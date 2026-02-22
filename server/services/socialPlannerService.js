const { GoogleGenerativeAI } = require('@google/generative-ai');

function getModel() {
    if (!process.env.GEMINI_API_KEY) {
        return null;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    return genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
}

async function generateSocialPost({ businessName, objective, platform, tone, topic }) {
    const model = getModel();
    if (!model) {
        return {
            caption: `${businessName || 'Unternehmen'}: ${topic || objective || 'Update'} – wir helfen euch weiter.`,
            hashtags: ['#marketing', '#agentur', '#growth'],
            imagePrompt: `Professionelles Social Media Motiv für ${businessName || 'ein Unternehmen'}`,
            generatedBy: 'fallback',
        };
    }

    const prompt = `Erstelle einen Social-Media-Post als JSON.
Unternehmen: ${businessName || 'Agentur'}
Plattform: ${platform || 'instagram'}
Ziel: ${objective || 'Leads generieren'}
Ton: ${tone || 'professionell'}
Thema: ${topic || 'Dienstleistungsvorteile'}

Antwort als reines JSON:
{
  "caption": "...",
  "hashtags": ["#..."],
  "imagePrompt": "..."
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    if (!parsed) {
        throw new Error('Social-Post konnte nicht generiert werden');
    }

    return {
        caption: parsed.caption || '',
        hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
        imagePrompt: parsed.imagePrompt || '',
        generatedBy: 'gemini',
    };
}

module.exports = {
    generateSocialPost,
};
