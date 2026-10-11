from datetime import date, datetime
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app import config
from app.models.incident_model import Incident, incident_report_table
from app.models.report_model import Report
from app.schemas.digest_schema import (
    DigestDomainCount,
    DigestIncident,
    DigestMonthResponse,
    DigestMonthSummary,
)
from app.schemas.incident_schema import IncidentResponse

DIGEST_MONTH_COUNT = 5
HIGHLIGHT_COUNT = 2
UNCLASSIFIED = "Unclassified"


def add_months(month: date, delta: int) -> date:
    index = month.year * 12 + month.month - 1 + delta
    return date(index // 12, index % 12 + 1, 1)


def current_month() -> date:
    today = datetime.now(ZoneInfo(config.INGESTION_TIMEZONE)).date()
    return today.replace(day=1)


def previous_month() -> date:
    return add_months(current_month(), -1)


def parse_month(value: str) -> date:
    """Parse 'YYYY-MM' into the first day of that month."""
    return datetime.strptime(value, "%Y-%m").date()


class DigestService:
    def __init__(self, db: Session):
        self.db = db

    def window(self, include_current: bool = False) -> list[date]:
        """The last DIGEST_MONTH_COUNT complete months, newest first, optionally
        preceded by the current month so far. Emails only ever use complete months."""
        this_month = current_month()
        start = 0 if include_current else 1
        return [add_months(this_month, -i) for i in range(start, DIGEST_MONTH_COUNT + 1)]

    def in_window(self, month: date, include_current: bool = False) -> bool:
        return month in self.window(include_current)

    def available_months(self) -> list[DigestMonthSummary]:
        months = self.window(include_current=True)
        this_month = current_month()
        digest_dates = self._digest_dates()
        month_start = func.date_trunc("month", digest_dates.c.digest_date)
        rows = self.db.execute(
            select(month_start, func.count())
            .where(
                digest_dates.c.digest_date >= months[-1],
                digest_dates.c.digest_date < add_months(months[0], 1),
            )
            .group_by(month_start)
        ).all()
        counts = {row_month.date(): count for row_month, count in rows}
        return [
            DigestMonthSummary(
                month=month, total=counts.get(month, 0), in_progress=month == this_month
            )
            for month in months
        ]

    def get_month(self, month: date) -> DigestMonthResponse:
        digest_dates = self._digest_dates()
        dated_ids = dict(
            self.db.execute(
                select(digest_dates.c.incident_id, digest_dates.c.digest_date).where(
                    digest_dates.c.digest_date >= month,
                    digest_dates.c.digest_date < add_months(month, 1),
                )
            ).all()
        )
        previous_total = (
            self.db.scalar(
                select(func.count()).where(
                    digest_dates.c.digest_date >= add_months(month, -1),
                    digest_dates.c.digest_date < month,
                )
            )
            or 0
        )

        incidents = []
        report_counts: dict[int, int] = {}
        if dated_ids:
            incidents = self.db.scalars(
                select(Incident)
                .where(Incident.incident_id.in_(dated_ids))
                .options(selectinload(Incident.classifications))
            ).all()
            report_counts = dict(
                self.db.execute(
                    select(incident_report_table.c.incident_id, func.count())
                    .where(incident_report_table.c.incident_id.in_(dated_ids))
                    .group_by(incident_report_table.c.incident_id)
                ).all()
            )

        items = [
            DigestIncident(
                **IncidentResponse.model_validate(incident).model_dump(),
                description=incident.description,
                digest_date=dated_ids[incident.incident_id],
                report_count=report_counts.get(incident.incident_id, 0),
            )
            for incident in incidents
        ]
        items.sort(key=lambda item: (item.digest_date, item.incident_id), reverse=True)

        domain_totals: dict[str, int] = {}
        for item in items:
            domain = next(
                (c.risk_domain for c in item.classifications if c.risk_domain), UNCLASSIFIED
            )
            domain_totals[domain] = domain_totals.get(domain, 0) + 1

        highlights = sorted(
            items, key=lambda item: (item.report_count, item.digest_date), reverse=True
        )[:HIGHLIGHT_COUNT]

        return DigestMonthResponse(
            month=month,
            total=len(items),
            previous_total=previous_total,
            domain_counts=[
                DigestDomainCount(risk_domain=domain, count=count)
                for domain, count in sorted(
                    domain_totals.items(), key=lambda pair: pair[1], reverse=True
                )
            ],
            highlights=highlights,
            incidents=items,
        )

    def _digest_dates(self):
        # An incident belongs to the month its earliest report was published;
        # incidents without reports fall back to incident_date. Scraped report
        # dates don't change, so a month's set is final once the month ends.
        digest_date = func.coalesce(func.min(Report.published_date), Incident.incident_date)
        return (
            select(Incident.incident_id, digest_date.label("digest_date"))
            .outerjoin(
                incident_report_table,
                incident_report_table.c.incident_id == Incident.incident_id,
            )
            .outerjoin(Report, Report.report_number == incident_report_table.c.report_id)
            .group_by(Incident.incident_id, Incident.incident_date)
            .subquery()
        )
