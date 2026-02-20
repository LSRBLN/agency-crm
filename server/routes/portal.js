const express = require('express');
const auth = require('../middleware/auth');
const Lead = require('../models/Lead');
const Audit = require('../models/Audit');
const router = express.Router();

// Get client portal data (progress overview)
router.get('/', auth, async (req, res) => {
    try {
        const totalLeads = await Lead.countDocuments();
        const totalAudits = await Audit.countDocuments();
        const highPriority = await Lead.countDocuments({ priority: 'high' });
        const avgScore = await Audit.aggregate([{ $group: { _id: null, avg: { $avg: '$totalScore' } } }]);

        res.json({
            totalLeads,
            totalAudits,
            highPriority,
            averageScore: avgScore[0]?.avg || 0,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
