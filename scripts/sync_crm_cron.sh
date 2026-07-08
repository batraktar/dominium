#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
VENV_DIR="${VENV_DIR:-$ROOT_DIR/dominium-vm}"
PYTHON_BIN="${PYTHON_BIN:-python3}"
LOG_DIR="$ROOT_DIR/logs"
LOG_FILE="$LOG_DIR/crm_sync.log"

mkdir -p "$LOG_DIR"

if [ -d "$VENV_DIR" ] && [ -f "$VENV_DIR/bin/activate" ]; then
    . "$VENV_DIR/bin/activate"
fi

echo "=== CRM Sync $(date '+%Y-%m-%d %H:%M:%S') ===" >> "$LOG_FILE"
"$PYTHON_BIN" "$ROOT_DIR/manage.py" sync_crm_properties --verbosity=2 >> "$LOG_FILE" 2>&1
echo "=== Done ===" >> "$LOG_FILE"
