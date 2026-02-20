import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import CSVUploader from '../components/CSVUploader'
import LeadTable from '../components/LeadTable'
import { Search, Filter } from 'lucide-react'

export default function Leads() {
    const [leads, setLeads] = useState([])
    const [search, setSearch] = useState('')
    const [filterPriority, setFilterPriority] = useState('all')
    const [sortField, setSortField] = useState('companyName')
    const [sortDir, setSortDir] = useState('asc')

    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    useEffect(() => {
        axios.get('/api/leads', { headers }).then(r => setLeads(r.data)).catch(console.error)
    }, [])

    async function handleCSVUpload() {
        // Refetch all leads after successful upload
        try {
            const r = await axios.get('/api/leads', { headers })
            setLeads(r.data)
        } catch (e) {
            console.error('Failed to refresh leads:', e)
        }
    }

    function handleSort(field) {
        if (sortField === field) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDir('asc')
        }
    }

    const filtered = useMemo(() => {
        let result = [...leads]
        if (search) {
            const q = search.toLowerCase()
            result = result.filter(l =>
                l.companyName?.toLowerCase().includes(q) ||
                l.websiteUrl?.toLowerCase().includes(q)
            )
        }
        if (filterPriority !== 'all') {
            result = result.filter(l => l.priority === filterPriority)
        }
        result.sort((a, b) => {
            let va = a[sortField], vb = b[sortField]
            if (typeof va === 'string') va = va.toLowerCase()
            if (typeof vb === 'string') vb = vb.toLowerCase()
            if (va < vb) return sortDir === 'asc' ? -1 : 1
            if (va > vb) return sortDir === 'asc' ? 1 : -1
            return 0
        })
        return result
    }, [leads, search, filterPriority, sortField, sortDir])

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold text-white">Lead-Management</h1>
                <p className="text-gray-400 mt-1">Importiere & verwalte Leads aus Manis AI / SimilarWeb</p>
            </div>

            <CSVUploader onUpload={handleCSVUpload} />

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Suche nach Unternehmen oder URL..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="input-field pl-10"
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <select
                        value={filterPriority}
                        onChange={e => setFilterPriority(e.target.value)}
                        className="input-field pl-10 pr-10 appearance-none cursor-pointer min-w-[180px]"
                    >
                        <option value="all">Alle Prioritäten</option>
                        <option value="high">Hohe Priorität</option>
                        <option value="medium">Mittlere Priorität</option>
                        <option value="low">Niedrige Priorität</option>
                    </select>
                </div>
            </div>

            <LeadTable leads={filtered} onSort={handleSort} sortField={sortField} sortDir={sortDir} />

            <p className="text-xs text-gray-600 text-right">{filtered.length} von {leads.length} Leads</p>
        </div>
    )
}
