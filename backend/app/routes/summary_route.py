from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.summary_schema import SummaryResponse
from app.services.summary_service import SummaryService

router = APIRouter(prefix="/api/summary", tags=["Summary"])


def get_summary_service(db: Session = Depends(get_db)) -> SummaryService:
    return SummaryService(db)


@router.get("/", response_model=SummaryResponse)
def get_summary(
    service: SummaryService = Depends(get_summary_service),
) -> SummaryResponse:
    return service.get_summary()
