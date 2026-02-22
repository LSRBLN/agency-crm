import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { TrendingUp, Users, DollarSign, Mail, Download, Calendar } from 'lucide-react'

function monthLabel(key) {
    const [year, month] = String(key).split('-')
    const date = new Date(Number(year), Number(month) - 1, 1)
    return date.toLocaleDateString('de-DE', { month: 'short' })
}

export default function Reports() {
    const [dateRange, setDateRange] = useState('30')
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    async function loadSummary(days) {
        setLoading(true)
        setError('')
        try {
            const response = await axios.get('/api/reports/summary', {
                headers,
                params: { days },
            })
            setData(response.data)
        } catch (err) {
            setError(err.response?.data?.error || 'Reporting konnte nicht geladen werden')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadSummary(dateRange)
    }, [dateRange])

    const sourceRows = useMemo(() => {
        const sourceObj = data?.leadsBySource || {}
        const total = Object.values(sourceObj).reduce((sum, value) => sum + Number(value || 0), 0)
        return Object.entries(sourceObj)
            .sort(([, a], [, b]) => Number(b) - Number(a))
            .map(([source, count]) => ({
                source,
                count: Number(count),
                rate: total ? Math.round((Number(count) / total) * 100) : 0,
            }))
    }, [data])

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Berichte</h1>
                    <p className="text-surface-400 mt-1">Analysen und Kennzahlen</p>
                </div>
                <div className="flex gap-2">
                    <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="input-field w-auto">
                        <option value="7">Letzte 7 Tage</option>
                        <option value="30">Letzte 30 Tage</option>
                        <option value="90">Letzte 90 Tage</option>
                        <option value="365">Letztes Jahr</option>
                    </select>
                    <button className="btn-secondary flex items-center gap-2" onClick={() => loadSummary(dateRange)}>
                        <Download className="w-4 h-4" />
                        Aktualisieren
                    </button>
                </div>
            </div>

            {error && <div className="mb-4 p-3 rounded-lg bg-rose-500/15 text-rose-300 text-sm">{error}</div>}
            {loading && <div className="mb-4 p-3 rounded-lg bg-surface-800 text-surface-300 text-sm">Lade Reporting...</div>}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="crm-card p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-surface-400 text-sm">Neue Leads</p>
                            <p className="text-2xl font-bold text-white">{data?.metrics?.totalLeads ?? 0}</p>
                        </div>
                        <Users className="w-8 h-8 text-crm-primary" />
                    </div>
                </div>
                <div className="crm-card p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-surface-400 text-sm">Conversion Rate</p>
                            <p className="text-2xl font-bold text-white">{data?.metrics?.conversionRate ?? 0}%</p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-status-success" />
                    </div>
                </div>
                <div className="crm-card p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-surface-400 text-sm">Pipeline Wert</p>
                            <p className="text-2xl font-bold text-crm-accent">{Number(data?.metrics?.pipelineValue || 0).toLocaleString('de-DE')}€</p>
                        </div>
                        <DollarSign className="w-8 h-8 text-crm-accent" />
                    </div>
                </div>
                <div className="crm-card p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-surface-400 text-sm">Outreach gesendet</p>
                            <p className="text-2xl font-bold text-white">{data?.metrics?.outreachSent ?? 0}</p>
                            <p className="text-xs text-status-info">Termine: {data?.metrics?.meetingsCount ?? 0}</p>
                        </div>
                        <Mail className="w-8 h-8 text-status-info" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="crm-card p-4">
                    <p className="text-surface-400 text-sm">Offene Tasks</p>
                    <p className="text-2xl font-bold text-white">{data?.metrics?.taskOpen ?? 0}</p>
                </div>
                <div className="crm-card p-4">
                    <p className="text-surface-400 text-sm">Erledigte Tasks</p>
                    <p className="text-2xl font-bold text-status-success">{data?.metrics?.taskDone ?? 0}</p>
                </div>
                <div className="crm-card p-4">
                    <p className="text-surface-400 text-sm">Überfällige Tasks</p>
                    <p className="text-2xl font-bold text-rose-400">{data?.metrics?.overdueTasks ?? 0}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="crm-card p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Leads nach Monat</h2>
                    <div className="space-y-3">
                        {(data?.leadsByMonth || []).map((item, index, arr) => {
                            const max = Math.max(...arr.map((r) => Number(r.count || 0)), 1)
                            return (
                                <div key={index}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-surface-400">{monthLabel(item.month)}</span>
                                        <span className="text-sm font-medium text-white">{item.count}</span>
                                    </div>
                                    <div className="h-6 bg-surface-700 rounded overflow-hidden">
                                        <div className="h-full bg-crm-primary rounded" style={{ width: `${(Number(item.count || 0) / max) * 100}%` }} />
                                    </div>
                                </div>
                            )
                        })}
                        {(data?.leadsByMonth || []).length === 0 && <p className="text-sm text-surface-500">Keine Daten</p>}
                    </div>
                </div>

                <div className="crm-card p-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Wert nach Monat</h2>
                    <div className="space-y-3">
                        {(data?.revenueByMonth || []).map((item, index, arr) => {
                            const max = Math.max(...arr.map((r) => Number(r.value || 0)), 1)
                            return (
                                <div key={index}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-surface-400">{monthLabel(item.month)}</span>
                                        <span className="text-sm font-medium text-crm-accent">{Number(item.value || 0).toLocaleString('de-DE')}€</span>
                                    </div>
                                    <div className="h-6 bg-surface-700 rounded overflow-hidden">
                                        <div className="h-full bg-crm-accent rounded" style={{ width: `${(Number(item.value || 0) / max) * 100}%` }} />
                                    </div>
                                </div>
                            )
                        })}
                        {(data?.revenueByMonth || []).length === 0 && <p className="text-sm text-surface-500">Keine Daten</p>}
                    </div>
                </div>
            </div>

            <div className="crm-card p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Lead-Quellen</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {sourceRows.map((item, index) => (
                        <div key={index} className="p-4 bg-surface-700/30 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-surface-400 text-sm">{item.source}</span>
                                <span className="text-xl font-bold text-white">{item.rate}%</span>
                            </div>
                            <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-crm-primary to-crm-accent rounded-full" style={{ width: `${item.rate}%` }} />
                            </div>
                            <p className="text-xs text-surface-500 mt-2">{item.count} Leads</p>
                        </div>
                    ))}
                    {sourceRows.length === 0 && <p className="text-sm text-surface-500">Keine Quellen-Daten</p>}
                </div>
                <div className="mt-4 text-xs text-surface-500 flex items-center gap-2"><Calendar className="w-3 h-3" />Zeitraum: {dateRange} Tage</div>
            </div>

            <div className="crm-card p-6 mt-6">
                <h2 className="text-lg font-semibold text-white mb-4">Outreach-Kanäle</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {Object.entries(data?.outreachByChannel || {}).map(([channel, count]) => (
                        <div key={channel} className="p-4 bg-surface-700/30 rounded-lg">
                            <p className="text-surface-400 text-sm mb-1">{channel}</p>
                            <p className="text-xl font-bold text-white">{Number(count || 0)}</p>
                        </div>
                    ))}
                    {Object.keys(data?.outreachByChannel || {}).length === 0 && <p className="text-sm text-surface-500">Keine Kanal-Daten</p>}
                </div>
            </div>
        </div>
    )
}
