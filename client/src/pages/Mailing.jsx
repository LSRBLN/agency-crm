import { useState } from 'react'
import { Mail, Send, Search, Filter, RefreshCw, CheckCircle, XCircle, Clock, FileText, MessageSquare } from 'lucide-react'

// Mock mailing data from Python app
const mockLeads = [
    { id: 1, company: 'Müller GmbH', contact: 'Max Müller', email: 'max.mueller@mueller.de', status: 'NEW', hasReply: false, offerCount: 0, score: 85 },
    { id: 2, company: 'Schmidt AG', contact: 'Anna Schmidt', email: 'anna@schmidt-ag.de', status: 'CONTACTED', hasReply: true, offerCount: 1, score: 72 },
    { id: 3, company: 'Weber KG', contact: 'Thomas Weber', email: 't.weber@weber-kg.de', status: 'REPLIED', hasReply: true, offerCount: 2, score: 65 },
    { id: 4, company: 'Fischer GmbH', contact: 'Sarah Fischer', email: 'sarah@fischer-gmbh.de', status: 'NEW', hasReply: false, offerCount: 0, score: 92 },
    { id: 5, company: 'Wagner & Co', contact: 'Michael Wagner', email: 'm.wagner@wagner-co.de', status: 'QUALIFIED', hasReply: true, offerCount: 3, score: 45 },
]

const mockTemplates = [
    { id: 1, name: 'Erstkontakt', subject: 'Website-Erstellung für {business_name}', channel: 'EMAIL' },
    { id: 2, name: 'Angebot', subject: 'Ihr individuelles Angebot', channel: 'EMAIL' },
    { id: 3, name: 'Follow-up', subject: 'Nachfrage: {business_name}', channel: 'EMAIL' },
]

export default function Mailing() {
    const [searchTerm, setSearchTerm] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [selectedTemplate, setSelectedTemplate] = useState('')
    const [sending, setSending] = useState(null)

    const filteredLeads = mockLeads.filter(lead => {
        const matchesSearch = lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.contact.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesStatus = filterStatus === 'all' || lead.status === filterStatus
        return matchesSearch && matchesStatus
    })

    const handleSend = (leadId) => {
        setSending(leadId)
        setTimeout(() => setSending(null), 2000)
    }

    const stats = {
        total: mockLeads.length,
        contacted: mockLeads.filter(l => l.status !== 'NEW').length,
        replied: mockLeads.filter(l => l.hasReply).length,
        offered: mockLeads.filter(l => l.offerCount > 0).length
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Mailing</h1>
                    <p className="text-surface-400 mt-1">E-Mail-Kampagnen und Nachverfolgung</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn-secondary flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Sync Antworten
                    </button>
                    <button className="btn-primary flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Alle senden
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="crm-card p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-surface-400 text-sm">Kontakte</p>
                            <p className="text-2xl font-bold text-white">{stats.total}</p>
                        </div>
                        <Mail className="w-8 h-8 text-crm-primary" />
                    </div>
                </div>
                <div className="crm-card p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-surface-400 text-sm">Kontaktiert</p>
                            <p className="text-2xl font-bold text-status-info">{stats.contacted}</p>
                        </div>
                        <Send className="w-8 h-8 text-status-info" />
                    </div>
                </div>
                <div className="crm-card p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-surface-400 text-sm">Antworten</p>
                            <p className="text-2xl font-bold text-status-success">{stats.replied}</p>
                        </div>
                        <MessageSquare className="w-8 h-8 text-status-success" />
                    </div>
                </div>
                <div className="crm-card p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-surface-400 text-sm">Angebote</p>
                            <p className="text-2xl font-bold text-crm-accent">{stats.offered}</p>
                        </div>
                        <FileText className="w-8 h-8 text-crm-accent" />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="crm-card p-4 mb-6">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                        <input type="text" placeholder="Kontakte suchen..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="input-field pl-10" />
                    </div>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field w-auto">
                        <option value="all">Alle Status</option>
                        <option value="NEW">Neu</option>
                        <option value="CONTACTED">Kontaktiert</option>
                        <option value="REPLIED">geantwortet</option>
                        <option value="QUALIFIED">qualifiziert</option>
                    </select>
                    <select value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)} className="input-field w-auto">
                        <option value="">Vorlage wählen...</option>
                        {mockTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Leads Table */}
            <div className="crm-card overflow-hidden">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th className="table-header">Kontakt</th>
                                <th className="table-header">Status</th>
                                <th className="table-header">Chancen-Score</th>
                                <th className="table-header">Antworten</th>
                                <th className="table-header">Angebote</th>
                                <th className="table-header text-right">Aktion</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLeads.map(lead => (
                                <tr key={lead.id} className="hover:bg-surface-700/30">
                                    <td className="table-cell">
                                        <div>
                                            <p className="font-medium text-white">{lead.company}</p>
                                            <p className="text-xs text-surface-500">{lead.contact} • {lead.email}</p>
                                        </div>
                                    </td>
                                    <td className="table-cell">
                                        <span className={`px-2 py-1 text-xs rounded-full ${lead.status === 'NEW' ? 'bg-blue-500/20 text-blue-400' :
                                                lead.status === 'CONTACTED' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    lead.status === 'REPLIED' ? 'bg-green-500/20 text-green-400' :
                                                        'bg-purple-500/20 text-purple-400'
                                            }`}>
                                            {lead.status}
                                        </span>
                                    </td>
                                    <td className="table-cell">
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-2 bg-surface-700 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${lead.score >= 70 ? 'bg-status-success' : lead.score >= 40 ? 'bg-status-warning' : 'bg-status-error'}`} style={{ width: `${lead.score}%` }} />
                                            </div>
                                            <span className="text-sm text-surface-400">{lead.score}%</span>
                                        </div>
                                    </td>
                                    <td className="table-cell">
                                        {lead.hasReply ? <CheckCircle className="w-5 h-5 text-status-success" /> : <XCircle className="w-5 h-5 text-surface-500" />}
                                    </td>
                                    <td className="table-cell">
                                        <span className="text-surface-300">{lead.offerCount}</span>
                                    </td>
                                    <td className="table-cell text-right">
                                        <button
                                            onClick={() => handleSend(lead.id)}
                                            disabled={sending === lead.id}
                                            className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1 ml-auto"
                                        >
                                            {sending === lead.id ? (
                                                <RefreshCw className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <Send className="w-3 h-3" />
                                            )}
                                            Senden
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
