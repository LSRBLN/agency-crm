const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Analyzes an existing website or code snippet to generate optimization suggestions.
 */
const analyzeWebsite = async (url, type = 'url') => {
    const prompt = `Du bist ein Senior AI Consultant. Analysiere die folgende ${type === 'url' ? 'Website URL' : 'Code-Basis'}: ${url}
    
    Generiere 3 konkrete Optimierungsvorschläge basierend auf:
    1. Performance & Core Web Vitals
    2. KI-Sichtbarkeit (AEO & Schema.org)
    3. Conversion-Rate-Optimierung (CRO)
    
    Gib die Antwort als kompakte Markdown-Liste zurück.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });

    return response.text;
};

module.exports = {
    analyzeWebsite
};
