import logging
from dataclasses import dataclass
from datetime import date, datetime, timezone
from html import escape

from sqlalchemy import and_, func, or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app import config
from app.core import mit_taxonomy as tax
from app.core.email_client import send_email, smtp_session
from app.models.digest_delivery_model import (
    STATUS_FAILED,
    STATUS_PENDING,
    STATUS_SENT,
    DigestDelivery,
)
from app.models.user_model import ROLE_ADMIN, User
from app.schemas.digest_schema import (
    DigestDeliveryStatusResponse,
    DigestIncident,
    DigestMonthResponse,
)
from app.services.digest_service import DigestService, add_months, previous_month

logger = logging.getLogger(__name__)

DESCRIPTION_PREVIEW_CHARS = 220


@dataclass
class RenderedEmail:
    subject: str
    html: str
    text: str


@dataclass
class DigestSendResult:
    month: date
    sent: int = 0
    failed: int = 0
    skipped: int = 0


def _link(path: str) -> str:
    return f"{config.FRONTEND_BASE_URL.rstrip('/')}{path}"


def _preview(description: str | None) -> str:
    text = " ".join((description or "").split())
    if len(text) <= DESCRIPTION_PREVIEW_CHARS:
        return text
    return text[:DESCRIPTION_PREVIEW_CHARS].rsplit(" ", 1)[0] + "…"


def _change_line(digest: DigestMonthResponse) -> str:
    diff = digest.total - digest.previous_total
    if diff == 0:
        return ""
    word = "more" if diff > 0 else "fewer"
    return f"{abs(diff)} {word} than the previous month"


# Light-theme colours from frontend/src/styles/global.css. Email clients drop
# stylesheets and CSS variables, so the values are inlined.
_BG = "#f6f5f2"
_SURFACE = "#ffffff"
_SURFACE_2 = "#f8f7f4"
_CHIP = "#efede8"
_BORDER = "#e2ded6"
_BORDER_SOFT = "#ebe8e1"
_FG = "#141a24"
_FG_DIM = "#555f6e"
_FG_FAINT = "#8b93a0"
_ACCENT = "#c2410c"
_FONT = "Inter,'Segoe UI',Helvetica,Arial,sans-serif"
_MONO = "'JetBrains Mono',Consolas,monospace"
# MIT risk domains 1-7, in taxonomy order (--d1 .. --d7).
_DOMAIN_COLORS = ["#7c3aed", "#16a34a", "#ca8a04", "#e11d48", "#db2777", "#64748b", "#0284c7"]
_BADGE_UP = ("#dc2626", "#fdecec")
_BADGE_DOWN = ("#16a34a", "#e8f6ed")
_BADGE_NEUTRAL = (_FG_DIM, _CHIP)
_LABEL = (
    "font-size:11px;font-weight:600;letter-spacing:.07em;"
    f"text-transform:uppercase;color:{_FG_FAINT};"
)

EMAIL_INCIDENT_COUNT = 2


def _domain_color(domain: str) -> str | None:
    wanted = tax.normalize(domain).lower()
    for index, name in enumerate(tax.DOMAINS):
        if tax.normalize(name).lower() == wanted:
            return _DOMAIN_COLORS[index % len(_DOMAIN_COLORS)]
    return None


def _badge(text: str, colors: tuple[str, str]) -> str:
    color, background = colors
    return (
        f'<span style="display:inline-block;font-size:12px;font-weight:600;color:{color};'
        f'background:{background};border-radius:999px;padding:2px 8px;">{escape(text)}</span>'
    )


def _stat_cell(label: str, value_html: str, badge_html: str) -> str:
    return f"""<td width="50%" valign="top" style="background:{_SURFACE_2};border:1px solid {_BORDER_SOFT};border-radius:10px;padding:14px 16px;">
<div style="{_LABEL}">{label}</div>
{value_html}
{badge_html}
</td>"""


def _stats_html(digest: DigestMonthResponse) -> str:
    diff = digest.total - digest.previous_total
    previous_label = add_months(digest.month, -1).strftime("%b")
    sign = "+" if diff >= 0 else "−"
    trend = _BADGE_UP if diff > 0 else _BADGE_DOWN if diff < 0 else _BADGE_NEUTRAL
    reported = _stat_cell(
        "Incidents reported",
        f'<div style="font-size:28px;font-weight:700;color:{_FG};margin:6px 0 4px;">{digest.total}</div>',
        _badge(f"{sign}{abs(diff)} vs {previous_label}", trend),
    )

    # Same rule as the digest page: the top domain ignores unclassified incidents.
    top = next((d for d in digest.domain_counts if _domain_color(d.risk_domain)), None)
    if top:
        top_value = escape(top.risk_domain)
        top_color = _domain_color(top.risk_domain)
        top_badge = _badge(f"{top.count} of {digest.total}", _BADGE_NEUTRAL)
    else:
        top_value, top_color, top_badge = "None classified yet", _FG_DIM, ""
    top_domain = _stat_cell(
        "Top risk domain",
        f'<div style="font-size:17px;font-weight:700;color:{top_color};margin:8px 0 6px;line-height:1.3;">{top_value}</div>',
        top_badge,
    )
    return f"""<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
<tr>{reported}<td width="12" style="font-size:0;">&nbsp;</td>{top_domain}</tr>
</table>"""


