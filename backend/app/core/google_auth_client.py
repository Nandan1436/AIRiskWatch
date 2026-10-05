from dataclasses import dataclass

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from app import config


class GoogleAuthError(RuntimeError):
    pass


@dataclass
class GoogleIdentity:
    sub: str
    email: str
    email_verified: bool
    name: str | None


def verify_google_id_token(credential: str) -> GoogleIdentity:
    """Verify the ID token from Google Identity Services against our client ID."""
    if not config.GOOGLE_CLIENT_ID:
        raise GoogleAuthError("Google sign-in is not configured")
    try:
        claims = id_token.verify_oauth2_token(
            credential, google_requests.Request(), config.GOOGLE_CLIENT_ID
        )
    except ValueError as exc:
        raise GoogleAuthError("Invalid Google credential") from exc

    email = claims.get("email")
    if not email:
        raise GoogleAuthError("Google account has no email address")
    return GoogleIdentity(
        sub=claims["sub"],
        email=email.lower(),
        email_verified=bool(claims.get("email_verified")),
        name=claims.get("name"),
    )
