const fs = require('fs').promises;
const path = require('path');

const TRACKS_DIR = path.join(__dirname, '..', 'tracks');

async function ensureTracksDir() {
    try {
        await fs.mkdir(TRACKS_DIR, { recursive: true });
    } catch (e) { /* exists */ }
}

async function createTrack(leadId, leadData) {
    await ensureTracksDir();
    const filePath = path.join(TRACKS_DIR, `${leadId}.md`);

    const content = `# ${leadData.businessName || 'Unknown Business'}
## Persistent Track — Gemini Conductor

**Lead ID:** ${leadId}
**Erstellt:** ${new Date().toISOString()}
**Standort:** ${leadData.location || leadData.city || 'Berlin Wedding'}
**Branche:** ${leadData.industry || 'N/A'}
**Website:** ${leadData.websiteUrl || 'N/A'}
**Kontakt:** ${leadData.contactName || 'N/A'} (${leadData.email || 'N/A'})

---

### Tech-Stack
${leadData.techStack || 'Noch nicht analysiert'}

### Design-Regeln
${leadData.designRules || 'Noch nicht definiert'}

### Marken-DNA
${leadData.brandDNA ? `- **Primärfarbe:** ${leadData.brandDNA.primaryColor || 'N/A'}
- **Sekundärfarbe:** ${leadData.brandDNA.secondaryColor || 'N/A'}
- **Typografie:** ${leadData.brandDNA.typography || 'N/A'}
- **Brand Voice:** ${leadData.brandDNA.brandVoice || 'N/A'}
- **Content-Strategie:** ${leadData.brandDNA.contentStrategy || 'N/A'}` : 'Noch nicht extrahiert (Pomelli-Scan ausstehend)'}

### Spezifische Ziele
${leadData.goals || '- Sichtbarkeit in KI-Suchmaschinen erhöhen\n- Lokale Auffindbarkeit verbessern\n- Mehr qualifizierte Anfragen generieren'}

---

### Audit-Historie
_Noch keine Audits durchgeführt._

---

### Notizen
_Keine Notizen._
`;

    await fs.writeFile(filePath, content);
    console.log(`[CONDUCTOR] Track created: ${filePath}`);
    return filePath;
}

async function updateTrack(leadId, section, content) {
    await ensureTracksDir();
    const filePath = path.join(TRACKS_DIR, `${leadId}.md`);

    try {
        let existing = await fs.readFile(filePath, 'utf-8');
        const timestamp = new Date().toISOString();

        switch (section) {
            case 'audit':
                existing = existing.replace(
                    /### Audit-Historie\n[\s\S]*?(?=\n---)/,
                    `### Audit-Historie\n${existing.includes('Noch keine Audits') ? '' : existing.match(/### Audit-Historie\n([\s\S]*?)(?=\n---)/)?.[1] || ''}\n#### Audit vom ${timestamp}\n${content}\n`
                );
                break;
            case 'techStack':
                existing = existing.replace(
                    /### Tech-Stack\n[\s\S]*?(?=\n### Design)/,
                    `### Tech-Stack\n${content}\n\n`
                );
                break;
            case 'designRules':
                existing = existing.replace(
                    /### Design-Regeln\n[\s\S]*?(?=\n### Marken)/,
                    `### Design-Regeln\n${content}\n\n`
                );
                break;
            case 'brandDNA':
                existing = existing.replace(
                    /### Marken-DNA\n[\s\S]*?(?=\n### Spezifische)/,
                    `### Marken-DNA\n${content}\n\n`
                );
                break;
            case 'notes':
                existing = existing.replace(
                    /### Notizen\n[\s\S]*$/,
                    `### Notizen\n${content}\n`
                );
                break;
            default:
                existing += `\n\n### ${section} (${timestamp})\n${content}\n`;
        }

        await fs.writeFile(filePath, existing);
        console.log(`[CONDUCTOR] Track updated: ${filePath} [${section}]`);
        return filePath;
    } catch (e) {
        console.warn(`[CONDUCTOR] Track not found for update, creating new: ${leadId}`);
        return createTrack(leadId, { businessName: 'Unknown' });
    }
}

async function getTrack(leadId) {
    const filePath = path.join(TRACKS_DIR, `${leadId}.md`);
    try {
        return await fs.readFile(filePath, 'utf-8');
    } catch (e) {
        return null;
    }
}

async function listTracks() {
    await ensureTracksDir();
    try {
        const files = await fs.readdir(TRACKS_DIR);
        return files.filter(f => f.endsWith('.md')).map(f => ({
            leadId: f.replace('.md', ''),
            filename: f
        }));
    } catch (e) {
        return [];
    }
}

module.exports = { createTrack, updateTrack, getTrack, listTracks };
