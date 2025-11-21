"""
Production settings.
"""

from .base import *  # noqa

DEBUG = False

if SECRET_KEY == "insecure-change-me":
    raise ValueError("DJANGO_SECRET_KEY must be set in production.")

if not ALLOWED_HOSTS:
    raise ValueError("DJANGO_ALLOWED_HOSTS must be provided in production.")


# Security hardening
SECURE_SSL_REDIRECT = env_bool("DJANGO_SECURE_SSL_REDIRECT", True)
SESSION_COOKIE_SECURE = env_bool("DJANGO_SESSION_COOKIE_SECURE", True)
CSRF_COOKIE_SECURE = env_bool("DJANGO_CSRF_COOKIE_SECURE", True)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_HSTS_SECONDS = (
    env_int("DJANGO_SECURE_HSTS_SECONDS", 60 * 60 * 24 * 30) or 60 * 60 * 24 * 30
)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool("DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS", True)
SECURE_HSTS_PRELOAD = env_bool("DJANGO_SECURE_HSTS_PRELOAD", True)
SECURE_REFERRER_POLICY = os.getenv(
    "DJANGO_SECURE_REFERRER_POLICY", "strict-origin-when-cross-origin"
)

# Use console email backend only if explicitly requested in production.
if EMAIL_BACKEND == "django.core.mail.backends.console.EmailBackend":
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
