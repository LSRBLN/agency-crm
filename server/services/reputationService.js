/**
 * Handles automated review blasts and reputation management.
 * Uses Gemini to generate keyword-rich email templates and Nodemailer to send them.
 */
const nodemailer = require('nodemailer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Create reusable transporter
function createTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
}

async function generateReviewTemplate(businessName, industry, keywords) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Erstelle eine freundliche E-Mail-Vorlage für eine Rezensionsanfrage.
  Unternehmen: ${businessName}
  Branche: ${industry}
  Wichtige Keywords die in der Rezension vorkommen sollten: ${keywords.join(', ')}
  
  Die E-Mail soll den Kunden motivieren, eine Google-Rezension zu schreiben und dabei natürlich die Keywords zu erwähnen.
  
  Antworte als JSON:
  {
    "subject": "Betreff",
    "htmlBody": "<html>...</html>",
    "plainText": "Klartext-Version"
  }`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
}

async function sendReviewRequest(businessName, customerEmails, googleReviewLink, industry, keywords) {
    const results = [];

    // Generate keyword-rich template
    const template = await generateReviewTemplate(
        businessName,
        industry || 'Dienstleistung',
        keywords || [businessName, 'Berlin Wedding', 'empfehlenswert']
    );

    if (!template) {
        return { success: false, message: 'Failed to generate review template', sent: 0 };
    }

    // If SMTP is not configured, return the template without sending
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log('[REPUTATION] SMTP not configured - returning template only');
        return {
            success: true,
            message: 'Review template generated (SMTP not configured for sending)',
            template,
            sent: 0,
            total: customerEmails?.length || 0
        };
    }

    const transporter = createTransporter();
    let sent = 0;

    for (const email of (customerEmails || [])) {
        try {
            const personalizedHtml = template.htmlBody
                .replace('{{REVIEW_LINK}}', googleReviewLink || '#')
                .replace('{{BUSINESS_NAME}}', businessName);

            await transporter.sendMail({
                from: `"${businessName}" <${process.env.SMTP_USER}>`,
                to: email,
                subject: template.subject,
                text: template.plainText,
                html: personalizedHtml
            });
            sent++;
            results.push({ email, status: 'sent' });
        } catch (error) {
            results.push({ email, status: 'failed', error: error.message });
        }
    }

    return {
        success: true,
        message: `Review blast completed: ${sent}/${customerEmails?.length || 0} emails sent`,
        template,
        sent,
        total: customerEmails?.length || 0,
        results
    };
}

module.exports = { sendReviewRequest, generateReviewTemplate };
