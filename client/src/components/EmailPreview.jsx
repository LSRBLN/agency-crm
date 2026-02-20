import { Mail, ExternalLink, Clock } from 'lucide-react'

export default function EmailPreview({ draft }) {
    const statusColors = {
        draft: 'badge-medium',
        sent: 'badge-low',
        failed: 'badge-high',
    }
    const statusLabels = { draft: 'Entwurf', sent: 'Gesendet', failed: 'Fehlgeschlagen' }

    return (
        <div className="glass-card p-5 hover:border-white/10 transition-all duration-300 group">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-brand-600/20">
                        <Mail className="w-5 h-5 text-brand-400" />
                    </div>
                    <div>
                        <h4 className="text-white font-medium text-sm">{draft.companyName}</h4>
                        <p className="text-xs text-gray-500">{draft.email || 'Keine E-Mail hinterlegt'}</p>
                    </div>
                </div>
                <span className={statusColors[draft.status] || 'badge-medium'}>
                    {statusLabels[draft.status] || draft.status}
                </span>
            </div>

            <div className="bg-surface-800/60 rounded-xl p-4 mb-3">
                <p className="text-xs text-gray-400 font-medium mb-1">Betreff</p>
                <p className="text-sm text-gray-200">{draft.subject}</p>
                <p className="text-xs text-gray-400 font-medium mt-3 mb-1">Vorschau</p>
                <p className="text-sm text-gray-400 line-clamp-3">{draft.body}</p>
            </div>

            <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {draft.createdAt ? new Date(draft.createdAt).toLocaleDateString('de-DE') : '—'}
                </span>
                <button className="text-xs text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    Vollständig anzeigen <ExternalLink className="w-3 h-3" />
                </button>
            </div>
        </div>
    )
}
