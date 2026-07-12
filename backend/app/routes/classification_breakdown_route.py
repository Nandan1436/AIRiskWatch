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
    service: ClassificationBreakdownService = Depends(
        get_classification_breakdown_service
    ),
) -> ClassificationBreakdownResponse:
    return service.get_breakdowns()
