import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { getFeatureFlags, subscribeFeatureFlags } from '../utils/featureFlags'

function formatDt(value) {
    if (!value) return '-'
    const dt = new Date(value)
    if (Number.isNaN(dt.getTime())) return '-'
    return dt.toLocaleString('de-DE')
}

function gridCellClass(rank) {
    if (rank === null || rank === undefined) return 'bg-surface-800/40 text-surface-500'
    const r = Number(rank)
    if (!Number.isFinite(r)) return 'bg-surface-800/40 text-surface-500'
    if (r <= 3) return 'bg-emerald-500/20 text-emerald-200'
    if (r <= 10) return 'bg-amber-500/20 text-amber-200'
    return 'bg-rose-500/15 text-rose-200'
}

export default function MapDashboard() {
    const [flags, setFlags] = useState(() => getFeatureFlags())
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [query, setQuery] = useState('')
    const [activeId, setActiveId] = useState('')
    const [active, setActive] = useState(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const [sortBy, setSortBy] = useState('created_desc')

    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    useEffect(() => subscribeFeatureFlags(setFlags), [])

    async function loadList() {
        setLoading(true)
        setError('')
        try {
            const resp = await axios.get('/api/lead-search/grid-scans', {
                headers,
                params: {
                    limit: 200,
                    q: query || undefined,
                },
            })
            setItems(Array.isArray(resp.data?.items) ? resp.data.items : [])
        } catch (err) {
            setError(err.response?.data?.error || 'Scans konnten nicht geladen werden')
        } finally {
            setLoading(false)
        }
    }

    async function loadDetail(id) {
        if (!id) return
        setDetailLoading(true)
        setError('')
        try {
            const resp = await axios.get(`/api/lead-search/grid-scans/${id}`, { headers })
            setActive(resp.data)
        } catch (err) {
            setError(err.response?.data?.error || 'Scan konnte nicht geladen werden')
        } finally {
            setDetailLoading(false)
        }
    }

    useEffect(() => {
        loadList()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        const t = setTimeout(() => {
            loadList()
        }, 250)
        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query])

    const kpis = useMemo(() => {
        const list = Array.isArray(items) ? items : []
        const bests = list.map((x) => Number(x?.summary?.best)).filter((n) => Number.isFinite(n))
        const avgs = list.map((x) => Number(x?.summary?.avg)).filter((n) => Number.isFinite(n))
        const found = list.map((x) => Number(x?.summary?.found)).filter((n) => Number.isFinite(n))
        const totals = list.map((x) => Number(x?.summary?.total)).filter((n) => Number.isFinite(n) && n > 0)

        const mean = (arr) => (arr.length ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : null)
        const foundRate = (() => {
            if (!found.length || !totals.length) return null
            const f = found.reduce((a, b) => a + b, 0)
            const t = totals.reduce((a, b) => a + b, 0)
            if (!t) return null
            return Math.round((f / t) * 100)
        })()

        return {
            total: list.length,
            avgBest: mean(bests),
            avgAvg: mean(avgs),
            foundRate,
        }
    }, [items])

    const visibleItems = useMemo(() => {
        const list = Array.isArray(items) ? [...items] : []
        const getCreated = (x) => new Date(x?.created_at || 0).getTime() || 0
        const getBest = (x) => (Number.isFinite(Number(x?.summary?.best)) ? Number(x.summary.best) : 999)
        const getAvg = (x) => (Number.isFinite(Number(x?.summary?.avg)) ? Number(x.summary.avg) : 999)
        const getFoundRate = (x) => {
            const f = Number(x?.summary?.found)
            const t = Number(x?.summary?.total)
            if (!Number.isFinite(f) || !Number.isFinite(t) || !t) return -1
            return f / t
        }

        if (sortBy === 'best_asc') list.sort((a, b) => getBest(a) - getBest(b))
        else if (sortBy === 'avg_asc') list.sort((a, b) => getAvg(a) - getAvg(b))
        else if (sortBy === 'found_desc') list.sort((a, b) => getFoundRate(b) - getFoundRate(a))
        else list.sort((a, b) => getCreated(b) - getCreated(a))

        return list
    }, [items, sortBy])

    const activeMapUrl = useMemo(() => {
        if (!active?.center_lat || !active?.center_lng) return null
        const q = `${active.center_lat},${active.center_lng}`
        return `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`
    }, [active])

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Map Dashboard</h1>
                    <p className="text-sm text-surface-400 mt-1">Grid-Rank Scans (Local SEO) – vorbereitet für CARTO Enrichment.</p>
                </div>
                <button className="btn-secondary" onClick={loadList} disabled={loading}>Refresh</button>
            </div>

            {error && <div className="p-3 rounded-lg bg-rose-500/15 text-rose-300 text-sm">{error}</div>}

            {!flags?.mapDashboard && (
                <div className="crm-card p-6 text-surface-300">
                    <p className="text-white font-semibold">Feature deaktiviert</p>
                    <p className="text-sm text-surface-400 mt-2">Aktiviere <span className="text-surface-200">Map Dashboard</span> unter <span className="text-surface-200">Einstellungen → Features</span>.</p>
                    <a className="btn-primary mt-4 inline-block" href="/settings">Zu den Einstellungen</a>
                </div>
            )}

            {flags?.mapDashboard && (
                <>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="crm-card p-4"><p className="text-surface-400 text-sm">Scans</p><p className="text-2xl font-bold text-white">{kpis.total}</p></div>
                <div className="crm-card p-4"><p className="text-surface-400 text-sm">Ø Best Rank</p><p className="text-2xl font-bold text-emerald-200">{kpis.avgBest ?? '-'}</p></div>
                <div className="crm-card p-4"><p className="text-surface-400 text-sm">Ø Avg Rank</p><p className="text-2xl font-bold text-amber-200">{kpis.avgAvg ?? '-'}</p></div>
                <div className="crm-card p-4"><p className="text-surface-400 text-sm">Found Rate</p><p className="text-2xl font-bold text-white">{kpis.foundRate !== null ? `${kpis.foundRate}%` : '-'}</p></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <aside className="lg:col-span-4 space-y-3">
                    <div className="crm-card p-4 space-y-2">
                        <p className="text-white font-semibold">Scans</p>
                        <input
                            className="input w-full"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Suche nach Firma/Domain/Query/Ort…"
                        />
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-surface-500">{loading ? 'Lade…' : `${items.length} Scans`}</p>
                            <select className="input text-xs" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                <option value="created_desc">Neueste zuerst</option>
                                <option value="best_asc">Best Rank (besser zuerst)</option>
                                <option value="avg_asc">Avg Rank (besser zuerst)</option>
                                <option value="found_desc">Found Rate (hoch zuerst)</option>
                            </select>
                        </div>
                    </div>

                    <div className="crm-card p-2">
                        <div className="max-h-[70vh] overflow-y-auto">
                            {visibleItems.map((it) => (
                                <button
                                    key={it.id}
                                    className={`w-full text-left p-3 rounded-lg hover:bg-surface-700/40 transition ${activeId === it.id ? 'bg-surface-700/40' : ''}`}
                                    onClick={async () => {
                                        setActiveId(it.id)
                                        await loadDetail(it.id)
                                    }}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm text-white font-semibold truncate">{it.place_name || it.domain || it.place_id}</p>
                                        {it.summary?.best && (
                                            <span className="badge-neutral">Best {it.summary.best}</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-surface-400 truncate">{it.query} · {it.near}</p>
                                    <p className="text-xs text-surface-500">{formatDt(it.created_at)}</p>
                                </button>
                            ))}
                            {!loading && items.length === 0 && (
                                <p className="p-4 text-sm text-surface-500">Noch keine Scans. Starte in der Lead-Suche einen “Grid Rank” Scan.</p>
                            )}
                        </div>
                    </div>
                </aside>

                <section className="lg:col-span-8 space-y-4">
                    <div className="crm-card p-4">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-white font-semibold">{active?.place_name || 'Scan auswählen'}</p>
                                <p className="text-xs text-surface-400">{active?.query ? `${active.query} · ${active.near}` : '—'}</p>
                            </div>
                            {active?.website && (
                                <a className="btn-secondary" href={active.website} target="_blank" rel="noreferrer">Website</a>
                            )}
                        </div>
                        {detailLoading && <p className="text-sm text-surface-400 mt-2">Lade Details…</p>}
                    </div>

                    {activeMapUrl && (
                        <div className="crm-card overflow-hidden">
                            <div className="h-[280px] w-full bg-surface-800">
                                <iframe
                                    title="map"
                                    src={activeMapUrl}
                                    className="w-full h-full"
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                />
                            </div>
                        </div>
                    )}

                    {Array.isArray(active?.matrix) && active.matrix.length > 0 && (
                        <div className="crm-card p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-white font-semibold">Grid Rank Heatmap</p>
                                <p className="text-xs text-surface-500">Best {active.summary?.best ?? '-'} · Avg {active.summary?.avg ?? '-'} · Found {active.summary?.found ?? 0}/{active.summary?.total ?? 0}</p>
                            </div>
                            <div className="inline-block">
                                {active.matrix.map((row, rIdx) => (
                                    <div key={rIdx} className="flex gap-1 mb-1">
                                        {row.map((cell, cIdx) => (
                                            <div
                                                key={`${rIdx}-${cIdx}`}
                                                className={`w-10 h-9 rounded flex items-center justify-center text-[12px] ${gridCellClass(cell)}`}
                                                title={cell ? `Rank ${cell}` : 'nicht in Top 20'}
                                            >
                                                {cell ?? '–'}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-surface-500">Grid {active.grid_size}×{active.grid_size} · Step {active.step_km}km · Radius {active.radius}m · Limit {active.result_limit}</p>
                        </div>
                    )}

                    {!active && (
                        <div className="crm-card p-6 text-surface-400">Wähle links einen Scan aus.</div>
                    )}
                </section>
            </div>

                </>
            )}
        </div>
    )
}
