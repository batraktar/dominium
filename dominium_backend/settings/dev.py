"""
Development settings.
"""

from .base import *  # noqa

DEBUG = True
ALLOWED_HOSTS = ALLOWED_HOSTS or ["127.0.0.1", "localhost"]

# Helpful defaults for local development
EMAIL_BACKEND = EMAIL_BACKEND or "django.core.mail.backends.console.EmailBackend"

INSTALLED_APPS += [
    "django.contrib.humanize",
]


INTERNAL_IPS = ["127.0.0.1"]
