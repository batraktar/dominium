"""
Base Django settings shared across environments.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Iterable, List

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


LOGS_DIR = BASE_DIR / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)
LOG_FILE_PATH = LOGS_DIR / os.getenv("DJANGO_LOG_FILE", "dominium.log.jsonl")
LOG_MAX_BYTES = env_int("DJANGO_LOG_MAX_BYTES", 5 * 1024 * 1024) or 5 * 1024 * 1024
LOG_BACKUPS = env_int("DJANGO_LOG_BACKUPS", 5) or 5


SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "insecure-change-me")
DEBUG = env_bool("DJANGO_DEBUG", default=False)

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", default=["127.0.0.1", "localhost"])
CSRF_TRUSTED_ORIGINS = env_list("DJANGO_CSRF_TRUSTED_ORIGINS")


INSTALLED_APPS = [
    "accounts",
    "house",
    "landing_doominium_real_state",
    "phonenumber_field",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    "django.contrib.sitemaps",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
]


MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "allauth.account.middleware.AccountMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "landing_doominium_real_state.urls"

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

WSGI_APPLICATION = "landing_doominium_real_state.wsgi.application"
ASGI_APPLICATION = "landing_doominium_real_state.asgi.application"


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
HOME_CACHE_SECONDS = env_int("HOME_CACHE_SECONDS", 60 * 5) or 60 * 5
SEARCH_CACHE_SECONDS = env_int("SEARCH_CACHE_SECONDS", 60) or 60
ALLOW_MANUAL_AUTH = env_bool("DJANGO_ALLOW_MANUAL_AUTH", False)


LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "console": {
            "format": "[%(asctime)s] %(levelname)s %(name)s: %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
        "json": {
            "()": "landing_doominium_real_state.logging_utils.JSONFormatter",
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
