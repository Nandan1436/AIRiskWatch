import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.google_auth_client import GoogleIdentity
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user_model import User
from app.services.user_service import UserConflictError, UserService

logger = logging.getLogger(__name__)


class AuthError(RuntimeError):
    pass


class AccountDisabledError(RuntimeError):
    pass


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.users = UserService(db)

    def register(self, email: str, username: str, password: str) -> User:
        email = email.lower()
        if self.users.get_by_email(email) is not None:
            raise UserConflictError("Email is already registered")
        if self.users.username_taken(username):
            raise UserConflictError("Username is already taken")

        user = User(email=email, username=username, password_hash=hash_password(password))
        self.db.add(user)
        self.users.commit_or_conflict()
        self.db.refresh(user)
        logger.info("auth: registered user id=%d", user.id)
        return user

    def login(self, email: str, password: str) -> User:
        user = self.users.get_by_email(email)
        # One message for both cases, so the endpoint doesn't reveal which emails exist.
        if user is None or not verify_password(password, user.password_hash):
            raise AuthError("Incorrect email or password")
        self._ensure_active(user)
        return user

    def login_with_google(self, identity: GoogleIdentity) -> User:
        user = self.db.scalar(select(User).where(User.google_sub == identity.sub))
        if user is None:
            if not identity.email_verified:
                raise AuthError("Google account email is not verified")
            user = self.users.get_by_email(identity.email)
            if user is not None:
                # Same verified email: link Google to the existing password account.
                user.google_sub = identity.sub
            else:
                seed = identity.email.split("@", 1)[0]
                user = User(
                    email=identity.email,
                    username=self.users.available_username(seed),
                    google_sub=identity.sub,
                )
                self.db.add(user)
            self.users.commit_or_conflict()
            self.db.refresh(user)
            logger.info("auth: google sign-in linked to user id=%d", user.id)
        self._ensure_active(user)
        return user

    @staticmethod
    def issue_token(user: User) -> str:
        return create_access_token(user.id, user.role)

    @staticmethod
    def _ensure_active(user: User) -> None:
        if not user.is_active:
            raise AccountDisabledError("This account has been deactivated")
