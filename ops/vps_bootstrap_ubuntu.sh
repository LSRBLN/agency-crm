#!/usr/bin/env bash
set -euo pipefail

# Ubuntu VPS bootstrap for Agency CRM
# Installs: Node.js (LTS), build tooling for better-sqlite3, nginx, certbot.
# Usage (on VPS): bash /opt/agency-crm/ops/vps_bootstrap_ubuntu.sh

if ! command -v sudo >/dev/null 2>&1; then
  echo "❌ sudo not found. Please run as a user with sudo." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "==> Update apt + base tools"
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg git

NODE_MAJOR="${NODE_MAJOR:-20}"

if ! command -v node >/dev/null 2>&1; then
  echo "==> Install Node.js ${NODE_MAJOR}.x (NodeSource)"
  sudo mkdir -p /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y nodejs
else
  echo "==> Node already installed: $(node -v)"
fi

echo "==> Install build deps (better-sqlite3)"
sudo apt-get install -y build-essential python3 make g++

echo "==> Install nginx"
sudo apt-get install -y nginx

echo "==> Install certbot (optional)"
# snapd is not always available; fallback to apt package
if command -v snap >/dev/null 2>&1; then
  sudo snap install core || true
  sudo snap refresh core || true
  sudo snap install --classic certbot || true
  sudo ln -sf /snap/bin/certbot /usr/bin/certbot || true
else
  sudo apt-get install -y certbot python3-certbot-nginx || true
fi

echo "==> Versions"
node -v || true
npm -v || true
nginx -v || true

echo "✅ Bootstrap complete"
