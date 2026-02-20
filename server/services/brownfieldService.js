const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

async function fetchWebsiteHTML(url) {
    try {
        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; AgencyCRM-Analyzer/1.0)',
                'Accept': 'text/html'
            },
            maxRedirects: 5
        });
        // Limit to first 15000 chars to stay within token limits
        return response.data.substring(0, 15000);
    } catch (error) {
        console.warn(`[BROWNFIELD] Failed to fetch ${url}: ${error.message}`);
        return null;
    }
}

async function analyzeWebsite(url) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Actually fetch the HTML
    const html = await fetchWebsiteHTML(url);

    const prompt = `Du bist ein Web-Analyse-Experte spezialisiert auf AEO (Answer Engine Optimization) und lokale Sichtbarkeit.

${html ? `Hier ist der tatsächliche HTML-Quellcode der Website ${url}:

\`\`\`html
${html}
\`\`\`

Analysiere den TATSÄCHLICHEN Code oben.` : `Die Website ${url} konnte nicht abgerufen werden. Analysiere basierend auf der URL und deinem Wissen.`}

Erstelle eine detaillierte Brownfield-Analyse mit folgenden Schwerpunkten:

1. **Performance-Probleme**: Render-blocking Resources, große Bilder, fehlende Lazy Loading
2. **AEO/Schema.org**: Vorhandene strukturierte Daten, fehlende Schema-Typen (LocalBusiness, FAQ, etc.)
3. **CRO (Conversion Rate)**: CTAs, Formulare, Trust-Signale, Mobile-Optimierung
4. **Technischer Stack**: Erkannte Frameworks, CMS, Libraries
5. **Sicherheit**: HTTPS, CSP-Header, veraltete Libraries
6. **Lokale SEO**: NAP-Konsistenz, Google Maps Einbindung, lokale Keywords

Antworte als JSON:
{
  "techStack": {
    "framework": "erkanntes Framework",
    "cms": "erkanntes CMS oder null",
    "libraries": ["lib1", "lib2"],
    "hosting": "erkannter Hoster oder null"
  },
  "performance": {
    "score": 0-100,
    "issues": ["Issue 1", "Issue 2"],
    "recommendations": ["Empfehlung 1", "Empfehlung 2"]
  },
  "aeo": {
    "score": 0-100,
    "existingSchema": ["vorhandene Schema-Typen"],
    "missingSchema": ["fehlende Schema-Typen"],
    "recommendations": ["AEO-Empfehlung 1", "AEO-Empfehlung 2"]
  },
  "cro": {
    "score": 0-100,
    "issues": ["CRO Issue 1"],
    "recommendations": ["CRO Empfehlung 1"]
  },
  "localSeo": {
    "score": 0-100,
    "napFound": true,
    "mapsEmbedded": true,
    "localKeywords": ["keyword1", "keyword2"],
    "recommendations": ["Lokale SEO Empfehlung 1"]
  },
  "security": {
    "https": true,
    "issues": ["Sicherheitsproblem 1"]
  },
  "overallScore": 0-100,
  "priorityActions": ["Priorität 1", "Priorität 2", "Priorität 3"],
  "htmlAnalyzed": true
}`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : { error: 'Failed to parse analysis', overallScore: 0 };
    } catch (error) {
        console.error('[BROWNFIELD] Analysis error:', error.message);
        return { error: error.message, overallScore: 0 };
    }
}

module.exports = { analyzeWebsite, fetchWebsiteHTML };
