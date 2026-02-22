import { useState } from 'react'
import {
    FolderKanban, Plus, Search, Filter, Calendar,
    User, DollarSign, Clock, CheckCircle, PlayCircle,
    Edit, Trash2, Eye, MoreVertical
} from 'lucide-react'

const STAGES = ['DISCOVERY', 'PLANNING', 'IN_PROGRESS', 'REVIEW', 'COMPLETED']

const mockProjects = [
    { id: 1, name: 'Website Relaunch Müller GmbH', client: 'Müller GmbH', value: 8500, stage: 'IN_PROGRESS', startDate: '2024-01-15', dueDate: '2024-02-28', progress: 65, assignee: 'Admin' },
    { id: 2, name: 'SEO Optimierung Schmidt AG', client: 'Schmidt AG', value: 3200, stage: 'COMPLETED', startDate: '2024-01-01', dueDate: '2024-01-31', progress: 100, assignee: 'Admin' },
    { id: 3, name: 'Landingpage Kampagne', client: 'Weber KG', value: 1500, stage: 'PLANNING', startDate: '2024-01-20', dueDate: '2024-02-15', progress: 20, assignee: 'Admin' },
    { id: 4, name: 'Online Shop Fischer', client: 'Fischer GmbH', value: 12000, stage: 'DISCOVERY', startDate: '2024-01-22', dueDate: '2024-03-15', progress: 10, assignee: 'Admin' },
    { id: 5, name: 'Brand Design Wagner', client: 'Wagner & Co', value: 5500, stage: 'REVIEW', startDate: '2024-01-10', dueDate: '2024-02-10', progress: 90, assignee: 'Admin' },
]

export default function Projects() {
    const [searchTerm, setSearchTerm] = useState('')
    const [filterStage, setFilterStage] = useState('all')
    const [selectedProject, setSelectedProject] = useState(null)

    const filteredProjects = mockProjects.filter(p =>
        (filterStage === 'all' || p.stage === filterStage) &&
        (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.client.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    const getStageBadge = (stage) => {
        const styles = {
            'DISCOVERY': 'badge-info',
            'PLANNING': 'badge-warning',
            'IN_PROGRESS': 'badge-error',
            'REVIEW': 'badge-neutral',
            'COMPLETED': 'badge-success',
        }
        const labels = { 'DISCOVERY': 'Entdeckung', 'PLANNING': 'Planung', 'IN_PROGRESS': 'In Arbeit', 'REVIEW': 'Überprüfung', 'COMPLETED': 'Abgeschlossen' }
        return <span className={styles[stage]}>{labels[stage]}</span>
    }

    const totalValue = mockProjects.reduce((s, p) => s + p.value, 0)
    const activeProjects = mockProjects.filter(p => p.stage === 'IN_PROGRESS').length

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Projekte</h1>
                    <p className="text-surface-400 mt-1">Verwalten Sie Ihre laufenden Projekte</p>
                </div>
                <button className="btn-primary flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Neues Projekt
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="crm-card p-4"><div className="flex items-center justify-between"><div><p className="text-surface-400 text-sm">Gesamt</p><p className="text-2xl font-bold text-white">{mockProjects.length}</p></div><FolderKanban className="w-8 h-8 text-crm-primary" /></div></div>
                <div className="crm-card p-4"><div className="flex items-center justify-between"><div><p className="text-surface-400 text-sm">Aktiv</p><p className="text-2xl font-bold text-status-warning">{activeProjects}</p></div><PlayCircle className="w-8 h-8 text-status-warning" /></div></div>
                <div className="crm-card p-4"><div className="flex items-center justify-between"><div><p className="text-surface-400 text-sm">Abgeschlossen</p><p className="text-2xl font-bold text-status-success">{mockProjects.filter(p => p.stage === 'COMPLETED').length}</p></div><CheckCircle className="w-8 h-8 text-status-success" /></div></div>
                <div className="crm-card p-4"><div className="flex items-center justify-between"><div><p className="text-surface-400 text-sm">Gesamtwert</p><p className="text-2xl font-bold text-crm-accent">{totalValue.toLocaleString('de-DE')}€</p></div><DollarSign className="w-8 h-8 text-crm-accent" /></div></div>
            </div>

            <div className="crm-card p-4 mb-6">
                <div className="flex items-center gap-4">
                    <div className="relative flex-1"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" /><input type="text" placeholder="Projekte suchen..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="input-field pl-10" /></div>
                    <select value={filterStage} onChange={e => setFilterStage(e.target.value)} className="input-field w-auto"><option value="all">Alle Phasen</option>{STAGES.map(s => <option key={s} value={s}>{s}</option>)}</select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.map(project => (
                    <div key={project.id} className="crm-card-hover p-5 cursor-pointer" onClick={() => setSelectedProject(project)}>
                        <div className="flex items-start justify-between mb-3">
                            <div><h3 className="font-semibold text-white">{project.name}</h3><p className="text-sm text-surface-400">{project.client}</p></div>
                            {getStageBadge(project.stage)}
                        </div>
                        <div className="mb-3"><div className="flex items-center justify-between text-sm mb-1"><span className="text-surface-400">Fortschritt</span><span className="text-surface-300">{project.progress}%</span></div><div className="h-2 bg-surface-700 rounded-full overflow-hidden"><div className="h-full bg-crm-primary rounded-full" style={{ width: `${project.progress}%` }} /></div></div>
                        <div className="flex items-center justify-between text-sm"><span className="text-surface-400 flex items-center gap-1"><Calendar className="w-3 h-3" /> {project.dueDate}</span><span className="text-crm-accent font-medium">{project.value.toLocaleString('de-DE')}€</span></div>
                    </div>
                ))}
            </div>

            {selectedProject && (
                <div className="modal-overlay" onClick={() => setSelectedProject(null)}>
                    <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-6">
                                <div><h2 className="text-xl font-bold text-white">{selectedProject.name}</h2><p className="text-surface-400">{selectedProject.client}</p>{getStageBadge(selectedProject.stage)}</div>
                                <button onClick={() => setSelectedProject(null)} className="btn-icon text-2xl">×</button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="crm-card p-4"><div className="flex items-center gap-3 mb-2"><DollarSign className="w-4 h-4 text-surface-400" /><span className="text-surface-400 text-sm">Wert</span></div><p className="text-white font-medium">{selectedProject.value.toLocaleString('de-DE')}€</p></div>
                                <div className="crm-card p-4"><div className="flex items-center gap-3 mb-2"><Calendar className="w-4 h-4 text-surface-400" /><span className="text-surface-400 text-sm">Fällig</span></div><p className="text-white font-medium">{selectedProject.dueDate}</p></div>
                            </div>
                            <div className="flex gap-3 mt-6"><button className="btn-primary flex-1">Bearbeiten</button><button className="btn-secondary flex-1">Details</button></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
