from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.digest_schema import DigestMonthListResponse, DigestMonthResponse
from app.services.digest_service import DigestService

router = APIRouter(prefix="/api/digest", tags=["Digest"])


def get_digest_service(db: Session = Depends(get_db)) -> DigestService:
    return DigestService(db)


@router.get("/months", response_model=DigestMonthListResponse)
def list_digest_months(
    service: DigestService = Depends(get_digest_service),
) -> DigestMonthListResponse:
    return DigestMonthListResponse(items=service.available_months())


@router.get("/{year}/{month}", response_model=DigestMonthResponse)
def get_digest_month(
    year: int = Path(ge=2000, le=2100),
    month: int = Path(ge=1, le=12),
    service: DigestService = Depends(get_digest_service),
) -> DigestMonthResponse:
    digest_month = date(year, month, 1)
    if not service.in_window(digest_month):
        raise HTTPException(status_code=404, detail="Digest month not available")
    return service.get_month(digest_month)