def _incident_card(incident: DigestIncident) -> str:
    domain = _domain(incident)
    color = _domain_color(domain) or _FG_FAINT
    url = escape(_link(f"/incidents/{incident.incident_id}"))
    when = f"{incident.digest_date.day} {incident.digest_date:%b %Y}"
    preview = _preview(incident.description)
    preview_html = (
        f'<p style="font-size:14px;line-height:1.55;color:{_FG_DIM};margin:0 0 10px;">{escape(preview)}</p>\n'
        if preview
        else ""
    )
    return f"""<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid {_BORDER};border-radius:10px;margin:0 0 12px;">
<tr><td style="padding:16px 18px;">
<div style="font-size:12px;margin:0 0 6px;"><span style="color:{color};font-size:14px;line-height:1;">&#9679;</span> <span style="color:{color};font-weight:600;">{escape(domain)}</span><span style="color:{_FG_FAINT};font-family:{_MONO};"> &middot; #{incident.incident_id} &middot; {when}</span></div>
<a href="{url}" style="display:block;font-size:16px;font-weight:600;line-height:1.35;color:{_FG};text-decoration:none;margin:0 0 6px;">{escape(incident.title or "Untitled incident")}</a>
{preview_html}<a href="{url}" style="font-size:13px;font-weight:600;color:{_ACCENT};text-decoration:none;">View incident &rarr;</a>
</td></tr>
</table>"""


def render_digest_email(digest: DigestMonthResponse) -> RenderedEmail:
    month_label = digest.month.strftime("%B %Y")
    month_name = digest.month.strftime("%B")
    digest_url = _link(f"/digest/{digest.month:%Y-%m}")
    account_url = _link("/account")
    change = _change_line(digest)
    noun = "incident" if digest.total == 1 else "incidents"
    subject = f"AIRiskWatch digest: {digest.total} AI {noun} in {month_label}"
    # digest.incidents is newest first, so these are the month's latest.
    shown = digest.incidents[:EMAIL_INCIDENT_COUNT]
    remaining = digest.total - len(shown)

    if digest.total:
        more = ""
        if remaining:
            more_noun = "incident" if remaining == 1 else "incidents"
            more = (
                f'<p style="font-size:14px;color:{_FG_DIM};margin:8px 0 16px;text-align:center;">'
                f'and <strong style="color:{_FG};">{remaining} more</strong> {more_noun} this month</p>'
            )
        cards = "\n".join(_incident_card(incident) for incident in shown)
        body = f"""{_stats_html(digest)}
<div style="{_LABEL}margin:0 0 10px;">Latest incidents</div>
{cards}
{more}"""
        preheader = f"{digest.total} AI {noun} first reported in {month_label}" + (
            f", {change}." if change else "."
        )
    else:
        body = (
            f'<p style="font-size:14px;color:{_FG_DIM};margin:0 0 16px;">'
            f"No AI incidents were reported in {month_label}.</p>"
        )
        preheader = f"No AI incidents were reported in {month_label}."

    html = f"""<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<title>{escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background:{_BG};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">{escape(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{_BG};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;font-family:{_FONT};color:{_FG};">
<tr><td style="padding:0 4px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="font-size:16px;font-weight:700;color:{_FG};"><span style="display:inline-block;width:22px;height:22px;line-height:22px;border-radius:6px;background:{_ACCENT};color:#ffffff;text-align:center;font-size:13px;vertical-align:middle;margin-right:8px;">&#9673;</span><span style="vertical-align:middle;">AIRiskWatch</span></td>
<td align="right" style="font-size:12px;color:{_FG_FAINT};">Monthly digest</td>
</tr></table>
</td></tr>
<tr><td style="background:{_SURFACE};border:1px solid {_BORDER};border-radius:14px;padding:32px 28px;">
<div style="font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:{_ACCENT};margin:0 0 8px;">Monthly digest</div>
<h1 style="font-size:24px;line-height:1.25;font-weight:700;color:{_FG};margin:0 0 8px;">{month_label} in AI incidents</h1>
<p style="font-size:14px;line-height:1.55;color:{_FG_DIM};margin:0 0 24px;">Incidents first reported during the month, from the MIT seed corpus and daily news ingestion.</p>
{body}
<table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>
<td style="background:{_ACCENT};border-radius:8px;"><a href="{escape(digest_url)}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">View the full {month_name} digest &rarr;</a></td>
</tr></table>
</td></tr>
<tr><td style="padding:20px 8px 0;text-align:center;font-size:12px;line-height:1.6;color:{_FG_FAINT};">
You receive this because monthly digest emails are on for your AIRiskWatch account.<br>
<a href="{escape(account_url)}" style="color:{_FG_DIM};text-decoration:underline;">Manage email preferences</a>
</td></tr>
</table>
</td></tr>
</table>
</body></html>"""

    text_lines = [
        f"{month_label} in AI incidents",
        f"{digest.total} {noun} reported" + (f" ({change})" if change else ""),
        "",
    ]
    if shown:
        text_lines.append("Latest incidents:")
        for incident in shown:
            text_lines.append(f"  * {incident.title or 'Untitled incident'} ({_domain(incident)})")
            if preview := _preview(incident.description):
                text_lines.append(f"    {preview}")
            text_lines.append(f"    {_link(f'/incidents/{incident.incident_id}')}")
        if remaining:
            text_lines.append(f"  ...and {remaining} more this month")
        text_lines.append("")
    text_lines += [
        f"Full digest: {digest_url}",
        f"Manage email preferences: {account_url}",
    ]
    return RenderedEmail(subject=subject, html=html, text="\n".join(text_lines))


