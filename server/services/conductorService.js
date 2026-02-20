const fs = require('fs');
const path = require('path');

const TRACKS_DIR = path.join(__dirname, '../tracks');

/**
 * Creates or updates a "Track" for a client.
 * A Track is a Markdown file containing project context, tech stack, and design rules.
 */
const createTrack = async (leadId, context) => {
    const trackPath = path.join(TRACKS_DIR, `${leadId}.md`);

    let content = `# Project Track: ${context.companyName || leadId}\n\n`;
    content += `## Tech Stack\n${context.techStack || 'Not specified'}\n\n`;
    content += `## Design Rules\n${context.designRules || 'Not specified'}\n\n`;
    content += `## Performance Goals\n${context.goals || 'Not specified'}\n\n`;
    content += `## Last Updated\n${new Date().toISOString()}\n`;

    fs.writeFileSync(trackPath, content, 'utf8');
    return { success: true, path: trackPath };
};

/**
 * Retrieves the project context from a Markdown Track file.
 */
const getTrack = async (leadId) => {
    const trackPath = path.join(TRACKS_DIR, `${leadId}.md`);
    if (!fs.existsSync(trackPath)) {
        return null;
    }
    const content = fs.readFileSync(trackPath, 'utf8');
    return content;
};

module.exports = {
    createTrack,
    getTrack
};
