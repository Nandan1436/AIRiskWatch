from datetime import date

from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=4000)
    top_k: int = Field(default=10, ge=1, le=25)


class SearchResultItem(BaseModel):
    incident_id: int
    title: str | None
    incident_date: date | None
    risk_domain: str | None
    risk_subdomain: str | None


class SearchResponse(BaseModel):
    summary: str | None  # None when the LLM summary could not be generated
    results: list[SearchResultItem]
