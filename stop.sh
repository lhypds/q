#!/bin/bash

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "=== Stopping Survey App ==="

# Read PM2_NAME from .env
PM2_NAME=$(grep '^PM2_NAME=' "$ROOT/.env" 2>/dev/null | cut -d= -f2 || echo survey-app)

pm2 stop "$PM2_NAME" 2>/dev/null || echo "$PM2_NAME was not running"
pm2 delete "$PM2_NAME" 2>/dev/null || true
pm2 save

echo "=== Stopped ==="
