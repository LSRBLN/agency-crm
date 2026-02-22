const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

router.use(auth);

function getModel() {
    if (!process.env.GEMINI_API_KEY) {
        const error = new Error('GEMINI_API_KEY fehlt');
        error.status = 503;
        throw error;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

router.post('/guided-learning', async (req, res) => {
    try {
        const topic = req.body?.topic || 'AI Overviews SEO Optimierung';
        const context = req.body?.context || '';

        const prompt = `Du bist ein Mentor für Agenturinhaber. Erkläre das Thema strukturiert, praxisnah und in 5 umsetzbaren Schritten.
Thema: ${topic}
Kontext: ${context}
Antwort auf Deutsch.`;

        const model = getModel();
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        res.json({ topic, lesson: text });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message || 'Guided Learning fehlgeschlagen' });
    }
});

router.post('/lead-list', async (req, res) => {
    try {
        const region = req.body?.region || 'Berlin';
        const industry = req.body?.industry || 'Dienstleister';
        const count = Number(req.body?.count || 20);

        const prompt = `Erstelle eine Liste mit ${count} potenziellen Leads für eine Agentur.
Region: ${region}
Branche: ${industry}
Gib realistisch klingende Beispiel-Datensätze als JSON-Array zurück mit Feldern:
name, company, role, city, email, reason.
Nur JSON ausgeben.`;

        const model = getModel();
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const match = text.match(/\[[\s\S]*\]/);
        const leads = match ? JSON.parse(match[0]) : [];

        res.json({ region, industry, countRequested: count, leads });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message || 'Lead-Liste konnte nicht generiert werden' });
    }
});

module.exports = router;
