"""
Base Django settings shared across environments.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Iterable, List
from urllib.parse import urlparse

BASE_DIR = Path(__file__).resolve().parent.parent.parent


def _load_env_file(path: Path) -> None:
    """Populate os.environ from a simple KEY=VALUE .env file if present."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line or line.strip().startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


_load_env_file(BASE_DIR / ".env")


def env_list(
    name: str, default: Iterable[str] | None = None, separator: str = ","
) -> List[str]:
    value = os.getenv(name)
    if not value:
        return list(default) if default is not None else []
    return [item.strip() for item in value.split(separator) if item.strip()]


def env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_int(name: str, default: int | None = None) -> int | None:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _normalize_origin(value: str) -> str:
    raw = str(value or "").strip()
    if not raw:
        return ""
    if "://" not in raw:
        raw = f"http://{raw}"
    parsed = urlparse(raw)
    if not parsed.scheme or not parsed.netloc:
        return ""
    return f"{parsed.scheme}://{parsed.netloc}"


def _append_csp_values(policy: str, directive: str, values: list[str]) -> str:
    clean_values = [value for value in values if value]
    if not clean_values:
        return policy

    directives = [item.strip() for item in str(policy or "").split(";") if item.strip()]
    updated: list[str] = []
    found = False

    for item in directives:
        parts = item.split()
        if not parts:
            continue

        name = parts[0]
        current_values = parts[1:]
        if name == directive:
            found = True
            for value in clean_values:
                if value not in current_values:
                    current_values.append(value)
            updated.append(" ".join([name, *current_values]))
        else:
            updated.append(" ".join(parts))

    if not found:
        updated.append(" ".join([directive, *clean_values]))

    return "; ".join(updated) + ";"


def _remove_csp_values(policy: str, directive: str, values: list[str]) -> str:
    values_to_remove = {value for value in values if value}
    if not values_to_remove:
        return policy

    directives = [item.strip() for item in str(policy or "").split(";") if item.strip()]
    updated: list[str] = []

    for item in directives:
        parts = item.split()
        if not parts:
            continue

        name = parts[0]
        current_values = parts[1:]
        if name == directive:
            filtered_values = [
                value for value in current_values if value not in values_to_remove
            ]
            updated.append(" ".join([name, *filtered_values]).strip())
        else:
            updated.append(" ".join(parts))

    return "; ".join([item for item in updated if item]) + ";"


LOGS_DIR = BASE_DIR / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE_PATH = LOGS_DIR / os.getenv("DJANGO_LOG_FILE", "dominium.log.jsonl")
LOG_MAX_BYTES = env_int("DJANGO_LOG_MAX_BYTES", 5 * 1024 * 1024) or 5 * 1024 * 1024
LOG_BACKUPS = env_int("DJANGO_LOG_BACKUPS", 5) or 5


SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "insecure-change-me")
DEBUG = env_bool("DJANGO_DEBUG", default=False)

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", default=["127.0.0.1", "localhost"])
CSRF_TRUSTED_ORIGINS = env_list("DJANGO_CSRF_TRUSTED_ORIGINS")
TRUST_X_FORWARDED_FOR = env_bool("DJANGO_TRUST_X_FORWARDED_FOR", False)
TRUSTED_PROXY_IPS = env_list("DJANGO_TRUSTED_PROXY_IPS")

REACT_SPA_DEV_SERVER_URL = os.getenv("REACT_SPA_DEV_SERVER_URL", "").rstrip("/")
REACT_SPA_ENTRY = os.getenv("REACT_SPA_ENTRY", "index.html")
REACT_SPA_MANIFEST_PATH = os.getenv(
    "REACT_SPA_MANIFEST_PATH",
    str(BASE_DIR / "frontend-react" / "dist" / ".vite" / "manifest.json"),
)
SEO_CANONICAL_HOST = os.getenv("SEO_CANONICAL_HOST", "").strip()
SEO_CANONICAL_SCHEME = os.getenv("SEO_CANONICAL_SCHEME", "").strip().lower()


INSTALLED_APPS = [
    "accounts",
    "house",
    "dominium_backend",
    "phonenumber_field",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    "django.contrib.sitemaps",
    "rest_framework",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
]


MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "dominium_backend.middleware.ContentSecurityPolicyMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "allauth.account.middleware.AccountMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "dominium_backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "accounts.context_processors.liked_properties",
                "accounts.context_processors.auth_modal_state",
            ],
        },
    },
]

WSGI_APPLICATION = "dominium_backend.wsgi.application"
ASGI_APPLICATION = "dominium_backend.asgi.application"


default_db_engine = os.getenv("DJANGO_DB_ENGINE", "django.db.backends.sqlite3")

DATABASES = {
    "default": {
        "ENGINE": default_db_engine,
    }
}

