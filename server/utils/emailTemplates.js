/**
 * AI Guilt Email Templates
 * Variables: {companyName}, {websiteUrl}, {score}, {competitor}, {auditLink}, {setupFeeLink}
 */
const templates = {
    aiGuilt: {
        subject: '{companyName}: ChatGPT empfiehlt Ihren Wettbewerber – Sie aber nicht.',
        body: `Guten Tag,

ich habe kürzlich eine AI-Sichtbarkeitsanalyse für lokale Unternehmen in Ihrer Branche durchgeführt.

Dabei ist mir aufgefallen: Wenn potenzielle Kunden eine KI-Suchmaschine wie ChatGPT fragen „Bester Anbieter in Ihrer Stadt", wird Ihr Konkurrent {competitor} empfohlen — Ihr Unternehmen {companyName} jedoch nicht.

Ihre aktuelle AI-Sichtbarkeit liegt bei nur {score} von 100 Punkten.

Ich habe ein kostenloses Audit für Sie erstellt, das genau zeigt, wo die Lücken liegen:
➜ {auditLink}

Die gute Nachricht: Diese Probleme sind struktureller Natur und können durch unser „AI Authority Setup" dauerhaft behoben werden. 

Die einmalige Setup-Gebühr beträgt 950 €. Sie können hier direkt die Implementierung beauftragen, und wir starten noch diese Woche:
➜ {setupFeeLink}

Oder hätten Sie vorab Interesse an einem 15-minütigen Gespräch, um die Details zu besprechen?

Mit freundlichen Grüßen`,
    },

    voiceAgent: {
        subject: '{companyName}: Wieviel Umsatz kostet Sie jeder verpasste Anruf?',
        body: `Guten Tag,

mir ist aufgefallen, dass in Ihrer Branche enorm viele Leads und Neukunden durch verpasste Anrufe verloren gehen – oft weil das Team im Einsatz oder in der Behandlung ist. Jeder Anruf, der auf der Mailbox landet (oder ganz abbricht), landet meist direkt bei Ihrem Konkurrenten {competitor}.

Wir haben für Unternehmen wie {companyName} einen KI-Sprachagenten entwickelt, der 24/7 ans Telefon geht, Termine vereinbart und Fragen kompetent beantwortet. Er amortisiert sich meist schon nach den ersten 3 geretteten Leads.

Die einmalige Setup-Gebühr für den Voice Agent beträgt 1.450 €. Die Implementierung dauert nur wenige Tage.
Sie können das Setup direkt hier beauftragen:
➜ {setupFeeLink}

Alternativ können Sie hier Ihr aktuelles AI-Audit einsehen:
➜ {auditLink}

Hätten Sie Interesse an einer kurzen Live-Demo, wie der Agent Anrufe annimmt?

Mit freundlichen Grüßen`,
    },

    quickWin: {
        subject: 'Schnelles Digital-Upgrade für {companyName} – Mehr Conversions in 48 Stunden',
        body: `Guten Tag,

viele traditionelle Betriebe in Ihrer Branche (insbesondere in Wedding) lassen viel Potenzial auf der Straße liegen, weil die digitale „Storefront" — also das Google Business Profil und die Website — nicht optimal für KI-Systeme gepflegt sind.

Dabei genügen oft kleine Hebel: Die Korrektur der NAP-Daten (Name, Adresse, Telefonnummer) auf allen Plattformen und die Integration eines smarten KI-Chat-Widgets auf Ihrer Website können Ihre Anfragen sofort messbar steigern. 

Wir bieten lokalen Unternehmen wie {companyName} genau dieses schnelle Upgrade-Paket an, um direkte Sichtbarkeit aufzubauen.

Die Setup-Gebühr für das Quick-Win-Paket (Chat Widget + NAP-Fix) beträgt nur 450 €. 
Sie können den Setup-Prozess hier direkt starten:
➜ {setupFeeLink}

Oder schauen Sie sich hier vorab Ihr aktuelles Visibility-Audit an:
➜ {auditLink}

Mit besten Grüßen`,
    },

    highTicket: {
        subject: '{companyName}: Dominieren Sie Ihre Nische in AI-Suchmaschinen',
        body: `Guten Tag,

in High-Ticket-Branchen ist jeder einzelne qualifizierte Lead bares Geld wert. Wenn potenzielle Kunden aktuell KI wie ChatGPT oder Perplexity nach den besten Anbietern suchen, landet Ihr stärkster Konkurrent {competitor} auf Platz 1. Ihr Unternehmen {companyName} wird leider nicht ausgespielt.

Bei Ihren Dienstleistungen reicht ein einziger Kunde, der durch AI-Sichtbarkeit gewonnen wird, um alle Marketingkosten für ein gesamtes Jahr zu decken.

Mit unserem Premium AI-Authority Setup machen wir Sie zur logischen #1 Empfehlung in allen relevanten KI-Chatbots. 

Das komplette Setup inkl. Datadog-Monitoring und kontinuierlicher Optimierung liegt bei einmalig 1.950 €.
Buchen Sie die Integration direkt hier:
➜ {setupFeeLink}

Ihr detailliertes Sichtbarkeits-Audit (Score: {score}/100) finden Sie hier:
➜ {auditLink}

Gerne erläutere ich Ihnen die Mechanik in einem 10-minütigen Gespräch.

Beste Grüße`,
    },

    followUp: {
        subject: 'Re: AI-Sichtbarkeitsanalyse für {companyName}',
        body: `Guten Tag,

ich wollte kurz nachfragen, ob Sie Gelegenheit hatten, sich das AI-Sichtbarkeits-Audit für {companyName} anzusehen.

Die AI-Landschaft verändert sich schnell – Unternehmen, die jetzt handeln, sichern sich einen entscheidenden Vorteil.

Ihr aktueller Score: {score}/100

Lassen Sie uns in einem kurzen Gespräch besprechen, wie wir Ihre AI-Sichtbarkeit optimieren können.

Mit freundlichen Grüßen`,
    },
};

function interpolateTemplate(templateKey, variables) {
    const template = templates[templateKey];
    if (!template) return null;

    let subject = template.subject;
    let body = template.body;

    for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{${key}}`;
        subject = subject.replaceAll(placeholder, value || '');
        body = body.replaceAll(placeholder, value || '');
    }

    return { subject, body };
}

module.exports = { templates, interpolateTemplate };
