import { useState, useEffect } from 'react'
import axios from 'axios'
import EmailPreview from '../components/EmailPreview'
import { Mail, Send, RefreshCw } from 'lucide-react'

export default function Outreach() {
    const [drafts, setDrafts] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')

    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    useEffect(() => {
        axios.get('/api/outreach', { headers })
            .then(r => setDrafts(r.data))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const filtered = filter === 'all' ? drafts : drafts.filter(d => d.status === filter)

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Outreach Engine</h1>
                    <p className="text-gray-400 mt-1">„AI Guilt" E-Mail-Entwürfe & Versand</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">{drafts.length} Entwürfe</span>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2">
                {[
                    { value: 'all', label: 'Alle' },
                    { value: 'draft', label: 'Entwürfe' },
                    { value: 'sent', label: 'Gesendet' },
                ].map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setFilter(tab.value)}
                        className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${filter === tab.value
                                ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <RefreshCw className="w-6 h-6 text-brand-400 animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <Mail className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                    <h3 className="text-lg font-medium text-gray-300 mb-1">Keine Entwürfe vorhanden</h3>
                    <p className="text-sm text-gray-500">Erstelle zuerst einen Audit und löse dann den Outreach-Entwurf aus.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map((draft, i) => (
                        <EmailPreview key={draft._id || i} draft={draft} />
                    ))}
                </div>
            )}
        </div>
    )
}
