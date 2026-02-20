import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Leads from './pages/Leads'
import AuditDetail from './pages/AuditDetail'
import Outreach from './pages/Outreach'
import ClientPortal from './pages/ClientPortal'
import Login from './pages/Login'
import ScorecardView from './pages/ScorecardView'
import AEOSimulator from './pages/AEOSimulator'
import { useState, useEffect } from 'react'

function ProtectedRoute({ children, token }) {
    if (!token) return <Navigate to="/login" replace />
    return children
}

export default function App() {
    const [token, setToken] = useState(localStorage.getItem('token'))
    const [sidebarOpen, setSidebarOpen] = useState(true)

    useEffect(() => {
        if (token) localStorage.setItem('token', token)
        else localStorage.removeItem('token')
    }, [token])

    const isLoginPage = window.location.pathname === '/login'

    return (
        <Router>
            <div className="flex h-screen overflow-hidden">
                {!isLoginPage && token && (
                    <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} onLogout={() => setToken(null)} />
                )}
                <main className={`flex-1 overflow-y-auto transition-all duration-300 ${!isLoginPage && token && sidebarOpen ? 'ml-64' : !isLoginPage && token ? 'ml-20' : ''}`}>
                    <Routes>
                        <Route path="/login" element={<Login onLogin={setToken} />} />
                        <Route path="/scorecard/:id" element={<ScorecardView />} />
                        <Route path="/" element={<ProtectedRoute token={token}><Dashboard /></ProtectedRoute>} />
                        <Route path="/leads" element={<ProtectedRoute token={token}><Leads /></ProtectedRoute>} />
                        <Route path="/audit/:id" element={<ProtectedRoute token={token}><AuditDetail /></ProtectedRoute>} />
                        <Route path="/outreach" element={<ProtectedRoute token={token}><Outreach /></ProtectedRoute>} />
                        <Route path="/portal" element={<ProtectedRoute token={token}><ClientPortal /></ProtectedRoute>} />
                        <Route path="/aeo-simulator" element={<ProtectedRoute token={token}><AEOSimulator /></ProtectedRoute>} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
            </div>
        </Router>
    )
}