if default_db_engine == "django.db.backends.sqlite3":
    DATABASES["default"]["NAME"] = os.getenv(
        "DJANGO_DB_NAME", str(BASE_DIR / "db.sqlite3")
    )
else:
    DATABASES["default"].update(
        {
            "NAME": os.getenv("DJANGO_DB_NAME"),
            "USER": os.getenv("DJANGO_DB_USER", ""),
            "PASSWORD": os.getenv("DJANGO_DB_PASSWORD", ""),
            "HOST": os.getenv("DJANGO_DB_HOST", "localhost"),
            "PORT": os.getenv("DJANGO_DB_PORT", ""),
            "OPTIONS": {},
        }
    )
    db_options = os.getenv("DJANGO_DB_OPTIONS")
    if db_options:
        DATABASES["default"]["OPTIONS"] = {
            opt.split("=")[0]: opt.split("=")[1]
            for opt in db_options.split(",")
            if "=" in opt
        }


AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    },
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


LANGUAGE_CODE = os.getenv("DJANGO_LANGUAGE_CODE", "uk-ua")
TIME_ZONE = os.getenv("DJANGO_TIME_ZONE", "UTC")
USE_I18N = True
USE_TZ = True


STATIC_URL = "/static/"
STATICFILES_DIRS = [BASE_DIR / "static"]
FRONTEND_DIST_DIR = BASE_DIR / "frontend-react" / "dist"
if FRONTEND_DIST_DIR.exists():
    STATICFILES_DIRS.append(FRONTEND_DIST_DIR)
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"


DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.CustomUser"
SITE_ID = env_int("DJANGO_SITE_ID", 3)

LOGIN_REDIRECT_URL = "/"
ACCOUNT_LOGOUT_REDIRECT_URL = "/"
LOGIN_URL = "/login/"

CACHE_BACKEND = os.getenv(
    "DJANGO_CACHE_BACKEND", "django.core.cache.backends.locmem.LocMemCache"
)
CACHE_LOCATION = os.getenv("DJANGO_CACHE_LOCATION", "dominium-cache")
CACHES = {
    "default": {
        "BACKEND": CACHE_BACKEND,
        "LOCATION": CACHE_LOCATION,
        "TIMEOUT": env_int("DJANGO_CACHE_TIMEOUT", 60 * 5) or 60 * 5,
    }
}


