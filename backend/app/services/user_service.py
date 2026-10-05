import re

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.user_model import User

_USERNAME_STRIP_RE = re.compile(r"[^A-Za-z0-9_.-]")


class UserConflictError(RuntimeError):
    pass


class UserService:
    def __init__(self, db: Session):
        self.db = db

    def get_user(self, user_id: int) -> User | None:
        return self.db.get(User, user_id)

    def get_by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(User.email == email.lower()))

    def username_taken(self, username: str, exclude_user_id: int | None = None) -> bool:
        query = select(User.id).where(func.lower(User.username) == username.lower())
        if exclude_user_id is not None:
            query = query.where(User.id != exclude_user_id)
        return self.db.scalar(query) is not None

    def available_username(self, seed: str) -> str:
        """Turn an email local part or display name into a free username."""
        base = _USERNAME_STRIP_RE.sub("", seed)[:24] or "user"
        if len(base) < 3:
            base = f"{base}user"
        candidate, suffix = base, 1
        while self.username_taken(candidate):
            suffix += 1
            candidate = f"{base}{suffix}"
        return candidate

    def update_profile(
        self,
        user: User,
        username: str | None = None,
        email_notifications: bool | None = None,
    ) -> User:
        if username is not None and username != user.username:
            if self.username_taken(username, exclude_user_id=user.id):
                raise UserConflictError("Username is already taken")
            user.username = username
        if email_notifications is not None:
            user.email_notifications = email_notifications
        self.commit_or_conflict()
        self.db.refresh(user)
        return user

    def commit_or_conflict(self) -> None:
        # The pre-checks above can race; the UNIQUE constraints are the real guard.
        try:
            self.db.commit()
        except IntegrityError as exc:
            self.db.rollback()
            raise UserConflictError("Email or username is already in use") from exc
