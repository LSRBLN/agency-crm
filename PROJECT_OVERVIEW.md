# Agency CRM — "Einnahme-Maschine" für Berlin Wedding

## Übersicht
Ein KI-gestütztes CRM-System, das lokale Unternehmen in Berlin Wedding dabei unterstützt, in der Ära der KI-Suche (Gemini, ChatGPT, Siri) sichtbar zu werden. Positionierung als **Validierungs-Spezialist**, nicht als Webdesigner.

## Tech-Stack
- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Datenbank:** MongoDB (Mongoose)
- **KI:** Google Gemini 2.5 Flash (via @google/generative-ai)
- **Payments:** Stripe Checkout
- **Email:** Nodemailer (SMTP)
- **Google APIs:** Sheets, Calendar (googleapis)
- **Monitoring:** Datadog (dd-trace)
- **Secrets:** Doppler SDK (optional)
- **Deployment:** Docker + Google Cloud Run

---

## Feature-Übersicht nach Kategorien

### 1. Agentische Fulfillment-Erweiterungen

| Feature | Service | Status |
|---------|---------|--------|
| **Persistent Tracks (Conductor)** | `conductorService.js` | ✅ Dynamische Markdown-Dateien pro Kunde mit Tech-Stack, Design-Regeln, Marken-DNA, Audit-Historie |
| **Stitch Loop Skill (MCP)** | `stitchService.js` | ✅ Template-basierter Design-Varianten-Generator mit Gemini, MCP-Ressourcen-Listing, Auto-Save |
| **Brownfield-Support** | `brownfieldService.js` | ✅ Echtes HTML-Fetching + Gemini-Analyse für AEO, Performance, CRO, Local SEO |

**API-Endpunkte:**
- `POST /api/stitch/generate-variant` — Variante aus Quell-Template generieren
- `GET /api/stitch/templates` — Alle Templates auflisten
- `GET /api/stitch/mcp/resources` — MCP-Ressourcen-Listing

### 2. Psychologische Sales-Hebel & Tiefe Analyse

| Feature | Service/Route | Status |
|---------|---------------|--------|
| **Maps Grounding Scorecard** | `audits.js` | ✅ Gemini + Google Search Grounding für GBP, Rezensionen, Schema.org |
| **SimilarWeb Traffic Gap** | `leads.js` | ✅ SimilarWeb API mit Gemini-Fallback für Wettbewerber-Traffic-Vergleich |
| **AEO-Simulation** | `aeoService.js` | ✅ Standalone-Endpoint + Audit-Integration, Score + Reasoning |

**API-Endpunkte:**
- `POST /api/audits/aeo-simulate` — Standalone AEO-Simulation
- `GET /api/leads/:id/competition` — Wettbewerber-Traffic-Analyse

**Frontend:**
- `/aeo-simulator` — Interaktiver AEO-Simulator mit Query-Eingabe und Score-Anzeige
- `/scorecard/:id` — Öffentliche Scorecard mit dynamischem Wettbewerber-Balkendiagramm

### 3. KI-Content- & Reputations-Systeme

| Feature | Service | Status |
|---------|---------|--------|
| **Pomelli DNA-Scanner** | `pomelliService.js` | ✅ Gemini-basierte Marken-DNA-Extraktion (Farben, Fonts, Voice, Content-Strategie) |
| **VEO-Video-Pipeline** | `veoService.js` | ✅ Gemini-generiertes Storyboard (4 Szenen, Script, Hashtags) — VEO API pending |
| **Review-Request-Engine** | `reputationService.js` | ✅ Gemini-generierte keyword-reiche Templates + Nodemailer-Versand |

**API-Endpunkte:**
- `POST /api/reputation/blast` — Review-Blast mit Keyword-Templates versenden

### 4. Client-Value & Reporting

| Feature | Service | Status |
|---------|---------|--------|
| **NotebookLM Audio** | `notebookService.js` | ✅ Gemini-generiertes Podcast-Script (2 Hosts, Transcript, Key Insights) — Audio API pending |
| **Workspace Studio** | `workspaceService.js` | ✅ Google Sheets Lead-Logging + Calendar-Einladungen (mit Fallback) |

### 5. Infrastruktur-Optimierung

| Feature | Datei | Status |
|---------|-------|--------|
| **Doppler Secrets** | `utils/secrets.js` | ✅ SDK-Integration mit process.env Fallback |
| **Datadog Monitoring** | `utils/datadog.js` | ✅ dd-trace Init + Custom Metrics + Error Tracking |
| **Cloud Run Deployment** | `deploy_gcp.sh` | ✅ Docker + gcloud mit Secret Manager Integration |
| **Stripe Payments** | `routes/stripe.js` | ✅ Checkout Sessions + Webhook-Handling |

---

## Neue Frontend-Seiten

| Route | Seite | Beschreibung |
|-------|-------|-------------|
| `/aeo-simulator` | AEOSimulator.jsx | Interaktiver AEO-Test mit Score-Visualisierung |
| `/scorecard/:id` | ScorecardView.jsx | Öffentliche Scorecard mit dynamischen Wettbewerber-Daten |
| `/audit/:id` | AuditDetail.jsx | Detailansicht mit Brownfield-Analyse |
| `/outreach` | Outreach.jsx | E-Mail-Drafts mit Senden-Funktion |
| `/stitch` | (Sidebar-Link) | Stitch Templates Verwaltung |

---

## Umgebungsvariablen

Siehe `.env.example` für alle benötigten Variablen:

| Variable | Zweck | Erforderlich |
|----------|-------|-------------|
| `MONGODB_URI` | Datenbank | ✅ |
| `GEMINI_API_KEY` | KI-Funktionen | ✅ |
| `JWT_SECRET` | Auth | ✅ |
| `STRIPE_SECRET_KEY` | Zahlungen | Optional |
| `SIMILARWEB_API_KEY` | Traffic-Daten | Optional (Gemini-Fallback) |
| `SMTP_USER` / `SMTP_PASS` | E-Mail-Versand | Optional |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Sheets/Calendar | Optional |
| `GOOGLE_SHEET_ID` | Lead-Logging | Optional |
| `DOPPLER_TOKEN` | Secret Management | Optional |
| `DATADOG_API_KEY` | Monitoring | Optional |

---

## Setup

```bash
# Backend
cd agency-crm/server
npm install
cp ../.env.example ../.env  # Variablen ausfüllen
npm start

# Frontend
cd agency-crm/client
npm install
npm run dev
```

## Deployment

```bash
# Google Cloud Run
cd agency-crm
chmod +x deploy_gcp.sh
./deploy_gcp.sh
```

Secrets müssen vorher in Google Secret Manager angelegt werden (siehe deploy_gcp.sh Kommentare).
