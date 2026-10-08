from sqlalchemy import ColumnElement, func, select
from sqlalchemy.orm import Session

from app.models.incident_model import Incident
from app.models.mit_classification_model import MitClassification
from app.schemas.classification_breakdown_schema import (
    ClassificationBreakdownItem,
    ClassificationBreakdownResponse,
)


class ClassificationBreakdownService:
    def __init__(self, db: Session):
        self.db = db

    def get_breakdowns(
        self,
        risk_domain: str | None = None,
        risk_subdomain: str | None = None,
        causal_entity: str | None = None,
        timing: str | None = None,
        intent: str | None = None,
    ) -> ClassificationBreakdownResponse:
        # Same semantics as the incident list filters: an incident matches when
        # any of its classifications has the value, so counts here agree with
        # the totals the incident list reports for the same filters.
        filters = {
            MitClassification.risk_domain: risk_domain,
            MitClassification.risk_subdomain: risk_subdomain,
            MitClassification.causal_entity: causal_entity,
            MitClassification.timing: timing,
            MitClassification.intent: intent,
        }
        matching = select(Incident.incident_id)
        for column, value in filters.items():
            if value:
                matching = matching.where(Incident.classifications.any(column == value))
        scoped = any(filters.values())

        return ClassificationBreakdownResponse(
            causal_entity=self._group_by(MitClassification.causal_entity, matching, scoped),
            intent=self._group_by(MitClassification.intent, matching, scoped),
            timing=self._group_by(MitClassification.timing, matching, scoped),
            risk_domain=self._group_by(MitClassification.risk_domain, matching, scoped),
        )

    def _group_by(
        self, column: ColumnElement, matching, scoped: bool
    ) -> list[ClassificationBreakdownItem]:
        query = (
            select(column, func.count(func.distinct(MitClassification.incident_id)))
            .where(column.is_not(None))
            .group_by(column)
        )
        if scoped:
            query = query.where(MitClassification.incident_id.in_(matching))
        items = [
            ClassificationBreakdownItem(name=name, incident_count=count)
            for name, count in self.db.execute(query).all()
        ]
        return sorted(items, key=lambda i: i.incident_count, reverse=True)
