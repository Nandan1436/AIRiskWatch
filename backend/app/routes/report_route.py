from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.report_schema import ReportDetailResponse
from app.services.report_service import ReportService

router = APIRouter(prefix="/api/reports", tags=["Reports"])


def get_report_service(db: Session = Depends(get_db)) -> ReportService:
    return ReportService(db)


@router.get("/{report_number}", response_model=ReportDetailResponse)
def get_report(
    report_number: int,
    report_service: ReportService = Depends(get_report_service),
) -> ReportDetailResponse:
    report = report_service.get_report(report_number)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return report
