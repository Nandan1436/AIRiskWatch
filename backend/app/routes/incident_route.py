from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.incident_schema import (
    IncidentDetailResponse,
    IncidentListResponse,
    IncidentTrendResponse,
)
from app.services.incident_service import IncidentService

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])


def get_incident_service(db: Session = Depends(get_db)) -> IncidentService:
    return IncidentService(db)


@router.get("/", response_model=IncidentListResponse)
def list_incidents(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    search: str | None = None,
    risk_domain: str | None = None,
    risk_subdomain: str | None = None,
    causal_entity: str | None = None,
    timing: str | None = None,
    intent: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    incident_service: IncidentService = Depends(get_incident_service),
) -> IncidentListResponse:
    incidents, total = incident_service.list_incidents(
        limit=limit,
        offset=offset,
        search=search,
        risk_domain=risk_domain,
        risk_subdomain=risk_subdomain,
        causal_entity=causal_entity,
        timing=timing,
        intent=intent,
        date_from=date_from,
        date_to=date_to,
    )
    return IncidentListResponse(
        items=incidents, total=total, limit=limit, offset=offset
    )


@router.get("/trend", response_model=IncidentTrendResponse)
def get_incident_trend(
    risk_domain: str | None = None,
    risk_subdomain: str | None = None,
    causal_entity: str | None = None,
    timing: str | None = None,
    intent: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    incident_service: IncidentService = Depends(get_incident_service),
) -> IncidentTrendResponse:
    points = incident_service.get_trend(
        risk_domain=risk_domain,
        risk_subdomain=risk_subdomain,
        causal_entity=causal_entity,
        timing=timing,
        intent=intent,
        date_from=date_from,
        date_to=date_to,
    )
    return IncidentTrendResponse(
        items=[{"year": year, "count": count} for year, count in points]
    )


@router.get("/{incident_id}", response_model=IncidentDetailResponse)
def get_incident(
    incident_id: int,
    incident_service: IncidentService = Depends(get_incident_service),
) -> IncidentDetailResponse:
    incident = incident_service.get_incident(incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident
