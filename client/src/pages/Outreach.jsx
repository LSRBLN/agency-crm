import { useState, useEffect } from 'react'
import axios from 'axios'
import EmailPreview from '../components/EmailPreview'
import { Mail, Send, RefreshCw, CheckCircle2 } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || ''

export default function Outreach() {
    const [drafts, setDrafts] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')
    const [sendingId, setSendingId] = useState(null)
    const [sendStatus, setSendStatus] = useState({}) // { [id]: 'success' | 'error' | message }

    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    useEffect(() => {
        axios.get('/api/outreach', { headers })
            .then(r => setDrafts(r.data))
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    async function handleSend(draftId) {
        setSendingId(draftId)
        setSendStatus(prev => ({ ...prev, [draftId]: null }))
        try {
            const res = await axios.post(`${API}/api/outreach/${draftId}/send`, {}, { headers })
            // Update the draft status to "sent" in local state
            setDrafts(prev => prev.map(d =>
                d._id === draftId ? { ...d, status: 'sent' } : d
            ))
            setSendStatus(prev => ({ ...prev, [draftId]: { type: 'success', message: res.data.message || 'Erfolgreich gesendet!' } }))
        } catch (err) {
            const msg = err.response?.data?.error || err.message || 'Fehler beim Senden.'
            setSendStatus(prev => ({ ...prev, [draftId]: { type: 'error', message: msg } }))
        } finally {
            setSendingId(null)
        }
    }

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
                        <div key={draft._id || i} className="flex flex-col gap-2">
                            <EmailPreview draft={draft} />

                            {/* Send button row */}
                            <div className="flex items-center gap-3 px-1">
                                <button
                                    onClick={() => handleSend(draft._id)}
                                    disabled={sendingId === draft._id || draft.status === 'sent'}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${draft.status === 'sent'
                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 cursor-not-allowed'
                                            : 'bg-brand-600/20 hover:bg-brand-600/30 text-brand-400 border border-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed'
                                        }`}
                                >
                                    {sendingId === draft._id ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Sende...
                                        </>
                                    ) : draft.status === 'sent' ? (
                                        <>
                                            <CheckCircle2 className="w-4 h-4" />
                                            Gesendet
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Senden
                                        </>
                                    )}
                                </button>

                                {/* Feedback message */}
                                {sendStatus[draft._id] && (
                                    <span className={`text-xs font-medium animate-fade-in ${sendStatus[draft._id].type === 'success' ? 'text-emerald-400' : 'text-rose-400'
                                        }`}>
                                        {sendStatus[draft._id].message}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
