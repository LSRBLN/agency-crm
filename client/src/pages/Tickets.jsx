import { useState } from 'react'
import {
    Headphones, Plus, Search, Filter, MoreVertical,
    User, Clock, AlertCircle, CheckCircle, XCircle,
    Edit, Trash2, MessageSquare, Mail, Phone, Calendar,
    Tag, Flag
} from 'lucide-react'

// Ticket statuses and priorities
const STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED']
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

// Mock tickets data
const mockTickets = [
    { id: 1, title: 'Website wird nicht richtig angezeigt', customer: 'Müller GmbH', contact: 'Max Müller', email: 'max@mueller.de', status: 'OPEN', priority: 'HIGH', assignee: 'Admin', created: '2024-01-20', updated: '2024-01-20', category: 'Technisch' },
    { id: 2, title: 'Anfrage zu Preisliste', customer: 'Schmidt AG', contact: 'Anna Schmidt', email: 'anna@schmidt-ag.de', status: 'IN_PROGRESS', priority: 'MEDIUM', assignee: 'Admin', created: '2024-01-19', updated: '2024-01-20', category: 'Vertrieb' },
    { id: 3, title: 'Support für Demo-Zugang', customer: 'Weber KG', contact: 'Thomas Weber', email: 't.weber@weber-kg.de', status: 'WAITING', priority: 'LOW', assignee: 'Admin', created: '2024-01-18', updated: '2024-01-19', category: 'Support' },
    { id: 4, title: 'Bug bei Formular-Übermittlung', customer: 'Fischer GmbH', contact: 'Sarah Fischer', email: 'sarah@fischer-gmbh.de', status: 'RESOLVED', priority: 'CRITICAL', assignee: 'Admin', created: '2024-01-15', updated: '2024-01-18', category: 'Technisch' },
    { id: 5, title: 'Fragen zu Vertragsverlängerung', customer: 'Wagner & Co', contact: 'Michael Wagner', email: 'm.wagner@wagner-co.de', status: 'OPEN', priority: 'MEDIUM', assignee: null, created: '2024-01-20', updated: '2024-01-20', category: 'Vertrag' },
    { id: 6, title: 'Einrichtungsprobleme', customer: 'Bergmann OHG', contact: 'Lisa Bergmann', email: 'lisa@bergmann-ohg.de', status: 'CLOSED', priority: 'HIGH', assignee: 'Admin', created: '2024-01-10', updated: '2024-01-15', category: 'Support' },
]

