const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const Lead = require('../models/Lead');
const auth = require('../middleware/auth');
const axios = require('axios'); // Used for SimilarWeb API calls
const router = express.Router();

const upload = multer({ dest: 'uploads/' });

// Get all leads
router.get('/', auth, async (req, res) => {
    try {
        const leads = await Lead.find().sort({ createdAt: -1 });
        res.json(leads);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get single lead
router.get('/:id', auth, async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ error: 'Lead nicht gefunden' });
        res.json(lead);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create single lead
router.post('/', auth, async (req, res) => {
    try {
        const lead = await Lead.create(req.body);
        res.status(201).json(lead);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Bulk import (CSV)
router.post('/bulk', auth, async (req, res) => {
    try {
        const { leads } = req.body;
        if (!Array.isArray(leads) || leads.length === 0) {
            return res.status(400).json({ error: 'Keine Leads im Payload' });
        }
        // Calculate priority for each lead before insert
        const prepared = leads.map(l => ({
            ...l,
            priority: (l.directTrafficPct > 50 && l.organicTrafficPct < 20) ? 'high' : l.directTrafficPct > 30 ? 'medium' : 'low',
        }));
        const created = await Lead.insertMany(prepared);
        res.status(201).json(created);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Update lead
router.put('/:id', auth, async (req, res) => {
    try {
        const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!lead) return res.status(404).json({ error: 'Lead nicht gefunden' });
        res.json(lead);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Delete lead
router.delete('/:id', auth, async (req, res) => {
    try {
        const lead = await Lead.findByIdAndDelete(req.params.id);
        if (!lead) return res.status(404).json({ error: 'Lead nicht gefunden' });
        res.json({ message: 'Lead gelöscht' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Upload CSV Metrics (from Manis AI)
router.post('/upload-metrics', auth, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }

    const results = [];
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            try {
                let updatedCount = 0;
                let createdCount = 0;

                for (const row of results) {
                    // Extract data from CSV (expecting specific columns from Manis AI or SimilarWeb)
                    const companyName = row['Company Name'] || row.companyName || row.name;
                    const websiteUrl = row['Website URL'] || row.websiteUrl || row.domain;

                    if (!companyName && !websiteUrl) continue; // Skip invalid rows

                    const monthlyVisitors = parseInt(row['Monthly Visitors'] || row.monthlyVisitors || 0, 10);
                    const directTrafficPct = parseFloat(row['Direct Traffic %'] || row.directTrafficPct || 0);
                    const organicTrafficPct = parseFloat(row['Organic Traffic %'] || row.organicTrafficPct || 0);
                    const competitorTraffic = row['Top Competitor Domains'] || row.competitorTraffic || '';

                    const leadData = {
                        monthlyVisitors: isNaN(monthlyVisitors) ? 0 : monthlyVisitors,
                        directTrafficPct: isNaN(directTrafficPct) ? 0 : directTrafficPct,
                        organicTrafficPct: isNaN(organicTrafficPct) ? 0 : organicTrafficPct,
                        competitorTraffic,
                        // Priority calculation handled pre-save
                    };

                    // Try to update existing lead by domain or name
                    let lead = null;
                    if (websiteUrl) {
                        // Very basic matching, in production use proper URL normalization
                        lead = await Lead.findOne({ websiteUrl: { $regex: websiteUrl.replace(/^https?:\/\/(www\.)?/, ''), $options: 'i' } });
                    }
                    if (!lead && companyName) {
                        lead = await Lead.findOne({ companyName: { $regex: companyName, $options: 'i' } });
                    }

                    if (lead) {
                        // Update existing
                        Object.assign(lead, leadData);
                        await lead.save();
                        updatedCount++;
                    } else {
                        // Create new
                        leadData.companyName = companyName || 'Unknown Company';
                        leadData.websiteUrl = websiteUrl || '';

                        // Force priority evaluation since we are creating new
                        if (leadData.directTrafficPct > 50 && leadData.organicTrafficPct < 20) {
                            leadData.priority = 'high';
                        } else if (leadData.directTrafficPct > 30) {
                            leadData.priority = 'medium';
                        } else {
                            leadData.priority = 'low';
                        }

                        await Lead.create(leadData);
                        createdCount++;
                    }
                }

                // Clean up file
                fs.unlinkSync(req.file.path);

                res.status(200).json({ message: 'CSV importiert', updatedCount, createdCount });
            } catch (err) {
                // Clean up file on error
                if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                res.status(500).json({ error: err.message });
            }
        });
});

// GET /:id/competition - Real SimilarWeb integration with Gemini fallback
router.get('/:id/competition', auth, async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ error: 'Lead not found' });

        const domain = lead.websiteUrl ? new URL(lead.websiteUrl.startsWith('http') ? lead.websiteUrl : `https://${lead.websiteUrl}`).hostname : null;

        // Try SimilarWeb API first
        if (process.env.SIMILARWEB_API_KEY && domain) {
            try {
                const swResponse = await axios.get(
                    `https://api.similarweb.com/v1/website/${domain}/total-traffic-and-engagement/visits`,
                    {
                        params: {
                            api_key: process.env.SIMILARWEB_API_KEY,
                            start_date: '2024-01',
                            end_date: '2024-12',
                            country: 'de',
                            granularity: 'monthly',
                            main_domain_only: false
                        },
                        timeout: 10000
                    }
                );

                const monthlyVisits = swResponse.data?.visits || [];
                const avgMonthly = monthlyVisits.length > 0
                    ? Math.round(monthlyVisits.reduce((sum, v) => sum + (v.visits || 0), 0) / monthlyVisits.length)
                    : 0;

                return res.json({
                    source: 'similarweb',
                    lead: { name: lead.businessName, domain, monthlyVisitors: avgMonthly },
                    competitors: [], // Would need separate competitor domain lookups
                    rawData: swResponse.data
                });
            } catch (swError) {
                console.warn('[SIMILARWEB] API call failed:', swError.message);
                // Fall through to Gemini estimation
            }
        }

        // Gemini-based competitor traffic estimation
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `Du bist ein lokaler SEO-Experte für Berlin Wedding. Schätze den monatlichen Website-Traffic für folgendes Unternehmen und seine Top-3-Wettbewerber:

Unternehmen: ${lead.businessName}
Branche: ${lead.industry || 'Lokal'}
Standort: Berlin Wedding
Website: ${lead.websiteUrl || 'Keine'}

Antworte als JSON:
{
  "lead": {
    "name": "${lead.businessName}",
    "estimatedMonthlyVisitors": number,
    "organicShare": number (0-100),
    "directShare": number (0-100)
  },
  "competitors": [
    {
      "name": "Wettbewerber 1",
      "estimatedMonthlyVisitors": number,
      "organicShare": number,
      "advantage": "Warum sie mehr Traffic haben"
    },
    {
      "name": "Wettbewerber 2",
      "estimatedMonthlyVisitors": number,
      "organicShare": number,
      "advantage": "Warum sie mehr Traffic haben"
    },
    {
      "name": "Wettbewerber 3",
      "estimatedMonthlyVisitors": number,
      "organicShare": number,
      "advantage": "Warum sie mehr Traffic haben"
    }
  ],
  "trafficGapAnalysis": "Kurze Analyse warum der Lead weniger Traffic hat",
  "recommendations": ["Empfehlung 1", "Empfehlung 2"]
}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const estimation = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

        res.json({
            source: 'gemini_estimation',
            ...estimation,
            disclaimer: 'Traffic-Daten sind KI-basierte Schätzungen. Für exakte Daten wird ein SimilarWeb API-Key benötigt.'
        });
    } catch (error) {
        console.error('[COMPETITION] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
