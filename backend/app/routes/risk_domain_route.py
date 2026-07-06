from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.risk_domain_schema import RiskDomainResponse
from app.services.risk_domain_service import RiskDomainService

router = APIRouter(prefix="/api/risk-domains", tags=["Risk Domains"])


def get_risk_domain_service(
    db: Session = Depends(get_db),
) -> RiskDomainService:
    return RiskDomainService(db)


@router.get("/", response_model=list[RiskDomainResponse])
def list_risk_domains(
    risk_domain_service: RiskDomainService = Depends(get_risk_domain_service),
) -> list[RiskDomainResponse]:
    return risk_domain_service.list_risk_domains()
