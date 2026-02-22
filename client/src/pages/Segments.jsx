import { useState } from 'react'
import { Target, Plus, Search, Filter, Users, BarChart3, Edit, Trash2, Globe } from 'lucide-react'

const mockSegments = [
    { id: 1, name: 'IT-Unternehmen', type: 'dynamic', criteria: 'Branche = IT', contacts: 45, conversion: 12.5 },
    { id: 2, name: 'Große Konzerne', type: 'static', criteria: 'Mitarbeiter > 100', contacts: 23, conversion: 8.2 },
    { id: 3, name: 'Handwerk', type: 'dynamic', criteria: 'Branche = Handwerk', contacts: 67, conversion: 15.3 },
    { id: 4, name: 'Hohe Bewertung', type: 'dynamic', criteria: 'Google Rating > 4.5', contacts: 34, conversion: 22.1 },
    { id: 5, name: 'Keine Website', type: 'dynamic', criteria: 'Website = leer', contacts: 89, conversion: 18.7 },
]

export default function Segments() {
    const [searchTerm, setSearchTerm] = useState('')
    const [filterType, setFilterType] = useState('all')

    const filtered = mockSegments.filter(s =>
        (filterType === 'all' || s.type === filterType) &&
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const totalContacts = mockSegments.reduce((s, seg) => Math.max(s, seg.contacts), 0)

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Zielgruppen</h1>
                    <p className="text-surface-400 mt-1">Statische und dynamische Zielgruppen verwalten</p>
                </div>
                <button className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Neue Zielgruppe</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="crm-card p-4"><div className="flex items-center justify-between"><div><p className="text-surface-400 text-sm">Zielgruppen</p><p className="text-2xl font-bold text-white">{mockSegments.length}</p></div><Target className="w-8 h-8 text-crm-primary" /></div></div>
                <div className="crm-card p-4"><div className="flex items-center justify-between"><div><p className="text-surface-400 text-sm">Dynamisch</p><p className="text-2xl font-bold text-status-info">{mockSegments.filter(s => s.type === 'dynamic').length}</p></div><BarChart3 className="w-8 h-8 text-status-info" /></div></div>
                <div className="crm-card p-4"><div className="flex items-center justify-between"><div><p className="text-surface-400 text-sm">Statisch</p><p className="text-2xl font-bold text-status-warning">{mockSegments.filter(s => s.type === 'static').length}</p></div><Users className="w-8 h-8 text-status-warning" /></div></div>
                <div className="crm-card p-4"><div className="flex items-center justify-between"><div><p className="text-surface-400 text-sm">Ø Conversion</p><p className="text-2xl font-bold text-crm-accent">{(mockSegments.reduce((s, seg) => s + seg.conversion, 0) / mockSegments.length).toFixed(1)}%</p></div><Globe className="w-8 h-8 text-crm-accent" /></div></div>
            </div>

            <div className="crm-card p-4 mb-6">
                <div className="flex items-center gap-4">
                    <div className="relative flex-1"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" /><input type="text" placeholder="Zielgruppen suchen..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="input-field pl-10" /></div>
                    <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input-field w-auto"><option value="all">Alle Typen</option><option value="dynamic">Dynamisch</option><option value="static">Statisch</option></select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(segment => (
                    <div key={segment.id} className="crm-card-hover p-5">
                        <div className="flex items-start justify-between mb-3">
                            <div><h3 className="font-semibold text-white">{segment.name}</h3><p className="text-xs text-surface-500 mt-1">{segment.criteria}</p></div>
                            <span className={`px-2 py-1 text-xs rounded-full ${segment.type === 'dynamic' ? 'bg-status-info/20 text-status-info' : 'bg-status-warning/20 text-status-warning'}`}>{segment.type === 'dynamic' ? 'Dynamisch' : 'Statisch'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-surface-400"><Users className="w-4 h-4" /><span>{segment.contacts} Kontakte</span></div>
                            <span className="text-crm-accent font-medium">{segment.conversion}% Conversion</span>
                        </div>
                        <div className="flex gap-2 mt-4 pt-4 border-t border-surface-700">
                            <button className="btn-secondary flex-1 text-sm py-2">Bearbeiten</button>
                            <button className="btn-icon"><Trash2 className="w-4 h-4 text-rose-400" /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
