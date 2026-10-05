import logging
from dataclasses import dataclass
from datetime import date, datetime, timezone
from html import escape

from sqlalchemy import and_, func, or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app import config
from app.core.email_client import send_email, smtp_session
from app.models.digest_delivery_model import (
    STATUS_FAILED,
    STATUS_PENDING,
    STATUS_SENT,
    DigestDelivery,
)
from app.models.user_model import ROLE_ADMIN, User
from app.schemas.digest_schema import DigestDeliveryStatusResponse, DigestMonthResponse
from app.services.digest_service import DigestService, previous_month

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


def render_digest_email(digest: DigestMonthResponse) -> RenderedEmail:
    month_label = digest.month.strftime("%B %Y")
    digest_url = _link(f"/digest/{digest.month:%Y-%m}")
    account_url = _link("/account")
    change = _change_line(digest)
    noun = "incident" if digest.total == 1 else "incidents"
    subject = f"AIRiskWatch digest: {digest.total} AI {noun} in {month_label}"

    top = max((d.count for d in digest.domain_counts), default=1)
    domain_rows = "".join(
        f"""<tr>
<td style="padding:6px 8px 6px 0;font-size:14px;color:#1f2937;">{escape(d.risk_domain)}</td>
<td style="padding:6px 0;width:45%;"><div style="background:#4f46e5;height:8px;border-radius:4px;width:{max(4, round(d.count / top * 100))}%;"></div></td>
<td style="padding:6px 0 6px 8px;font-size:14px;color:#1f2937;text-align:right;font-weight:600;">{d.count}</td>
</tr>"""
        for d in digest.domain_counts
    )

    highlight_cards = "".join(
        f"""<div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:0 0 12px;">
<div style="font-size:12px;color:#4f46e5;font-weight:600;margin:0 0 4px;">{escape(_domain(h))}</div>
<div style="font-size:16px;font-weight:600;color:#111827;margin:0 0 6px;">{escape(h.title or "Untitled incident")}</div>
<div style="font-size:14px;color:#4b5563;line-height:1.5;margin:0 0 8px;">{escape(_preview(h.description))}</div>
<a href="{escape(_link(f"/incidents/{h.incident_id}"))}" style="font-size:14px;color:#4f46e5;text-decoration:none;">Read more &rarr;</a>
</div>"""
        for h in digest.highlights
    )

    if digest.total:
        body = f"""
<h2 style="font-size:16px;color:#111827;margin:24px 0 8px;">Risk domains</h2>
<table role="presentation" style="width:100%;border-collapse:collapse;">{domain_rows}</table>
<h2 style="font-size:16px;color:#111827;margin:24px 0 12px;">Highlights</h2>
{highlight_cards}"""
    else:
        body = '<p style="font-size:14px;color:#4b5563;">No AI incidents were reported this month.</p>'

    html = f"""<!doctype html>
<html><body style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;">
<div style="font-size:13px;color:#6b7280;margin:0 0 4px;">AIRiskWatch monthly digest</div>
<h1 style="font-size:22px;color:#111827;margin:0 0 8px;">AI incidents, {month_label}</h1>
<p style="font-size:15px;color:#374151;margin:0;"><strong>{digest.total}</strong> {noun} reported{f" &middot; {change}" if change else ""}</p>
{body}
<div style="text-align:center;margin:28px 0 8px;">
<a href="{escape(digest_url)}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:8px;">View the full {month_label} digest</a>
</div>
<p style="font-size:12px;color:#9ca3af;text-align:center;margin:24px 0 0;">You receive this because monthly digest emails are on for your AIRiskWatch account.
<a href="{escape(account_url)}" style="color:#6b7280;">Manage email preferences</a></p>
</div></body></html>"""

    text_lines = [
        f"AI incidents, {month_label}",
        f"{digest.total} {noun} reported" + (f" ({change})" if change else ""),
        "",
    ]
    if digest.total:
        text_lines.append("Risk domains:")
        text_lines += [f"  - {d.risk_domain}: {d.count}" for d in digest.domain_counts]
        text_lines += ["", "Highlights:"]
        for h in digest.highlights:
            text_lines += [
                f"  * {h.title or 'Untitled incident'} ({_domain(h)})",
                f"    {_preview(h.description)}",
                f"    {_link(f'/incidents/{h.incident_id}')}",
            ]
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
