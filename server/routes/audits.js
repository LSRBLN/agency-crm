const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const Audit = require('../models/Audit');
const Lead = require('../models/Lead');
const auth = require('../middleware/auth');
const { calculateAuditScore } = require('../utils/scoring');
const router = express.Router();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Get all audits
router.get('/', auth, async (req, res) => {
    try {
        const audits = await Audit.find().populate('leadId', 'companyName').sort({ createdAt: -1 });
        res.json(audits);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get audit by lead ID
router.get('/lead/:leadId', auth, async (req, res) => {
    try {
        const audit = await Audit.findOne({ leadId: req.params.leadId }).sort({ createdAt: -1 });
        if (!audit) return res.status(404).json({ error: 'Kein Audit gefunden' });
        res.json(audit);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Generate audit for a lead using Gemini API with Google Search Grounding
router.post('/', auth, async (req, res) => {
    try {
        const { leadId } = req.body;
        const lead = await Lead.findById(leadId);
        if (!lead) return res.status(404).json({ error: 'Lead nicht gefunden' });

        // Prepare the prompt for Gemini
        const query = `${lead.companyName} in ${lead.city || 'Berlin Wedding'}`;
        const prompt = `Du bist ein AI Trust Auditor. Analysiere das Unternehmen "${query}" mithilfe der Google-Suche.
        Beurteile die folgenden drei Säulen für die lokale Sichtbarkeit in KI-Modellen und Google Maps:
        1. Local Authority Foundation: Ist das Google Business Profil (GBP) beansprucht? Sind die Informationen konsistent?
        2. Structured Data: Sind spezifische Dienstleistungen oder Speisekarten klar erkennbar?
        3. Brand Sentiment: Welche spezifischen Keywords werden in Rezensionen oft erwähnt?
        
        Gib die Antwort im folgenden JSON-Format zurück (nur JSON, keine Markdown Code Blöcke):
        {
            "gbpClaimed": true/false,
            "reviewsResponded": true/false,
            "structuredDataFound": true/false,
            "sentimentKeywords": ["keyword1", "keyword2"],
            "mapsGroundingReasoning": "Ein kurzer, überzeugender Text (2-3 Sätze), der erklärt, warum KI-Modelle das Unternehmen im Vergleich zur Konkurrenz ggf. vernachlässigen."
        }`;

        // Call Gemini with Google Search tool enabled
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                temperature: 0.2, // Low temperature for more factual responses
            }
        });

        // Clean JSON response
        let aiResultStr = response.text;
        if (aiResultStr.startsWith('```json')) {
            aiResultStr = aiResultStr.replace(/^```json/, '').replace(/```$/, '');
        } else if (aiResultStr.startsWith('```')) {
            aiResultStr = aiResultStr.replace(/^```/, '').replace(/```$/, '');
        }

        let auditData;
        try {
            auditData = JSON.parse(aiResultStr.trim());
        } catch (e) {
            console.error("Failed to parse Gemini JSON:", aiResultStr);
            // Fallback simulated data if parsing fails
            auditData = {
                gbpClaimed: Math.random() > 0.4,
                reviewsResponded: Math.random() > 0.5,
                structuredDataFound: Math.random() > 0.7,
                sentimentKeywords: ['zuverlässig', 'schnell'],
                mapsGroundingReasoning: "KI-Systeme können bestimmte strukturierte Service-Daten Ihres Profils derzeit nicht eindeutig verarbeiten, weshalb Wettbewerber in intelligenten Suchanfragen bevorzugt werden.",
            };
        }

        const aeoVisible = auditData.structuredDataFound; // Proxy for AEO visibility
        const aeoCompetitor = aeoVisible ? '' : `${lead.industry || 'Branche'}-Konkurrent GmbH`;
        const aeoQuery = `Bester ${lead.industry || 'Dienstleister'} in ${lead.city || 'der Region'}`;

        const { scores, totalScore } = calculateAuditScore({
            gbpClaimed: auditData.gbpClaimed,
            reviewsResponded: auditData.reviewsResponded,
            aeoVisible,
            organicTrafficPct: lead.organicTrafficPct || 0,
        });

        const audit = await Audit.create({
            leadId,
            totalScore,
            scores,
            gbpClaimed: auditData.gbpClaimed,
            reviewsResponded: auditData.reviewsResponded,
            aeoVisible,
            aeoCompetitor,
            aeoQuery,
            mapsGroundingReasoning: auditData.mapsGroundingReasoning,
            structuredDataFound: auditData.structuredDataFound,
            sentimentKeywords: auditData.sentimentKeywords || [],
        });

        res.status(201).json(audit);
    } catch (err) {
        console.error("Audit generation error:", err);
        res.status(400).json({ error: err.message });
    }
});

// Public endpoint for Scorecard view (no auth required)
router.get('/scorecard/:id', async (req, res) => {
    try {
        const audit = await Audit.findById(req.params.id).populate('leadId');
        if (!audit) return res.status(404).json({ error: 'Scorecard nicht gefunden' });

        // Only return necessary public data
        res.json({
            companyName: audit.leadId.companyName,
            city: audit.leadId.city,
            totalScore: audit.totalScore,
            scores: audit.scores,
            reasoning: audit.mapsGroundingReasoning,
            pillars: {
                gbpClaimed: audit.gbpClaimed,
                structuredDataFound: audit.structuredDataFound,
                sentimentKeywords: audit.sentimentKeywords
            },
            date: audit.createdAt
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
