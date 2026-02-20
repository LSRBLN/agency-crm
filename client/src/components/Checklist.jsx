import { useState } from 'react'
import { CheckCircle2, Circle, ChevronDown, ChevronUp } from 'lucide-react'

const defaultPillars = [
    {
        name: 'Local Authority',
        description: 'Lokale Sichtbarkeit & Google Business Profil optimieren',
        tasks: [
            { id: 'gbp-claim', label: 'Google Business Profil beansprucht & verifiziert', done: false },
            { id: 'gbp-complete', label: 'GBP vollständig ausgefüllt (Öffnungszeiten, Bilder, Kategorie)', done: false },
            { id: 'nap-sync', label: 'NAP-Daten (Name, Adresse, Telefon) auf Top-Verzeichnissen synchronisiert (Quick Win)', done: false },
            { id: 'local-content', label: 'Lokale Landing Pages erstellt', done: false },
        ],
    },
    {
        name: 'Structured Data',
        description: 'Maschinenlesbare Daten für AI-Suchmaschinen',
        tasks: [
            { id: 'schema-org', label: 'Schema.org Markup implementiert (LocalBusiness)', done: false },
            { id: 'faq-schema', label: 'FAQ-Schema auf relevanten Seiten', done: false },
            { id: 'review-schema', label: 'Review-Schema aktiv', done: false },
            { id: 'sitemap', label: 'XML-Sitemap aktuell & eingereicht', done: false },
        ],
    },
    {
        name: 'AI Automation & Conversion',
        description: 'KI-Agenten zur maximalen Lead-Ausschöpfung',
        tasks: [
            { id: 'chat-widget', label: 'Smartes KI-Chat-Widget auf Website integriert (Quick Win)', done: false },
            { id: 'voice-agent', label: '24/7 AI Voice Agent für verpasste Anrufe eingerichtet', done: false },
            { id: 'voice-handoff', label: 'Voice Agent SMS-Handoff & Terminierung getestet', done: false },
            { id: 'datadog', label: 'Datadog Performance-Monitoring für Agenten aktiv', done: false },
        ],
    },
]

export default function Checklist({ pillars = defaultPillars, onChange }) {
    const [data, setData] = useState(pillars)
    const [expanded, setExpanded] = useState(pillars.map(() => true))

    function toggle(pillarIdx, taskIdx) {
        const next = data.map((p, pi) => ({
            ...p,
            tasks: p.tasks.map((t, ti) =>
                pi === pillarIdx && ti === taskIdx ? { ...t, done: !t.done } : t
            ),
        }))
        setData(next)
        onChange?.(next)
    }

    function toggleExpand(idx) {
        setExpanded(prev => prev.map((v, i) => i === idx ? !v : v))
    }

    return (
        <div className="space-y-4">
            {data.map((pillar, pi) => {
                const completed = pillar.tasks.filter(t => t.done).length
                const total = pillar.tasks.length
                const pct = Math.round((completed / total) * 100)

                return (
                    <div key={pi} className="glass-card overflow-hidden">
                        <button
                            onClick={() => toggleExpand(pi)}
                            className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
                        >
                            <div className="text-left">
                                <h3 className="text-white font-semibold">{pillar.name}</h3>
                                <p className="text-xs text-gray-500 mt-0.5">{pillar.description}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <span className="text-sm font-bold text-brand-400">{pct}%</span>
                                    <div className="w-24 h-1.5 bg-surface-600 rounded-full mt-1">
                                        <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                                {expanded[pi] ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                            </div>
                        </button>

                        {expanded[pi] && (
                            <div className="px-5 pb-5 space-y-2 animate-fade-in border-t border-white/5 pt-4">
                                {pillar.tasks.map((task, ti) => (
                                    <button
                                        key={task.id}
                                        onClick={() => toggle(pi, ti)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left ${task.done ? 'bg-emerald-500/10 hover:bg-emerald-500/15' : 'bg-surface-600/50 hover:bg-surface-600'
                                            }`}
                                    >
                                        {task.done
                                            ? <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                            : <Circle className="w-5 h-5 text-gray-600 flex-shrink-0" />
                                        }
                                        <span className={`text-sm ${task.done ? 'text-emerald-300 line-through' : 'text-gray-300'}`}>
                                            {task.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