export default function Tickets() {
    const [searchTerm, setSearchTerm] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [filterPriority, setFilterPriority] = useState('all')
    const [selectedTicket, setSelectedTicket] = useState(null)

    const filteredTickets = mockTickets.filter(ticket => {
        const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.contact.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus
        const matchesPriority = filterPriority === 'all' || ticket.priority === filterPriority
        return matchesSearch && matchesStatus && matchesPriority
    })

    const getStatusBadge = (status) => {
        const styles = {
            'OPEN': 'badge-error',
            'IN_PROGRESS': 'badge-warning',
            'WAITING': 'badge-info',
            'RESOLVED': 'badge-success',
            'CLOSED': 'badge-neutral',
        }
        const labels = {
            'OPEN': 'Offen',
            'IN_PROGRESS': 'In Bearbeitung',
            'WAITING': 'Wartend',
            'RESOLVED': 'Gelöst',
            'CLOSED': 'Geschlossen',
        }
        return <span className={styles[status]}>{labels[status]}</span>
    }

    const getPriorityBadge = (priority) => {
        const styles = {
            'LOW': 'badge-neutral',
            'MEDIUM': 'badge-info',
            'HIGH': 'badge-warning',
            'CRITICAL': 'badge-error',
        }
        const labels = {
            'LOW': 'Niedrig',
            'MEDIUM': 'Mittel',
            'HIGH': 'Hoch',
            'CRITICAL': 'Kritisch',
        }
        return <span className={styles[priority]}>{labels[priority]}</span>
    }

    // Calculate stats
    const openTickets = filteredTickets.filter(t => t.status === 'OPEN').length
    const inProgressTickets = filteredTickets.filter(t => t.status === 'IN_PROGRESS').length
    const resolvedTickets = filteredTickets.filter(t => t.status === 'RESOLVED').length

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Service-Tickets</h1>
                    <p className="text-surface-400 mt-1">Verwalten Sie Support-Anfragen und Kundenprobleme</p>
                </div>
                <button className="btn-primary flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Neues Ticket
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="crm-card p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-surface-400 text-sm">Offene Tickets</p>
                            <p className="text-2xl font-bold text-status-error">{openTickets}</p>
                        </div>
                        <AlertCircle className="w-8 h-8 text-status-error" />
                    </div>
                </div>
                <div className="crm-card p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-surface-400 text-sm">In Bearbeitung</p>
                            <p className="text-2xl font-bold text-status-warning">{inProgressTickets}</p>
                        </div>
                        <Clock className="w-8 h-8 text-status-warning" />
                    </div>
                </div>
                <div className="crm-card p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-surface-400 text-sm">Gelöst</p>
                            <p className="text-2xl font-bold text-status-success">{resolvedTickets}</p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-status-success" />
                    </div>
                </div>
                <div className="crm-card p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-surface-400 text-sm">Gesamt</p>
                            <p className="text-2xl font-bold text-white">{mockTickets.length}</p>
                        </div>
                        <Headphones className="w-8 h-8 text-crm-primary" />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="crm-card p-4 mb-6">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                        <input
                            type="text"
                            placeholder="Tickets suchen..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-field pl-10"
                        />
                    </div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="input-field w-auto"
                    >
                        <option value="all">Alle Status</option>
                        {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                    <select
                        value={filterPriority}
                        onChange={(e) => setFilterPriority(e.target.value)}
                        className="input-field w-auto"
                    >
                        <option value="all">Alle Prioritäten</option>
                        {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
            </div>

            {/* Tickets List */}
            <div className="crm-card overflow-hidden">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th className="table-header">Ticket</th>
                                <th className="table-header">Kunde</th>
                                <th className="table-header">Status</th>
                                <th className="table-header">Priorität</th>
                                <th className="table-header">Bearbeiter</th>
                                <th className="table-header">Erstellt</th>
                                <th className="table-header text-right">Aktionen</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTickets.map((ticket) => (
                                <tr key={ticket.id} className="hover:bg-surface-700/30 cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
                                    <td className="table-cell">
                                        <div>
                                            <p className="font-medium text-white">#{ticket.id} {ticket.title}</p>
                                            <p className="text-xs text-surface-500">{ticket.category}</p>
                                        </div>
                                    </td>
                                    <td className="table-cell">
                                        <div>
                                            <p className="text-white">{ticket.customer}</p>
                                            <p className="text-xs text-surface-500">{ticket.contact}</p>
                                        </div>
                                    </td>
                                    <td className="table-cell">{getStatusBadge(ticket.status)}</td>
                                    <td className="table-cell">{getPriorityBadge(ticket.priority)}</td>
                                    <td className="table-cell">
                                        {ticket.assignee ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-crm-primary flex items-center justify-center text-white text-xs">
                                                    {ticket.assignee[0]}
                                                </div>
                                                <span className="text-surface-300">{ticket.assignee}</span>
                                            </div>
                                        ) : (
                                            <span className="text-surface-500">Nicht zugewiesen</span>
                                        )}
                                    </td>
                                    <td className="table-cell text-surface-400">{ticket.created}</td>
                                    <td className="table-cell text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button className="btn-icon" title="Bearbeiten">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button className="btn-icon" title="Löschen">
                                                <Trash2 className="w-4 h-4 text-rose-400" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Ticket Detail Modal */}
            {selectedTicket && (
                <div className="modal-overlay" onClick={() => setSelectedTicket(null)}>
                    <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-surface-400">#{selectedTicket.id}</span>
                                        {getStatusBadge(selectedTicket.status)}
                                        {getPriorityBadge(selectedTicket.priority)}
                                    </div>
                                    <h2 className="text-xl font-bold text-white">{selectedTicket.title}</h2>
                                </div>
                                <button onClick={() => setSelectedTicket(null)} className="btn-icon text-2xl">
                                    ×
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="crm-card p-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <User className="w-4 h-4 text-surface-400" />
                                        <span className="text-surface-400 text-sm">Kunde</span>
                                    </div>
                                    <p className="text-white font-medium">{selectedTicket.customer}</p>
                                    <p className="text-sm text-surface-400">{selectedTicket.contact}</p>
                                </div>
                                <div className="crm-card p-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Mail className="w-4 h-4 text-surface-400" />
                                        <span className="text-surface-400 text-sm">E-Mail</span>
                                    </div>
                                    <p className="text-white font-medium">{selectedTicket.email}</p>
                                </div>
                                <div className="crm-card p-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Calendar className="w-4 h-4 text-surface-400" />
                                        <span className="text-surface-400 text-sm">Erstellt</span>
                                    </div>
                                    <p className="text-white font-medium">{selectedTicket.created}</p>
                                </div>
                                <div className="crm-card p-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Clock className="w-4 h-4 text-surface-400" />
                                        <span className="text-surface-400 text-sm">Zuletzt aktualisiert</span>
                                    </div>
                                    <p className="text-white font-medium">{selectedTicket.updated}</p>
                                </div>
                            </div>

                            {/* Activity/Comments Section */}
                            <div className="crm-card p-4 mb-4">
                                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4" />
                                    Aktivitäten
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-crm-primary flex items-center justify-center text-white text-sm flex-shrink-0">
                                            A
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-white">Admin</span>
                                                <span className="text-xs text-surface-500">hat den Status geändert</span>
                                            </div>
                                            <p className="text-sm text-surface-400">Ticket erstellt und zur Bearbeitung zugewiesen.</p>
                                            <span className="text-xs text-surface-500">{selectedTicket.created}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button className="btn-primary flex-1">Bearbeiten</button>
                                <button className="btn-secondary flex-1">Status ändern</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
