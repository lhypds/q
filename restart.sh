#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "=== Restarting Survey App ==="

# Pull latest code
echo "Pulling latest code..."
cd "$ROOT"
git pull

# Reinstall deps and rebuild frontend
echo "Updating dependencies..."
cd "$ROOT"
npm install

echo "Rebuilding frontend..."
npm run build

# Restart pm2 process using ecosystem file
echo "Restarting pm2 process..."
pm2 restart ecosystem.config.cjs --update-env || pm2 start ecosystem.config.cjs --update-env

pm2 save

echo ""
pm2 list
echo ""
echo "=== Restart complete ==="
