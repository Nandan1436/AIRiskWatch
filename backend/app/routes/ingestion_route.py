"""Manual ingestion trigger.

"Cron is the backbone, manual is the override" (design doc §8.8). With no admin
panel to click a button in, this endpoint is the override.

There is deliberately no ``GET /runs``: nothing about a run is persisted, so
there is no history to serve — past runs live in the application logs.
"""
from dataclasses import asdict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.ingestion_schema import IngestionRunResponse
from app.services.ingestion_service import IngestionService

router = APIRouter(prefix="/api/ingestion", tags=["Ingestion"])


def get_ingestion_service(db: Session = Depends(get_db)) -> IngestionService:
    return IngestionService(db)


@router.post("/run", response_model=IngestionRunResponse)
def run_ingestion(
    service: IngestionService = Depends(get_ingestion_service),
) -> IngestionRunResponse:
    """Run one ingestion cycle synchronously.

    Synchronous is fine without a job queue because the per-source cap bounds
    the work. A concurrent call (or an overlapping scheduler tick) returns
    ``status='skipped'`` via the advisory lock rather than running twice.
    """
    summary = service.run_cycle()
    return IngestionRunResponse(**asdict(summary))
