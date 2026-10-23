from dataclasses import dataclass

from django.conf import settings
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2 import id_token


class GoogleIdentityError(Exception):
    pass


@dataclass(frozen=True, slots=True)
class GoogleIdentity:
    subject: str
    email: str
    full_name: str = ""


def get_google_client_id() -> str:
    client_id = str(getattr(settings, "GOOGLE_CLIENT_ID", "") or "").strip()
    if client_id and client_id != "your-google-id":
        return client_id

    from allauth.socialaccount.models import SocialApp

    app = SocialApp.objects.filter(provider="google").order_by("pk").first()
    return str(app.client_id or "").strip() if app else ""


def verify_google_identity(credential: str) -> GoogleIdentity:
    client_id = get_google_client_id()
    token = str(credential or "").strip()
    if not client_id or not token:
        raise GoogleIdentityError("Google identity is not configured or missing.")

    try:
        claims = id_token.verify_oauth2_token(
            token,
            GoogleRequest(),
            audience=client_id,
        )
    except (ValueError, TypeError) as exc:
        raise GoogleIdentityError("Google credential verification failed.") from exc

    subject = str(claims.get("sub") or "").strip()
    email = str(claims.get("email") or "").strip().lower()
    if not subject or not email or claims.get("email_verified") is not True:
        raise GoogleIdentityError("Google email is not verified.")

    full_name = str(claims.get("name") or "").strip()
    return GoogleIdentity(subject=subject, email=email, full_name=full_name)