def _domain(incident) -> str:
    return next(
        (c.risk_domain for c in incident.classifications if c.risk_domain), "Unclassified"
    )


def send_monthly_digest(
    db: Session, month: date | None = None, test_to: str | None = None
) -> DigestSendResult:
    """Send one month's digest to every opted-in user, at most once per user.

    With test_to, sends a single copy there and leaves digest_delivery alone.
    """
    month = month or previous_month()
    result = DigestSendResult(month=month)
    email = render_digest_email(DigestService(db).get_month(month))

    if test_to:
        with smtp_session() as smtp:
            send_email(smtp, test_to, email.subject, email.html, email.text)
        result.sent = 1
        return result

    recipients = db.execute(
        select(User.id, User.email)
        .where(*_subscriber_filter())
        .order_by(User.id)
    ).all()

    with smtp_session() as smtp:
        for user_id, address in recipients:
            if not _claim(db, user_id, month):
                result.skipped += 1
                continue
            try:
                send_email(smtp, address, email.subject, email.html, email.text)
            except Exception:
                logger.exception("digest email to user %s failed", user_id)
                _mark(db, user_id, STATUS_FAILED)
                result.failed += 1
            else:
                _mark(db, user_id, STATUS_SENT)
                result.sent += 1

    logger.info(
        "digest %s: sent=%d failed=%d skipped=%d",
        f"{month:%Y-%m}",
        result.sent,
        result.failed,
        result.skipped,
    )
    return result


def run_digest_job(month: date | None = None) -> None:
    """Entry point for the scheduler and the admin background task."""
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        send_monthly_digest(db, month)
    except Exception:
        logger.exception("monthly digest send failed")
    finally:
        db.close()


def delivery_status(db: Session, month: date) -> DigestDeliveryStatusResponse:
    counts = dict(
        db.execute(
            select(DigestDelivery.status, func.count())
            .where(DigestDelivery.digest_month == month)
            .group_by(DigestDelivery.status)
        ).all()
    )
    subscribers = db.scalar(select(func.count()).select_from(User).where(*_subscriber_filter()))
    return DigestDeliveryStatusResponse(
        month=month,
        subscribers=subscribers or 0,
        sent=counts.get(STATUS_SENT, 0),
        failed=counts.get(STATUS_FAILED, 0),
        pending=counts.get(STATUS_PENDING, 0),
    )


def _subscriber_filter():
    # Admins are excluded from the bulk send; they use "Send test to me".
    return (
        User.is_active.is_(True),
        User.email_notifications.is_(True),
        User.role != ROLE_ADMIN,
    )


def _claim(db: Session, user_id: int, month: date) -> bool:
    # Atomic claim on the user's single row: succeeds only if this month hasn't
    # been handled for them yet, or the last attempt for it failed. A 'pending'
    # row (crash mid-send) is left alone so nobody gets a second copy.
    statement = (
        insert(DigestDelivery)
        .values(user_id=user_id, digest_month=month, status=STATUS_PENDING)
        .on_conflict_do_update(
            index_elements=[DigestDelivery.user_id],
            set_={"digest_month": month, "status": STATUS_PENDING, "sent_at": None},
            where=or_(
                DigestDelivery.digest_month < month,
                and_(
                    DigestDelivery.digest_month == month,
                    DigestDelivery.status == STATUS_FAILED,
                ),
            ),
        )
        .returning(DigestDelivery.user_id)
    )
    claimed = db.execute(statement).scalar_one_or_none() is not None
    db.commit()
    return claimed


def _mark(db: Session, user_id: int, status: str) -> None:
    delivery = db.get(DigestDelivery, user_id)
    delivery.status = status
    delivery.sent_at = datetime.now(timezone.utc) if status == STATUS_SENT else None
    db.commit()
