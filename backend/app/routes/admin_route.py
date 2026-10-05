from datetime import date

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Response
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.core import email_client

from app.database import get_db
from app.models.report_model import Report
from app.models.user_model import User
from app.routes.auth_dependencies import require_admin
from app.schemas.admin_schema import (
    AdminReportDetailResponse,
    AdminReportListResponse,
    AdminReportResponse,
    AdminUserListResponse,
    AdminUserUpdateRequest,
    IncidentCreateRequest,
    IncidentUpdateRequest,
    ReportCreateRequest,
    ReportUpdateRequest,
)
from app.schemas.digest_schema import (
    DigestDeliveryStatusResponse,
    DigestSendRequest,
    DigestSendResponse,
)
from app.schemas.incident_schema import IncidentDetailResponse
from app.schemas.user_schema import UserResponse
from app.services.admin_service import AdminError, AdminService, IdAllocationBusyError
from app.services.digest_email_service import (
    delivery_status,
    render_digest_email,
    run_digest_job,
    send_monthly_digest,
)
from app.services.digest_service import DigestService, parse_month, previous_month

# Every route here is admin-only; require_admin runs before each handler.
router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"],
    dependencies=[Depends(require_admin)],
)


def get_admin_service(db: Session = Depends(get_db)) -> AdminService:
    return AdminService(db)


def _report_response(report: Report, detail: bool = False) -> AdminReportResponse:
    schema = AdminReportDetailResponse if detail else AdminReportResponse
    return schema.model_validate(
        {
            **{key: getattr(report, key) for key in schema.model_fields if key != "incident_ids"},
            "incident_ids": sorted(incident.incident_id for incident in report.incidents),
        }
    )


# --- users ---------------------------------------------------------------


@router.get("/users", response_model=AdminUserListResponse)
def list_users(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    search: str | None = None,
    service: AdminService = Depends(get_admin_service),
) -> AdminUserListResponse:
    users, total = service.list_users(limit=limit, offset=offset, search=search)
    return AdminUserListResponse(
        items=[UserResponse.model_validate(user) for user in users],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    request: AdminUserUpdateRequest,
    actor: User = Depends(require_admin),
    service: AdminService = Depends(get_admin_service),
) -> User:
    try:
        user = service.update_user(actor, user_id, role=request.role, is_active=request.is_active)
    except AdminError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# --- incidents -----------------------------------------------------------


@router.post("/incidents", response_model=IncidentDetailResponse, status_code=201)
def create_incident(
    request: IncidentCreateRequest,
    service: AdminService = Depends(get_admin_service),
):
    try:
        return service.create_incident(request.model_dump())
    except IdAllocationBusyError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.patch("/incidents/{incident_id}", response_model=IncidentDetailResponse)
def update_incident(
    incident_id: int,
    request: IncidentUpdateRequest,
    service: AdminService = Depends(get_admin_service),
):
    incident = service.update_incident(incident_id, request.model_dump(exclude_unset=True))
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.delete("/incidents/{incident_id}", status_code=204)
def delete_incident(
    incident_id: int,
    service: AdminService = Depends(get_admin_service),
) -> Response:
    if not service.delete_incident(incident_id):
        raise HTTPException(status_code=404, detail="Incident not found")
    return Response(status_code=204)


# --- reports -------------------------------------------------------------


@router.get("/reports", response_model=AdminReportListResponse)
def list_reports(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    search: str | None = None,
    service: AdminService = Depends(get_admin_service),
) -> AdminReportListResponse:
    reports, total = service.list_reports(limit=limit, offset=offset, search=search)
    return AdminReportListResponse(
        items=[_report_response(report) for report in reports],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/reports/{report_number}", response_model=AdminReportDetailResponse)
def get_report(
    report_number: int,
    service: AdminService = Depends(get_admin_service),
) -> AdminReportResponse:
    report = service.get_report(report_number)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return _report_response(report, detail=True)


@router.post("/reports", response_model=AdminReportDetailResponse, status_code=201)
def create_report(
    request: ReportCreateRequest,
    service: AdminService = Depends(get_admin_service),
) -> AdminReportResponse:
    try:
        report = service.create_report(request.model_dump())
    except AdminError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except IdAllocationBusyError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return _report_response(report, detail=True)


@router.patch("/reports/{report_number}", response_model=AdminReportDetailResponse)
def update_report(
    report_number: int,
    request: ReportUpdateRequest,
    service: AdminService = Depends(get_admin_service),
) -> AdminReportResponse:
    try:
        report = service.update_report(report_number, request.model_dump(exclude_unset=True))
    except AdminError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return _report_response(report, detail=True)


@router.delete("/reports/{report_number}", status_code=204)
def delete_report(
    report_number: int,
    service: AdminService = Depends(get_admin_service),
) -> Response:
    if not service.delete_report(report_number):
        raise HTTPException(status_code=404, detail="Report not found")
    return Response(status_code=204)


# --- monthly digest ------------------------------------------------------


def _digest_month(db: Session, month: str | None) -> date:
    if month is None:
        return previous_month()
    try:
        parsed = parse_month(month)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="month must be YYYY-MM") from exc
    if not DigestService(db).in_window(parsed):
        raise HTTPException(status_code=400, detail="Digest month not available")
    return parsed


@router.get("/digest/preview", response_class=HTMLResponse)
def preview_digest(
    month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$"),
    db: Session = Depends(get_db),
) -> HTMLResponse:
    digest_month = _digest_month(db, month)
    email = render_digest_email(DigestService(db).get_month(digest_month))
    return HTMLResponse(email.html)


@router.get("/digest/status", response_model=DigestDeliveryStatusResponse)
def digest_status(
    month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$"),
    db: Session = Depends(get_db),
) -> DigestDeliveryStatusResponse:
    return delivery_status(db, _digest_month(db, month))


# A test send runs inline so SMTP errors surface immediately; the full send
# runs in the background and its progress shows up in /digest/status.
@router.post("/digest/send", response_model=DigestSendResponse, status_code=202)
def send_digest(
    request: DigestSendRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> DigestSendResponse:
    if not email_client.is_configured():
        raise HTTPException(status_code=503, detail="Email sending is not configured (SMTP_HOST)")
    digest_month = _digest_month(db, request.month)
    if request.test_to:
        try:
            send_monthly_digest(db, digest_month, test_to=request.test_to)
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Test email failed: {exc}") from exc
    else:
        background_tasks.add_task(run_digest_job, digest_month)
    return DigestSendResponse(month=digest_month, test_to=request.test_to)
