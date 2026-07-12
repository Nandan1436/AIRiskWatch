from sqlalchemy import ColumnElement, func, select
from sqlalchemy.orm import Session

from app.models.mit_classification_model import MitClassification
from app.schemas.classification_breakdown_schema import (
    ClassificationBreakdownItem,
    ClassificationBreakdownResponse,
)


class ClassificationBreakdownService:
    def __init__(self, db: Session):
        self.db = db

    def get_breakdowns(self) -> ClassificationBreakdownResponse:
        return ClassificationBreakdownResponse(
            causal_entity=self._group_by(MitClassification.causal_entity),
            intent=self._group_by(MitClassification.intent),
            timing=self._group_by(MitClassification.timing),
        )

    def _group_by(self, column: ColumnElement) -> list[ClassificationBreakdownItem]:
        rows = self.db.execute(
            select(column, func.count(func.distinct(MitClassification.incident_id)))
            .where(column.is_not(None))
            .group_by(column)
        ).all()
        items = [
            ClassificationBreakdownItem(name=name, incident_count=count)
            for name, count in rows
        ]
        return sorted(items, key=lambda i: i.incident_count, reverse=True)
