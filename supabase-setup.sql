-- Supabase CRM Tables Setup
-- Execute this in Supabase Dashboard > SQL Editor

-- 1. Contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    position TEXT,
    status TEXT DEFAULT 'new',
    source TEXT,
    notes TEXT,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Companies table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    website TEXT,
    industry TEXT,
    address TEXT,
    city TEXT,
    phone TEXT,
    email TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Deals table
CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    value DECIMAL(12,2) DEFAULT 0,
    stage TEXT DEFAULT 'new',
    probability INTEGER DEFAULT 10,
    contact_id UUID,
    company_id UUID,
    expected_close DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open',
    priority TEXT DEFAULT 'medium',
    category TEXT,
    contact_id UUID,
    assigned_to TEXT,
    due_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'planning',
    start_date DATE,
    due_date DATE,
    budget DECIMAL(12,2),
    contact_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Activities table
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    type TEXT,
    description TEXT,
    due_date TIMESTAMPTZ,
    completed BOOLEAN DEFAULT false,
    contact_id UUID,
    deal_id UUID,
    project_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Calendar Events table
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    all_day BOOLEAN DEFAULT false,
    color TEXT,
    contact_id UUID,
    deal_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Knowledge Base table
CREATE TABLE IF NOT EXISTS knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    category TEXT,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Segments table
CREATE TABLE IF NOT EXISTS segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    criteria JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    name TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Audits table
CREATE TABLE IF NOT EXISTS audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID,
    business_name TEXT,
    url TEXT,
    status TEXT DEFAULT 'in_progress',
    totalScore DECIMAL(5,2) DEFAULT 0,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS (Row Level Security)
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (for demo)
CREATE POLICY "Enable all access for demo" ON contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for demo" ON companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for demo" ON deals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for demo" ON tickets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for demo" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for demo" ON activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for demo" ON calendar_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for demo" ON knowledge_base FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for demo" ON segments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for demo" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for demo" ON audits FOR ALL USING (true) WITH CHECK (true);

-- Insert demo data
INSERT INTO contacts (name, email, phone, company, status, source, notes) VALUES
('Auto Berlin Wedding', 'info@autoberlin.de', '+49 30 123456', 'Auto Berlin GmbH', 'new', 'Website', 'Interessiert an AEO Audit'),
('Physio Praxis Mitte', 'kontakt@physio-berlin.de', '+49 30 234567', 'Physio Praxis GmbH', 'contacted', 'Referral', 'Hat bereits Website'),
('Zahnarztpraxis Wedding', 'info@zahnarzt-wedding.de', '+49 30 345678', 'Zahnarztpraxis', 'qualified', 'Cold Call', 'Große Praxis, interessiert'),
('Friseur Salon Berlin', 'contact@friseur-wedding.de', '+49 30 456789', 'Friseur Salon', 'new', 'Website', 'Braucht komplett neuen Auftritt'),
('Bäckerei Berlin Mitte', 'info@baeckerei-berlin.de', '+49 30 567890', 'Bäckerei GmbH', 'won', 'Website', 'Auftrag gewonnen!');

INSERT INTO deals (name, value, stage, probability, expected_close) VALUES
('Webseite Auto Berlin', 3500, 'new', 10, '2026-03-15'),
('SEO Paket Physio', 1200, 'contacted', 30, '2026-03-01'),
('Komplettpaket Zahnarzt', 8000, 'qualified', 60, '2026-02-28'),
('Logo & Branding', 1500, 'proposal', 50, '2026-03-20'),
('Google Ads Management', 2400, 'won', 100, '2026-02-15');

INSERT INTO tickets (title, description, status, priority, category, assigned_to, due_date) VALUES
('Website nicht erreichbar', 'Kunde meldet Fehler 500', 'open', 'high', 'Technical', 'Max', '2026-02-21'),
('SEO Ranking abgefallen', 'Positionen für Hauptkeywords verschlechtert', 'in_progress', 'medium', 'SEO', 'Lisa', '2026-02-25'),
('Neues Formular einbauen', 'Kontaktformular für Angebotserstellung', 'open', 'low', 'Development', 'Tom', '2026-03-01'),
('Google Ads optimieren', 'CTR verbessern, Kosten senken', 'resolved', 'medium', 'Marketing', 'Sarah', '2026-02-18'),
('SSL Zertifikat erneuern', 'Läuft am 28.02. ab', 'open', 'high', 'Technical', 'Max', '2026-02-22');

INSERT INTO audits (business_name, url, status, totalScore, details) VALUES
('Kfz Werkstatt Berlin', 'https://kfz-berlin.de', 'completed', 72, '{"aeoScore":65,"mapsScore":80,"organicScore":70}'),
('Physiotherapie Wedding', 'https://physio-wedding.de', 'in_progress', 45, '{"aeoScore":40,"mapsScore":50,"organicScore":45}'),
('Restaurant Berlin Mitte', 'https://restaurant-berlin.de', 'completed', 68, '{"aeoScore":70,"mapsScore":65,"organicScore":70}');

SELECT 'CRM Tables created successfully!' as result;
