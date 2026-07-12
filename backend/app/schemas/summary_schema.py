from pydantic import BaseModel


class SummaryResponse(BaseModel):
    total_incidents: int
    total_organizations: int
    total_risk_domains: int
    latest_year: int | None
    latest_year_count: int
    previous_year_count: int
    yoy_change_pct: float | None
