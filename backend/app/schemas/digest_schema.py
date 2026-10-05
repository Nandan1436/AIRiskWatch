from datetime import date

from pydantic import BaseModel, EmailStr, Field

from app.schemas.incident_schema import IncidentResponse


class DigestMonthSummary(BaseModel):
    month: date  # first day of the month
    total: int


class DigestMonthListResponse(BaseModel):
    items: list[DigestMonthSummary]  # newest first


class DigestDomainCount(BaseModel):
    risk_domain: str
    count: int


class DigestIncident(IncidentResponse):
    description: str | None
    digest_date: date  # earliest report date, or incident_date without reports
    report_count: int


class DigestMonthResponse(BaseModel):
    month: date
    total: int
    previous_total: int
    domain_counts: list[DigestDomainCount]
    highlights: list[DigestIncident]
    incidents: list[DigestIncident]


class DigestSendRequest(BaseModel):
    month: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}$")  # YYYY-MM
    test_to: EmailStr | None = None  # send one copy here; delivery rows untouched


class DigestSendResponse(BaseModel):
    month: date
    test_to: str | None


class DigestDeliveryStatusResponse(BaseModel):
    month: date
    subscribers: int
    sent: int
    failed: int
    pending: int
