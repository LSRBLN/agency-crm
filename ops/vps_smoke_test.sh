#!/usr/bin/env bash
set -euo pipefail

# Quick smoke test for Agency CRM on a VPS
# Usage: bash /opt/agency-crm/ops/vps_smoke_test.sh

APP_DIR="${APP_DIR:-/opt/agency-crm}"
PORT="${PORT:-5050}"
HEALTH_URL="http://127.0.0.1:${PORT}/api/health"

say() { echo -e "\n==> $*"; }

say "Basic info"
whoami || true
uname -a || true

say "Check node/npm"
if command -v node >/dev/null 2>&1; then
  node -v
else
  echo "❌ node not found"
fi
if command -v npm >/dev/null 2>&1; then
  npm -v
else
  echo "❌ npm not found"
fi

say "Check app directory: ${APP_DIR}"
if [ ! -d "${APP_DIR}" ]; then
  echo "❌ ${APP_DIR} not found"
  exit 1
fi

say "Check .env"
if [ -f "${APP_DIR}/.env" ]; then
  echo "✅ .env exists"
  grep -E '^(PORT|DB_PATH|JWT_SECRET|ADMIN_EMAIL)=' "${APP_DIR}/.env" || true
else
  echo "❌ Missing ${APP_DIR}/.env"
fi

say "Check sqlite path"
DB_PATH_LINE="$(grep -E '^DB_PATH=' "${APP_DIR}/.env" 2>/dev/null || true)"
DB_PATH="${DB_PATH_LINE#DB_PATH=}"
if [ -n "${DB_PATH}" ]; then
  # resolve relative to APP_DIR
  case "${DB_PATH}" in
    /*) DB_ABS="${DB_PATH}";;
    *) DB_ABS="${APP_DIR}/${DB_PATH}";;
  esac
  echo "DB_PATH=${DB_ABS}"
  if [ -f "${DB_ABS}" ]; then
    echo "✅ DB file exists"
  else
    echo "ℹ️ DB file not present yet (it will be created on first start if directory is writable)"
  fi
  if [ -d "$(dirname "${DB_ABS}")" ]; then
    ls -la "$(dirname "${DB_ABS}")" | head -n 20 || true
  fi
fi

say "systemd service"
if command -v systemctl >/dev/null 2>&1; then
  systemctl --no-pager status agency-crm || true
else
  echo "ℹ️ systemctl not available"
fi

say "Health endpoint"
if command -v curl >/dev/null 2>&1; then
  curl -sS -D - "${HEALTH_URL}" -o /tmp/agency_crm_health.json || true
  echo "--- body ---"
  cat /tmp/agency_crm_health.json || true
else
  echo "❌ curl not found"
fi

say "nginx check (optional)"
if command -v nginx >/dev/null 2>&1; then
  nginx -t || true
  systemctl --no-pager status nginx || true
fi

echo -e "\n✅ Smoke test done"
