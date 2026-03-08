"""
Dynamic settings loader that selects dev/prod configuration based on DJANGO_ENV.
"""

from __future__ import annotations

import os

DJANGO_ENV = os.getenv("DJANGO_ENV", "dev").lower()

if DJANGO_ENV == "prod":
    from .prod import *  # noqa
elif DJANGO_ENV in {"test", "ci"}:
    from .dev import *  # noqa - reuse dev defaults for tests
else:
    from .dev import *  # noqa
