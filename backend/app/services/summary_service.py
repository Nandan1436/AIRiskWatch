from datetime import date

from sqlalchemy import func, select, union
from sqlalchemy.orm import Session

from app.models.incident_model import Incident
from app.models.mit_classification_model import MitClassification
from app.schemas.summary_schema import SummaryResponse


class SummaryService:
    def __init__(self, db: Session):
        self.db = db

    def get_summary(self) -> SummaryResponse:
        total_incidents = self.db.scalar(select(func.count(Incident.incident_id))) or 0
        total_organizations = self._total_organizations()
        total_risk_domains = (
            self.db.scalar(
                select(func.count(func.distinct(MitClassification.risk_domain))).where(
                    MitClassification.risk_domain.is_not(None)
                )
            )
            or 0
        )

        latest_year, latest_year_count, previous_year_count = self._year_over_year()
        yoy_change_pct = (
            round((latest_year_count - previous_year_count) / previous_year_count * 100, 1)
            if previous_year_count
            else None
        )

        return SummaryResponse(
            total_incidents=total_incidents,
            total_organizations=total_organizations,
            total_risk_domains=total_risk_domains,
            latest_year=latest_year,
            latest_year_count=latest_year_count,
            previous_year_count=previous_year_count,
            yoy_change_pct=yoy_change_pct,
        )

    def _total_organizations(self) -> int:
        deployer_names = select(func.unnest(Incident.alleged_deployer).label("org")).where(
            Incident.alleged_deployer.is_not(None)
        )
        developer_names = select(func.unnest(Incident.alleged_developer).label("org")).where(
            Incident.alleged_developer.is_not(None)
        )
        combined = union(deployer_names, developer_names).subquery()
        return (
            self.db.scalar(
                select(func.count(func.distinct(combined.c.org))).where(
                    combined.c.org.is_not(None),
                    combined.c.org != "unknown",
                    ~combined.c.org.like("unknown-%"),
                )
            )
            or 0
        )

    def _year_over_year(self) -> tuple[int | None, int, int]:
        year = func.extract("year", Incident.incident_date).label("year")
        rows = self.db.execute(
            select(year, func.count(func.distinct(Incident.incident_id)))
            .where(Incident.incident_date.is_not(None))
            .group_by(year)
        ).all()
        counts = {int(row_year): count for row_year, count in rows}

        current_year = date.today().year
        complete_years = sorted(y for y in counts if y < current_year)
        if not complete_years:
            return None, 0, 0

        latest_year = complete_years[-1]
        previous_year = complete_years[-2] if len(complete_years) > 1 else None
        return (
            latest_year,
            counts.get(latest_year, 0),
            counts.get(previous_year, 0) if previous_year else 0,
        )
