from pydantic import BaseModel


class CreatedIncidentResponse(BaseModel):
    incident_id: int
    title: str
    url: str


class IngestionRunResponse(BaseModel):
    status: str
    sources_processed: int
    articles_seen: int
    articles_relevant: int
    articles_failed: int
    incidents_created: int
    reports_attached: int
    created_incidents: list[CreatedIncidentResponse]
    errors: list[str]
