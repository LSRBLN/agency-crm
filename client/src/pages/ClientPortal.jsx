import Checklist from '../components/Checklist'
import { Shield, TrendingUp } from 'lucide-react'

export default function ClientPortal() {
    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fade-in">
            {/* Header */}
            <div className="glass-card p-6 bg-gradient-to-r from-brand-600/10 to-brand-700/5">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-brand-600/30">
                        <Shield className="w-7 h-7 text-brand-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Client Portal</h1>
                        <p className="text-gray-400 text-sm">3-Pfeiler AI-Optimierungsstrategie — Delivery Roadmap</p>
                    </div>
                </div>
            </div>

            {/* Progress Overview */}
            <div className="glass-card p-6">
                <div className="flex items-center gap-3 mb-4">
                    <TrendingUp className="w-5 h-5 text-brand-400" />
                    <h2 className="text-lg font-semibold text-white">Gesamtfortschritt</h2>
                </div>
                <p className="text-sm text-gray-400 mb-6">
                    Diese interaktive Checkliste bildet die 3-Pfeiler-Strategie ab: <strong className="text-brand-300">Local Authority</strong>,{' '}
                    <strong className="text-brand-300">Structured Data</strong> und <strong className="text-brand-300">Brand Sentiment</strong>.
                    Markiere Aufgaben als erledigt, um den Fortschritt zu tracken.
                </p>
                <Checklist />
            </div>
        </div>
    )
}
