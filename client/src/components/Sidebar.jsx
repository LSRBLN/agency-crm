import { NavLink, useLocation } from 'react-router-dom'
import {
    LayoutDashboard,
    Users,
    Building2,
    DollarSign,
    Headphones,
    FolderKanban,
    Calendar,
    BookOpen,
    Target,
    Settings,
    ChevronLeft,
    ChevronRight,
    LogOut,
    Search,
    Map,
    HelpCircle,
    Globe,
    Zap,
    Clock,
    Mail,
    BarChart3
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { getFeatureFlags, subscribeFeatureFlags } from '../utils/featureFlags'

// Main CRM Modules
const mainModules = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/daily', label: 'Tagesfokus', icon: Clock },
    { to: '/contacts', label: 'Kontakte', icon: Users },
    { to: '/companies', label: 'Firmen', icon: Building2 },
    { to: '/deals', label: 'Vertrieb', icon: DollarSign },
    { to: '/tickets', label: 'Service', icon: Headphones },
]

// Secondary Modules
const secondaryModules = [
    { to: '/projects', label: 'Projekte', icon: FolderKanban },
    { to: '/calendar', label: 'Kalender', icon: Calendar },
    { to: '/mailing', label: 'Mailing', icon: Mail },
]

// Tools
const toolsModules = [
    { to: '/marketing', label: 'Marketing', icon: BarChart3 },
    { to: '/knowledge', label: 'Wissensdatenbank', icon: BookOpen },
    { to: '/segments', label: 'Zielgruppen', icon: Target },
    { to: '/reports', label: 'Berichte', icon: BarChart3 },
]

// Additional Features are built dynamically (feature flags)

export default function Sidebar({ open, onToggle, onLogout }) {
    const location = useLocation()
    const [collapsed, setCollapsed] = useState(!open)
    const [flags, setFlags] = useState(() => getFeatureFlags())

    // live updates when user toggles features in Settings
    useEffect(() => {
        return subscribeFeatureFlags(setFlags)
    }, [])

    const features = [
        { to: '/leads', label: 'Leads', icon: Search },
        ...(flags.mapDashboard ? [{ to: '/map-dashboard', label: 'Map Dashboard', icon: Map }] : []),
        { to: '/portal', label: 'Kundenportal', icon: Globe },
    ]

    const isActive = (path, exact = false) => {
        if (exact) return location.pathname === path
        return location.pathname.startsWith(path)
    }

    const NavItem = ({ to, label, icon: Icon, exact = false }) => (
        <NavLink
            to={to}
            end={exact}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive(to, exact)
                ? 'bg-crm-primary/10 text-crm-primary border-l-2 border-crm-primary -ml-0.5'
                : 'text-surface-400 hover:bg-surface-700 hover:text-surface-200'
                }`}
        >
            <Icon className={`w-5 h-5 flex-shrink-0 ${isActive(to, exact) ? 'text-crm-primary' : ''}`} />
            {!collapsed && (
                <span className="text-sm font-medium truncate">{label}</span>
            )}
        </NavLink>
    )

    return (
        <aside className={`fixed top-0 left-0 h-screen bg-surface-800 border-r border-surface-700 z-50 flex flex-col transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'
            }`}>
            {/* Logo Section */}
            <div className="flex items-center gap-3 px-4 py-5 border-b border-surface-700">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-crm-primary to-crm-accent flex items-center justify-center shadow-lg flex-shrink-0">
                    <Zap className="w-5 h-5 text-white" />
                </div>
                {!collapsed && (
                    <div className="animate-fade-in overflow-hidden">
                        <h1 className="font-bold text-white text-lg leading-tight truncate">Gemini</h1>
                        <p className="text-xs text-crm-accent font-medium tracking-wide">CRM System</p>
                    </div>
                )}
            </div>

            {/* User Info */}
            {!collapsed && (
                <div className="px-4 py-3 border-b border-surface-700">
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-surface-700/50">
                        <div className="w-8 h-8 rounded-full bg-crm-primary flex items-center justify-center text-white text-sm font-semibold">
                            A
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">Admin</p>
                            <p className="text-xs text-surface-400 truncate">admin@gemini.de</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Navigation - Scrollable */}
            <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin">
                {/* Main Modules */}
                <div className="mb-6">
                    {!collapsed && (
                        <p className="px-3 mb-2 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                            Hauptmenü
                        </p>
                    )}
                    <div className="space-y-1">
                        {mainModules.map((item) => (
                            <NavItem key={item.to} {...item} exact={item.exact} />
                        ))}
                    </div>
                </div>

                {/* Secondary Modules */}
                <div className="mb-6">
                    {!collapsed && (
                        <p className="px-3 mb-2 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                            Projekte
                        </p>
                    )}
                    <div className="space-y-1">
                        {secondaryModules.map((item) => (
                            <NavItem key={item.to} {...item} />
                        ))}
                    </div>
                </div>

                {/* Tools */}
                <div className="mb-6">
                    {!collapsed && (
                        <p className="px-3 mb-2 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                            Tools
                        </p>
                    )}
                    <div className="space-y-1">
                        {toolsModules.map((item) => (
                            <NavItem key={item.to} {...item} />
                        ))}
                    </div>
                </div>

                {/* Additional Features */}
                <div className="mb-6">
                    {!collapsed && (
                        <p className="px-3 mb-2 text-xs font-semibold text-surface-500 uppercase tracking-wider">
                            Extras
                        </p>
                    )}
                    <div className="space-y-1">
                        {features.map((item) => (
                            <NavItem key={item.to} {...item} />
                        ))}
                    </div>
                </div>
            </nav>

            {/* Bottom Actions */}
            <div className="border-t border-surface-700 p-3 space-y-1">
                {/* Settings */}
                <NavItem to="/settings" label={collapsed ? '' : 'Einstellungen'} icon={Settings} />

                {/* Help */}
                <button className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-surface-400 hover:bg-surface-700 hover:text-surface-200 transition-all duration-200 w-full ${collapsed ? 'justify-center' : ''}`}>
                    <HelpCircle className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && <span className="text-sm font-medium">Hilfe</span>}
                </button>

                {/* Collapse Toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="flex items-center justify-center w-full py-2 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-700 transition-all"
                >
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>

                {/* Logout */}
                <button
                    onClick={onLogout}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-surface-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200 w-full ${collapsed ? 'justify-center' : ''}`}
                >
                    <LogOut className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && <span className="text-sm font-medium">Abmelden</span>}
                </button>
            </div>
        </aside>
    )
}
