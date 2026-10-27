#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
VENV_DIR="${VENV_DIR:-$ROOT_DIR/dominium-vm}"
PYTHON_BIN="${PYTHON_BIN:-python3}"

if [ -d "$VENV_DIR" ] && [ -f "$VENV_DIR/bin/activate" ]; then
    . "$VENV_DIR/bin/activate"
fi

"$PYTHON_BIN" "$ROOT_DIR/manage.py" send_seo_article_reminder
