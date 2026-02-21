const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { supabase } = require('../services/supabaseClient');
const auth = require('../middleware/auth');

router.use(auth);

function ensureDb(res) {
    if (!supabase) {
        res.status(503).json({ error: 'Datenbank nicht konfiguriert' });
        return false;
    }
    return true;
}

function mapAudit(record) {
    const details = record.details || {};
    const totalScore = typeof record.totalScore === 'number'
        ? record.totalScore
        : (typeof record.totalscore === 'number' ? record.totalscore : 0);

    return {
        ...record,
        _id: record.id,
        businessName: record.business_name,
        score: totalScore,
        aeoScore: details.aeoScore ?? null,
        mapsScore: details.mapsScore ?? null,
        organicScore: details.organicScore ?? null,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
    };
}

function getCompanyProfileDefaults() {
    return {
        companyName: 'Mustermann Consulting',
        ownerName: 'Max Mustermann',
        street: 'Musterstraße 1',
        zip: '10115',
        city: 'Berlin',
        country: 'Deutschland',
        email: 'info@mustermann.de',
        phone: '+49 30 000000',
        website: 'https://mustermann.de',
        taxId: '12/345/67890',
        vatId: 'DE123456789',
        logoUrl: 'server/routes/ChatGPT Image 21. Feb. 2026, 19_51_41.png',
    };
}

function resolveLogoPath(logoUrl) {
    const candidate = String(logoUrl || '').trim();
    if (!candidate) return null;

    if (path.isAbsolute(candidate)) {
        return fs.existsSync(candidate) ? candidate : null;
    }

    const resolved = path.resolve(process.cwd(), candidate);
    return fs.existsSync(resolved) ? resolved : null;
}

async function getCompanyProfile() {
    const defaults = getCompanyProfileDefaults();
    const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('type', 'app_setting')
        .eq('title', 'Setting company_profile')
        .maybeSingle();

    if (error) throw error;
    if (!data?.description) return defaults;

    const payload = safeJsonParse(data.description);
    return { ...defaults, ...payload };
}

function safeJsonParse(value) {
    if (!value || typeof value !== 'string') return {};
    try {
        return JSON.parse(value);
    } catch {
        return {};
    }
}

function formatCurrency(value) {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value || 0);
}

function buildOnsiteRecommendations({ contact, enrichment, research, profile }) {
    const recommendations = [];

    const searchShare = Number(enrichment?.summary?.searchShare || 0);
    const latestVisits = Number(enrichment?.summary?.latestVisits || 0);
    const hasPhone = Boolean(contact.phone);
    const hasEmail = Boolean(contact.email);
    const socialCount = Array.isArray(research?.socialLinks) ? research.socialLinks.length : 0;
    const hasMetaDescription = Boolean(research?.metaDescription);
    const hasPainPoints = Array.isArray(profile?.painPoints) && profile.painPoints.length > 0;

    if (searchShare < 0.25) {
        recommendations.push({
            area: 'SEO & AI-Sichtbarkeit',
            issue: 'Geringer organischer Suchanteil',
            optimization: 'Keyword-Cluster, lokale Landingpages und AEO-Struktur (FAQ/Schema) aufbauen',
            expectedImpact: 'Mehr qualifizierte Anfragen über Google & AI Overviews',
            priority: 'hoch',
        });
    }

    if (!hasMetaDescription) {
        recommendations.push({
            area: 'Website Conversion Basis',
            issue: 'Meta-Beschreibung fehlt oder ist unklar',
            optimization: 'CTR-starke Meta Titles/Descriptions für Kernseiten definieren',
            expectedImpact: 'Mehr Klickrate auf Suchergebnisse',
            priority: 'mittel',
        });
    }

    if (!hasPhone || !hasEmail) {
        recommendations.push({
            area: 'Lead-Erfassung',
            issue: 'Kontaktkanäle unvollständig',
            optimization: 'Kontaktformular, Rückruf-CTA und WhatsApp/Telefon-CTA prominent platzieren',
            expectedImpact: 'Höhere Abschlussrate aus Website-Traffic',
            priority: 'hoch',
        });
    }

    if (socialCount === 0) {
        recommendations.push({
            area: 'Trust & Branding',
            issue: 'Keine klaren Social Signale erkannt',
            optimization: 'LinkedIn/Instagram sauber verknüpfen, Content-Plan mit Case-Posts starten',
            expectedImpact: 'Mehr Vertrauen im Erstgespräch und kürzerer Sales Cycle',
            priority: 'mittel',
        });
    }

    if (!hasPainPoints) {
        recommendations.push({
            area: 'Sales Messaging',
            issue: 'Pain Points nicht strukturiert erfasst',
            optimization: 'Kurzdiagnose-Formular mit 5 Qualifikationsfragen etablieren',
            expectedImpact: 'Bessere Angebotsgenauigkeit und höhere Win-Rate',
            priority: 'mittel',
        });
    }

    if (recommendations.length === 0) {
        recommendations.push({
            area: 'Skalierung',
            issue: 'Grundlagen sind vorhanden',
            optimization: 'Conversion-Optimierung, Remarketing und CRM-Automation als nächster Hebel',
            expectedImpact: 'Stabiles Wachstum bei planbaren Akquisekosten',
            priority: 'mittel',
        });
    }

    const baseLeadPotential = latestVisits > 0 ? Math.max(4, Math.round(latestVisits * 0.0035)) : 8;
    const improvementFactor = recommendations.filter((item) => item.priority === 'hoch').length >= 2 ? 0.35 : 0.2;
    const additionalLeadsMonthly = Math.max(2, Math.round(baseLeadPotential * improvementFactor));
    const assumedCloseRate = 0.18;
    const assumedAvgDealValue = 2500;
    const additionalRevenueMonthly = Math.round(additionalLeadsMonthly * assumedCloseRate * assumedAvgDealValue);

    const quickPitch = [
        `Wir sehen kurzfristig ${additionalLeadsMonthly}+ zusätzliche qualifizierte Leads pro Monat als realistisches Potenzial.`,
        `Bei konservativer Abschlussquote entspricht das ca. ${formatCurrency(additionalRevenueMonthly)} zusätzlichem Monatsumsatz.`,
        'Die größten Hebel sind die priorisierten Maßnahmen aus der Sofortanalyse.',
    ];

    return {
        recommendations,
        benefits: {
            additionalLeadsMonthly,
            additionalRevenueMonthly,
            assumptions: {
                closeRate: assumedCloseRate,
                averageDealValue: assumedAvgDealValue,
            },
        },
        quickPitch,
    };
}

