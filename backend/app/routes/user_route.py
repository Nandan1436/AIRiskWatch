from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user_model import User
from app.routes.auth_dependencies import get_current_user
from app.schemas.user_schema import UserResponse, UserUpdateRequest
from app.services.user_service import UserConflictError, UserService

router = APIRouter(prefix="/api/users", tags=["Users"])


def get_user_service(db: Session = Depends(get_db)) -> UserService:
    return UserService(db)


@router.get("/me", response_model=UserResponse)
def get_me(user: User = Depends(get_current_user)) -> User:
    return user


@router.patch("/me", response_model=UserResponse)
def update_me(
    request: UserUpdateRequest,
    user: User = Depends(get_current_user),
    service: UserService = Depends(get_user_service),
) -> User:
    try:
        return service.update_profile(
            user,
            username=request.username,
            email_notifications=request.email_notifications,
        )
    except UserConflictError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
