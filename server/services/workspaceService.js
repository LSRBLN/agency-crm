/**
 * Google Workspace Studio Integration Service
 * Handles automated workflows like logging leads to Sheets and sending calendar invites.
 * Uses the googleapis package with service account auth or graceful fallback.
 */
const { google } = require('googleapis');

// Initialize Google Auth
function getAuth() {
    // Try service account first, then fall back to API key
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        return new google.auth.GoogleAuth({
            credentials,
            scopes: [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/calendar'
            ]
        });
    }
    console.warn('[WORKSPACE] No Google service account configured - operations will be logged only');
    return null;
}

async function logLeadToSheets(leadData) {
    const auth = getAuth();

    if (!auth || !process.env.GOOGLE_SHEET_ID) {
        console.log('[WORKSPACE] Sheets not configured - logging lead locally');
        console.log('[WORKSPACE] Lead data:', JSON.stringify({
            name: leadData.businessName,
            email: leadData.email,
            score: leadData.overallScore,
            timestamp: new Date().toISOString()
        }));
        return {
            success: true,
            mode: 'local_log',
            message: 'Lead logged locally (Google Sheets not configured)',
            data: leadData
        };
    }

    try {
        const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

        const values = [[
            new Date().toISOString(),
            leadData.businessName || '',
            leadData.email || '',
            leadData.phone || '',
            leadData.industry || '',
            leadData.websiteUrl || '',
            leadData.overallScore || 0,
            leadData.priority || 'medium',
            leadData.status || 'new'
        ]];

        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Leads!A:I',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values }
        });

        return {
            success: true,
            mode: 'google_sheets',
            sheetUrl: `https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEET_ID}`,
            updatedRange: response.data.updates?.updatedRange
        };
    } catch (error) {
        console.error('[WORKSPACE] Sheets error:', error.message);
        return { success: false, error: error.message };
    }
}

async function sendCalendarInvite(eventData) {
    const auth = getAuth();

    if (!auth) {
        console.log('[WORKSPACE] Calendar not configured - logging event locally');
        return {
            success: true,
            mode: 'local_log',
            message: 'Calendar event logged locally (Google Calendar not configured)',
            data: eventData
        };
    }

    try {
        const calendar = google.calendar({ version: 'v3', auth: await auth.getClient() });

        const event = {
            summary: eventData.title || `Meeting mit ${eventData.businessName}`,
            description: eventData.description || `Audit-Besprechung für ${eventData.businessName}`,
            start: {
                dateTime: eventData.startTime,
                timeZone: 'Europe/Berlin'
            },
            end: {
                dateTime: eventData.endTime || new Date(new Date(eventData.startTime).getTime() + 30 * 60000).toISOString(),
                timeZone: 'Europe/Berlin'
            },
            attendees: eventData.attendees?.map(email => ({ email })) || [],
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 60 },
                    { method: 'popup', minutes: 15 }
                ]
            }
        };

        const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
            sendUpdates: 'all'
        });

        return {
            success: true,
            mode: 'google_calendar',
            eventId: response.data.id,
            eventLink: response.data.htmlLink
        };
    } catch (error) {
        console.error('[WORKSPACE] Calendar error:', error.message);
        return { success: false, error: error.message };
    }
}

module.exports = { logLeadToSheets, sendCalendarInvite };
