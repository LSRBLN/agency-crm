import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import axios from 'axios'
import ScoreGauge from '../components/ScoreGauge'
import { ArrowLeft, RefreshCw, CheckCircle2, XCircle, HelpCircle, Mail, ExternalLink, TrendingUp } from 'lucide-react'

export default function AuditDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [lead, setLead] = useState(null)
    const [audit, setAudit] = useState(null)
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [templateKey, setTemplateKey] = useState('aiGuilt')

    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    useEffect(() => {
        async function load() {
            try {
                const leadRes = await axios.get(`/api/leads/${id}`, { headers })
                setLead(leadRes.data)
                try {
                    const auditRes = await axios.get(`/api/audits/lead/${id}`, { headers })
                    setAudit(auditRes.data)
                } catch (e) {
                    // No audit yet
                }
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [id])

    async function generateAudit() {
        setGenerating(true)
        try {
            const res = await axios.post(`/api/audits`, { leadId: id }, { headers })
            setAudit(res.data)
        } catch (e) {
            console.error('Audit generation error:', e)
        } finally {
            setGenerating(false)
        }
    }

    async function triggerOutreach() {
        try {
            await axios.post('/api/outreach', { leadId: id, auditId: audit._id, templateKey }, { headers })
            alert('Outreach-Entwurf wurde erstellt!')
        } catch (e) {
            console.error(e)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <RefreshCw className="w-8 h-8 text-brand-400 animate-spin" />
            </div>
        )
    }

    if (!lead) {
        return (
            <div className="p-8 text-center text-gray-400">
                <p>Lead nicht gefunden.</p>
                <button onClick={() => navigate('/leads')} className="btn-primary mt-4">Zurück zu Leads</button>
            </div>
        )
    }

    function StatusIcon({ value }) {
        if (value === true) return <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        if (value === false) return <XCircle className="w-5 h-5 text-rose-400" />
        return <HelpCircle className="w-5 h-5 text-gray-500" />
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/leads')} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-400" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-white">{lead.companyName}</h1>
                    <a href={lead.websiteUrl} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-brand-400 hover:text-brand-300 transition-colors">{lead.websiteUrl}</a>
                </div>
            </div>

            {!audit ? (
                <div className="glass-card p-12 text-center">
                    <h2 className="text-xl font-semibold text-white mb-2">AI Trust Audit</h2>
                    <p className="text-gray-400 mb-6">Noch kein Audit vorhanden. Generiere jetzt eine Visibility Scorecard.</p>
                    <button onClick={generateAudit} disabled={generating} className="btn-primary inline-flex items-center gap-2">
                        <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
                        {generating ? 'Wird generiert...' : 'Audit generieren'}
                    </button>
                </div>
            ) : (
                <>
                    {/* Score Overview */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="glass-card p-8 flex items-center justify-center lg:col-span-1">
                            <ScoreGauge score={audit.totalScore} />
                        </div>
                        <div className="glass-card p-6 lg:col-span-2 space-y-4">
                            <h2 className="text-lg font-semibold text-white">Audit-Details</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[
                                    { label: 'GBP Beansprucht', value: audit.gbpClaimed, score: audit.scores?.gbp },
                                    { label: 'Rezensionen Beantwortet', value: audit.reviewsResponded, score: audit.scores?.reviews },
                                    { label: 'AEO Sichtbarkeit', value: audit.aeoVisible, score: audit.scores?.aeo },
                                    { label: 'Organic Traffic', value: null, score: audit.scores?.organic },
                                ].map((item, i) => (
                                    <div key={i} className="bg-surface-800/60 rounded-xl p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <StatusIcon value={item.value} />
                                            <span className="text-sm text-gray-300">{item.label}</span>
                                        </div>
                                        <span className="text-sm font-bold text-brand-400">{item.score ?? '—'} / {
                                            item.label.includes('GBP') ? '25' : item.label.includes('Rezensionen') ? '25' : item.label.includes('AEO') ? '30' : '20'
                                        }</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Visueller Wettbewerbsvergleich */}
                    <div className="glass-card mb-6 border-l-4 border-l-brand-500 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-bl-full pointer-events-none" />
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <span className="bg-brand-500/20 text-brand-400 p-1.5 rounded-lg text-sm">AI Proof</span>
                                Wettbewerbsvergleich
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* The User's Business */}
                                <div className={`p-5 rounded-xl border ${audit.aeoVisible ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
                                    <div className="flex items-center gap-3 mb-2">
                                        {audit.aeoVisible ? <CheckCircle2 className="w-6 h-6 text-emerald-400" /> : <XCircle className="w-6 h-6 text-rose-400" />}
                                        <h3 className="font-semibold text-white">{lead.companyName}</h3>
                                    </div>
                                    <p className={`text-sm ${audit.aeoVisible ? 'text-emerald-300' : 'text-rose-300'}`}>
                                        {audit.aeoVisible ? 'Wird als Top-Empfehlung von AI-Agenten (ChatGPT, Gemini) gelistet.' : 'Unsichtbar für AI-Agenten. Sie verlieren Traffic an die Konkurrenz.'}
                                    </p>
                                </div>

                                {/* The Competitor */}
                                {!audit.aeoVisible && audit.aeoCompetitor && (
                                    <div className="p-5 rounded-xl border border-amber-500/30 bg-amber-500/10 relative overflow-hidden">
                                        <div className="absolute -right-6 -top-6 opacity-10">
                                            <TrendingUp className="w-24 h-24 text-amber-500" />
                                        </div>
                                        <div className="flex items-center gap-3 mb-2 relative z-10">
                                            <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                                                <span className="text-amber-400 text-xs font-bold font-mono">#1</span>
                                            </div>
                                            <h3 className="font-semibold text-white">{audit.aeoCompetitor}</h3>
                                        </div>
                                        <p className="text-sm text-amber-300 relative z-10">
                                            Wird aktuell bei Anfragen nach "{lead.industry || 'Dienstleistungen'}" bevorzugt empfohlen und greift Ihre potenziellen Kunden ab.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 items-center">
                        <button onClick={generateAudit} disabled={generating} className="btn-secondary inline-flex items-center gap-2">
                            <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
                            Audit neu generieren
                        </button>
                        <a href={`/scorecard/${audit._id}`} target="_blank" rel="noopener noreferrer" className="btn-secondary inline-flex items-center gap-2">
                            <ExternalLink className="w-4 h-4" />
                            Scorecard Vorschau
                        </a>
                        <div className="flex-1" />
                        <div className="flex items-center gap-2">
                            <select
                                value={templateKey}
                                onChange={e => setTemplateKey(e.target.value)}
                                className="input-field py-2.5 text-sm max-w-[200px]"
                            >
                                <option value="aiGuilt">Standard AI Guilt (950€)</option>
                                <option value="voiceAgent">Voice Agent (1.450€)</option>
                                <option value="quickWin">Quick Win & NAP (450€)</option>
                                <option value="highTicket">High-Ticket ROI (1.950€)</option>
                            </select>
                            <button onClick={triggerOutreach} className="btn-primary inline-flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                Outreach-Entwurf erstellen
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
