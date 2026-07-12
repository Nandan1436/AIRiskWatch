from sqlalchemy import ColumnElement, func, select
from sqlalchemy.orm import Session

from app.models.incident_model import Incident
from app.schemas.organization_schema import (
    OrganizationLeaderboardResponse,
    OrganizationResponse,
)


class OrganizationService:
    def __init__(self, db: Session):
        self.db = db

    def list_top_organizations(self, limit: int = 15) -> OrganizationLeaderboardResponse:
        deployer_counts = self._unnest_counts(Incident.alleged_deployer)

        orgs = [
            OrganizationResponse(name=name, incident_count=count)
            for name, count in deployer_counts.items()
            if name
        ]
        top_orgs = sorted(orgs, key=lambda o: o.incident_count, reverse=True)[:limit]

        total_attributed, unattributed = self._attribution_stats()
        return OrganizationLeaderboardResponse(
            organizations=top_orgs,
            total_attributed_incidents=total_attributed,
            unattributed_incident_count=unattributed,
        )

    def _is_named(self, org_column: ColumnElement) -> ColumnElement:
        # AIID seed data uses "unknown" / "unknown-<category>" as a
        # placeholder when the actual actor was never identified in
        # reporting - these aren't real organizations, so exclude them
        # from the ranking rather than let them crowd out named orgs.
        return (org_column != "unknown") & (~org_column.like("unknown-%"))

    def _unnest_counts(self, column) -> dict[str, int]:
        org = func.unnest(column).label("org")
        subq = (
            select(Incident.incident_id.label("incident_id"), org)
            .where(column.is_not(None))
            .subquery()
        )
        rows = self.db.execute(
            select(subq.c.org, func.count(func.distinct(subq.c.incident_id)))
            .where(subq.c.org.is_not(None), self._is_named(subq.c.org))
            .group_by(subq.c.org)
        ).all()
        return dict(rows)

    def _attribution_stats(self) -> tuple[int, int]:
        deployer_pairs = select(
            Incident.incident_id.label("incident_id"),
            func.unnest(Incident.alleged_deployer).label("org"),
        ).where(Incident.alleged_deployer.is_not(None)).subquery()

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
