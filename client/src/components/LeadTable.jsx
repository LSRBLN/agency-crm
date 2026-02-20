import { ArrowUpDown, Eye, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

function PriorityBadge({ priority }) {
    const classes = {
        high: 'badge-high',
        medium: 'badge-medium',
        low: 'badge-low',
    }
    const labels = { high: 'Hoch', medium: 'Mittel', low: 'Niedrig' }
    return <span className={classes[priority] || classes.low}>{labels[priority] || priority}</span>
}

export default function LeadTable({ leads, onSort, sortField, sortDir }) {
    const navigate = useNavigate()

    const columns = [
        { key: 'companyName', label: 'Unternehmen' },
        { key: 'websiteUrl', label: 'Website' },
        { key: 'estimatedRevenue', label: 'Umsatz (USD)' },
        { key: 'monthlyVisitors', label: 'Besucher/Mt' },
        { key: 'competitorTraffic', label: 'Top Konkurrent' },
        { key: 'directTrafficPct', label: 'Direkt %' },
        { key: 'organicTrafficPct', label: 'Organic %' },
        { key: 'priority', label: 'Priorität' },
    ]

    return (
        <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/5">
                            {columns.map(col => (
                                <th
                                    key={col.key}
                                    className="table-header cursor-pointer hover:text-gray-200 transition-colors select-none"
                                    onClick={() => onSort?.(col.key)}
                                >
                                    <div className="flex items-center gap-1.5">
                                        {col.label}
                                        <ArrowUpDown className={`w-3 h-3 ${sortField === col.key ? 'text-brand-400' : 'text-gray-600'}`} />
                                    </div>
                                </th>
                            ))}
                            <th className="table-header">Aktionen</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {leads.map((lead, i) => (
                            <tr key={lead._id || i} className="hover:bg-white/[0.02] transition-colors">
                                <td className="table-cell font-medium text-white">{lead.companyName}</td>
                                <td className="table-cell">
                                    <a href={lead.websiteUrl} target="_blank" rel="noopener noreferrer"
                                        className="text-brand-400 hover:text-brand-300 transition-colors truncate block max-w-[150px]">
                                        {lead.websiteUrl?.replace(/^https?:\/\//, '')}
                                    </a>
                                </td>
                                <td className="table-cell">{Number(lead.estimatedRevenue || 0).toLocaleString('de-DE', { style: 'currency', currency: 'USD' })}</td>
                                <td className="table-cell">{Number(lead.monthlyVisitors || 0).toLocaleString('de-DE')}</td>
                                <td className="table-cell text-xs text-gray-400 truncate max-w-[120px]">{lead.competitorTraffic || '-'}</td>
                                <td className="table-cell">
                                    <div className="flex items-center gap-2">
                                        <div className="w-16 h-1.5 bg-surface-600 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${lead.directTrafficPct > 50 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                                style={{ width: `${lead.directTrafficPct || 0}%` }} />
                                        </div>
                                        <span className="text-xs">{lead.directTrafficPct || 0}%</span>
                                    </div>
                                </td>
                                <td className="table-cell">
                                    <div className="flex items-center gap-2">
                                        <div className="w-16 h-1.5 bg-surface-600 rounded-full overflow-hidden">
                                            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${lead.organicTrafficPct || 0}%` }} />
                                        </div>
                                        <span className="text-xs">{lead.organicTrafficPct || 0}%</span>
                                    </div>
                                </td>
                                <td className="table-cell"><PriorityBadge priority={lead.priority} /></td>
                                <td className="table-cell">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => navigate(`/audit/${lead._id}`)}
                                            className="p-2 rounded-lg hover:bg-brand-600/20 text-gray-400 hover:text-brand-400 transition-all"
                                            title="Audit ansehen"
                                        >
                                            <ShieldCheck className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {leads.length === 0 && (
                            <tr>
                                <td colSpan={7} className="table-cell text-center text-gray-500 py-12">
                                    Keine Leads vorhanden. Importiere eine CSV-Datei.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