async function getLatestActivityByType(contactId, type) {
    const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('contact_id', contactId)
        .eq('type', type)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return data || null;
}

async function buildOnsiteAnalysisPayload(contactId) {
    const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single();

    if (contactError || !contact) {
        const err = new Error('Kontakt nicht gefunden');
        err.status = 404;
        throw err;
    }

    const [enrichmentAct, researchAct, profileAct] = await Promise.all([
        getLatestActivityByType(contactId, 'similarweb_enrichment'),
        getLatestActivityByType(contactId, 'lead_research'),
        getLatestActivityByType(contactId, 'lead_profile'),
    ]);

    const enrichment = enrichmentAct ? safeJsonParse(enrichmentAct.description) : null;
    const research = researchAct ? safeJsonParse(researchAct.description) : null;
    const profile = profileAct ? safeJsonParse(profileAct.description) : null;

    const analysis = buildOnsiteRecommendations({ contact, enrichment, research, profile });

    return {
        contact,
        generatedAt: new Date().toISOString(),
        analysis,
        context: {
            hasEnrichment: Boolean(enrichment),
            hasResearch: Boolean(research),
            hasProfile: Boolean(profile),
        },
    };
}

// GET all audits
router.get('/', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const { data, error } = await supabase
            .from('audits')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json((data || []).map(mapAudit));
    } catch (err) {
        res.status(500).json({ error: 'Audits konnten nicht geladen werden' });
    }
});

// GET single audit
router.get('/:id', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const { data, error } = await supabase
            .from('audits')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Audit nicht gefunden' });
        }

        res.json(mapAudit(data));
    } catch (err) {
        res.status(500).json({ error: 'Audit konnte nicht geladen werden' });
    }
});

// POST create audit
router.post('/', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const payload = {
            lead_id: req.body.lead_id || null,
            business_name: req.body.businessName || req.body.business_name || null,
            url: req.body.url || null,
            status: req.body.status || 'in_progress',
            totalScore: Number(req.body.score || req.body.totalScore || 0),
            details: req.body.details || null,
            updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from('audits')
            .insert([payload])
            .select('*')
            .single();

        if (error || !data) {
            throw error || new Error('Audit konnte nicht erstellt werden');
        }

        res.status(201).json(mapAudit(data));
    } catch (err) {
        res.status(500).json({ error: 'Audit konnte nicht erstellt werden' });
    }
});

