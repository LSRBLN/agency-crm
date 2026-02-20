import { NavLink } from 'react-router-dom'
import {
    LayoutDashboard, Users, ShieldCheck, Mail, Globe, ChevronLeft, ChevronRight, LogOut, Zap, Layers, Search
} from 'lucide-react'

const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/leads', label: 'Leads', icon: Users },
    { to: '/outreach', label: 'Outreach', icon: Mail },
    { to: '/portal', label: 'Client Portal', icon: Globe },
    { to: '/stitch', label: 'Stitch Templates', icon: Layers },
    { to: '/aeo-simulator', label: 'AEO Simulator', icon: Search },
]

export default function Sidebar({ open, onToggle, onLogout }) {
    return (
        <aside className={`fixed top-0 left-0 h-screen glass-sidebar z-50 flex flex-col transition-all duration-300 ${open ? 'w-64' : 'w-20'}`}>
            {/* Logo */}
            <div className="flex items-center gap-3 px-5 py-6 border-b border-white/5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow flex-shrink-0">
                    <Zap className="w-5 h-5 text-white" />
                </div>
                {open && (
                    <div className="animate-fade-in">
                        <h1 className="font-bold text-white text-lg leading-tight">Gemini</h1>
                        <p className="text-[10px] text-brand-400 font-medium tracking-widest uppercase">Conductor</p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-3 space-y-1">
                {navItems.map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${isActive
                                ? 'bg-brand-600/20 text-brand-400 shadow-glow'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                            }`
                        }
                    >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        {open && <span className="text-sm font-medium animate-fade-in">{label}</span>}
                    </NavLink>
                ))}
            </nav>

            {/* Bottom Actions */}
            <div className="px-3 py-4 border-t border-white/5 space-y-2">
                <button onClick={onLogout} className="flex items-center gap-3 px-3 py-3 rounded-xl text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200 w-full">
                    <LogOut className="w-5 h-5 flex-shrink-0" />
                    {open && <span className="text-sm font-medium">Abmelden</span>}
                </button>
                <button onClick={onToggle} className="flex items-center justify-center w-full py-2 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all">
                    {open ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
            </div>
        </aside>
    )
}
