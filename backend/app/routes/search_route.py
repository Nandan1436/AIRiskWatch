from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.llm_client import LlmClientError, create_llm_client
from app.database import get_db
from app.schemas.search_schema import SearchRequest, SearchResponse
from app.services.search_service import SearchError, SearchService

router = APIRouter(prefix="/api/search", tags=["Search"])


def get_search_service(db: Session = Depends(get_db)) -> SearchService:
    try:
        client = create_llm_client(interactive=True)
    except LlmClientError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return SearchService(db, client)


@router.post("", response_model=SearchResponse)
def search_incidents(
    request: SearchRequest,
    service: SearchService = Depends(get_search_service),
) -> SearchResponse:
    try:
        summary, results = service.search(request.query, request.top_k)
    except SearchError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return SearchResponse(summary=summary, results=results)