// POST run audit
router.post('/:id/run', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const updates = {
            status: 'completed',
            updated_at: new Date().toISOString(),
        };

        if (req.body.details) {
            updates.details = req.body.details;
        }

        if (req.body.score !== undefined || req.body.totalScore !== undefined) {
            updates.totalScore = Number(req.body.score ?? req.body.totalScore ?? 0);
        }

        const { data, error } = await supabase
            .from('audits')
            .update(updates)
            .eq('id', req.params.id)
            .select('*')
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Audit nicht gefunden' });
        }

        res.json(mapAudit(data));
    } catch (err) {
        res.status(500).json({ error: 'Audit konnte nicht ausgeführt werden' });
    }
});

router.post('/trust-prospecting/:contactId', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const contactId = req.params.contactId;

        const { data: contact, error: contactError } = await supabase
            .from('contacts')
            .select('*')
            .eq('id', contactId)
            .single();

        if (contactError || !contact) {
            return res.status(404).json({ error: 'Kontakt nicht gefunden' });
        }

        const { data: enrichments, error: enrichmentError } = await supabase
            .from('activities')
            .select('*')
            .eq('type', 'similarweb_enrichment')
            .eq('contact_id', contactId)
            .order('created_at', { ascending: false })
            .limit(1);

        if (enrichmentError) throw enrichmentError;

        const latestEnrichment = Array.isArray(enrichments) && enrichments.length ? enrichments[0] : null;
        let enrichmentDetails = null;
        if (latestEnrichment?.description) {
            try {
                enrichmentDetails = JSON.parse(latestEnrichment.description);
            } catch {
                enrichmentDetails = null;
            }
        }

        const checks = [
            {
                key: 'website_presence',
                label: 'Website vorhanden',
                passed: Boolean(contact.company && String(contact.company).includes('.')),
                recommendation: 'Domain hinterlegen und technische Basis prüfen',
            },
            {
                key: 'contact_data',
                label: 'Kontaktangaben vollständig',
                passed: Boolean(contact.email || contact.phone),
                recommendation: 'E-Mail oder Telefon ergänzen',
            },
            {
                key: 'ai_visibility',
                label: 'AI-Search Sichtbarkeit',
                passed: Number(enrichmentDetails?.summary?.searchShare || 0) >= 0.2,
                recommendation: 'Strukturierte Inhalte für AI Overviews aufbauen',
            },
            {
                key: 'traffic_health',
                label: 'Traffic-Basis',
                passed: Number(enrichmentDetails?.summary?.latestVisits || 0) > 1000,
                recommendation: 'SEO/Content-Engine aufsetzen und Keywords clustern',
            },
            {
                key: 'review_signal',
                label: 'Review-Signal / Reputation',
                passed: false,
                recommendation: 'Bewertungsanfragen automatisieren und GBP optimieren',
            },
            {
                key: 'chat_widget',
                label: 'Chat-/Agent-Widget',
                passed: false,
                recommendation: 'AI Chat-Widget auf Website integrieren',
            },
        ];

        const totalScore = Math.round((checks.filter((check) => check.passed).length / checks.length) * 100);
        const gaps = checks.filter((check) => !check.passed).map((check) => ({
            key: check.key,
            label: check.label,
            recommendation: check.recommendation,
        }));

        const details = {
            trustAudit: true,
            checks,
            gaps,
            enrichmentSummary: enrichmentDetails?.summary || null,
            generatedAt: new Date().toISOString(),
        };

        const payload = {
            lead_id: contactId,
            business_name: contact.company || contact.name || 'Unbekannt',
            url: enrichmentDetails?.domain ? `https://${enrichmentDetails.domain}` : null,
            status: 'completed',
            totalScore,
            details,
            updated_at: new Date().toISOString(),
        };

        const { data: audit, error: auditError } = await supabase
            .from('audits')
            .insert([payload])
            .select('*')
            .single();

        if (auditError || !audit) {
            throw auditError || new Error('Trust Audit konnte nicht erstellt werden');
        }

        res.status(201).json(mapAudit(audit));
    } catch (err) {
        res.status(500).json({ error: 'Trust Prospecting Audit fehlgeschlagen' });
    }
});

