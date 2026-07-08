#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
FRONTEND_DIR="$ROOT_DIR/frontend-react"
VENV_DIR="${VENV_DIR:-$ROOT_DIR/dominium-vm}"
PYTHON_BIN="${PYTHON_BIN:-python3}"
BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_HOST="${FRONTEND_HOST:-127.0.0.1}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
BACKEND_URL="http://${BACKEND_HOST}:${BACKEND_PORT}"
FRONTEND_URL="http://${FRONTEND_HOST}:${FRONTEND_PORT}"

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "Python interpreter not found: $PYTHON_BIN" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required to run the React frontend." >&2
  exit 1
fi

if [ ! -d "$FRONTEND_DIR" ]; then
  echo "React frontend directory not found: $FRONTEND_DIR" >&2
  exit 1
fi

if [ ! -d "$VENV_DIR" ]; then
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

# shellcheck disable=SC1091
. "$VENV_DIR/bin/activate"

if ! python -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)" >/dev/null 2>&1; then
  echo "Virtualenv at $VENV_DIR uses Python older than 3.10. Recreate it with python3.10+." >&2
  exit 1
fi

if ! python -c "import django" >/dev/null 2>&1; then
  pip install -r "$ROOT_DIR/requirements.dev.txt"
fi

if [ ! -f "$ROOT_DIR/.env" ] && [ -f "$ROOT_DIR/.env.example" ]; then
  cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
fi

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  (cd "$FRONTEND_DIR" && npm install)
fi

cd "$ROOT_DIR"
python manage.py migrate

check_port_available() {
  python - "$1" "$2" <<'PY'
import socket
import sys

host = sys.argv[1]
port = int(sys.argv[2])

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
try:
    sock.bind((host, port))
except OSError:
    raise SystemExit(1)
finally:
    sock.close()
PY
}

if ! check_port_available "$BACKEND_HOST" "$BACKEND_PORT"; then
  echo "Backend port ${BACKEND_PORT} is already in use. Stop the existing process or set BACKEND_PORT." >&2
  exit 1
fi

if ! check_port_available "$FRONTEND_HOST" "$FRONTEND_PORT"; then
  echo "Frontend port ${FRONTEND_PORT} is already in use. Stop the existing process or set FRONTEND_PORT." >&2
  exit 1
fi

cleanup() {
  status=$?
  trap - INT TERM EXIT
  if [ "${DJANGO_PID:-}" ]; then
    kill "$DJANGO_PID" 2>/dev/null || true
  fi
  if [ "${VITE_PID:-}" ]; then
    kill "$VITE_PID" 2>/dev/null || true
  fi
  wait 2>/dev/null || true
  exit "$status"
}

trap cleanup INT TERM EXIT

REACT_SPA_DEV_SERVER_URL="$FRONTEND_URL" \
python manage.py runserver "${BACKEND_HOST}:${BACKEND_PORT}" &
DJANGO_PID=$!

(
  cd "$FRONTEND_DIR"
  VITE_BACKEND_URL="$BACKEND_URL" \
  npm run dev -- --host "$FRONTEND_HOST" --port "$FRONTEND_PORT" --strictPort
) &
VITE_PID=$!

echo "Backend:  $BACKEND_URL"
echo "Frontend: $FRONTEND_URL"

wait "$DJANGO_PID" "$VITE_PID"
