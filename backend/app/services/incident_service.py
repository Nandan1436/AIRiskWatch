from datetime import date

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.incident_model import Incident
from app.models.mit_classification_model import MitClassification


class IncidentService:
    def __init__(self, db: Session):
        self.db = db

    def list_incidents(
        self,
        limit: int,
        offset: int,
        search: str | None = None,
        risk_domain: str | None = None,
        risk_subdomain: str | None = None,
        causal_entity: str | None = None,
        timing: str | None = None,
        intent: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> tuple[list[Incident], int]:
        query = select(Incident)
        query = self._apply_filters(
            query,
            search=search,
            risk_domain=risk_domain,
            risk_subdomain=risk_subdomain,
            causal_entity=causal_entity,
            timing=timing,
            intent=intent,
            date_from=date_from,
            date_to=date_to,
        )

        # One round trip: the window count gives the total before LIMIT, and
        # joinedload with LIMIT makes SQLAlchemy page the incidents in a
        # subquery and join their classifications outside it, so the limit
        # still counts incidents rather than classification rows.
        rows = (
            self.db.execute(
                query.add_columns(func.count().over().label("total"))
                .options(joinedload(Incident.classifications))
                .order_by(Incident.incident_date.desc(), Incident.incident_id.desc())
                .limit(limit)
                .offset(offset)
            )
            .unique()
            .all()
        )
        if rows:
            return [incident for incident, _ in rows], rows[0].total
        if offset == 0:
            return [], 0
        # Past the last page there are no rows to carry the total.
        total = self.db.scalar(select(func.count()).select_from(query.subquery()))
        return [], total or 0

    def get_trend(
        self,
        risk_domain: str | None = None,
        risk_subdomain: str | None = None,
        causal_entity: str | None = None,
        timing: str | None = None,
        intent: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[tuple[int, int]]:
        year = func.extract("year", Incident.incident_date).label("year")
        query = (
            select(year, func.count(func.distinct(Incident.incident_id)))
            .where(Incident.incident_date.is_not(None))
        )
        query = self._apply_filters(
            query,
            search=None,
            risk_domain=risk_domain,
            risk_subdomain=risk_subdomain,
            causal_entity=causal_entity,
            timing=timing,
            intent=intent,
            date_from=date_from,
            date_to=date_to,
        )
        rows = self.db.execute(query.group_by(year).order_by(year)).all()
        return [(int(row_year), count) for row_year, count in rows]

    def get_incident(self, incident_id: int) -> Incident | None:
        # Both collections in one query. Joining two collections multiplies
        # rows (classifications x reports), which is negligible for a single
        # incident and cheaper than two extra round trips.
        return (
            self.db.execute(
                select(Incident)
                .where(Incident.incident_id == incident_id)
                .options(
                    joinedload(Incident.classifications),
                    joinedload(Incident.reports),
                )
            )
            .unique()
            .scalar_one_or_none()
        )

    def _apply_filters(
        self,
        query: Select,
        search: str | None,
        risk_domain: str | None,
        risk_subdomain: str | None,
        causal_entity: str | None,
        timing: str | None,
        intent: str | None,
        date_from: date | None,
        date_to: date | None,
    ) -> Select:
        if search:
            pattern = f"%{search}%"
            query = query.where(
                or_(
                    Incident.title.ilike(pattern),
                    Incident.description.ilike(pattern),
                )
            )
        if date_from:
            query = query.where(Incident.incident_date >= date_from)
        if date_to:
            query = query.where(Incident.incident_date <= date_to)

        classification_filters = {
            MitClassification.risk_domain: risk_domain,
            MitClassification.risk_subdomain: risk_subdomain,
            MitClassification.causal_entity: causal_entity,
            MitClassification.timing: timing,
            MitClassification.intent: intent,
        }
        for column, value in classification_filters.items():
            if value:
                query = query.where(
                    Incident.classifications.any(column == value)
                )
        return query
