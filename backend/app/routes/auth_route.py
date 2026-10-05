from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.google_auth_client import GoogleAuthError, verify_google_id_token
from app.database import get_db
from app.models.user_model import User
from app.schemas.auth_schema import (
    AuthResponse,
    GoogleLoginRequest,
    LoginRequest,
    RegisterRequest,
)
from app.schemas.user_schema import UserResponse
from app.services.auth_service import AccountDisabledError, AuthError, AuthService
from app.services.user_service import UserConflictError

router = APIRouter(prefix="/api/auth", tags=["Auth"])


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(db)


def _auth_response(user: User) -> AuthResponse:
    return AuthResponse(
        access_token=AuthService.issue_token(user),
        user=UserResponse.model_validate(user),
    )


@router.post("/register", response_model=AuthResponse, status_code=201)
def register(
    request: RegisterRequest,
    service: AuthService = Depends(get_auth_service),
) -> AuthResponse:
    try:
        user = service.register(request.email, request.username, request.password)
    except UserConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return _auth_response(user)


@router.post("/login", response_model=AuthResponse)
def login(
    request: LoginRequest,
    service: AuthService = Depends(get_auth_service),
) -> AuthResponse:
    try:
        user = service.login(request.email, request.password)
    except AuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except AccountDisabledError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    return _auth_response(user)


@router.post("/google", response_model=AuthResponse)
def google_login(
    request: GoogleLoginRequest,
    service: AuthService = Depends(get_auth_service),
) -> AuthResponse:
    try:
        identity = verify_google_id_token(request.credential)
        user = service.login_with_google(identity)
    except (GoogleAuthError, AuthError) as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except AccountDisabledError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except UserConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return _auth_response(user)
