#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "Setting up..."

# Install pm2 globally if not present
if ! command -v pm2 &> /dev/null; then
  echo "Installing pm2..."
  npm install -g pm2
fi

# Install all dependencies and build
echo "Installing dependencies..."
cd "$ROOT"
npm install

echo "Building frontend..."
npm run build

echo ""
echo "=== Setup complete ==="
echo "Run ./start.sh to start the app"
