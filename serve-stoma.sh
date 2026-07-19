#!/usr/bin/env bash
set -euo pipefail

# Usage: ./serve-stoma.sh [port]
PORT="${1:-8000}"

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STOMA_DIR="$BASE_DIR/Stoma Appliance Scheme"

if [ ! -d "$STOMA_DIR" ]; then
  echo "Error: 'Stoma Appliance Scheme' directory not found at $STOMA_DIR" >&2
  exit 1
fi

PY=python3
if ! command -v "$PY" >/dev/null 2>&1; then
  PY=python
  if ! command -v "$PY" >/dev/null 2>&1; then
    echo "Error: no Python found. Install Python or use an alternative live server." >&2
    exit 1
  fi
fi

cd "$STOMA_DIR"
URL="http://localhost:$PORT/index.html"

echo "Serving $STOMA_DIR on $URL"

# Start server in background so we can open the browser, then wait so Ctrl+C stops it
"$PY" -m http.server "$PORT" >/dev/null 2>&1 &
PID=$!

trap 'kill "$PID" 2>/dev/null || true; exit' INT TERM

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL" >/dev/null 2>&1 || true
elif command -v gnome-open >/dev/null 2>&1; then
  gnome-open "$URL" >/dev/null 2>&1 || true
else
  echo "Open your browser to: $URL"
fi

echo "Server running (PID $PID). Press Ctrl+C to stop."
wait $PID
