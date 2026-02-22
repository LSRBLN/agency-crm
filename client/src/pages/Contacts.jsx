import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Users, Plus, Search, Mail, Phone, Building2, Calendar, Edit, Trash2 } from 'lucide-react'

const initialForm = {
    name: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    mobile_phone: '',
    company: '',
    position: '',
    website: '',
    street_address: '',
    zip_code: '',
    city: '',
    country: 'Deutschland',
    status: 'lead',
    source: '',
    attribution_source: '',
    attribution_campaign: '',
    notes: '',
}

export default function Contacts() {
    const [contacts, setContacts] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [form, setForm] = useState(initialForm)
    const [selectedContact, setSelectedContact] = useState(null)

    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    async function loadContacts() {
        setLoading(true)
        setError('')
        try {
            const { data } = await axios.get('/api/contacts', {
                headers,
                params: {
                    q: searchTerm || undefined,
                    status: statusFilter,
                },
            })
            setContacts(Array.isArray(data) ? data : [])
        } catch (err) {
            setError(err.response?.data?.error || 'Kontakte konnten nicht geladen werden')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadContacts()
    }, [searchTerm, statusFilter])

    const stats = useMemo(() => {
        return {
            total: contacts.length,
            active: contacts.filter(c => c.status === 'active').length,
            lead: contacts.filter(c => c.status === 'lead').length,
            inactive: contacts.filter(c => c.status === 'inactive').length,
        }
    }, [contacts])

    function resetForm() {
        setForm(initialForm)
        setEditingId(null)
        setShowForm(false)
    }

    function openCreate() {
        setForm(initialForm)
        setEditingId(null)
        setShowForm(true)
    }

    function openEdit(contact) {
        setForm({
            name: contact.name || '',
            first_name: contact.first_name || '',
            last_name: contact.last_name || '',
            email: contact.email || '',
            phone: contact.phone || '',
            mobile_phone: contact.mobile_phone || '',
            company: contact.company || '',
            position: contact.position || '',
            website: contact.website || '',
            street_address: contact.street_address || '',
            zip_code: contact.zip_code || '',
            city: contact.city || '',
            country: contact.country || 'Deutschland',
            status: contact.status || 'lead',
            source: contact.source || '',
            attribution_source: contact.attribution_source || '',
            attribution_campaign: contact.attribution_campaign || '',
            notes: contact.notes || '',
        })
        setEditingId(contact.id)
        setShowForm(true)
    }

    async function saveContact(e) {
        e.preventDefault()
        try {
            if (!form.name.trim()) {
                setError('Name ist erforderlich')
                return
            }

            if (editingId) {
                await axios.put(`/api/contacts/${editingId}`, form, { headers })
            } else {
                await axios.post('/api/contacts', form, { headers })
            }
            resetForm()
            await loadContacts()
        } catch (err) {
            setError(err.response?.data?.error || 'Kontakt konnte nicht gespeichert werden')
        }
    }

    async function removeContact(id) {
        if (!window.confirm('Kontakt wirklich löschen?')) return
        try {
            await axios.delete(`/api/contacts/${id}`, { headers })
            if (selectedContact?.id === id) setSelectedContact(null)
            await loadContacts()
        } catch (err) {
            setError(err.response?.data?.error || 'Kontakt konnte nicht gelöscht werden')
        }
    }

    const getStatusBadge = (status) => {
        const styles = {
            active: 'badge-success',
            inactive: 'badge-neutral',
            lead: 'badge-info',
        }
        const labels = {
            active: 'Aktiv',
            inactive: 'Inaktiv',
            lead: 'Lead',
        }
        return <span className={styles[status] || 'badge-neutral'}>{labels[status] || status || 'Unbekannt'}</span>
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Kontakte</h1>
                    <p className="text-surface-400 mt-1">Verwalten Sie Ihre Kontakte und Ansprechpartner</p>
                </div>
                <button onClick={openCreate} className="btn-primary flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Neuer Kontakt
                </button>
            </div>

            {error && <div className="mb-4 p-3 rounded-lg bg-rose-500/15 text-rose-300 text-sm">{error}</div>}

            {showForm && (
                <form onSubmit={saveContact} className="crm-card p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input className="input-field" placeholder="Name*" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    <input className="input-field" placeholder="Vorname" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                    <input className="input-field" placeholder="Nachname" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                    <input className="input-field" placeholder="E-Mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    <input className="input-field" placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    <input className="input-field" placeholder="Mobil" value={form.mobile_phone} onChange={(e) => setForm({ ...form, mobile_phone: e.target.value })} />
                    <input className="input-field" placeholder="Firma" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                    <input className="input-field" placeholder="Position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
                    <input className="input-field" placeholder="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                    <input className="input-field" placeholder="Straße" value={form.street_address} onChange={(e) => setForm({ ...form, street_address: e.target.value })} />
                    <input className="input-field" placeholder="PLZ" value={form.zip_code} onChange={(e) => setForm({ ...form, zip_code: e.target.value })} />
                    <input className="input-field" placeholder="Stadt" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                    <input className="input-field" placeholder="Land" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                    <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                        <option value="lead">Lead</option>
                        <option value="active">Aktiv</option>
                        <option value="inactive">Inaktiv</option>
                    </select>
                    <input className="input-field md:col-span-1" placeholder="Quelle" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
                    <input className="input-field" placeholder="Attribution Source" value={form.attribution_source} onChange={(e) => setForm({ ...form, attribution_source: e.target.value })} />
                    <input className="input-field" placeholder="Attribution Kampagne" value={form.attribution_campaign} onChange={(e) => setForm({ ...form, attribution_campaign: e.target.value })} />
                    <input className="input-field md:col-span-2" placeholder="Notizen" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    <div className="md:col-span-3 flex gap-2 justify-end">
                        <button type="button" onClick={resetForm} className="btn-secondary">Abbrechen</button>
                        <button type="submit" className="btn-primary">{editingId ? 'Speichern' : 'Erstellen'}</button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="crm-card p-4"><p className="text-surface-400 text-sm">Gesamt</p><p className="text-2xl font-bold text-white">{stats.total}</p></div>
                <div className="crm-card p-4"><p className="text-surface-400 text-sm">Aktiv</p><p className="text-2xl font-bold text-status-success">{stats.active}</p></div>
                <div className="crm-card p-4"><p className="text-surface-400 text-sm">Leads</p><p className="text-2xl font-bold text-status-info">{stats.lead}</p></div>
                <div className="crm-card p-4"><p className="text-surface-400 text-sm">Inaktiv</p><p className="text-2xl font-bold text-surface-500">{stats.inactive}</p></div>
            </div>

            <div className="crm-card p-4 mb-6">
                <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                        <input
                            type="text"
                            placeholder="Kontakte suchen..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-field pl-10"
                        />
                    </div>
                    <select className="input-field w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="all">Alle Status</option>
                        <option value="lead">Lead</option>
                        <option value="active">Aktiv</option>
                        <option value="inactive">Inaktiv</option>
                    </select>
                </div>
            </div>

            <div className="crm-card overflow-hidden">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th className="table-header">Name</th>
                                <th className="table-header">Firma</th>
                                <th className="table-header">Position</th>
                                <th className="table-header">Kontakt</th>
                                <th className="table-header">Status</th>
                                <th className="table-header">Erstellt</th>
                                <th className="table-header text-right">Aktionen</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!loading && contacts.map((contact) => (
                                <tr key={contact.id} className="hover:bg-surface-700/30 cursor-pointer" onClick={() => setSelectedContact(contact)}>
                                    <td className="table-cell">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-crm-primary/20 flex items-center justify-center text-crm-primary font-medium text-sm">
                                                {String(contact.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}
                                            </div>
                                            <span className="font-medium text-white">{contact.name}</span>
                                        </div>
                                    </td>
                                    <td className="table-cell">{contact.company || '-'}</td>
                                    <td className="table-cell text-surface-400">{contact.position || '-'}</td>
                                    <td className="table-cell">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-crm-primary flex items-center gap-1 text-xs"><Mail className="w-3 h-3" /> {contact.email || '-'}</span>
                                            <span className="text-surface-500 flex items-center gap-1 text-xs"><Phone className="w-3 h-3" /> {contact.phone || '-'}</span>
                                        </div>
                                    </td>
                                    <td className="table-cell">{getStatusBadge(contact.status)}</td>
                                    <td className="table-cell text-surface-400">{contact.created_at ? new Date(contact.created_at).toLocaleDateString('de-DE') : '-'}</td>
                                    <td className="table-cell text-right">
                                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                            <button className="btn-icon" title="Bearbeiten" onClick={() => openEdit(contact)}><Edit className="w-4 h-4" /></button>
                                            <button className="btn-icon" title="Löschen" onClick={() => removeContact(contact.id)}><Trash2 className="w-4 h-4 text-rose-400" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && contacts.length === 0 && (
                                <tr><td className="table-cell text-center text-surface-400 py-10" colSpan={7}>Keine Kontakte gefunden</td></tr>
                            )}
                            {loading && (
                                <tr><td className="table-cell text-center text-surface-400 py-10" colSpan={7}>Lade Kontakte...</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedContact && (
                <div className="modal-overlay" onClick={() => setSelectedContact(null)}>
                    <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-crm-primary/20 flex items-center justify-center text-crm-primary font-bold text-xl">
                                        {String(selectedContact.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">{selectedContact.name}</h2>
                                        <p className="text-surface-400">{selectedContact.position || '-'}</p>
                                        {getStatusBadge(selectedContact.status)}
                                    </div>
                                </div>
                                <button onClick={() => setSelectedContact(null)} className="btn-icon">×</button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="crm-card p-4"><div className="flex items-center gap-3 mb-2"><Building2 className="w-4 h-4 text-surface-400" /><span className="text-surface-400 text-sm">Firma</span></div><p className="text-white font-medium">{selectedContact.company || '-'}</p></div>
                                <div className="crm-card p-4"><div className="flex items-center gap-3 mb-2"><Mail className="w-4 h-4 text-surface-400" /><span className="text-surface-400 text-sm">E-Mail</span></div><p className="text-white font-medium">{selectedContact.email || '-'}</p></div>
                                <div className="crm-card p-4"><div className="flex items-center gap-3 mb-2"><Phone className="w-4 h-4 text-surface-400" /><span className="text-surface-400 text-sm">Telefon</span></div><p className="text-white font-medium">{selectedContact.phone || '-'}</p></div>
                                <div className="crm-card p-4"><div className="flex items-center gap-3 mb-2"><Calendar className="w-4 h-4 text-surface-400" /><span className="text-surface-400 text-sm">Erstellt am</span></div><p className="text-white font-medium">{selectedContact.created_at ? new Date(selectedContact.created_at).toLocaleDateString('de-DE') : '-'}</p></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
