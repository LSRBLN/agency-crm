const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    companyName: { type: String, required: true },
    websiteUrl: { type: String, default: '' },
    estimatedRevenue: { type: Number, default: 0 },
    monthlyVisitors: { type: Number, default: 0 },
    competitorTraffic: { type: String, default: '' },
    directTrafficPct: { type: Number, default: 0 },
    organicTrafficPct: { type: Number, default: 0 },
    priority: { type: String, enum: ['high', 'medium', 'low'], default: 'low' },
    industry: { type: String, default: '' },
    city: { type: String, default: '' },
    email: { type: String, default: '' },
    notes: { type: String, default: '' },
}, { timestamps: true });

// Auto-calculate priority before save
// Auto-calculate priority before save
leadSchema.pre('save', function (next) {
    // If direct traffic is high and organic is very low -> invisible on Google -> high priority
    if (this.directTrafficPct > 50 && this.organicTrafficPct < 20) {
        this.priority = 'high';
    } else if (this.directTrafficPct > 30) {
        this.priority = 'medium';
    } else {
        this.priority = 'low';
    }
    next();
});

module.exports = mongoose.model('Lead', leadSchema);
