from datetime import date

from pydantic import BaseModel, ConfigDict

from app.schemas.mit_classification_schema import MitClassificationResponse
from app.schemas.report_schema import ReportSummary


class IncidentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    incident_id: int
    title: str | None
    incident_date: date | None
    alleged_deployer: list[str] | None
    alleged_developer: list[str] | None
    harmed_parties: list[str] | None
    classifications: list[MitClassificationResponse]


class IncidentDetailResponse(IncidentResponse):
    description: str | None
    reports: list[ReportSummary]


class IncidentListResponse(BaseModel):
    items: list[IncidentResponse]
    total: int
    limit: int
    offset: int


class IncidentTrendPoint(BaseModel):
    year: int
    count: int


class IncidentTrendResponse(BaseModel):
    items: list[IncidentTrendPoint]
