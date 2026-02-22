# CRM Funktionen Übersicht

## 📊 Dashboard
- **Kennzahlen-Übersicht**: Gesamt Leads, Offene Tickets, Aktive Projekte, Umsatz
- **Status-Verteilung**: Visualisierung der Lead-Status
- **Letzte Aktivitäten**: Recent activity feed

---

## 👥 Kontakte (Contacts)
### Funktionen:
- Kontaktliste mit Suchfilter
- Status-Badges (Aktiv, Inaktiv, Lead)
- Detailansicht mit Kontaktdaten
- E-Mail und Telefon-Verknüpfung
- Firmen-Zuordnung
- Erstellt-Datum Tracking

### Features:
- Quick Search
- Status-Filter
- Detail-Modal mit allen Informationen
- Bearbeiten/Löschen-Aktionen

---

## 🏢 Firmen (Companies)
### Funktionen:
- Firmenprofil-Verwaltung
- Branchen-Zuordnung
- Mitarbeiter-Anzahl
- Umsatz-Tracking
- Adresse und Website
- Status-Verwaltung (Aktiv, Inaktiv, Lead)

### Features:
- Grid- und Listenansicht
- Detail-Modal
- Wirtschaftsdaten-Anzeige

---

## 💰 Vertrieb (Deals Pipeline)
### Pipeline-Stages:
1. **NEW** - Neuer Lead
2. **CONTACTED** - Kontaktiert
3. **REPLIED** - Hat geantwortet
4. **QUALIFIED** - Qualifiziert
5. **WON** - Gewonnen
6. **LOST** - Verloren

### Funktionen:
- Kanban-Board Ansicht
- Listenansicht
- Deal-Wert Tracking
- Wahrscheinlichkeits-Berechnung
- Letzte Aktivität
- Google Bewertung & Reviews (aus Python-App)

### Features:
- Drag & Drop (vorbereitet)
- Farbcodierte Phasen
- Fortschrittsbalken
- Chance-Score Berechnung

---

## 🎫 Service (Tickets)
### Status:
- **OPEN** - Offen
- **IN_PROGRESS** - In Bearbeitung
- **WAITING** - Wartend
- **RESOLVED** - Gelöst
- **CLOSED** - Geschlossen

### Prioritäten:
- **LOW** - Niedrig
- **MEDIUM** - Mittel
- **HIGH** - Hoch
- **CRITICAL** - Kritisch

### Funktionen:
- Ticket-Erstellung
- Kategorisierung
- Bearbeiter-Zuweisung
- Aktivitäten-Historie
- Kommentar-System

---

## 📁 Projekte (Projects)
### Phasen:
- **DISCOVERY** - Entdeckung
- **PLANNING** - Planung
- **IN_PROGRESS** - In Arbeit
- **REVIEW** - Überprüfung
- **COMPLETED** - Abgeschlossen

### Funktionen:
- Projektübersicht
- Fortschritts-Tracking
- Budget/Value Tracking
- Start- und Fälligkeitsdatum
- Zuweisung an Teammitglieder

---

## 📅 Kalender (Calendar)
### Funktionen:
- Monatsansicht
- Terminübersicht
- Terminarten:
  - Meetings
  - Demos
  - Calls
  - Interne Termine
- Farbcodierung nach Typ
- Termindauer-Anzeige
- Teilnehmer-Informationen

---

## 📧 Mailing
### Funktionen:
- Lead-Liste mit Filterung
- Status-Filter (NEW, CONTACTED, REPLIED, QUALIFIED)
- Chance-Score Anzeige
- E-Mail-Vorlagen
- Bulk-Senden
- Antwort-Tracking
- Angebot-Zähler

### Features:
- Vorlagenauswahl
- Sync-Funktion für Antworten
- Öffnungs-/Antwortrate

---

## 📈 Marketing
### Kampagnen-Management:
- Kampagne erstellen
- Zielgruppe definieren
- Status: DRAFT, ACTIVE, PAUSED, COMPLETED
- Performance-Tracking:
  - Gesendet
  - Geöffnet
  - Angeklickt
  - Geantwortet

