const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { saveTemplate, loadTemplate, listTemplates, generateVariant, mcpGetResources } = require('../services/stitchService');

// List all available templates
router.get('/templates', auth, async (req, res) => {
    try {
        const templates = await listTemplates();
        res.json({ success: true, templates });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get a specific template
router.get('/templates/:name', auth, async (req, res) => {
    try {
        const template = await loadTemplate(req.params.name);
        if (!template) return res.status(404).json({ error: 'Template not found' });
        res.json({ success: true, template });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Save a new template
router.post('/templates', auth, async (req, res) => {
    try {
        const { name, data } = req.body;
        if (!name || !data) return res.status(400).json({ error: 'name and data required' });
        const filePath = await saveTemplate(name, data);
        res.json({ success: true, filePath });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Generate a variant from a source template for a target business
router.post('/generate-variant', auth, async (req, res) => {
    try {
        const { sourceTemplate, targetBusiness } = req.body;
        if (!sourceTemplate || !targetBusiness) {
            return res.status(400).json({ error: 'sourceTemplate and targetBusiness required' });
        }
        const result = await generateVariant(sourceTemplate, targetBusiness);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// MCP-style resource listing
router.get('/mcp/resources', auth, async (req, res) => {
    try {
        const resources = await mcpGetResources();
        res.json(resources);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
