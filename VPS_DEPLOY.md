# VPS Deploy (ohne Supabase)

## Ziel
- Backend + Frontend laufen auf **einem** Node-Prozess (Express servt `client/dist`)
- Reverse Proxy via Nginx auf Port 80 → Node auf Port **5050**
- Datenbank: **SQLite** Datei auf dem Server (`/opt/agency-crm/data/crm.sqlite`)

## 1) .env auf dem VPS
Datei: `/opt/agency-crm/.env`

Minimal:
- `JWT_SECRET=...`
- `ADMIN_EMAIL=...`
- `ADMIN_PASSWORD=...`
- `PORT=5050`
- `DB_PATH=/opt/agency-crm/data/crm.sqlite`

Optional:
- `GOOGLE_PLACES_API_KEY=...`
- `SIMILARWEB_API_KEY=...`
- `GEMINI_API_KEY=...`

## 2) Systemd Service
- Datei: `/etc/systemd/system/agency-crm.service`
- Vorlage: `ops/agency-crm.service`

Dann:
- `sudo systemctl daemon-reload`
- `sudo systemctl enable agency-crm`

## 3) Nginx
- Config: `/etc/nginx/sites-available/agency-crm`
- Vorlage: `ops/nginx-agency-crm.conf`

Dann:
- `sudo ln -sf /etc/nginx/sites-available/agency-crm /etc/nginx/sites-enabled/agency-crm`
- `sudo nginx -t && sudo systemctl reload nginx`

## 4) Deploy (Build + Restart)
Script: `/opt/agency-crm/deploy_vps.sh`

- `bash /opt/agency-crm/deploy_vps.sh`

Falls `better-sqlite3` nicht baut:
- `sudo apt-get update && sudo apt-get install -y build-essential python3`
- danach Deploy erneut.

## 0) Einmalig: Tools installieren (Ubuntu)
Wenn auf dem VPS noch kein Node/npm vorhanden ist (oder `better-sqlite3` beim Installieren crasht), nutze:
- Script: `/opt/agency-crm/ops/vps_bootstrap_ubuntu.sh`
- Ausführen: `bash /opt/agency-crm/ops/vps_bootstrap_ubuntu.sh`

Danach einmal deployen: `bash /opt/agency-crm/deploy_vps.sh`

## 5) Smoke Test
- `curl -s http://127.0.0.1:5050/api/health | cat`
  - erwartet: `{"status":"ok",...,"database":"sqlite","connected":true}`
- Login im Browser mit `ADMIN_EMAIL` / `ADMIN_PASSWORD`

Alternativ als Script:
- `bash /opt/agency-crm/ops/vps_smoke_test.sh`

## Daten
- DB-Datei: `/opt/agency-crm/data/crm.sqlite`
- Backup (quick): `cp /opt/agency-crm/data/crm.sqlite /opt/agency-crm/data/crm.sqlite.bak`
