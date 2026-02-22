import { useState } from 'react'
import axios from 'axios'
import { Zap, Eye, EyeOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Login({ onLogin }) {
    const navigate = useNavigate()
    const [mode, setMode] = useState('login') // login | register
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPw, setShowPw] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
            const res = await axios.post(endpoint, { email, password })
            if (!res?.data?.token) {
                throw new Error('Token fehlt in der Antwort')
            }
            onLogin(res.data.token)
            navigate('/', { replace: true })
        } catch (err) {
            setError(err.response?.data?.error || 'Fehler bei der Anmeldung')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-surface-900">
            {/* Background gradient */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-700/10 rounded-full blur-3xl" />
            </div>

            <div className="glass-card p-8 w-full max-w-md relative z-10 animate-slide-up">
                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow-lg">
                        <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Gemini Conductor</h1>
                        <p className="text-xs text-brand-400 font-medium tracking-widest uppercase">AI Agency CRM</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-1 bg-surface-800 rounded-xl mb-6">
                    <button
                        type="button"
                        onClick={() => setMode('login')}
                        className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${mode === 'login' ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'
                            }`}
                    >
                        Anmelden
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('register')}
                        className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${mode === 'register' ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'
                            }`}
                    >
                        Registrieren
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">E-Mail</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="input-field"
                            placeholder="max@beispiel.de"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Passwort</label>
                        <div className="relative">
                            <input
                                type={showPw ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="input-field pr-12"
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw(!showPw)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                            >
                                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-sm text-rose-400">
                            {error}
                        </div>
                    )}

                    <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            mode === 'login' ? 'Anmelden' : 'Konto erstellen'
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