router.post('/onsite-analysis/:contactId', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const contactId = req.params.contactId;
        const payload = await buildOnsiteAnalysisPayload(contactId);

        await supabase.from('activities').insert([{
            title: `Onsite Analysis ${payload.contact?.name || contactId}`,
            type: 'onsite_analysis',
            description: JSON.stringify(payload),
            completed: true,
            contact_id: contactId,
            created_at: new Date().toISOString(),
        }]);

        res.json(payload);
    } catch (err) {
        res.status(500).json({ error: 'Vor-Ort Analyse fehlgeschlagen' });
    }
});

router.get('/onsite-analysis/:contactId/pdf', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const contactId = req.params.contactId;
        let analysisPayload = null;

        const latestOnsite = await getLatestActivityByType(contactId, 'onsite_analysis');
        if (latestOnsite) {
            analysisPayload = safeJsonParse(latestOnsite.description);
        }

        if (!analysisPayload?.analysis || !analysisPayload?.contact) {
            analysisPayload = await buildOnsiteAnalysisPayload(contactId);
        }

        const profile = await getCompanyProfile();

        const filename = `onsite-analyse-${String(analysisPayload.contact?.name || contactId)
            .toLowerCase()
            .replace(/[^a-z0-9-_]+/g, '-')}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(res);

        const logoPath = resolveLogoPath(profile.logoUrl);
        if (logoPath) {
            try {
                doc.image(logoPath, 420, 45, { fit: [120, 60], align: 'right' });
            } catch {
            }
        }

        doc.fontSize(18).text(profile.companyName || 'Ihre Agentur', { align: 'left' });
        doc.fontSize(10).fillColor('#666666');
        const addressLine = [profile.street, `${profile.zip} ${profile.city}`.trim(), profile.country].filter(Boolean).join(', ');
        if (addressLine) doc.text(addressLine);
        const contactLine = [profile.email, profile.phone, profile.website].filter(Boolean).join(' | ');
        if (contactLine) doc.text(contactLine);
        if (profile.ownerName) doc.text(`Ansprechpartner: ${profile.ownerName}`);
        const legalLine = [
            profile.taxId ? `Steuernr.: ${profile.taxId}` : '',
            profile.vatId ? `USt-ID: ${profile.vatId}` : '',
        ].filter(Boolean).join(' | ');
        if (legalLine) doc.text(legalLine);
        doc.moveDown(1.2);

        doc.fillColor('#000000').fontSize(16).text('Vor-Ort Potenzialanalyse', { align: 'left' });
        doc.fontSize(11).text(`Kunde: ${analysisPayload.contact?.name || '-'} (${analysisPayload.contact?.company || '-'})`);
        doc.text(`Erstellt am: ${analysisPayload.generatedAt ? new Date(analysisPayload.generatedAt).toLocaleString('de-DE') : '-'}`);
        doc.moveDown(1);

        doc.fontSize(13).text('Geschätztes Potenzial', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11)
            .text(`Zusätzliche Leads / Monat: ${analysisPayload.analysis?.benefits?.additionalLeadsMonthly ?? '-'}`)
            .text(`Geschätzter Zusatzumsatz / Monat: ${formatCurrency(analysisPayload.analysis?.benefits?.additionalRevenueMonthly || 0)}`);
        doc.moveDown(1);

        doc.fontSize(13).text('Empfohlene Optimierungen', { underline: true });
        doc.moveDown(0.6);

        (analysisPayload.analysis?.recommendations || []).forEach((item, index) => {
            doc.fontSize(11).fillColor('#000000').text(`${index + 1}. ${item.area} (${item.priority})`);
            doc.fontSize(10).fillColor('#444444').text(`Problem: ${item.issue}`);
            doc.text(`Maßnahme: ${item.optimization}`);
            doc.text(`Nutzen: ${item.expectedImpact}`);
            doc.moveDown(0.5);
        });

        doc.moveDown(0.6);
        doc.fontSize(13).fillColor('#000000').text('Gesprächs-Pitch', { underline: true });
        doc.moveDown(0.5);
        (analysisPayload.analysis?.quickPitch || []).forEach((line) => {
            doc.fontSize(10).fillColor('#444444').text(`• ${line}`);
        });

        doc.moveDown(1.2);
        doc.fontSize(9).fillColor('#666666').text('Diese Analyse ist eine indikative Potenzialbewertung auf Basis verfügbarer Signale und ersetzt keine betriebswirtschaftliche Detailkalkulation.');

        doc.end();
    } catch (err) {
        if (!res.headersSent) {
            res.status(err.status || 500).json({ error: 'PDF konnte nicht erstellt werden' });
        }
    }
});

router.get('/onsite-analysis/:contactId/offer-pdf', async (req, res) => {
    if (!ensureDb(res)) return;

    try {
        const contactId = req.params.contactId;
        let analysisPayload = null;

        const latestOnsite = await getLatestActivityByType(contactId, 'onsite_analysis');
        if (latestOnsite) {
            analysisPayload = safeJsonParse(latestOnsite.description);
        }

        if (!analysisPayload?.analysis || !analysisPayload?.contact) {
            analysisPayload = await buildOnsiteAnalysisPayload(contactId);
        }

        const profile = await getCompanyProfile();
        const setupFee = Number(req.query.setupFee || profile.offerSetupFee || 0);
        const monthlyRetainer = Number(req.query.monthlyRetainer || profile.offerMonthlyRetainer || 0);
        const termMonths = Number(req.query.termMonths || profile.offerTermMonths || 6);
        const totalValue = setupFee + (monthlyRetainer * termMonths);

        const filename = `angebot-${String(analysisPayload.contact?.name || contactId)
            .toLowerCase()
            .replace(/[^a-z0-9-_]+/g, '-')}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        const doc = new PDFDocument({ margin: 50 });
        doc.pipe(res);

        const logoPath = resolveLogoPath(profile.logoUrl);
        if (logoPath) {
            try {
                doc.image(logoPath, 420, 45, { fit: [120, 60], align: 'right' });
            } catch {
            }
        }

        doc.fontSize(18).text(profile.companyName || 'Ihre Agentur', { align: 'left' });
        doc.fontSize(10).fillColor('#666666');
        const addressLine = [profile.street, `${profile.zip} ${profile.city}`.trim(), profile.country].filter(Boolean).join(', ');
        if (addressLine) doc.text(addressLine);
        const contactLine = [profile.email, profile.phone, profile.website].filter(Boolean).join(' | ');
        if (contactLine) doc.text(contactLine);
        if (profile.ownerName) doc.text(`Ansprechpartner: ${profile.ownerName}`);
        doc.moveDown(1.2);

        doc.fillColor('#000000').fontSize(16).text('Angebot zur Optimierung & Lead-Generierung', { align: 'left' });
        doc.fontSize(11).text(`Kunde: ${analysisPayload.contact?.name || '-'} (${analysisPayload.contact?.company || '-'})`);
        doc.text(`Datum: ${new Date().toLocaleDateString('de-DE')}`);
        doc.moveDown(0.8);

        doc.fontSize(13).text('Ausgangslage und Potenzial', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11)
            .text(`Identifiziertes Zusatzpotenzial: ${analysisPayload.analysis?.benefits?.additionalLeadsMonthly ?? '-'} Leads / Monat`)
            .text(`Geschätztes Umsatzpotenzial: ${formatCurrency(analysisPayload.analysis?.benefits?.additionalRevenueMonthly || 0)} / Monat`);

        doc.moveDown(0.8);
        doc.fontSize(13).text('Leistungsumfang', { underline: true });
        doc.moveDown(0.5);
        (analysisPayload.analysis?.recommendations || []).slice(0, 5).forEach((item, index) => {
            doc.fontSize(10).text(`${index + 1}. ${item.area}: ${item.optimization}`);
        });

        doc.moveDown(0.8);
        doc.fontSize(13).text('Investition', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11)
            .text(`Einmaliges Setup: ${formatCurrency(setupFee)}`)
            .text(`Monatlicher Retainer: ${formatCurrency(monthlyRetainer)}`)
            .text(`Laufzeit: ${termMonths} Monate`)
            .text(`Gesamtvolumen: ${formatCurrency(totalValue)}`);

        doc.moveDown(0.8);
        doc.fontSize(13).text('Ihr Nutzen', { underline: true });
        doc.moveDown(0.5);
        (analysisPayload.analysis?.quickPitch || []).forEach((line) => {
            doc.fontSize(10).text(`• ${line}`);
        });

        doc.moveDown(1.2);
        doc.fontSize(9).fillColor('#666666').text('Dieses Angebot basiert auf einer Potenzialanalyse und wird im Kickoff auf finale Ziele, KPIs und Umsetzungsplan abgestimmt.');

        doc.end();
    } catch (err) {
        if (!res.headersSent) {
            res.status(err.status || 500).json({ error: 'Angebots-PDF konnte nicht erstellt werden' });
        }
    }
});

module.exports = router;
