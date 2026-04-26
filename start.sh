#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "Starting..."

cd "$ROOT"
pm2 start ecosystem.config.cjs --update-env

# Read PORT from .env for display
PORT=$(grep '^PORT=' "$ROOT/.env" 2>/dev/null | cut -d= -f2 || echo 3001)

echo "App running at http://localhost:$PORT"
