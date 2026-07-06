from datetime import date

from pydantic import BaseModel, ConfigDict


class ReportSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    report_number: int
    title: str | None
    url: str | None
    source_domain: str | None
    published_date: date | None
    language: str | None


class ReportDetailResponse(ReportSummary):
    authors: str | None
    text: str | None
