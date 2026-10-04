from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.mit_classification_model import MitClassification
from app.schemas.risk_domain_schema import (
    RiskDomainResponse,
    RiskSubdomainResponse,
)


class RiskDomainService:
    def __init__(self, db: Session):
        self.db = db

    def list_risk_domains(self) -> list[RiskDomainResponse]:
        rows = self.db.execute(
            select(
                MitClassification.risk_domain,
                MitClassification.risk_subdomain,
                func.count(func.distinct(MitClassification.incident_id)).label(
                    "incident_count"
                ),
            )
            .where(MitClassification.risk_domain.is_not(None))
            .group_by(
                MitClassification.risk_domain,
                MitClassification.risk_subdomain,
            )
        ).all()

        domain_counts = dict(
            self.db.execute(
                select(
                    MitClassification.risk_domain,
                    func.count(func.distinct(MitClassification.incident_id)),
                )
                .where(MitClassification.risk_domain.is_not(None))
                .group_by(MitClassification.risk_domain)
            ).all()
        )

        domains: dict[str, list[RiskSubdomainResponse]] = {}
        for risk_domain, risk_subdomain, incident_count in rows:
            subdomains = domains.setdefault(risk_domain, [])
            if risk_subdomain:
                subdomains.append(
                    RiskSubdomainResponse(
                        name=risk_subdomain, incident_count=incident_count
                    )
                )

        responses = [
            RiskDomainResponse(
                name=name,
                incident_count=domain_counts.get(name, 0),
                subdomains=sorted(
                    subdomains, key=lambda sub: sub.incident_count, reverse=True
                ),
            )
            for name, subdomains in domains.items()
        ]
        return sorted(
            responses, key=lambda domain: domain.incident_count, reverse=True
        )