EMAIL_BACKEND = os.getenv(
    "DJANGO_EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend"
)
EMAIL_HOST = os.getenv("DJANGO_EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = env_int("DJANGO_EMAIL_PORT", 587) or 587
EMAIL_USE_TLS = env_bool("DJANGO_EMAIL_USE_TLS", True)
EMAIL_USE_SSL = env_bool("DJANGO_EMAIL_USE_SSL", False)
EMAIL_HOST_USER = os.getenv("DJANGO_EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("DJANGO_EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.getenv(
    "DJANGO_DEFAULT_FROM_EMAIL", EMAIL_HOST_USER or "webmaster@localhost"
)


AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]

ACCOUNT_EMAIL_VERIFICATION = os.getenv("DJANGO_ACCOUNT_EMAIL_VERIFICATION", "optional")
ACCOUNT_LOGIN_METHODS = {"username", "email"}
ACCOUNT_SIGNUP_FIELDS = ["email", "username*", "password1*", "password2*"]
ACCOUNT_PREVENT_ENUMERATION = env_bool("DJANGO_ACCOUNT_PREVENT_ENUMERATION", True)
SOCIALACCOUNT_LOGIN_ON_GET = env_bool("DJANGO_SOCIALACCOUNT_LOGIN_ON_GET", True)
SOCIALACCOUNT_AUTO_SIGNUP = env_bool("DJANGO_SOCIALACCOUNT_AUTO_SIGNUP", True)
SOCIALACCOUNT_ADAPTER = "accounts.adapters.CustomSocialAccountAdapter"


GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")

SOCIALACCOUNT_PROVIDERS = {
    "google": {
        "SCOPE": ["profile", "email"],
        "AUTH_PARAMS": {"access_type": "offline"},
    }
}


TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_IDS = []
raw_chat_ids = env_list("TELEGRAM_CHAT_IDS")
for item in raw_chat_ids:
    try:
        TELEGRAM_CHAT_IDS.append(int(item))
    except ValueError:
        TELEGRAM_CHAT_IDS.append(item)


# Default timeout (seconds) for outbound HTTP requests made by the project.
REQUESTS_TIMEOUT = env_int("REQUESTS_TIMEOUT", 10) or 10
IMPORT_ALLOWED_HOSTS = env_list("IMPORT_ALLOWED_HOSTS")
IMPORT_ALLOWED_IMAGE_HOSTS = env_list("IMPORT_ALLOWED_IMAGE_HOSTS")
IMPORT_REQUIRE_ALLOWED_HOSTS = env_bool(
    "IMPORT_REQUIRE_ALLOWED_HOSTS",
    default=os.getenv("DJANGO_ENV", "dev").lower() == "prod",
)
IMPORT_ALLOW_PRIVATE_HOSTS = env_bool("IMPORT_ALLOW_PRIVATE_HOSTS", False)
IMPORT_MAX_HTML_BYTES = env_int("IMPORT_MAX_HTML_BYTES", 2 * 1024 * 1024) or (
    2 * 1024 * 1024
)
IMPORT_MAX_IMAGE_BYTES = env_int("IMPORT_MAX_IMAGE_BYTES", 12 * 1024 * 1024) or (
    12 * 1024 * 1024
)
IMPORT_HTTP_REDIRECT_LIMIT = env_int("IMPORT_HTTP_REDIRECT_LIMIT", 3) or 3
IMPORT_IMAGE_PHASH_THRESHOLD = env_int("IMPORT_IMAGE_PHASH_THRESHOLD", 4) or 4
EXCHANGE_RATES_URL = os.getenv(
    "EXCHANGE_RATES_URL",
    "https://api.privatbank.ua/p24api/pubinfo?exchange&json&coursid=11",
)
EXCHANGE_RATES_CACHE_SECONDS = (
    env_int("EXCHANGE_RATES_CACHE_SECONDS", 60 * 30) or 60 * 30
)

CONSULTATION_RATE_LIMIT = env_int("CONSULTATION_RATE_LIMIT", 5) or 5
CONSULTATION_RATE_WINDOW = env_int("CONSULTATION_RATE_WINDOW", 600) or 600
IMPORT_RATE_LIMIT = env_int("IMPORT_RATE_LIMIT", 5) or 5
IMPORT_RATE_WINDOW = env_int("IMPORT_RATE_WINDOW", 60) or 60
LOGIN_RATE_LIMIT = env_int("LOGIN_RATE_LIMIT", 8) or 8
LOGIN_RATE_WINDOW = env_int("LOGIN_RATE_WINDOW", 300) or 300
ADMIN_IMAGE_UPLOAD_MAX_FILES = env_int("ADMIN_IMAGE_UPLOAD_MAX_FILES", 20) or 20
ADMIN_IMAGE_MAX_BYTES = env_int("ADMIN_IMAGE_MAX_BYTES", 8 * 1024 * 1024) or (
    8 * 1024 * 1024
)
HOME_CACHE_SECONDS = env_int("HOME_CACHE_SECONDS", 60 * 5) or 60 * 5
SEARCH_CACHE_SECONDS = env_int("SEARCH_CACHE_SECONDS", 60) or 60
ALLOW_MANUAL_AUTH = env_bool("DJANGO_ALLOW_MANUAL_AUTH", False)

REALTSOFT_CRM_URL = os.getenv("REALTSOFT_CRM_URL", "").strip()
REALTSOFT_API_KEY = os.getenv("REALTSOFT_API_KEY", "").strip()
REALTSOFT_SECRET_KEY = os.getenv("REALTSOFT_SECRET_KEY", "").strip()
REALTSOFT_SYNC_ENABLED = env_bool("REALTSOFT_SYNC_ENABLED", False)
REALTSOFT_DEFAULT_PER_PAGE = env_int("REALTSOFT_DEFAULT_PER_PAGE", 150) or 150


SANITIZE_ALLOWED_TAGS = env_list(
    "DJANGO_SANITIZE_ALLOWED_TAGS",
    default=[
        "p",
        "br",
        "b",
        "strong",
        "i",
        "em",
        "u",
        "ul",
        "ol",
        "li",
        "a",
    ],
)
SANITIZE_ALLOWED_SCHEMES = env_list(
    "DJANGO_SANITIZE_ALLOWED_SCHEMES",
    default=["http", "https", "mailto", "tel"],
)
SANITIZE_CLEAN_CONTENT_TAGS = env_list(
    "DJANGO_SANITIZE_CLEAN_CONTENT_TAGS",
    default=["script", "style", "iframe", "object", "embed"],
)
SANITIZE_ALLOWED_ATTRIBUTES = {
    "a": {"href", "title", "target"},
}

PERMISSIONS_POLICY = os.getenv(
    "DJANGO_PERMISSIONS_POLICY",
    "camera=(), microphone=(), payment=(), usb=(), geolocation=(), fullscreen=(), clipboard-write=(self), web-share=(self)",
).strip()
CROSS_ORIGIN_RESOURCE_POLICY = os.getenv(
    "DJANGO_CROSS_ORIGIN_RESOURCE_POLICY", "same-site"
).strip()
X_PERMITTED_CROSS_DOMAIN_POLICIES = os.getenv(
    "DJANGO_X_PERMITTED_CROSS_DOMAIN_POLICIES", "none"
).strip()
ORIGIN_AGENT_CLUSTER = os.getenv("DJANGO_ORIGIN_AGENT_CLUSTER", "?1").strip()

CONTENT_SECURITY_POLICY = os.getenv(
    "DJANGO_CONTENT_SECURITY_POLICY",
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline' 'nonce-{nonce}' https://cdn.jsdelivr.net https://cdn.tailwindcss.com; "
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; "
    "img-src 'self' data: https:; "
    "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net; "
    "connect-src 'self'; "
    "frame-src 'none'; "
    "object-src 'none'; "
    "base-uri 'self'; "
    "form-action 'self'; "
    "frame-ancestors 'self';",
)
CSP_STRICT_REPORT_ONLY = env_bool("DJANGO_CSP_STRICT_REPORT_ONLY", True)
CSP_REPORT_URI = os.getenv("DJANGO_CSP_REPORT_URI", "/_csp/report/").strip()
CSP_REPORT_RATE_LIMIT = env_int("DJANGO_CSP_REPORT_RATE_LIMIT", 120) or 120
CSP_REPORT_RATE_WINDOW = env_int("DJANGO_CSP_REPORT_RATE_WINDOW", 60) or 60

raw_report_only_policy = os.getenv(
    "DJANGO_CONTENT_SECURITY_POLICY_REPORT_ONLY", ""
).strip()
if raw_report_only_policy:
    CONTENT_SECURITY_POLICY_REPORT_ONLY = raw_report_only_policy
elif CSP_STRICT_REPORT_ONLY:
    strict_report_policy = _remove_csp_values(
        CONTENT_SECURITY_POLICY,
        "script-src",
        ["'unsafe-inline'"],
    )
    strict_report_policy = _append_csp_values(
        strict_report_policy,
        "script-src",
        ["'nonce-{nonce}'"],
    )
    if CSP_REPORT_URI:
        strict_report_policy = _append_csp_values(
            strict_report_policy,
            "report-uri",
            [CSP_REPORT_URI],
        )
    CONTENT_SECURITY_POLICY_REPORT_ONLY = strict_report_policy
else:
    CONTENT_SECURITY_POLICY_REPORT_ONLY = ""

react_dev_origin = _normalize_origin(REACT_SPA_DEV_SERVER_URL)
if DEBUG and react_dev_origin:
    if react_dev_origin not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(react_dev_origin)

    parsed_react_dev = urlparse(react_dev_origin)
    ws_scheme = "wss" if parsed_react_dev.scheme == "https" else "ws"
    ws_origin = f"{ws_scheme}://{parsed_react_dev.netloc}"

    CONTENT_SECURITY_POLICY = _append_csp_values(
        CONTENT_SECURITY_POLICY,
        "script-src",
        [react_dev_origin],
    )
    CONTENT_SECURITY_POLICY = _append_csp_values(
        CONTENT_SECURITY_POLICY,
        "style-src",
        [react_dev_origin],
    )
    CONTENT_SECURITY_POLICY = _append_csp_values(
        CONTENT_SECURITY_POLICY,
        "connect-src",
        [react_dev_origin, ws_origin],
    )
    if CONTENT_SECURITY_POLICY_REPORT_ONLY:
        CONTENT_SECURITY_POLICY_REPORT_ONLY = _append_csp_values(
            CONTENT_SECURITY_POLICY_REPORT_ONLY,
            "script-src",
            [react_dev_origin],
        )
        CONTENT_SECURITY_POLICY_REPORT_ONLY = _append_csp_values(
            CONTENT_SECURITY_POLICY_REPORT_ONLY,
            "style-src",
            [react_dev_origin],
        )
        CONTENT_SECURITY_POLICY_REPORT_ONLY = _append_csp_values(
            CONTENT_SECURITY_POLICY_REPORT_ONLY,
            "connect-src",
            [react_dev_origin, ws_origin],
        )


REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework.authentication.SessionAuthentication",
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ),
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": os.getenv("DJANGO_DRF_ANON_THROTTLE", "60/min"),
        "user": os.getenv("DJANGO_DRF_USER_THROTTLE", "240/min"),
    },
}


LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "console": {
            "format": "[%(asctime)s] %(levelname)s %(name)s: %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
        "json": {
            "()": "dominium_backend.logging_utils.JSONFormatter",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "console",
        },
        "file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": str(LOG_FILE_PATH),
            "maxBytes": LOG_MAX_BYTES,
            "backupCount": LOG_BACKUPS,
            "encoding": "utf-8",
            "formatter": "json",
        },
    },
    "root": {
        "handlers": ["console", "file"],
        "level": os.getenv("DJANGO_LOG_LEVEL", "INFO"),
    },
}
