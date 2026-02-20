import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { ShieldCheck, MapPin, Zap, MessageSquare, AlertTriangle, CheckCircle, Smartphone, BarChart3, Mail, Play, Video } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || ''

export default function ScorecardView() {
    const { id } = useParams()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [blasting, setBlasting] = useState(false)
    const [blastStatus, setBlastStatus] = useState(null)
    const [competitionData, setCompetitionData] = useState(null)

    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    useEffect(() => {
        axios.get(`/api/audits/scorecard/${id}`)
            .then(r => {
                setData(r.data)
                setLoading(false)
            })
            .catch(e => {
                console.error(e)
                setError('Scorecard nicht gefunden oder nicht verfügbar.')
                setLoading(false)
            })
    }, [id])

    // Fetch competition data once audit data is loaded
    useEffect(() => {
        if (data?.leadId) {
            const leadId = data.leadId?._id || data.leadId
            try {
                const tok = localStorage.getItem('token')
                fetch(`${API}/api/leads/${leadId}/competition`, {
                    headers: { Authorization: `Bearer ${tok}` }
                })
                    .then(r => r.json())
                    .then(d => setCompetitionData(d))
                    .catch(err => console.warn('Competition data not available:', err))
            } catch (err) {
                console.warn('Competition data not available:', err)
            }
        }
    }, [data])

    async function handleReviewBlast() {
        setBlasting(true)
        try {
            const r = await axios.post('/api/reputation/blast', {
                leadId: data.leadId?._id,
                companyName: data.companyName,
                clientEmail: 'info@' + data.companyName.toLowerCase().replace(/\s+/g, '') + '.de' // Mock email
            }, { headers })
            setBlastStatus(r.data.message)
        } catch (e) {
            console.error(e)
            setBlastStatus('Fehler beim Senden der Review-Anfrage.')
        }
        setBlasting(false)
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0B0D17]">
                <div className="text-center animate-pulse">
                    <ShieldCheck className="w-16 h-16 text-brand-400 mx-auto mb-4" />
                    <h2 className="text-xl text-white font-medium">Lade AI Trust Audit...</h2>
                </div>
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0B0D17] p-6">
                <div className="glass-card max-w-md w-full p-8 text-center border-rose-500/30">
                    <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Audit nicht gefunden</h2>
                    <p className="text-gray-400 mb-6">{error}</p>
                </div>
            </div>
        )
    }

    const isLowScore = data.totalScore < 50;

    // Build competitor list: use API data if available, otherwise fall back to static data
    const staticCompetitors = [
        { name: 'Konkurrent #1 (Wedding)', traffic: 8500, color: 'bg-brand-500' },
        { name: 'Konkurrent #2 (Wedding)', traffic: 6200, color: 'bg-brand-400' },
        { name: 'Konkurrent #3 (Wedding)', traffic: 4800, color: 'bg-brand-300' },
        { name: 'Ihr Unternehmen', traffic: 800, color: 'bg-rose-500' },
    ]

    const barColors = ['bg-brand-500', 'bg-brand-400', 'bg-brand-300', 'bg-brand-200']
    const dynamicCompetitors = competitionData?.competitors
        ? competitionData.competitors.map((c, i) => ({
            name: c.name,
            traffic: c.estimatedMonthlyVisitors ?? c.traffic ?? 0,
            color: c.isClient ? 'bg-rose-500' : (barColors[i] || 'bg-brand-300'),
            isClient: c.isClient,
        }))
        : null

    const competitorList = dynamicCompetitors || staticCompetitors
    const maxTraffic = Math.max(...competitorList.map(c => c.traffic), 1)

    return (
        <div className="min-h-screen bg-[#0B0D17] text-white p-4 sm:p-8 font-sans selection:bg-brand-500/30">
            {/* Header */}
            <header className="max-w-2xl mx-auto flex items-center justify-between mb-8 sm:mb-12">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-xl tracking-tight">AI Trust Audit</h1>
                        <p className="text-sm text-brand-200 uppercase tracking-widest font-semibold">Gemini Intelligence</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-400">Generiert am</p>
                    <p className="font-medium">{new Date(data.date).toLocaleDateString('de-DE')}</p>
                </div>
            </header>

            <main className="max-w-2xl mx-auto space-y-6 sm:space-y-8 animate-fade-in">
                {/* Hero / Impact Section */}
                <section className="relative overflow-hidden glass-card p-6 sm:p-10 border-brand-500/20">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-[100px] -z-10 translate-x-1/2 -translate-y-1/2" />

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-10">
                        <div className="flex-1">
                            <h2 className="text-3xl sm:text-4xl font-extrabold mb-2 leading-tight">
                                {data.companyName}
                            </h2>
                            <p className="text-lg text-gray-400 font-medium flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-brand-400" />
                                {data.city} Region
                            </p>

                            <div className="mt-8 space-y-4">
                                <h3 className="text-sm uppercase tracking-widest text-brand-400 font-bold">Die KI-Empfehlung</h3>
                                <p className={`text-lg sm:text-xl font-medium leading-relaxed ${isLowScore ? 'text-rose-100' : 'text-emerald-100'}`}>
                                    {isLowScore
                                        ? "ChatGPT und Google Gemini empfehlen Ihre Konkurrenten bevorzugt bei Suchanfragen in Ihrer Region."
                                        : "KI-Systeme können Ihr Unternehmen gut erfassen und empfehlen Sie in Ihrer Region."}
                                </p>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10 relative text-sm sm:text-base">
                                    <div className="absolute -left-1 top-4 w-2 h-8 rounded-r bg-brand-500" />
                                    <p className="text-gray-300 italic">
                                        "{data.reasoning || 'Detaillierte KI-Begründung liegt vor.'}"
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Score Circle */}
                        <div className="flex flex-col items-center justify-center">
                            <div className="relative w-32 h-32 sm:w-40 sm:h-40 group">
                                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-surface-700" />
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8"
                                        className={data.totalScore < 50 ? 'text-rose-500' : data.totalScore < 75 ? 'text-amber-500' : 'text-emerald-500'}
                                        strokeDasharray={`${2 * Math.PI * 45}`}
                                        strokeDashoffset={`${2 * Math.PI * 45 * (1 - (data.totalScore || 0) / 100)}`}
                                        strokeLinecap="round"
                                        style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-4xl sm:text-5xl font-black">{data.totalScore}</span>
                                    <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">Score / 100</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Reputation Pulse & Review Blast */}
                <section className="glass-card p-6 border-brand-500/20">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-brand-400" />
                                Reputation Pulse
                            </h3>
                            <p className="text-gray-400 text-sm mt-1">Triggern Sie jetzt automatisierte Google-Rezensionsanfragen.</p>
                        </div>
                        <button
                            onClick={handleReviewBlast}
                            disabled={blasting}
                            className="btn-primary py-2 px-6 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                        >
                            {blasting ? <Zap className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                            {blasting ? 'Sende...' : 'Review Blast starten'}
                        </button>
                    </div>
                    {blastStatus && (
                        <div className="mt-4 p-3 bg-brand-500/10 border border-brand-500/30 rounded text-brand-300 text-xs font-medium animate-fade-in">
                            {blastStatus}
                        </div>
                    )}
                </section>

                {/* AEO Simulation Proof */}
                <section className="glass-card p-6 border-brand-500/20">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-brand-400" />
                        AEO-Simulation Proof
                    </h3>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-sm font-bold text-brand-300 uppercase tracking-wider">Agentic Inquiry:</span>
                            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">LIVE TEST</span>
                        </div>
                        <p className="text-gray-300 italic text-sm mb-4">
                            "Hey Gemini, wer ist der zuverlässigste Dienstleister für {data.leadId?.industry || 'Service'} in {data.city || 'Wedding'}?"
                        </p>
                        <div className="space-y-3">
                            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-rose-500 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.5)]" style={{ width: `${data.aeoProof?.score || 15}%` }} />
                            </div>
                            <p className="text-xs text-rose-400 font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Aktuelle Sichtbarkeit: {data.aeoProof?.score || 15}% ({data.aeoProof?.score < 50 ? 'Kritisch' : 'Optimierungsbedarf'})
                            </p>
                        </div>
                        <p className="text-gray-400 text-xs mt-4 leading-relaxed">
                            {data.aeoProof?.reasoning || "KI-Modelle bevorzugen aktuell Wettbewerber, da Ihre Standort-Daten keine semantische Kohärenz aufweisen."}
                        </p>
                    </div>
                </section>

                {/* Business DNA (Pomelli Scanner) */}
                {data.businessDNA && (
                    <section className="glass-card p-6 border-brand-500/20">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-brand-400" />
                            Business DNA Profile (Pomelli)
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                                <p className="text-xs text-brand-300 uppercase font-bold mb-1">Primary Color</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded border border-white/20" style={{ backgroundColor: data.businessDNA.primaryColor }} />
                                    <span className="text-sm font-mono">{data.businessDNA.primaryColor}</span>
                                </div>
                            </div>
                            <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                                <p className="text-xs text-brand-300 uppercase font-bold mb-1">Brand Voice</p>
                                <p className="text-sm">{data.businessDNA.brandVoice}</p>
                            </div>
                            {data.businessDNA.contentStrategy && (
                                <div className="col-span-2 p-3 bg-white/5 rounded-lg border border-white/10">
                                    <p className="text-xs text-brand-300 uppercase font-bold mb-1">Content Strategy</p>
                                    <p className="text-sm text-gray-300">{data.businessDNA.contentStrategy}</p>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* Audio & Video High-Value Assets */}
                <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* NotebookLM Audio */}
                    <div className="glass-card p-6 border-brand-500/20">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Play className="w-5 h-5 text-brand-400" />
                            Audio Visibility Report
                        </h3>
                        <p className="text-gray-400 text-sm mb-4">Ein interaktiver AI-Podcast über Ihre Sichtbarkeit.</p>

                        {data.details?.podcast ? (
                            <div className="space-y-3">
                                {/* Key Insights */}
                                {data.details.podcast.keyInsights?.length > 0 && (
                                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                                        <p className="text-xs text-brand-300 uppercase font-bold mb-2">Key Insights</p>
                                        <ul className="space-y-1">
                                            {data.details.podcast.keyInsights.map((insight, i) => (
                                                <li key={i} className="text-xs text-gray-300 flex items-start gap-1">
                                                    <span className="text-brand-400 mt-0.5">•</span>
                                                    {insight}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {/* Action Items */}
                                {data.details.podcast.actionItems?.length > 0 && (
                                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                                        <p className="text-xs text-brand-300 uppercase font-bold mb-2">Action Items</p>
                                        <ul className="space-y-1">
                                            {data.details.podcast.actionItems.map((item, i) => (
                                                <li key={i} className="text-xs text-gray-300 flex items-start gap-1">
                                                    <span className="text-emerald-400 mt-0.5">→</span>
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {/* Transcript excerpt */}
                                {data.details.podcast.transcript?.length > 0 && (
                                    <div className="p-3 bg-white/5 rounded-lg border border-white/10 max-h-40 overflow-y-auto">
                                        <p className="text-xs text-brand-300 uppercase font-bold mb-2">Transcript</p>
                                        {data.details.podcast.transcript.slice(0, 3).map((line, i) => (
                                            <p key={i} className="text-xs text-gray-400 mb-1">
                                                {line.speaker && <span className="text-brand-400 font-bold">{line.speaker}: </span>}
                                                {line.text || line}
                                            </p>
                                        ))}
                                    </div>
                                )}
                                {data.audioOverviewUrl && (
                                    <a
                                        href={data.audioOverviewUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-sm"
                                    >
                                        <Play className="w-4 h-4 fill-current" />
                                        <span className="font-bold">Podcast anhören</span>
                                    </a>
                                )}
                            </div>
                        ) : (
                            <a
                                href={data.audioOverviewUrl || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
                            >
                                <Play className="w-4 h-4 fill-current" />
                                <span className="font-bold">Podcast anhören</span>
                            </a>
                        )}
                    </div>

                    {/* VEO Video */}
                    <div className="glass-card p-6 border-brand-500/20">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Video className="w-5 h-5 text-brand-400" />
                            VEO Brand Video
                        </h3>
                        <p className="text-gray-400 text-sm mb-4">Automatisiertes Kurzvideo für Ihre Social Media Kanäle.</p>

                        {data.details?.storyboard ? (
                            <div className="space-y-3">
                                {/* Video Script */}
                                {data.details.storyboard.script && (
                                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                                        <p className="text-xs text-brand-300 uppercase font-bold mb-1">Video Script</p>
                                        <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">{data.details.storyboard.script}</p>
                                    </div>
                                )}
                                {/* Scenes */}
                                {data.details.storyboard.scenes?.length > 0 && (
                                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                                        <p className="text-xs text-brand-300 uppercase font-bold mb-2">Szenen ({data.details.storyboard.scenes.length})</p>
                                        <div className="space-y-1">
                                            {data.details.storyboard.scenes.slice(0, 3).map((scene, i) => (
                                                <div key={i} className="text-xs text-gray-400 flex items-start gap-1">
                                                    <span className="text-brand-400 font-bold flex-shrink-0">#{i + 1}</span>
                                                    <span>{scene.description || scene}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {/* Hashtags */}
                                {data.details.storyboard.hashtags?.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {data.details.storyboard.hashtags.slice(0, 5).map((tag, i) => (
                                            <span key={i} className="text-xs bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded-full">
                                                {tag.startsWith('#') ? tag : `#${tag}`}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button className="flex items-center justify-center gap-2 w-full py-3 bg-brand-500/20 hover:bg-brand-500/30 border border-brand-500/30 rounded-xl transition-all text-brand-300">
                                <Video className="w-4 h-4" />
                                <span className="font-bold">Vorschau generieren</span>
                            </button>
                        )}
                    </div>
                </section>

                {/* Real-time Competitive Comparison */}
                <section className="glass-card p-6 sm:p-10 border-brand-500/20">
                    <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
                        <Zap className="w-6 h-6 text-brand-400" />
                        Wettbewerbs-Analyse (Wedding & Müllerstraße)
                    </h2>

                    {/* Data source badge */}
                    {competitionData?.source && (
                        <div className="mb-4 flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${competitionData.source === 'similarweb'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-amber-500/20 text-amber-400'
                                }`}>
                                {competitionData.source === 'similarweb' ? '📊 SimilarWeb' : '🤖 KI-Schätzung'}
                            </span>
                            {competitionData.disclaimer && (
                                <span className="text-xs text-gray-500">{competitionData.disclaimer}</span>
                            )}
                        </div>
                    )}

                    <div className="space-y-6 mt-4">
                        {competitorList.map((comp, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between text-base font-medium">
                                    <span className={comp.isClient || comp.name === 'Ihr Unternehmen' ? 'text-rose-400 font-bold' : 'text-gray-300'}>
                                        {comp.name}
                                    </span>
                                    <span className="text-gray-400">{comp.traffic.toLocaleString()} Besucher / Mt.</span>
                                </div>
                                <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${comp.color} rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(167,139,250,0.2)]`}
                                        style={{ width: `${(comp.traffic / maxTraffic) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30">
                        <p className="text-rose-100 font-bold flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            AI Trust Lever: {data.competitorGap || "Ihr Hauptwettbewerber hat ~10x mehr organische Sichtbarkeit."}
                        </p>
                        <p className="text-rose-200/70 text-sm mt-1">
                            Der Grund: "KI-Modelle bevorzugen strukturierte Daten von Wettbewerbern, da Ihre Profile semantisch isoliert sind."
                        </p>
                    </div>
                </section>

                {/* CTA / Footer */}
                <section className="text-center pt-8 pb-12">
                    <div className="inline-flex items-center gap-3 text-brand-300 mb-6 font-bold uppercase tracking-widest text-sm">
                        <Smartphone className="w-5 h-5" />
                        Die KI-Lücke schließen
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold mb-4">Verpassen Sie keine Neukunden.</h3>
                    <p className="text-gray-400 max-w-lg mx-auto mb-8 text-lg">
                        Nutzen Sie unsere Expertise im AI Search Optimization, um Ihr Unternehmen für die nächste Generation der Suche vorzubereiten.
                    </p>
                    <button className="btn-primary py-4 px-12 text-xl rounded-full font-bold shadow-[0_0_40px_rgba(167,139,250,0.4)] hover:shadow-[0_0_60px_rgba(167,139,250,0.6)] transition-all transform hover:-translate-y-1">
                        Kostenlose KI-Beratung
                    </button>
                </section>
            </main>
        </div>
    )
}
