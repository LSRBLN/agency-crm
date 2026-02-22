require('dotenv').config();
const express = require('express');
const { initMonitoring } = require('./utils/datadog');
initMonitoring();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Supabase client
const { supabase, testConnection } = require('./services/supabaseClient');

// Routes
const authRoutes = require('./routes/auth');
const leadRoutes = require('./routes/leads');
const contactRoutes = require('./routes/contacts');
const companyRoutes = require('./routes/companies');
const dealRoutes = require('./routes/deals');
const ticketRoutes = require('./routes/tickets');
const calendarRoutes = require('./routes/calendar');
const reportsRoutes = require('./routes/reports');
const automationRoutes = require('./routes/automation');
const similarwebRoutes = require('./routes/similarweb');
const leadSearchRoutes = require('./routes/leadSearch');
const socialPlannerRoutes = require('./routes/socialPlanner');
const socialIntegrationsRoutes = require('./routes/socialIntegrations');
const geminiToolsRoutes = require('./routes/geminiTools');
const formsRoutes = require('./routes/forms');
const settingsRoutes = require('./routes/settings');
const auditRoutes = require('./routes/audits');
const outreachRoutes = require('./routes/outreach');
const portalRoutes = require('./routes/portal');
const stripeRoutes = require('./routes/stripe');
const stitchRoutes = require('./routes/stitch');

const app = express();
const PORT = process.env.PORT || 5000;

async function ensureAdminUser() {
    if (!supabase) {
        return;
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
        return;
    }

    const normalizedEmail = String(adminEmail).toLowerCase();
    const { data: existing, error: findError } = await supabase
        .from('users')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle();

    if (findError) {
        throw findError;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    if (existing) {
        const { error: updateError } = await supabase
            .from('users')
            .update({
                password: hashedPassword,
                role: 'admin',
                name: process.env.ADMIN_NAME || 'Admin',
            })
            .eq('id', existing.id);

        if (updateError) {
            throw updateError;
        }

        console.log(`✅ Admin user updated: ${normalizedEmail}`);
        return;
    }

    const { error: insertError } = await supabase
        .from('users')
        .insert([{
            email: normalizedEmail,
            password: hashedPassword,
            role: 'admin',
            name: process.env.ADMIN_NAME || 'Admin',
        }]);

    if (insertError) {
        throw insertError;
    }

    console.log(`✅ Admin user created: ${normalizedEmail}`);
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/similarweb', similarwebRoutes);
app.use('/api/lead-search', leadSearchRoutes);
app.use('/api/social-planner', socialPlannerRoutes);
app.use('/api/social-integrations', socialIntegrationsRoutes);
app.use('/api/gemini', geminiToolsRoutes);
app.use('/api/forms', formsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/audits', auditRoutes);
app.use('/api/outreach', outreachRoutes);
app.use('/api/reputation', require('./routes/reputation'));
app.use('/api/portal', portalRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/stitch', stitchRoutes);

// Health check
app.get('/api/health', async (req, res) => {
    const connected = Boolean(supabase);
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'sqlite',
        connected
    });
});

const distCandidates = [
    path.join(__dirname, '../client/dist'),
    path.join(__dirname, './client/dist'),
];

const distPath = distCandidates.find((candidate) => fs.existsSync(path.join(candidate, 'index.html')));

if (distPath) {
    app.use(express.static(distPath));
}

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
    if (distPath) {
        return res.sendFile(path.join(distPath, 'index.html'));
    }

    return res.status(503).json({
        error: 'Frontend build not deployed',
        message: 'API is running. Deploy client/dist to enable the web UI.',
    });
});

// Start server with Supabase connection
async function startServer() {
    try {
        // Test Supabase connection
        const connected = await testConnection();

        if (connected) {
            console.log('✅ Local DB connected successfully');
            await ensureAdminUser();
        } else {
            console.log('⚠️  Local DB not available');
        }

        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT} (SQLite)`);
        });
    } catch (err) {
        console.error('❌ Failed to start server:', err.message);
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    }
}

startServer();
