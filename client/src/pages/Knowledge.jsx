import { useState } from 'react'
import { BookOpen, Plus, Search, Folder, FileText, ChevronRight, Edit, Trash2, Eye } from 'lucide-react'

const mockArticles = [
    { id: 1, title: 'So erstellen Sie ein Angebot', category: 'Vertrieb', views: 145, updated: '2024-01-15' },
    { id: 2, title: 'Häufig gestellte Fragen zu Preisen', category: 'Preise', views: 89, updated: '2024-01-12' },
    { id: 3, title: 'Anleitung zur Demo-Seite', category: 'Technisch', views: 234, updated: '2024-01-10' },
    { id: 4, title: 'E-Mail Vorlagen Übersicht', category: 'Marketing', views: 167, updated: '2024-01-08' },
    { id: 5, title: 'Bugfix Anleitung', category: 'Technisch', views: 56, updated: '2024-01-05' },
]

const categories = ['Alle', 'Vertrieb', 'Preise', 'Technisch', 'Marketing']

export default function Knowledge() {
    const [searchTerm, setSearchTerm] = useState('')
    const [filterCategory, setFilterCategory] = useState('Alle')

    const filtered = mockArticles.filter(a =>
        (filterCategory === 'Alle' || a.category === filterCategory) &&
        a.title.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Wissensdatenbank</h1>
                    <p className="text-surface-400 mt-1">Dokumentation und FAQs für das Team</p>
                </div>
                <button className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Neuer Artikel</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="crm-card p-4"><div className="flex items-center justify-between"><div><p className="text-surface-400 text-sm">Artikel</p><p className="text-2xl font-bold text-white">{mockArticles.length}</p></div><BookOpen className="w-8 h-8 text-crm-primary" /></div></div>
                <div className="crm-card p-4"><div className="flex items-center justify-between"><div><p className="text-surface-400 text-sm">Kategorien</p><p className="text-2xl font-bold text-white">{categories.length - 1}</p></div><Folder className="w-8 h-8 text-status-info" /></div></div>
                <div className="crm-card p-4"><div className="flex items-center justify-between"><div><p className="text-surface-400 text-sm">Aufrufe gesamt</p><p className="text-2xl font-bold text-white">{mockArticles.reduce((s, a) => s + a.views, 0)}</p></div><Eye className="w-8 h-8 text-status-success" /></div></div>
            </div>

            <div className="crm-card p-4 mb-6">
                <div className="flex items-center gap-4">
                    <div className="relative flex-1"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" /><input type="text" placeholder="Artikel suchen..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="input-field pl-10" /></div>
                    <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="input-field w-auto">{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
                </div>
            </div>

            <div className="space-y-2">
                {filtered.map(article => (
                    <div key={article.id} className="crm-card-hover p-4 flex items-center justify-between cursor-pointer">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-crm-primary/20 flex items-center justify-center"><FileText className="w-5 h-5 text-crm-primary" /></div>
                            <div><h3 className="font-medium text-white">{article.title}</h3><p className="text-sm text-surface-400">{article.category} • {article.views} Aufrufe</p></div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-surface-500">{article.updated}</span>
                            <div className="flex items-center gap-2"><button className="btn-icon"><Edit className="w-4 h-4" /></button><button className="btn-icon"><Trash2 className="w-4 h-4 text-rose-400" /></button><ChevronRight className="w-4 h-4 text-surface-400" /></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
