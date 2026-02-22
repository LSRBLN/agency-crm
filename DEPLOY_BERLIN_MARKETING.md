# Deployment-Runbook: berlin-marketing.me

## Aktueller Stand
- Backend auf Azure erstellt: `agency-crm-backend-bm.azurewebsites.net`
- Domain-Ziel definiert:
  - Frontend + API: `https://berlin-marketing.me`
- Namecheap-Frontend-Artefakt erstellt: `berlin-marketing.me-frontend.zip`

## Namecheap (cPanel) – Frontend
1. In cPanel `public_html` leeren (nur wenn alte Seite ersetzt werden soll).
2. `berlin-marketing.me-frontend.zip` nach `public_html/` hochladen.
3. ZIP in `public_html/` entpacken.
4. Prüfen, dass `public_html/index.html` und `public_html/assets/*` existieren.

## Namecheap DNS
Folgende DNS-Records setzen:
- `A`: `@` -> `51.116.145.41`
- `CNAME`: `www` -> `agency-crm-backend-bm.azurewebsites.net`
- `TXT`: `asuid` -> `84026ccb12268e999be500547b5696f8ece431e240e80d20ede0ce18fd340561`

### Automatisch per Namecheap API
Voraussetzungen:
- Namecheap API aktiviert
- Whitelist-IP gesetzt (deine aktuelle öffentliche IP)

Umgebungsvariablen:

```bash
export NAMECHEAP_API_USER="..."
export NAMECHEAP_API_KEY="..."
export NAMECHEAP_USERNAME="..."
export NAMECHEAP_CLIENT_IP="..."
```

Dry-run:

```bash
python3 scripts/namecheap_dns_sync.py \
  --domain berlin-marketing.me \
  --azure-host agency-crm-backend-bm.azurewebsites.net \
  --azure-ip 51.116.145.41 \
  --verification-id 84026CCB12268E999BE500547B5696F8ECE431E240E80D20EDE0CE18FD340561 \
  --dry-run
```

Anwenden:

```bash
python3 scripts/namecheap_dns_sync.py \
  --domain berlin-marketing.me \
  --azure-host agency-crm-backend-bm.azurewebsites.net \
  --azure-ip 51.116.145.41 \
  --verification-id 84026CCB12268E999BE500547B5696F8ECE431E240E80D20EDE0CE18FD340561
```

## Azure – Custom Domain verbinden
Nach DNS-Propagation (5–30 min, ggf. bis 24h):

```bash
az webapp config hostname add \
  --resource-group rg-lsrbln-0847 \
  --webapp-name agency-crm-backend-bm \
  --hostname berlin-marketing.me

az webapp config hostname add \
  --resource-group rg-lsrbln-0847 \
  --webapp-name agency-crm-backend-bm \
  --hostname www.berlin-marketing.me
```

## Azure App Settings (Supabase)
In App Service `agency-crm-backend-bm` setzen:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- optional serverseitig: `SUPABASE_SERVICE_ROLE_KEY`
- `APP_TYPE=backend`
- `PORT=8080`
- `FRONTEND_URL=https://berlin-marketing.me`

## Supabase
1. Datei `supabase-setup.sql` in Supabase SQL Editor ausführen.
2. RLS-Policies prüfen und bei Produktionsbetrieb verschärfen.

## Verifikation
- API Health: `https://agency-crm-backend-bm.azurewebsites.net/api/health`
- Nach Domain-Mapping: `https://berlin-marketing.me/api/health`
- Frontend: `https://berlin-marketing.me`
