#!/usr/bin/env bash
set -euo pipefail

# Deploy script for Ubuntu VPS
# Assumes repo is located at /opt/agency-crm and systemd service is named "agency-crm".

APP_DIR="/opt/agency-crm"
SERVICE_NAME="agency-crm"

cd "$APP_DIR"

echo "==> Pull latest code"
git pull

echo "==> Ensure data directory exists (local SQLite)"
mkdir -p "$APP_DIR/data"

# Make sure the service user can write the sqlite file.
# If your service runs as user xipx, this is usually correct:
chown -R xipx:xipx "$APP_DIR/data" || true

echo "==> Install backend dependencies"
cd "$APP_DIR/server"
# If you prefer npm install, replace npm ci.
npm ci

echo "==> Install frontend dependencies + build"
cd "$APP_DIR/client"
npm ci
npm run build

echo "==> Restart service"
sudo systemctl restart "$SERVICE_NAME"

echo "==> Status"
sudo systemctl --no-pager status "$SERVICE_NAME" || true

echo "✅ Deploy complete"
