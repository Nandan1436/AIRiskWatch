from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.organization_schema import OrganizationLeaderboardResponse
from app.services.organization_service import OrganizationService

router = APIRouter(prefix="/api/organizations", tags=["Organizations"])


def get_organization_service(db: Session = Depends(get_db)) -> OrganizationService:
    return OrganizationService(db)


@router.get("/top", response_model=OrganizationLeaderboardResponse)
def list_top_organizations(
    limit: int = Query(default=15, ge=1, le=100),
    risk_domain: str | None = None,
    risk_subdomain: str | None = None,
    causal_entity: str | None = None,
    timing: str | None = None,
    intent: str | None = None,
    service: OrganizationService = Depends(get_organization_service),
) -> OrganizationLeaderboardResponse:
    return service.list_top_organizations(
        limit=limit,
        risk_domain=risk_domain,
        risk_subdomain=risk_subdomain,
        causal_entity=causal_entity,
        timing=timing,
        intent=intent,
    )
