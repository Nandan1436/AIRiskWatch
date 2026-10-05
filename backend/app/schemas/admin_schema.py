from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.report_schema import ReportSummary
from app.schemas.user_schema import UserResponse


class AdminUserListResponse(BaseModel):
    items: list[UserResponse]
    total: int
    limit: int
    offset: int


class AdminUserUpdateRequest(BaseModel):
    role: Literal["user", "admin"] | None = None
    is_active: bool | None = None


class IncidentCreateRequest(BaseModel):
    title: str = Field(min_length=1)
    description: str | None = None
    incident_date: date | None = None
    alleged_deployer: list[str] = []
    alleged_developer: list[str] = []
    harmed_parties: list[str] = []


class IncidentUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1)
    description: str | None = None
    incident_date: date | None = None
    alleged_deployer: list[str] | None = None
    alleged_developer: list[str] | None = None
    harmed_parties: list[str] | None = None


class AdminReportResponse(ReportSummary):
    authors: str | None
    incident_ids: list[int]


class AdminReportDetailResponse(AdminReportResponse):
    text: str | None


class AdminReportListResponse(BaseModel):
    items: list[AdminReportResponse]
    total: int
    limit: int
    offset: int


class ReportCreateRequest(BaseModel):
    title: str = Field(min_length=1)
    text: str | None = None
    url: str | None = None
    source_domain: str | None = None
    authors: str | None = None
    published_date: date | None = None
    language: str | None = "en"
    incident_ids: list[int] = []


class ReportUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1)
    text: str | None = None
    url: str | None = None
    source_domain: str | None = None
    authors: str | None = None
    published_date: date | None = None
    language: str | None = None
    incident_ids: list[int] | None = None
