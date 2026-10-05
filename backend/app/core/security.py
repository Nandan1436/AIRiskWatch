import logging
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app import config

logger = logging.getLogger(__name__)

# bcrypt only hashes the first 72 bytes; request schemas reject longer passwords.
BCRYPT_MAX_BYTES = 72

_secret = config.JWT_SECRET
if not _secret:
    _secret = secrets.token_urlsafe(32)
    logger.warning("JWT_SECRET is not set; using a random secret, tokens reset on restart")


class InvalidTokenError(RuntimeError):
    pass


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(user_id: int, role: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "role": role,
        "iat": now,
        "exp": now + timedelta(minutes=config.JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, _secret, algorithm=config.JWT_ALGORITHM)


def decode_access_token(token: str) -> int:
    """Return the user id in a valid token, or raise InvalidTokenError."""
    try:
        payload = jwt.decode(token, _secret, algorithms=[config.JWT_ALGORITHM])
        return int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError) as exc:
        raise InvalidTokenError("Invalid or expired token") from exc
