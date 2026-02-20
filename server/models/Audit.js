const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema({
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
    totalScore: { type: Number, default: 0 },
    scores: {
        gbp: { type: Number, default: 0 },      // max 25
        reviews: { type: Number, default: 0 },   // max 25
        aeo: { type: Number, default: 0 },       // max 30
        organic: { type: Number, default: 0 },   // max 20
    },
    gbpClaimed: { type: Boolean, default: false },
    reviewsResponded: { type: Boolean, default: false },
    aeoVisible: { type: Boolean, default: false },
    aeoCompetitor: { type: String, default: '' },
    aeoQuery: { type: String, default: '' },
    mapsGroundingReasoning: { type: String, default: '' },
    structuredDataFound: { type: Boolean, default: false },
    sentimentKeywords: { type: [String], default: [] },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

module.exports = mongoose.model('Audit', auditSchema);
