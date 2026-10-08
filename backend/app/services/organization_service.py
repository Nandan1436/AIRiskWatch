from sqlalchemy import ColumnElement, func, select
from sqlalchemy.orm import Session

from app.models.incident_model import Incident
from app.models.mit_classification_model import MitClassification
from app.schemas.organization_schema import (
    OrganizationLeaderboardResponse,
    OrganizationResponse,
)


class OrganizationService:
    def __init__(self, db: Session):
        self.db = db

    def list_top_organizations(
        self,
        limit: int = 15,
        risk_domain: str | None = None,
        risk_subdomain: str | None = None,
        causal_entity: str | None = None,
        timing: str | None = None,
        intent: str | None = None,
    ) -> OrganizationLeaderboardResponse:
        # Optional taxonomy filters, matched the same way as the incident list.
        scope = [
            Incident.classifications.any(column == value)
            for column, value in {
                MitClassification.risk_domain: risk_domain,
                MitClassification.risk_subdomain: risk_subdomain,
                MitClassification.causal_entity: causal_entity,
                MitClassification.timing: timing,
                MitClassification.intent: intent,
            }.items()
            if value
        ]
        deployer_counts = self._unnest_counts(Incident.alleged_deployer, scope)

        orgs = [
            OrganizationResponse(name=name, incident_count=count)
            for name, count in deployer_counts.items()
            if name
        ]
        top_orgs = sorted(orgs, key=lambda o: o.incident_count, reverse=True)[:limit]

        total_attributed, unattributed = self._attribution_stats(scope)
        return OrganizationLeaderboardResponse(
            organizations=top_orgs,
            total_attributed_incidents=total_attributed,
            unattributed_incident_count=unattributed,
        )

    def _is_named(self, org_column: ColumnElement) -> ColumnElement:
        return (org_column != "unknown") & (~org_column.like("unknown-%"))

    def _unnest_counts(self, column, scope: list[ColumnElement]) -> dict[str, int]:
        org = func.unnest(column).label("org")
        subq = (
            select(Incident.incident_id.label("incident_id"), org)
            .where(column.is_not(None), *scope)
            .subquery()
        )
        rows = self.db.execute(
            select(subq.c.org, func.count(func.distinct(subq.c.incident_id)))
            .where(subq.c.org.is_not(None), self._is_named(subq.c.org))
            .group_by(subq.c.org)
        ).all()
        return dict(rows)

    def _attribution_stats(self, scope: list[ColumnElement]) -> tuple[int, int]:
        deployer_pairs = select(
            Incident.incident_id.label("incident_id"),
            func.unnest(Incident.alleged_deployer).label("org"),
        ).where(Incident.alleged_deployer.is_not(None), *scope).subquery()

        named_subq = (
            select(deployer_pairs.c.incident_id)
            .where(
                deployer_pairs.c.org.is_not(None),
                self._is_named(deployer_pairs.c.org),
            )
            .subquery()
        )
        total_attributed = (
            self.db.scalar(select(func.count(func.distinct(named_subq.c.incident_id))))
            or 0
        )

        unattributed_subq = (
            select(deployer_pairs.c.incident_id)
            .where(deployer_pairs.c.org.is_not(None))
            .except_(select(named_subq.c.incident_id))
        ).subquery()
        unattributed = (
            self.db.scalar(
                select(func.count(func.distinct(unattributed_subq.c.incident_id)))
            )
            or 0
        )

        return total_attributed, unattributed
