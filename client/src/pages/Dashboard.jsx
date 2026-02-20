import { useState, useEffect } from 'react'
import { Users, ShieldCheck, Mail, TrendingUp } from 'lucide-react'
import StatsCard from '../components/StatsCard'
import axios from 'axios'

export default function Dashboard() {
    const [stats, setStats] = useState({ leads: 0, audits: 0, outreach: 0, highPriority: 0 })

    useEffect(() => {
        async function load() {
            try {
                const token = localStorage.getItem('token')
                const headers = { Authorization: `Bearer ${token}` }
                const [leadsRes, auditsRes, outreachRes] = await Promise.all([
                    axios.get('/api/leads', { headers }),
                    axios.get('/api/audits', { headers }),
                    axios.get('/api/outreach', { headers }),
                ])
                setStats({
                    leads: leadsRes.data.length,
                    audits: auditsRes.data.length,
                    outreach: outreachRes.data.length,
                    highPriority: leadsRes.data.filter(l => l.priority === 'high').length,
                })
            } catch (e) {
                console.error('Dashboard load error:', e)
            }
        }
        load()
    }, [])

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                <p className="text-gray-400 mt-1">Übersicht aller Leads, Audits und Outreach-Aktivitäten</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatsCard icon={Users} label="Gesamt Leads" value={stats.leads} color="brand" delay={0} />
                <StatsCard icon={TrendingUp} label="Hohe Priorität" value={stats.highPriority} color="rose" delay={100} />
                <StatsCard icon={ShieldCheck} label="Audits erstellt" value={stats.audits} color="emerald" delay={200} />
                <StatsCard icon={Mail} label="Outreach Entwürfe" value={stats.outreach} color="amber" delay={300} />
            </div>

            {/* Quick Info Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Priority Breakdown */}
                <div className="glass-card p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Prioritäts-Verteilung</h2>
                    <div className="space-y-3">
                        {[
                            { label: 'Hohe Priorität (>50% Direkt-Traffic)', pct: stats.leads ? Math.round((stats.highPriority / stats.leads) * 100) : 0, color: 'bg-rose-500' },
                            { label: 'Mittlere Priorität', pct: stats.leads ? Math.round(((stats.leads - stats.highPriority) / stats.leads) * 50) : 0, color: 'bg-amber-500' },
                            { label: 'Niedrige Priorität', pct: stats.leads ? Math.round(((stats.leads - stats.highPriority) / stats.leads) * 50) : 0, color: 'bg-emerald-500' },
                        ].map((item, i) => (
                            <div key={i}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-gray-400">{item.label}</span>
                                    <span className="text-sm font-semibold text-gray-300">{item.pct}%</span>
                                </div>
                                <div className="h-2 bg-surface-600 rounded-full overflow-hidden">
                                    <div className={`h-full ${item.color} rounded-full transition-all duration-700`} style={{ width: `${item.pct}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Workflow Status */}
                <div className="glass-card p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Workflow-Pipeline</h2>
                    <div className="flex items-center justify-between">
                        {[
                            { label: 'CSV Import', icon: '📄', active: stats.leads > 0 },
                            { label: 'Audit', icon: '🔍', active: stats.audits > 0 },
                            { label: 'Outreach', icon: '📧', active: stats.outreach > 0 },
                            { label: 'Client', icon: '🤝', active: false },
                        ].map((step, i) => (
                            <div key={i} className="flex items-center">
                                <div className={`flex flex-col items-center gap-2 ${step.active ? 'opacity-100' : 'opacity-40'}`}>
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${step.active ? 'bg-brand-600/30 shadow-glow' : 'bg-surface-600'
                                        }`}>
                                        {step.icon}
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-medium">{step.label}</span>
                                </div>
                                {i < 3 && <div className={`w-8 h-px mx-2 ${step.active ? 'bg-brand-500' : 'bg-surface-600'}`} />}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
