import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Building2, Plus, Search, MapPin, Globe, Edit, Trash2, Mail, Phone } from 'lucide-react'

const initialForm = {
    name: '',
    website: '',
    industry: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    notes: '',
}

export default function Companies() {
    const [companies, setCompanies] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [form, setForm] = useState(initialForm)
    const [selectedCompany, setSelectedCompany] = useState(null)

    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    async function loadCompanies() {
        setLoading(true)
        setError('')
        try {
            const { data } = await axios.get('/api/companies', {
                headers,
                params: { q: searchTerm || undefined },
            })
            setCompanies(Array.isArray(data) ? data : [])
        } catch (err) {
            setError(err.response?.data?.error || 'Firmen konnten nicht geladen werden')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadCompanies()
    }, [searchTerm])

    const stats = useMemo(() => {
        const uniqueIndustries = new Set(companies.map(c => c.industry).filter(Boolean)).size
        return {
            total: companies.length,
            industries: uniqueIndustries,
            withWebsite: companies.filter(c => c.website).length,
            withEmail: companies.filter(c => c.email).length,
        }
    }, [companies])

    function openCreate() {
        setEditingId(null)
        setForm(initialForm)
        setShowForm(true)
    }

    function openEdit(company) {
        setEditingId(company.id)
        setForm({
            name: company.name || '',
            website: company.website || '',
            industry: company.industry || '',
            address: company.address || '',
            city: company.city || '',
            phone: company.phone || '',
            email: company.email || '',
            notes: company.notes || '',
        })
        setShowForm(true)
    }

    function resetForm() {
        setEditingId(null)
        setForm(initialForm)
        setShowForm(false)
    }

    async function saveCompany(e) {
        e.preventDefault()
        try {
            if (!form.name.trim()) {
                setError('Firmenname ist erforderlich')
                return
            }

            if (editingId) {
                await axios.put(`/api/companies/${editingId}`, form, { headers })
            } else {
                await axios.post('/api/companies', form, { headers })
            }

            resetForm()
            await loadCompanies()
        } catch (err) {
            setError(err.response?.data?.error || 'Firma konnte nicht gespeichert werden')
        }
    }

    async function removeCompany(id) {
        if (!window.confirm('Firma wirklich löschen?')) return
        try {
            await axios.delete(`/api/companies/${id}`, { headers })
            if (selectedCompany?.id === id) setSelectedCompany(null)
            await loadCompanies()
        } catch (err) {
            setError(err.response?.data?.error || 'Firma konnte nicht gelöscht werden')
        }
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Firmen</h1>
                    <p className="text-surface-400 mt-1">Verwalten Sie Ihre Firmen und Geschäftspartner</p>
                </div>
                <button onClick={openCreate} className="btn-primary flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Neue Firma
                </button>
            </div>

            {error && <div className="mb-4 p-3 rounded-lg bg-rose-500/15 text-rose-300 text-sm">{error}</div>}

            {showForm && (
                <form onSubmit={saveCompany} className="crm-card p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input className="input-field" placeholder="Firmenname*" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    <input className="input-field" placeholder="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                    <input className="input-field" placeholder="Branche" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
                    <input className="input-field" placeholder="Adresse" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                    <input className="input-field" placeholder="Stadt" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                    <input className="input-field" placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    <input className="input-field" placeholder="E-Mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    <input className="input-field md:col-span-2" placeholder="Notizen" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    <div className="md:col-span-3 flex gap-2 justify-end">
                        <button type="button" onClick={resetForm} className="btn-secondary">Abbrechen</button>
                        <button type="submit" className="btn-primary">{editingId ? 'Speichern' : 'Erstellen'}</button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="crm-card p-4"><p className="text-surface-400 text-sm">Gesamt Firmen</p><p className="text-2xl font-bold text-white">{stats.total}</p></div>
                <div className="crm-card p-4"><p className="text-surface-400 text-sm">Branchen</p><p className="text-2xl font-bold text-white">{stats.industries}</p></div>
                <div className="crm-card p-4"><p className="text-surface-400 text-sm">Mit Website</p><p className="text-2xl font-bold text-status-info">{stats.withWebsite}</p></div>
                <div className="crm-card p-4"><p className="text-surface-400 text-sm">Mit E-Mail</p><p className="text-2xl font-bold text-status-success">{stats.withEmail}</p></div>
            </div>

            <div className="crm-card p-4 mb-6">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                    <input
                        type="text"
                        placeholder="Firmen suchen..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-field pl-10"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {!loading && companies.map((company) => (
                    <div
                        key={company.id}
                        className="crm-card-hover p-5 cursor-pointer"
                        onClick={() => setSelectedCompany(company)}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg bg-crm-primary/20 flex items-center justify-center">
                                    <Building2 className="w-6 h-6 text-crm-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white">{company.name}</h3>
                                    <p className="text-sm text-surface-400">{company.industry || '-'}</p>
                                </div>
                            </div>
                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                <button className="btn-icon" onClick={() => openEdit(company)}><Edit className="w-4 h-4" /></button>
                                <button className="btn-icon" onClick={() => removeCompany(company.id)}><Trash2 className="w-4 h-4 text-rose-400" /></button>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-surface-400"><MapPin className="w-4 h-4" />{company.city || company.address || '-'}</div>
                            <div className="flex items-center gap-2 text-surface-400"><Globe className="w-4 h-4" />{company.website || '-'}</div>
                        </div>
                    </div>
                ))}
                {!loading && companies.length === 0 && (
                    <div className="crm-card p-8 text-center text-surface-400 md:col-span-2 lg:col-span-3">Keine Firmen gefunden</div>
                )}
                {loading && (
                    <div className="crm-card p-8 text-center text-surface-400 md:col-span-2 lg:col-span-3">Lade Firmen...</div>
                )}
            </div>

            {selectedCompany && (
                <div className="modal-overlay" onClick={() => setSelectedCompany(null)}>
                    <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-lg bg-crm-primary/20 flex items-center justify-center"><Building2 className="w-8 h-8 text-crm-primary" /></div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">{selectedCompany.name}</h2>
                                        <p className="text-surface-400">{selectedCompany.industry || '-'}</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedCompany(null)} className="btn-icon text-2xl">×</button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="crm-card p-4"><div className="flex items-center gap-3 mb-2"><MapPin className="w-4 h-4 text-surface-400" /><span className="text-surface-400 text-sm">Adresse</span></div><p className="text-white font-medium">{selectedCompany.address || '-'}</p></div>
                                <div className="crm-card p-4"><div className="flex items-center gap-3 mb-2"><Globe className="w-4 h-4 text-surface-400" /><span className="text-surface-400 text-sm">Website</span></div><p className="text-white font-medium">{selectedCompany.website || '-'}</p></div>
                                <div className="crm-card p-4"><div className="flex items-center gap-3 mb-2"><Mail className="w-4 h-4 text-surface-400" /><span className="text-surface-400 text-sm">E-Mail</span></div><p className="text-white font-medium">{selectedCompany.email || '-'}</p></div>
                                <div className="crm-card p-4"><div className="flex items-center gap-3 mb-2"><Phone className="w-4 h-4 text-surface-400" /><span className="text-surface-400 text-sm">Telefon</span></div><p className="text-white font-medium">{selectedCompany.phone || '-'}</p></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
