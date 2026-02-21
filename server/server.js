require('dotenv').config();
const express = require('express');
const { initMonitoring } = require('./utils/datadog');
initMonitoring();
const cors = require('cors');
const path = require('path');

// Supabase client
const { supabase, testConnection } = require('./services/supabaseClient');

// Routes
const authRoutes = require('./routes/auth');
const leadRoutes = require('./routes/leads');
const dealRoutes = require('./routes/deals');
const ticketRoutes = require('./routes/tickets');
const auditRoutes = require('./routes/audits');
const outreachRoutes = require('./routes/outreach');
const portalRoutes = require('./routes/portal');
const stripeRoutes = require('./routes/stripe');
const stitchRoutes = require('./routes/stitch');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/tickets', ticketRoutes);
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
        database: 'supabase',
        connected
    });
});

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../client/dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Start server with Supabase connection
async function startServer() {
    try {
        // Test Supabase connection
        const connected = await testConnection();

        if (connected) {
            console.log('✅ Supabase connected successfully');
        } else {
            console.log('⚠️  Running in fallback mode');
        }

        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT} (Supabase)`);
        });
    } catch (err) {
        console.error('❌ Failed to start server:', err.message);
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT} (Fallback mode)`);
        });
    }
}

startServer();
