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
    summary = service.run_cycle()
    return IngestionRunResponse(**asdict(summary))
