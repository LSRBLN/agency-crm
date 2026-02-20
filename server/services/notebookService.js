/**
 * NotebookLM Audio Overview Service
 * Generates podcast-style scripts from audit data using Gemini.
 * (NotebookLM Audio API is not yet publicly available.)
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function generateAudioOverview(auditData) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `Du bist ein Podcast-Host-Duo (Alex und Sarah) das monatliche Visibility-Reports für lokale Unternehmen bespricht. Erstelle ein natürliches Gespräch (ca. 2 Minuten Lesezeit) basierend auf diesen Audit-Daten:

Unternehmen: ${auditData.businessName}
Branche: ${auditData.industry || 'Lokal'}
Standort: ${auditData.location || 'Berlin Wedding'}
Gesamt-Score: ${auditData.overallScore}/100
GBP beansprucht: ${auditData.gbpClaimed ? 'Ja' : 'Nein'}
Rezensionen beantwortet: ${auditData.reviewsResponded ? 'Ja' : 'Nein'}
Schema.org vorhanden: ${auditData.structuredDataFound ? 'Ja' : 'Nein'}
AEO-Score: ${auditData.aeoScore || 'N/A'}/100

Antworte als JSON:
{
  "title": "Podcast-Titel",
  "duration_estimate": "2:30",
  "transcript": [
    {"speaker": "Alex", "text": "..."},
    {"speaker": "Sarah", "text": "..."}
  ],
  "key_insights": ["Insight 1", "Insight 2", "Insight 3"],
  "action_items": ["Action 1", "Action 2"]
}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const podcast = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

        return {
            status: 'script_ready',
            podcast,
            audioUrl: null, // NotebookLM Audio API not yet public - script ready for TTS
            generatedAt: new Date().toISOString()
        };
    } catch (error) {
        console.error('[NOTEBOOK] Error generating audio overview:', error.message);
        return {
            status: 'error',
            podcast: null,
            audioUrl: null,
            error: error.message,
            generatedAt: new Date().toISOString()
        };
    }
}

module.exports = { generateAudioOverview };
