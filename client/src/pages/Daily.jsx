import { useState } from 'react'
import { Clock, AlertCircle, CheckCircle, ArrowRight, Mail, FileText, Globe } from 'lucide-react'

// Daily focus items from Python CRM
const mockDailyItems = [
    { id: 1, type: 'no_offer', title: 'Kein Angebot gesendet', priority: 40, company: 'Müller GmbH', action: 'Angebot erstellen', link: '/deals' },
    { id: 2, type: 'no_demo', title: 'Demo-Seite fehlt', priority: 30, company: 'Schmidt AG', action: 'Demo erstellen', link: '/projects' },
    { id: 3, type: 'reply', title: 'Kunde hat geantwortet', priority: 50, company: 'Weber KG', action: 'Antworten', link: '/conversations' },
    { id: 4, type: 'followup', title: 'Wiedervorlage fällig', priority: 20, company: 'Fischer GmbH', action: 'Follow-up', link: '/deals' },
]

export default function Daily() {
    const [items, setItems] = useState(mockDailyItems)

    const getTypeIcon = (type) => {
        const icons = {
            no_offer: <FileText className="w-4 h-4" />,
            no_demo: <Globe className="w-4 h-4" />,
            reply: <Mail className="w-4 h-4" />,
            followup: <Clock className="w-4 h-4" />
        }
        return icons[type] || <AlertCircle className="w-4 h-4" />
    }

    const getTypeColor = (type) => {
        const colors = {
            no_offer: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
            no_demo: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
            reply: 'bg-green-500/20 text-green-400 border-green-500/30',
            followup: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
        }
        return colors[type] || 'bg-surface-600 text-surface-300 border-surface-500'
    }

    const sortedItems = [...items].sort((a, b) => b.priority - a.priority)
    const totalPriority = items.reduce((sum, item) => sum + item.priority, 0)

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Tagesfokus</h1>
                <p className="text-surface-400 mt-1">Ihre priorisierten Aufgaben für heute</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="crm-card p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-surface-400 text-sm">Aufgaben heute</p>
                            <p className="text-2xl font-bold text-white">{items.length}</p>
                        </div>
                        <Clock className="w-8 h-8 text-crm-primary" />
                    </div>
                </div>
                <div className="crm-card p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-surface-400 text-sm">Prioritäts-Score</p>
                            <p className="text-2xl font-bold text-status-warning">{totalPriority}</p>
                        </div>
                        <AlertCircle className="w-8 h-8 text-status-warning" />
                    </div>
                </div>
                <div className="crm-card p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-surface-400 text-sm">Abgeschlossen</p>
                            <p className="text-2xl font-bold text-status-success">0</p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-status-success" />
                    </div>
                </div>
            </div>

            {/* Priority Queue */}
            <div className="crm-card p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Aufgaben-Priorität</h2>
                <div className="space-y-3">
                    {sortedItems.map((item, index) => (
                        <div key={item.id} className="flex items-center gap-4 p-4 bg-surface-700/30 rounded-lg hover:bg-surface-700/50 transition-colors">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-surface-600 text-surface-300 font-bold text-sm">
                                {index + 1}
                            </div>
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${getTypeColor(item.type)}`}>
                                {getTypeIcon(item.type)}
                            </div>
                            <div className="flex-1">
                                <p className="text-white font-medium">{item.title}</p>
                                <p className="text-sm text-surface-400">{item.company}</p>
                            </div>
                            <div className="text-right">
                                <span className="text-xs text-surface-500">Priorität: {item.priority}</span>
                                <button className="ml-3 btn-secondary text-sm py-1 flex items-center gap-1">
                                    {item.action}
                                    <ArrowRight className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tips */}
            <div className="crm-card p-6 mt-6">
                <h2 className="text-lg font-semibold text-white mb-4">Empfehlungen</h2>
                <div className="space-y-2 text-surface-400 text-sm">
                    <p>• Kontaktieren Sie zuerst Leads mit hoher Priorität</p>
                    <p>• Beantworten Sie eingehende E-Mails innerhalb von 24 Stunden</p>
                    <p>• Erstellen Sie Angebote für qualifizierte Leads</p>
                </div>
            </div>
        </div>
    )
}
