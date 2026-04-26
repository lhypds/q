#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "Restarting..."

cd "$ROOT"
git pull

echo "Updating dependencies..."
npm install

echo "Rebuilding frontend..."
npm run build

"$ROOT/stop.sh"
"$ROOT/start.sh"
