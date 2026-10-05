from dataclasses import asdict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.routes.auth_dependencies import require_admin
from app.schemas.ingestion_schema import IngestionRunResponse
from app.services.ingestion_service import IngestionService

router = APIRouter(prefix="/api/ingestion", tags=["Ingestion"])


def get_ingestion_service(db: Session = Depends(get_db)) -> IngestionService:
    return IngestionService(db)


# Admin-only: a run spends LLM quota and writes incidents. The CLI and the
# scheduler call the service directly and are unaffected.
@router.post(
    "/run",
    response_model=IngestionRunResponse,
    dependencies=[Depends(require_admin)],
)
def run_ingestion(
    service: IngestionService = Depends(get_ingestion_service),
) -> IngestionRunResponse:
    summary = service.run_cycle()
    return IngestionRunResponse(**asdict(summary))
