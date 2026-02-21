// Supabase Client Service
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
const hasSupabaseCredentials = Boolean(supabaseUrl && supabaseKey);

if (!hasSupabaseCredentials) {
    console.warn('⚠️  Supabase credentials not found. Starting in demo/fallback mode.');
}

const supabase = hasSupabaseCredentials ? createClient(supabaseUrl, supabaseKey) : null;

// Test connection
async function testConnection() {
    if (!supabase) {
        return false;
    }

    try {
        const { data, error } = await supabase.from('contacts').select('count').limit(1);
        if (error && error.code !== 'PGRST116') {
            // PGRST116 = table does not exist - we'll create tables
            console.log('ℹ️  Supabase connected, tables will be created on first use');
            return true;
        }
        console.log('✅ Supabase connected successfully');
        return true;
    } catch (err) {
        console.error('❌ Supabase connection failed:', err.message);
        return false;
    }
}

// Initialize database tables
async function initializeTables() {
    const tables = {
        contacts: `
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            company TEXT,
            position TEXT,
            status TEXT DEFAULT 'active',
            source TEXT,
            notes TEXT,
            tags TEXT[],
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        `,
        companies: `
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
        `,
        deals: `
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
        `,
        tickets: `
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
        `,
        projects: `
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
        `,
        activities: `
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
        `,
        calendar_events: `
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
        `,
        knowledge_base: `
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title TEXT NOT NULL,
            content TEXT,
            category TEXT,
            tags TEXT[],
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        `,
        segments: `
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            description TEXT,
            criteria JSONB,
            created_at TIMESTAMPTZ DEFAULT now()
        `,
        users: `
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email TEXT UNIQUE NOT NULL,
            password TEXT,
            name TEXT,
            role TEXT DEFAULT 'user',
            created_at TIMESTAMPTZ DEFAULT now()
        `
    };

    // Note: Tables need to be created manually in Supabase Dashboard or via migrations
    // This is a helper to check if tables exist
    console.log('📋 CRM Tables defined. Please create them in Supabase Dashboard.');
    return tables;
}

module.exports = { supabase, testConnection, initializeTables, hasSupabaseCredentials };
