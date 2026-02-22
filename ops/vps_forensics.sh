#!/usr/bin/env bash
set -euo pipefail

# VPS forensics helper: find out HOW files landed on the server.
# Run as root (recommended) from anywhere:
#   bash /opt/agency-crm/ops/vps_forensics.sh
# or if the repo isn't in /opt/agency-crm, copy this script and run it.

TARGET_DIR="${TARGET_DIR:-/root}"

say() { echo -e "\n==> $*"; }

say "Who/where"
whoami || true
hostname || true
pwd || true

say "List ${TARGET_DIR} (top)"
ls -la "${TARGET_DIR}" | head -n 200 || true

say "Recent changes in ${TARGET_DIR} (last 2 days)"
# Print mtime (newest first)
find "${TARGET_DIR}" -maxdepth 2 -type f -mtime -2 -printf '%TY-%Tm-%Td %TH:%TM:%TS  %u:%g  %p\n' 2>/dev/null | sort -r | head -n 200 || true

say "If there are ZIPs: show their timestamps"
ls -la "${TARGET_DIR}"/*.zip 2>/dev/null || true

say "Look for extracted repo hints"
for p in "/opt/agency-crm" "${TARGET_DIR}/agency-crm"; do
  if [ -d "$p" ]; then
    echo "--- ${p} ---"
    ls -la "$p" | head -n 80 || true
    [ -d "$p/.git" ] && echo "✅ Git repo detected at $p" || echo "ℹ️ No .git at $p"
  fi
done

say "Shell history hints (root + xipx)"
for h in /root/.bash_history /home/xipx/.bash_history; do
  if [ -f "$h" ]; then
    echo "--- $h (grep: unzip|zip|scp|rsync|git|wget|curl|deploy|npm) ---"
    grep -E 'unzip|zip |scp |rsync |git |wget |curl |deploy|npm |node ' "$h" | tail -n 80 || true
  fi
done

say "Systemd timers/cron (common source of 'mysterious' updates)"
if command -v systemctl >/dev/null 2>&1; then
  systemctl list-timers --all --no-pager | head -n 200 || true
fi

# cron
ls -la /etc/cron.* 2>/dev/null || true
crontab -l 2>/dev/null || true
crontab -l -u xipx 2>/dev/null || true

say "Auth log: recent SSH logins (last 200 lines)"
if [ -f /var/log/auth.log ]; then
  tail -n 200 /var/log/auth.log | sed -n 's/.*\(Accepted\|session opened\|session closed\).*/&/p' || true
fi

say "Done"
echo "If you paste the output here, we can pinpoint whether this came from: manual unzip, git pull, a deploy script, or an automated job."