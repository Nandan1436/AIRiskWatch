from pydantic import BaseModel


class IngestionRunResponse(BaseModel):
    status: str
    sources_processed: int
    articles_seen: int
    articles_relevant: int
    articles_failed: int
    incidents_created: int
    reports_attached: int
    errors: list[str]
