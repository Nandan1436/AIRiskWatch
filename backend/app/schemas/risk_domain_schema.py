from pydantic import BaseModel


class RiskSubdomainResponse(BaseModel):
    name: str
    incident_count: int


class RiskDomainResponse(BaseModel):
    name: str
    incident_count: int
    subdomains: list[RiskSubdomainResponse]
