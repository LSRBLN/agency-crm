# ☁️ Azure Deployment Guide (GitHub Student Pack)

Mit dem GitHub Student Pack hast du Zugriff auf **Azure for Students** ($100 Guthaben & kostenlose Services). Das ist ideal, um dein CRM professionell zu hosten. 

Wir teilen das Hosting auf zwei kostenlose/günstige Services auf:
1. **Frontend (React)** ➔ *Azure Static Web Apps* (Kostenlos)
2. **Backend (Node.js)** ➔ *Azure App Service* (Linux, F1 Free Tier oder Basic)

---

## 🔒 Vorbereitung
1. Melde dich bei [Azure](https://portal.azure.com) an und aktiviere dein "Azure for Students" Abonnement.
2. Lade dein Projekt (`agency-crm`) in ein privates GitHub-Repository hoch. Azure zieht sich den Code später automatisch von dort.

---

## 🌐 1. Frontend hosten (Azure Static Web Apps)
Azure Static Web Apps sind perfekt für React/Vite-Apps und dauerhaft kostenlos.

1. Suche im Azure-Portal nach **Static Web Apps** und klicke auf *Erstellen*.
2. **Basics**:
   - Abonnement: *Azure for Students*
   - Ressourcengruppe: Neu erstellen (z.B. `agency-crm-rg`)
   - Name: `agency-crm-frontend`
   - Tarif: **Free**
3. **Bereitstellungsdetails**:
   - Quelle: **GitHub**
   - Wähle dein Repository und den `main`-Branch aus.
   - Build-Voreinstellungen: **React**
   - App-Speicherort: `/client` (wichtig! nicht `/`)
   - API-Speicherort: *(leer lassen)*
   - Ausgabespeicherort: `dist`
4. Klicke auf **Überprüfen + erstellen**. Azure richtet nun automatisch eine GitHub Action ein, die dein Frontend bei jedem Push baut und veröffentlicht.

---

## ⚙️ 2. Backend hosten (Azure App Service)

1. Suche im Azure-Portal nach **App Services** und klicke auf *Erstellen* -> *Web-App*.
2. **Basics**:
   - Ressourcengruppe: `agency-crm-rg` (die eben erstellte)
   - Name: `agency-crm-backend` (wird zu agency-crm-backend.azurewebsites.net)
   - Veröffentlichen: **Code**
   - Laufzeitstapel: **Node 20 LTS** (oder 18)
   - Betriebssystem: **Linux**
   - Region: *Zentral-/Westeuropa*
3. **Preisplan**:
   - Wähle **Free F1** (kostenlos) oder **B1 Basic** (ca. 12€/Monat, bezahlt von deinen $100 Credits).
4. **Bereitstellung (Deployment)**:
   - Aktiviere "Continuous Deployment" über GitHub.
   - Wähle dein Repo. Azure erstellt auch hier eine GitHub Action für das Backend.
5. Klicke auf **Überprüfen + erstellen**.

---

## 🔑 3. Backend konfigurieren (Umgebungsvariablen)

Damit dein Backend auf Azure läuft, müssen die `.env` Variablen hinterlegt werden, da diese nicht auf GitHub liegen.

1. Gehe in deinem neuen App Service (`agency-crm-backend`) links im Menü auf **Umgebungsvariablen** (oder *Konfiguration*).
2. Füge folgende App-Einstellungen hinzu:
   - `MONGODB_URI` = `mongodb+srv://...` (dein Atlas Connection String)
   - `JWT_SECRET` = `gemini-conductor-secret-2024` (oder ein neues sicheres Passwort)
   - `PORT` = `8080` (Azure App Service Linux nutzt standardmäßig Port 8080)
   - `GEMINI_API_KEY` = `dein_key`
   - `GMAIL_CLIENT_ID` = `...`
   - `GMAIL_CLIENT_SECRET` = `...`
   - `FRONTEND_URL` = `https://deine-static-web-app-url.azurestaticapps.net` (Die URL aus Schritt 1)
3. Speichern und Backend neu starten.

---

## 🔄 4. Frontend & Backend verbinden

Da das Frontend nun auf einer externen URL läuft, muss es wissen, wo das Azure-Backend liegt.

1. Gehe in deinem Codebank (lokal) in die Datei `client/vite.config.js`. Dort steht aktuell ein Proxy (localhost:5000). Da wir nun extern hosten, richten wir Axios global ein.
2. Es ist am einfachsten, wenn du in `client/.env.production` folgende Zeile anlegst:
   `VITE_API_URL=https://agency-crm-backend.azurewebsites.net`
3. Push die Änderungen auf GitHub. Die Azure GitHub Actions bauen Frontend und Backend nun automatisch mit den richtigen Verknüpfungen neu.

**Das war's!** MIt MongoDB Atlas und Azure hast du nun eine hochskalierbare, kostenlose/sehr günstige Cloud-Infrastruktur aufgebaut.
