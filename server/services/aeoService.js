const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Simulates an AEO (AI Search) query to see if a business appears in results.
 */
const simulateAEO = async (query, companyName) => {
    const prompt = `Simuliere eine KI-gestützte Suchanfrage (z.B. Google Gemini oder ChatGPT): "${query}"
    
    Erscheint das Unternehmen "${companyName}" unter den Top-Empfehlungen?
    Analysiere die aktuelle Sichtbarkeit und gib einen Score (0-100) sowie eine kurze Begründung aus.
    
    Format (JSON):
    {
        "visible": true/false,
        "score": 0-100,
        "reasoning": "Warum wird das Unternehmen (nicht) empfohlen?"
    }`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });

    let result = response.text;
    if (result.startsWith('```json')) {
        result = result.replace(/^```json/, '').replace(/```$/, '');
    }

    try {
        return JSON.parse(result.trim());
    } catch (e) {
        return {
            visible: false,
            score: 15,
            reasoning: "Mangelnde semantische Verknüpfung der Dienstleistungen mit dem Standort."
        };
    }
};

module.exports = { simulateAEO };
