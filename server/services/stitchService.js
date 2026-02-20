const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, '..', 'tracks', 'templates');

/**
 * Stitch Loop Skill - MCP-based design variant generator
 * Takes a successful template (e.g., for Physiotherapy) and generates
 * automated variants for new clients in different industries.
 */

async function ensureTemplatesDir() {
    try {
        await fs.mkdir(TEMPLATES_DIR, { recursive: true });
    } catch (e) { /* exists */ }
}

async function saveTemplate(templateName, templateData) {
    await ensureTemplatesDir();
    const filePath = path.join(TEMPLATES_DIR, `${templateName.replace(/[^a-zA-Z0-9-_]/g, '_')}.json`);
    await fs.writeFile(filePath, JSON.stringify(templateData, null, 2));
    console.log(`[STITCH MCP] Template saved: ${filePath}`);
    return filePath;
}

async function loadTemplate(templateName) {
    const filePath = path.join(TEMPLATES_DIR, `${templateName.replace(/[^a-zA-Z0-9-_]/g, '_')}.json`);
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        console.warn(`[STITCH MCP] Template not found: ${templateName}`);
        return null;
    }
}

async function listTemplates() {
    await ensureTemplatesDir();
    try {
        const files = await fs.readdir(TEMPLATES_DIR);
        return files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
    } catch (e) {
        return [];
    }
}

async function generateVariant(sourceTemplateName, targetBusiness) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Load source template if it exists
    const sourceTemplate = await loadTemplate(sourceTemplateName);

    const prompt = `Du bist ein Web-Design-Experte und arbeitest mit dem "Stitch Loop" System.
  
${sourceTemplate ? `Quell-Template (erfolgreich für ${sourceTemplateName}):
${JSON.stringify(sourceTemplate, null, 2)}` : `Kein Quell-Template vorhanden. Erstelle ein neues Design-Konzept.`}

Ziel-Unternehmen:
- Name: ${targetBusiness.businessName}
- Branche: ${targetBusiness.industry}
- Standort: ${targetBusiness.location || 'Berlin Wedding'}
- Website: ${targetBusiness.websiteUrl || 'Keine'}
- Marken-DNA: ${JSON.stringify(targetBusiness.brandDNA || {})}

Erstelle eine angepasste Design-Variante für dieses Unternehmen. Behalte die bewährte Struktur des Quell-Templates bei, passe aber Farben, Texte, Bilder und CTAs an die neue Branche an.

Antworte als JSON:
{
  "variant_name": "Name der Variante",
  "source_template": "${sourceTemplateName}",
  "target_business": "${targetBusiness.businessName}",
  "design": {
    "layout": "Beschreibung des Layouts",
    "hero_section": {
      "headline": "Hauptüberschrift",
      "subheadline": "Unterüberschrift",
      "cta_text": "CTA Button Text",
      "background_style": "Hintergrund-Beschreibung"
    },
    "color_scheme": {
      "primary": "#hex",
      "secondary": "#hex",
      "accent": "#hex",
      "background": "#hex",
      "text": "#hex"
    },
    "typography": {
      "heading_font": "Font Name",
      "body_font": "Font Name"
    },
    "sections": [
      {"name": "Section Name", "purpose": "Zweck", "content_outline": "Inhalt"}
    ],
    "seo_elements": {
      "title_tag": "SEO Title",
      "meta_description": "Meta Description",
      "schema_type": "LocalBusiness / etc.",
      "target_keywords": ["keyword1", "keyword2"]
    }
  },
  "aeo_optimizations": [
    "AEO-Optimierung 1",
    "AEO-Optimierung 2"
  ],
  "estimated_build_time": "X Stunden"
}`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const variant = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

        if (variant) {
            // Auto-save the generated variant as a new template
            await saveTemplate(`${targetBusiness.businessName}_variant`, variant);
        }

        return {
            success: true,
            variant,
            sourceTemplate: sourceTemplateName,
            generatedAt: new Date().toISOString()
        };
    } catch (error) {
        console.error('[STITCH MCP] Error generating variant:', error.message);
        return {
            success: false,
            error: error.message,
            sourceTemplate: sourceTemplateName
        };
    }
}

// MCP-style resource handler - provides context about available templates
async function mcpGetResources() {
    const templates = await listTemplates();
    return {
        resources: templates.map(name => ({
            uri: `stitch://templates/${name}`,
            name,
            mimeType: 'application/json'
        }))
    };
}

module.exports = {
    saveTemplate,
    loadTemplate,
    listTemplates,
    generateVariant,
    mcpGetResources
};
