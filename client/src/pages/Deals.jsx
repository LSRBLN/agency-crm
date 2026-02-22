import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { DollarSign, Plus, Search, Building2, TrendingUp, CheckCircle, Star, Edit, Trash2 } from 'lucide-react'

const STAGES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']

const initialForm = {
    name: '',
    value: '',
    stage: 'new',
    probability: 10,
    contact_id: '',
    company_id: '',
    expected_close: '',
    notes: '',
}

const stageLabel = {
    new: 'Neu',
    contacted: 'Kontaktiert',
    qualified: 'Qualifiziert',
    proposal: 'Angebot',
    won: 'Gewonnen',
    lost: 'Verloren',
}

const stageColor = {
    new: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    contacted: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    qualified: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    proposal: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    won: 'bg-green-500/20 text-green-400 border-green-500/30',
    lost: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export default function Deals() {
    const [deals, setDeals] = useState([])
    const [contacts, setContacts] = useState([])
    const [companies, setCompanies] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedDeal, setSelectedDeal] = useState(null)
    const [viewMode, setViewMode] = useState('board')
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [form, setForm] = useState(initialForm)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    async function loadData() {
        setLoading(true)
        setError('')
        try {
            const [dealsRes, contactsRes, companiesRes] = await Promise.all([
                axios.get('/api/deals', { headers }),
                axios.get('/api/contacts', { headers }),
                axios.get('/api/companies', { headers }),
            ])
            setDeals(Array.isArray(dealsRes.data) ? dealsRes.data : [])
            setContacts(Array.isArray(contactsRes.data) ? contactsRes.data : [])
            setCompanies(Array.isArray(companiesRes.data) ? companiesRes.data : [])
        } catch (err) {
            setError(err.response?.data?.error || 'Deals konnten nicht geladen werden')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const contactMap = useMemo(() => {
        return contacts.reduce((acc, contact) => {
            acc[contact.id] = contact
            return acc
        }, {})
    }, [contacts])

    const companyMap = useMemo(() => {
        return companies.reduce((acc, company) => {
            acc[company.id] = company
            return acc
        }, {})
    }, [companies])

    const filteredDeals = useMemo(() => {
        const query = searchTerm.trim().toLowerCase()
        if (!query) return deals
        return deals.filter((deal) => {
            const companyName = companyMap[deal.company_id]?.name || ''
            const contactName = contactMap[deal.contact_id]?.name || ''
            return (
                String(deal.name || '').toLowerCase().includes(query) ||
                companyName.toLowerCase().includes(query) ||
                contactName.toLowerCase().includes(query)
            )
        })
    }, [deals, searchTerm, contactMap, companyMap])

    const dealsByStage = useMemo(() => {
        return STAGES.reduce((acc, stage) => {
            acc[stage] = filteredDeals.filter((deal) => (deal.stage || 'new') === stage)
            return acc
        }, {})
    }, [filteredDeals])

    const totalValue = filteredDeals.reduce((sum, deal) => sum + Number(deal.value || 0), 0)
    const wonValue = filteredDeals
        .filter((deal) => deal.stage === 'won')
        .reduce((sum, deal) => sum + Number(deal.value || 0), 0)
    const avgProbability = filteredDeals.length
        ? Math.round(filteredDeals.reduce((sum, deal) => sum + Number(deal.probability || 0), 0) / filteredDeals.length)
        : 0

    function openCreate() {
        setEditingId(null)
        setForm(initialForm)
        setShowForm(true)
    }

    function openEdit(deal) {
        setEditingId(deal.id)
        setForm({
            name: deal.name || '',
            value: deal.value ?? '',
            stage: deal.stage || 'new',
            probability: deal.probability ?? 10,
            contact_id: deal.contact_id || '',
            company_id: deal.company_id || '',
            expected_close: deal.expected_close || '',
            notes: deal.notes || '',
        })
        setShowForm(true)
    }

    function resetForm() {
        setEditingId(null)
        setForm(initialForm)
        setShowForm(false)
    }

    async function saveDeal(e) {
        e.preventDefault()
        try {
            if (!form.name.trim()) {
                setError('Deal-Name ist erforderlich')
                return
            }

            const payload = {
                ...form,
                value: Number(form.value || 0),
                probability: Number(form.probability || 0),
                contact_id: form.contact_id || null,
                company_id: form.company_id || null,
                expected_close: form.expected_close || null,
            }

            if (editingId) {
                await axios.put(`/api/deals/${editingId}`, payload, { headers })
            } else {
                await axios.post('/api/deals', payload, { headers })
            }

            resetForm()
            await loadData()
        } catch (err) {
            setError(err.response?.data?.error || 'Deal konnte nicht gespeichert werden')
        }
    }

    async function removeDeal(id) {
        if (!window.confirm('Deal wirklich löschen?')) return
        try {
            await axios.delete(`/api/deals/${id}`, { headers })
            if (selectedDeal?.id === id) setSelectedDeal(null)
            await loadData()
        } catch (err) {
            setError(err.response?.data?.error || 'Deal konnte nicht gelöscht werden')
        }
    }

    async function moveStage(deal, stage) {
        try {
            await axios.put(`/api/deals/${deal.id}`, { stage }, { headers })
            await loadData()
        } catch (err) {
            setError(err.response?.data?.error || 'Stage konnte nicht aktualisiert werden')
        }
    }

    return (
        <div className="p-6 max-w-full mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Vertrieb</h1>
                    <p className="text-surface-400 mt-1">Verfolgen Sie Ihre Verkaufschancen und Deals</p>
                </div>
                <button onClick={openCreate} className="btn-primary flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Neuer Deal
                </button>
            </div>

            {error && <div className="mb-4 p-3 rounded-lg bg-rose-500/15 text-rose-300 text-sm">{error}</div>}

            {showForm && (
                <form onSubmit={saveDeal} className="crm-card p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input className="input-field" placeholder="Deal-Name*" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    <input type="number" className="input-field" placeholder="Wert" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
                    <select className="input-field" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
                        {STAGES.map((stage) => <option key={stage} value={stage}>{stageLabel[stage]}</option>)}
                    </select>
                    <input type="number" className="input-field" placeholder="Wahrscheinlichkeit %" min="0" max="100" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} />
                    <select className="input-field" value={form.contact_id} onChange={(e) => setForm({ ...form, contact_id: e.target.value })}>
                        <option value="">Kontakt auswählen</option>
                        {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
                    </select>
                    <select className="input-field" value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>
                        <option value="">Firma auswählen</option>
                        {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                    </select>
                    <input type="date" className="input-field" value={form.expected_close} onChange={(e) => setForm({ ...form, expected_close: e.target.value })} />
                    <input className="input-field md:col-span-2" placeholder="Notizen" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    <div className="md:col-span-3 flex gap-2 justify-end">
                        <button type="button" onClick={resetForm} className="btn-secondary">Abbrechen</button>
                        <button type="submit" className="btn-primary">{editingId ? 'Speichern' : 'Erstellen'}</button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="crm-card p-4">
                    <div className="flex items-center justify-between">
                        <div><p className="text-surface-400 text-sm">Gesamt Deals</p><p className="text-2xl font-bold text-white">{filteredDeals.length}</p></div>
                        <DollarSign className="w-8 h-8 text-crm-primary" />
                    </div>
                </div>
                <div className="crm-card p-4">
                    <div className="flex items-center justify-between">
                        <div><p className="text-surface-400 text-sm">Gesamtvolumen</p><p className="text-2xl font-bold text-white">{totalValue.toLocaleString('de-DE')}€</p></div>
                        <TrendingUp className="w-8 h-8 text-status-info" />
                    </div>
                </div>
                <div className="crm-card p-4">
                    <div className="flex items-center justify-between">
                        <div><p className="text-surface-400 text-sm">Gewonnen</p><p className="text-2xl font-bold text-status-success">{wonValue.toLocaleString('de-DE')}€</p></div>
                        <CheckCircle className="w-8 h-8 text-status-success" />
                    </div>
                </div>
                <div className="crm-card p-4">
                    <div className="flex items-center justify-between">
                        <div><p className="text-surface-400 text-sm">Ø Wahrscheinlichkeit</p><p className="text-2xl font-bold text-crm-accent">{avgProbability}%</p></div>
                        <Star className="w-8 h-8 text-crm-accent" />
                    </div>
                </div>
            </div>

            <div className="crm-card p-4 mb-6">
                <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                        <input
                            type="text"
                            placeholder="Deals suchen..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-field pl-10"
                        />
                    </div>
                    <div className="flex rounded-lg overflow-hidden border border-surface-600">
                        <button onClick={() => setViewMode('board')} className={`px-4 py-2 text-sm font-medium ${viewMode === 'board' ? 'bg-crm-primary text-white' : 'bg-surface-700 text-surface-300 hover:bg-surface-600'}`}>Board</button>
                        <button onClick={() => setViewMode('list')} className={`px-4 py-2 text-sm font-medium ${viewMode === 'list' ? 'bg-crm-primary text-white' : 'bg-surface-700 text-surface-300 hover:bg-surface-600'}`}>Liste</button>
                    </div>
                </div>
            </div>

            {loading && <div className="crm-card p-8 text-center text-surface-400">Lade Deals...</div>}

            {!loading && viewMode === 'board' && (
                <div className="flex gap-4 overflow-x-auto pb-4">
                    {STAGES.map((stage) => (
                        <div key={stage} className="flex-shrink-0 w-72">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-white">{stageLabel[stage]}</h3>
                                <span className="px-2 py-0.5 text-xs rounded-full bg-surface-700 text-surface-400">{dealsByStage[stage]?.length || 0}</span>
                            </div>
                            <div className="space-y-3 min-h-[200px]">
                                {(dealsByStage[stage] || []).map((deal) => {
                                    const company = companyMap[deal.company_id]
                                    const contact = contactMap[deal.contact_id]
                                    return (
                                        <div key={deal.id} className="crm-card p-4 cursor-pointer hover:border-crm-primary/50 transition-colors" onClick={() => setSelectedDeal(deal)}>
                                            <div className="flex items-start justify-between mb-2">
                                                <h4 className="font-medium text-white text-sm">{deal.name}</h4>
                                                <span className={`px-2 py-0.5 text-xs rounded-full border ${stageColor[deal.stage] || stageColor.new}`}>{deal.probability || 0}%</span>
                                            </div>
                                            <p className="text-xs text-surface-400 mb-1">{company?.name || 'Ohne Firma'}</p>
                                            <p className="text-xs text-surface-500 mb-2">{contact?.name || 'Ohne Kontakt'}</p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-semibold text-crm-accent">{Number(deal.value || 0).toLocaleString('de-DE')}€</span>
                                                <select value={deal.stage || 'new'} className="bg-transparent text-xs text-surface-300" onClick={(e) => e.stopPropagation()} onChange={(e) => moveStage(deal, e.target.value)}>
                                                    {STAGES.map((option) => <option key={option} value={option}>{stageLabel[option]}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!loading && viewMode === 'list' && (
                <div className="crm-card overflow-hidden">
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th className="table-header">Deal</th>
                                    <th className="table-header">Firma</th>
                                    <th className="table-header">Kontakt</th>
                                    <th className="table-header">Wert</th>
                                    <th className="table-header">Phase</th>
                                    <th className="table-header">Wahrscheinlichkeit</th>
                                    <th className="table-header text-right">Aktionen</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDeals.map((deal) => (
                                    <tr key={deal.id} className="hover:bg-surface-700/30 cursor-pointer" onClick={() => setSelectedDeal(deal)}>
                                        <td className="table-cell"><div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-crm-primary" /><span className="font-medium text-white">{deal.name}</span></div></td>
                                        <td className="table-cell">{companyMap[deal.company_id]?.name || '-'}</td>
                                        <td className="table-cell">{contactMap[deal.contact_id]?.name || '-'}</td>
                                        <td className="table-cell font-semibold text-crm-accent">{Number(deal.value || 0).toLocaleString('de-DE')}€</td>
                                        <td className="table-cell"><span className={`px-2 py-1 text-xs rounded-full border ${stageColor[deal.stage] || stageColor.new}`}>{stageLabel[deal.stage] || deal.stage || '-'}</span></td>
                                        <td className="table-cell">{deal.probability || 0}%</td>
                                        <td className="table-cell text-right">
                                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                <button className="btn-icon" onClick={() => openEdit(deal)}><Edit className="w-4 h-4" /></button>
                                                <button className="btn-icon" onClick={() => removeDeal(deal.id)}><Trash2 className="w-4 h-4 text-rose-400" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredDeals.length === 0 && (
                                    <tr><td colSpan={7} className="table-cell text-center text-surface-400 py-10">Keine Deals gefunden</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {selectedDeal && (
                <div className="modal-overlay" onClick={() => setSelectedDeal(null)}>
                    <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-white">{selectedDeal.name}</h2>
                                    <p className="text-surface-400">{companyMap[selectedDeal.company_id]?.name || 'Ohne Firma'} • {contactMap[selectedDeal.contact_id]?.name || 'Ohne Kontakt'}</p>
                                    <span className={`px-2 py-1 text-xs rounded-full border mt-2 inline-block ${stageColor[selectedDeal.stage] || stageColor.new}`}>{stageLabel[selectedDeal.stage] || selectedDeal.stage}</span>
                                </div>
                                <button onClick={() => setSelectedDeal(null)} className="btn-icon text-2xl">×</button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="crm-card p-4"><p className="text-surface-400 text-sm mb-2">Deal-Wert</p><p className="text-2xl font-bold text-crm-accent">{Number(selectedDeal.value || 0).toLocaleString('de-DE')}€</p></div>
                                <div className="crm-card p-4"><p className="text-surface-400 text-sm mb-2">Wahrscheinlichkeit</p><p className="text-2xl font-bold text-white">{selectedDeal.probability || 0}%</p></div>
                                <div className="crm-card p-4"><p className="text-surface-400 text-sm mb-2">Erwarteter Abschluss</p><p className="text-white font-medium">{selectedDeal.expected_close ? new Date(selectedDeal.expected_close).toLocaleDateString('de-DE') : '-'}</p></div>
                                <div className="crm-card p-4"><p className="text-surface-400 text-sm mb-2">Notizen</p><p className="text-white font-medium">{selectedDeal.notes || '-'}</p></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
