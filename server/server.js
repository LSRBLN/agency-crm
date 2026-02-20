require('dotenv').config();
const express = require('express');
const { initMonitoring } = require('./utils/datadog');
initMonitoring();
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const leadRoutes = require('./routes/leads');
const auditRoutes = require('./routes/audits');
const outreachRoutes = require('./routes/outreach');
const portalRoutes = require('./routes/portal');
const stripeRoutes = require('./routes/stripe');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/audits', auditRoutes);
app.use('/api/outreach', outreachRoutes);
app.use('/api/reputation', require('./routes/reputation'));
app.use('/api/portal', portalRoutes);
app.use('/api/stripe', stripeRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, '../client/dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ MongoDB connected');
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error('❌ MongoDB connection failed:', err.message);
        console.log('⚠️  Starting server without database...');
        // Start anyway for frontend dev
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT} (no DB)`);
        });
    });
