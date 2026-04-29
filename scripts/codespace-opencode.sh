#!/usr/bin/env bash
set -euo pipefail

PORT="${OPENCODE_PORT:-4096}"
HOST="${OPENCODE_HOST:-127.0.0.1}"

if ! command -v opencode >/dev/null 2>&1; then
  echo "opencode no esta instalado o no esta en PATH."
  echo "Instalalo/autenticalo primero y vuelve a ejecutar este script."
  exit 1
fi

echo "Starting OpenCode on http://${HOST}:${PORT}"
exec opencode serve --port "$PORT" --hostname "$HOST"
