const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Scans a website to extract "Business DNA" (Colors, Fonts, Tone, Brand Voice).
 */
const scanBusinessDNA = async (url) => {
    const prompt = `Du bist der Google Pomelli DNA-Scanner. Analysiere die Website ${url} und extrahiere das Business DNA Profil.
    
    Gib die Antwort im folgenden JSON-Format zurück (nur JSON):
    {
        "primaryColor": "#hex",
        "secondaryColor": "#hex",
        "typography": "Schriftart-Stil (z.B. Serif, Sans-Serif Modern)",
        "brandVoice": "Ein Satz zur Tonalität (z.B. Vertrauenswürdig, Fachlich kompetent)",
        "contentStrategy": "Welche Themen stehen im Fokus?"
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
            primaryColor: "#A78BFA",
            secondaryColor: "#0B0D17",
            typography: "Modern Sans-Serif",
            brandVoice: "Professional & Reliable",
            contentStrategy: "Local Expertise & Trust"
        };
    }
};

module.exports = { scanBusinessDNA };
