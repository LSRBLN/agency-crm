import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { ShieldCheck, MapPin, Zap, MessageSquare, AlertTriangle, CheckCircle, Smartphone } from 'lucide-react'

export default function ScorecardView() {
    const { id } = useParams()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

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
                    {/* Background glow */}
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
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10 relative">
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
                                {/* SVG Circle Progress */}
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

                {/* The 3 Pillars */}
                <section className="grid sm:grid-cols-3 gap-4">
                    {/* Pillar 1 */}
                    <div className="glass-card p-6 flex flex-col h-full hover:-translate-y-1 transition-transform">
                        <MapPin className="w-8 h-8 text-brand-400 mb-4" />
                        <h3 className="font-bold text-lg mb-2">Local Authority Foundation</h3>
                        <p className="text-sm text-gray-400 mb-6 flex-grow">
                            Basis-Daten wie das Google Profil, die Google Maps nutzt, um KI-Suchen zu grounden.
                        </p>
                        <div className={`p-3 rounded-lg border flex items-center gap-3 ${data.pillars.gbpClaimed ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
                            {data.pillars.gbpClaimed ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
                            <span className="font-semibold text-sm">
                                {data.pillars.gbpClaimed ? 'Profil beansprucht & aktiv' : 'Mangelnde Profil-Konsistenz'}
                            </span>
                        </div>
                    </div>

                    {/* Pillar 2 */}
                    <div className="glass-card p-6 flex flex-col h-full hover:-translate-y-1 transition-transform">
                        <Zap className="w-8 h-8 text-brand-400 mb-4" />
                        <h3 className="font-bold text-lg mb-2">Structured Data Reading</h3>
                        <p className="text-sm text-gray-400 mb-6 flex-grow">
                            Lesbarkeit spezifischer Features (z.B. Menüs, Spezialsices) für Crawler und LLMs.
                        </p>
                        <div className={`p-3 rounded-lg border flex items-center gap-3 ${data.pillars.structuredDataFound ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'}`}>
                            {data.pillars.structuredDataFound ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
                            <span className="font-semibold text-sm">
                                {data.pillars.structuredDataFound ? 'Datenstruktur optimal' : 'Fehlende semantische Signale'}
                            </span>
                        </div>
                    </div>

                    {/* Pillar 3 */}
                    <div className="glass-card p-6 flex flex-col h-full hover:-translate-y-1 transition-transform">
                        <MessageSquare className="w-8 h-8 text-brand-400 mb-4" />
                        <h3 className="font-bold text-lg mb-2">Brand Sentiment</h3>
                        <p className="text-sm text-gray-400 mb-6 flex-grow">
                            Keywords, die in Kunden-Rezensionen vorherrschen und KI-Assoziationen triggern.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {data.pillars.sentimentKeywords && data.pillars.sentimentKeywords.length > 0 ? (
                                data.pillars.sentimentKeywords.map((kw, idx) => (
                                    <span key={idx} className="px-2.5 py-1 text-xs font-medium bg-white/10 text-brand-100 rounded">
                                        {kw}
                                    </span>
                                ))
                            ) : (
                                <span className="text-sm text-gray-500 italic">Keine prägenden Keywords extrahiert.</span>
                            )}
                        </div>
                    </div>
                </section>

                {/* CTA / Footer */}
                <section className="text-center pt-8 pb-12">
                    <div className="inline-flex items-center gap-3 text-brand-300 mb-6">
                        <Smartphone className="w-5 h-5" />
                        <span className="text-sm font-semibold uppercase tracking-widest">Die KI-Lücke schließen</span>
                    </div>
                    <h3 className="text-2xl font-bold mb-4">Verpassen Sie keine KI-gesteuerten Neukunden.</h3>
                    <p className="text-gray-400 max-w-lg mx-auto mb-8">
                        Nutzen Sie unsere Expertise im AI Search Optimization, um Ihr Google Profil und Web-Setup für die nächste Generation der Suche vorzubereiten.
                    </p>
                    <button className="btn-primary py-4 px-10 text-lg rounded-full font-bold shadow-[0_0_40px_rgba(167,139,250,0.3)] hover:shadow-[0_0_60px_rgba(167,139,250,0.5)] transition-shadow">
                        Kostenlose Beratung anfragen
                    </button>
                </section>

            </main>
        </div>
    )
}