### Zielgruppen-Statistiken:
- NEW (Neue Leads)
- CONTACTED (Kontaktiert)
- REPLIED (geantwortet)
- QUALIFIED (qualifiziert)
- WON (gewonnen)
- LOST (verloren)

---

## 📚 Wissensdatenbank (Knowledge Base)
### Funktionen:
- Artikel-Verwaltung
- Kategorisierung
- Aufruf-Statistiken
- Volltextsuche
- Artikel-Editor (vorbereitet)

### Kategorien:
- Vertrieb
- Preise
- Technisch
- Marketing

---

## 🎯 Zielgruppen (Segments)
### Segment-Typen:
- **Dynamisch**: Automatisch basierend auf Regeln
- **Statisch**: Manuell zusammengestellt

### Funktionen:
- Segment-Erstellung
- Kriterien-Definition
- Kontakt-Anzahl
- Conversion-Tracking

### Beispiel-Kriterien:
- Branche = IT
- Mitarbeiter > 100
- Google Rating > 4.5
- Website = leer

---

## 📊 Berichte (Reports)
### Metriken:
- Neue Leads (Zeitraum-Vergleich)
- Conversion Rate
- Umsatzentwicklung
- E-Mail Performance

### Visualisierungen:
- Leads nach Monat (Bar Chart)
- Umsatz nach Monat
- Conversion nach Quelle
- Trend-Indikatoren

---

## ⚙️ Einstellungen (Settings)
### Tabs:
1. **Profil**: Name, E-Mail, Zeitzone
2. **Benachrichtigungen**: E-Mail, Push, Weekly Digest
3. **Sicherheit**: Passwort-Änderung
4. **Integrationen**: Google Workspace, Outscraper, Pomelli
5. **E-Mail**: SMTP-Konfiguration

---

## 🔗 Integrationen (in Settings)
### Verfügbare Integrationen:
- **Google Workspace**: Docs, Sheets, Maps
- **Outscraper**: Datenerweiterung
- **Pomelli**: Kontakanreicherung
- **SMTP**: E-Mail-Versand

---

## 🎯 Tagesfokus (Daily)
### Funktionen:
- Priorisierte Aufgabenliste
- Automatische Prioritäts-Berechnung:
  - Kein Angebot gesendet (+40)
  - Demo fehlt (+30)
  - Kunde hat geantwortet (+50)
  - Wiedervorlage fällig (+20)
- Quick-Action Buttons

---

## 📱 Navigation
### Hauptmenü:
- Dashboard
- Tagesfokus
- Kontakte
- Firmen
- Vertrieb
- Service

### Projekte:
- Projekte
- Kalender
- Mailing

### Tools:
- Marketing
- Wissensdatenbank
- Zielgruppen
- Berichte

---

## 🎨 Design-System
### Farben:
- Primary: #2563EB (Blau)
- Accent: #10B981 (Grün)
- Error: #EF4444 (Rot)
- Warning: #F59E0B (Orange)
- Info: #3B82F6 (Hellblau)

### Komponenten:
- Buttons (Primary, Secondary, Ghost, Icon)
- Cards (mit Hover-Effekten)
- Tables (mit Sortierung)
- Badges (Status, Priorität)
- Modals (Detail-Ansichten)
- Forms (Input, Select, Checkbox)

---

## 📁 Datei-Struktur
```
agency-crm/client/
├── src/
│   ├── components/
│   │   └── Sidebar.jsx
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Contacts.jsx
│   │   ├── Companies.jsx
│   │   ├── Deals.jsx
│   │   ├── Tickets.jsx
│   │   ├── Projects.jsx
│   │   ├── Calendar.jsx
│   │   ├── Mailing.jsx
│   │   ├── Marketing.jsx
│   │   ├── Knowledge.jsx
│   │   ├── Segments.jsx
│   │   ├── Reports.jsx
│   │   ├── Settings.jsx
│   │   └── Daily.jsx
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
└── tailwind.config.js
```

---

## 🔄 Nächste Schritte (Offen)
1. **Backend-Verbindung**: Python-App Datenbank anbinden
2. **Echtzeit-Daten**: API-Integration
3. **Google-Integration**: Maps, Docs, Sheets
4. **Outscraper/Pomelli**: Konfiguration
5. **Benutzer-Authentifizierung**: Login/Logout
