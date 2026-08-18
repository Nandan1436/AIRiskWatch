from pydantic import BaseModel


class IngestionRunResponse(BaseModel):
    """Result of one ingestion cycle.

    Nothing about a run is persisted, so this response is the only structured
    record of it — hence the full count breakdown rather than a bare success
    flag. ``articles_failed`` is reported separately from
    ``articles_seen - articles_relevant`` because "mostly irrelevant" and
    "mostly erroring" are very different outcomes.
    """

    status: str  # completed | partial | failed | skipped
    sources_processed: int
    articles_seen: int
    articles_relevant: int
    articles_failed: int
    incidents_created: int
    reports_attached: int
    errors: list[str]
