from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.report_model import Report


class ReportService:
    def __init__(self, db: Session):
        self.db = db

    def get_report(self, report_number: int) -> Report | None:
        return self.db.scalar(
            select(Report).where(Report.report_number == report_number)
        )
