from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.classification_breakdown_schema import ClassificationBreakdownResponse
from app.services.classification_breakdown_service import ClassificationBreakdownService

router = APIRouter(
    prefix="/api/classification-breakdowns", tags=["Classification Breakdowns"]
)


def get_classification_breakdown_service(
    db: Session = Depends(get_db),
) -> ClassificationBreakdownService:
    return ClassificationBreakdownService(db)


@router.get("/", response_model=ClassificationBreakdownResponse)
def get_classification_breakdowns(
    risk_domain: str | None = None,
    risk_subdomain: str | None = None,
    causal_entity: str | None = None,
    timing: str | None = None,
    intent: str | None = None,
    service: ClassificationBreakdownService = Depends(
        get_classification_breakdown_service
    ),
) -> ClassificationBreakdownResponse:
    return service.get_breakdowns(
        risk_domain=risk_domain,
        risk_subdomain=risk_subdomain,
        causal_entity=causal_entity,
        timing=timing,
        intent=intent,
    )
