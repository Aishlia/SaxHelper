#!/usr/bin/env bash
# Start the Sax Sheet Reader on http://localhost:8765
set -euo pipefail

cd "$(dirname "$0")"
PORT="${PORT:-8765}"

if [ ! -x .venv/bin/python ]; then
  echo "Creating the virtual environment (Python 3.12)…"
  if command -v uv >/dev/null 2>&1; then
    uv venv --python 3.12 .venv
    uv pip install --python .venv/bin/python -r requirements.txt
  else
    python3 -m venv .venv
    .venv/bin/pip install --upgrade pip
    .venv/bin/pip install -r requirements.txt
  fi
fi

echo "Sax Sheet Reader → http://localhost:${PORT}"

# Open a browser once the port answers, unless asked not to.
if [ "${OPEN:-1}" = "1" ] && command -v open >/dev/null 2>&1; then
  (
    for _ in $(seq 1 40); do
      if curl -sf -o /dev/null "http://127.0.0.1:${PORT}/api/health"; then
        open "http://localhost:${PORT}"
        break
      fi
      sleep 0.25
    done
  ) &
fi

cd backend
exec env PYTHONWARNINGS=ignore ../.venv/bin/uvicorn app:app --host 127.0.0.1 --port "$PORT" "$@"
