const mongoose = require('mongoose');

const outreachSchema = new mongoose.Schema({
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
    auditId: { type: mongoose.Schema.Types.ObjectId, ref: 'Audit' },
    companyName: { type: String, default: '' },
    email: { type: String, default: '' },
    subject: { type: String, default: '' },
    body: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'sent', 'failed'], default: 'draft' },
}, { timestamps: true });

module.exports = mongoose.model('Outreach', outreachSchema);
