import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Leads from './pages/Leads'
import Contacts from './pages/Contacts'
import Companies from './pages/Companies'
import Deals from './pages/Deals'
import Tickets from './pages/Tickets'
import Projects from './pages/Projects'
import Calendar from './pages/Calendar'
import Knowledge from './pages/Knowledge'
import Segments from './pages/Segments'
import Settings from './pages/Settings'
import Daily from './pages/Daily'
import Mailing from './pages/Mailing'
import Marketing from './pages/Marketing'
import Reports from './pages/Reports'
import AuditDetail from './pages/AuditDetail'
import Outreach from './pages/Outreach'
import ClientPortal from './pages/ClientPortal'
import Login from './pages/Login'
import ScorecardView from './pages/ScorecardView'
import AEOSimulator from './pages/AEOSimulator'
import LeadReport from './pages/LeadReport'
import MapDashboard from './pages/MapDashboard'
import { useState, useEffect } from 'react'
import { Bell, Search } from 'lucide-react'
import { refreshFeatureFlagsFromServer } from './utils/featureFlags'

function ProtectedRoute({ children, token }) {
    if (!token) return <Navigate to="/login" replace />
    return children
}

// Header Component for logged in users
function Header() {
    return (
        <header className="h-16 bg-surface-800 border-b border-surface-700 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-white">Gemini CRM</h2>
            </div>
            <div className="flex items-center gap-3">
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                    <input
                        type="text"
                        placeholder="Suche..."
                        className="pl-10 pr-4 py-2 bg-surface-700 border border-surface-600 rounded-lg text-sm text-surface-200 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-crm-primary/50 focus:border-crm-primary w-64"
                    />
                </div>
                <button className="relative p-2 rounded-lg text-surface-400 hover:bg-surface-700 hover:text-surface-200 transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-status-error rounded-full"></span>
                </button>
            </div>
        </header>
    )
}

export default function App() {
    const [token, setToken] = useState(localStorage.getItem('token'))
    const [sidebarOpen, setSidebarOpen] = useState(true)

    const handleLogin = (nextToken) => {
        try {
            if (nextToken) localStorage.setItem('token', nextToken)
            else localStorage.removeItem('token')
        } catch {
            // ignore storage errors
        }
        setToken(nextToken)
    }

    useEffect(() => {
        if (token) localStorage.setItem('token', token)
        else localStorage.removeItem('token')
    }, [token])

    useEffect(() => {
        // Keep feature toggles synced across devices (server-backed)
        if (!token) return
        refreshFeatureFlagsFromServer()
    }, [token])

    const isLoginPage = window.location.pathname === '/login'

    return (
        <Router>
            <div className="flex h-screen overflow-hidden">
                {!isLoginPage && token && (
                    <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} onLogout={() => handleLogin(null)} />
                )}
                <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${!isLoginPage && token ? (sidebarOpen ? 'ml-64' : 'ml-20') : ''}`}>
                    {!isLoginPage && token && <Header />}
                    <main className="flex-1 overflow-y-auto bg-surface-900">
                        <Routes>
                            <Route path="/login" element={token ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />} />
                            <Route path="/scorecard/:id" element={<ScorecardView />} />

                            {/* CRM Routes */}
                            <Route path="/" element={<ProtectedRoute token={token}><Dashboard /></ProtectedRoute>} />
                            <Route path="/contacts" element={<ProtectedRoute token={token}><Contacts /></ProtectedRoute>} />
                            <Route path="/companies" element={<ProtectedRoute token={token}><Companies /></ProtectedRoute>} />
                            <Route path="/deals" element={<ProtectedRoute token={token}><Deals /></ProtectedRoute>} />
                            <Route path="/tickets" element={<ProtectedRoute token={token}><Tickets /></ProtectedRoute>} />
                            <Route path="/projects" element={<ProtectedRoute token={token}><Projects /></ProtectedRoute>} />
                            <Route path="/calendar" element={<ProtectedRoute token={token}><Calendar /></ProtectedRoute>} />
                            <Route path="/knowledge" element={<ProtectedRoute token={token}><Knowledge /></ProtectedRoute>} />
                            <Route path="/segments" element={<ProtectedRoute token={token}><Segments /></ProtectedRoute>} />
                            <Route path="/settings" element={<ProtectedRoute token={token}><Settings /></ProtectedRoute>} />
                            <Route path="/daily" element={<ProtectedRoute token={token}><Daily /></ProtectedRoute>} />
                            <Route path="/mailing" element={<ProtectedRoute token={token}><Mailing /></ProtectedRoute>} />
                            <Route path="/marketing" element={<ProtectedRoute token={token}><Marketing /></ProtectedRoute>} />
                            <Route path="/reports" element={<ProtectedRoute token={token}><Reports /></ProtectedRoute>} />

                            {/* Legacy Routes */}
                            <Route path="/leads" element={<ProtectedRoute token={token}><Leads /></ProtectedRoute>} />
                            <Route path="/leads/:id" element={<ProtectedRoute token={token}><LeadReport /></ProtectedRoute>} />
                            <Route path="/map-dashboard" element={<ProtectedRoute token={token}><MapDashboard /></ProtectedRoute>} />
                            <Route path="/audit/:id" element={<ProtectedRoute token={token}><AuditDetail /></ProtectedRoute>} />
                            <Route path="/outreach" element={<ProtectedRoute token={token}><Outreach /></ProtectedRoute>} />
                            <Route path="/portal" element={<ProtectedRoute token={token}><ClientPortal /></ProtectedRoute>} />
                            <Route path="/aeo-simulator" element={<ProtectedRoute token={token}><AEOSimulator /></ProtectedRoute>} />

                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </main>
                </div>
            </div>
        </Router>
    )
}
