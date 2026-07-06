from datetime import date

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session, selectinload

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

        total = self.db.scalar(
            select(func.count()).select_from(query.subquery())
        )

        incidents = (
            self.db.scalars(
                query.options(selectinload(Incident.classifications))
                .order_by(Incident.incident_id)
                .limit(limit)
                .offset(offset)
            )
            .all()
        )
        return list(incidents), total or 0

    def get_incident(self, incident_id: int) -> Incident | None:
        return self.db.scalar(
            select(Incident)
            .where(Incident.incident_id == incident_id)
            .options(
                selectinload(Incident.classifications),
                selectinload(Incident.reports),
            )
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
