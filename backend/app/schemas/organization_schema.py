from pydantic import BaseModel


class OrganizationResponse(BaseModel):
    name: str
    incident_count: int


class OrganizationLeaderboardResponse(BaseModel):
    organizations: list[OrganizationResponse]
    total_attributed_incidents: int
    unattributed_incident_count: int
