import { useEffect, useState } from 'react'
import axios from 'axios'
import { Settings as SettingsIcon, User, Bell, Lock, Palette, Globe, Database, Key, Save, Mail, SlidersHorizontal } from 'lucide-react'
import { getFeatureFlags, refreshFeatureFlagsFromServer, saveFeatureFlagsToServer } from '../utils/featureFlags'

const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'notifications', label: 'Benachrichtigungen', icon: Bell },
    { id: 'security', label: 'Sicherheit', icon: Lock },
    { id: 'integrations', label: 'Integrationen', icon: Globe },
    { id: 'email', label: 'E-Mail', icon: Mail },
    { id: 'features', label: 'Features', icon: SlidersHorizontal },
]

export default function Settings() {
    const [activeTab, setActiveTab] = useState('profile')
    const [settings, setSettings] = useState({
        name: 'Admin',
        email: 'admin@gemini.de',
        timezone: 'Europe/Berlin',
        emailNotifications: true,
        pushNotifications: true,
        weeklyDigest: true,
    })
    const [companyProfile, setCompanyProfile] = useState({
        companyName: 'Mustermann Consulting',
        ownerName: 'Max Mustermann',
        street: 'Musterstraße 1',
        zip: '10115',
        city: 'Berlin',
        country: 'Deutschland',
        email: 'info@mustermann.de',
        phone: '+49 30 000000',
        website: 'https://mustermann.de',
        taxId: '12/345/67890',
        vatId: 'DE123456789',
        logoUrl: '/home/xipx/Dokumente/GEMINI/agency-crm/server/routes/ChatGPT Image 21. Feb. 2026, 19_51_41.png',
    })
    const [savingProfile, setSavingProfile] = useState(false)
    const [saveMessage, setSaveMessage] = useState('')
    const [featureFlags, setFeatureFlagsState] = useState(() => getFeatureFlags())
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    useEffect(() => {
        loadCompanyProfile()
    }, [])

    useEffect(() => {
        // When switching tabs, refresh flags in case they were updated elsewhere
        setFeatureFlagsState(getFeatureFlags())
        if (activeTab === 'features') {
            refreshFeatureFlagsFromServer().then((flags) => setFeatureFlagsState(flags))
        }
    }, [activeTab])

    async function toggleFlag(key) {
        const optimistic = {
            ...featureFlags,
            [key]: !featureFlags?.[key],
        }
        setFeatureFlagsState(optimistic)
        setSaveMessage('Speichere Feature-Einstellungen...')

        const saved = await saveFeatureFlagsToServer({ [key]: optimistic[key] })
        setFeatureFlagsState(saved)
        setSaveMessage('Feature-Einstellungen gespeichert')
        setTimeout(() => setSaveMessage(''), 1500)
    }

    async function loadCompanyProfile() {
        setSaveMessage('')
        try {
            const response = await axios.get('/api/settings/company-profile', { headers })
            const profile = response.data?.profile || {}
            setCompanyProfile((prev) => ({ ...prev, ...profile }))
        } catch (err) {
            setSaveMessage(err.response?.data?.error || 'Firmendaten konnten nicht geladen werden')
        }
    }

    async function saveCompanyProfile() {
        setSavingProfile(true)
        setSaveMessage('')
        try {
            const response = await axios.put('/api/settings/company-profile', companyProfile, { headers })
            setCompanyProfile((prev) => ({ ...prev, ...(response.data?.profile || {}) }))
            setSaveMessage('Firmendaten erfolgreich gespeichert')
        } catch (err) {
            setSaveMessage(err.response?.data?.error || 'Firmendaten konnten nicht gespeichert werden')
        } finally {
            setSavingProfile(false)
        }
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Einstellungen</h1>
                <p className="text-surface-400 mt-1">Verwalten Sie Ihr Konto und die Anwendungseinstellungen</p>
            </div>

            <div className="flex gap-6">
                {/* Sidebar */}
                <div className="w-48 flex-shrink-0">
                    <nav className="space-y-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                                        ? 'bg-crm-primary/10 text-crm-primary'
                                        : 'text-surface-400 hover:bg-surface-700 hover:text-surface-200'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className="flex-1">
                    {activeTab === 'profile' && (
                        <div className="crm-card p-6">
                            <h2 className="text-lg font-semibold text-white mb-6">Profil-Einstellungen</h2>
                            <div className="space-y-4">
                                {saveMessage && (
                                    <div className="p-3 rounded-lg bg-surface-700 text-surface-200 text-sm">{saveMessage}</div>
                                )}
                                <div>
                                    <label className="input-label">Name</label>
                                    <input type="text" value={settings.name} onChange={e => setSettings({ ...settings, name: e.target.value })} className="input-field" />
                                </div>
                                <div>
                                    <label className="input-label">E-Mail</label>
                                    <input type="email" value={settings.email} onChange={e => setSettings({ ...settings, email: e.target.value })} className="input-field" />
                                </div>
                                <div>
                                    <label className="input-label">Zeitzone</label>
                                    <select value={settings.timezone} onChange={e => setSettings({ ...settings, timezone: e.target.value })} className="input-field">
                                        <option value="Europe/Berlin">Berlin (CET)</option>
                                        <option value="Europe/London">London (GMT)</option>
                                        <option value="America/New_York">New York (EST)</option>
                                    </select>
                                </div>

                                <div className="pt-4 border-t border-surface-700">
                                    <h3 className="text-white font-medium mb-3">Firmendaten für PDF-Reports</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="input-label">Firmenname</label>
                                            <input type="text" value={companyProfile.companyName} onChange={e => setCompanyProfile({ ...companyProfile, companyName: e.target.value })} className="input-field" />
                                        </div>
                                        <div>
                                            <label className="input-label">Inhaber / Ansprechpartner</label>
                                            <input type="text" value={companyProfile.ownerName} onChange={e => setCompanyProfile({ ...companyProfile, ownerName: e.target.value })} className="input-field" />
                                        </div>
                                        <div>
                                            <label className="input-label">Straße + Nr.</label>
                                            <input type="text" value={companyProfile.street} onChange={e => setCompanyProfile({ ...companyProfile, street: e.target.value })} className="input-field" />
                                        </div>
                                        <div>
                                            <label className="input-label">PLZ</label>
                                            <input type="text" value={companyProfile.zip} onChange={e => setCompanyProfile({ ...companyProfile, zip: e.target.value })} className="input-field" />
                                        </div>
                                        <div>
                                            <label className="input-label">Stadt</label>
                                            <input type="text" value={companyProfile.city} onChange={e => setCompanyProfile({ ...companyProfile, city: e.target.value })} className="input-field" />
                                        </div>
                                        <div>
                                            <label className="input-label">Land</label>
                                            <input type="text" value={companyProfile.country} onChange={e => setCompanyProfile({ ...companyProfile, country: e.target.value })} className="input-field" />
                                        </div>
                                        <div>
                                            <label className="input-label">Firmen-E-Mail</label>
                                            <input type="email" value={companyProfile.email} onChange={e => setCompanyProfile({ ...companyProfile, email: e.target.value })} className="input-field" />
                                        </div>
                                        <div>
                                            <label className="input-label">Telefon</label>
                                            <input type="text" value={companyProfile.phone} onChange={e => setCompanyProfile({ ...companyProfile, phone: e.target.value })} className="input-field" />
                                        </div>
                                        <div>
                                            <label className="input-label">Website</label>
                                            <input type="text" value={companyProfile.website} onChange={e => setCompanyProfile({ ...companyProfile, website: e.target.value })} className="input-field" />
                                        </div>
                                        <div>
                                            <label className="input-label">Steuernummer</label>
                                            <input type="text" value={companyProfile.taxId} onChange={e => setCompanyProfile({ ...companyProfile, taxId: e.target.value })} className="input-field" />
                                        </div>
                                        <div>
                                            <label className="input-label">USt-ID</label>
                                            <input type="text" value={companyProfile.vatId} onChange={e => setCompanyProfile({ ...companyProfile, vatId: e.target.value })} className="input-field" />
                                        </div>
                                        <div>
                                            <label className="input-label">Logo Pfad/URL</label>
                                            <input type="text" value={companyProfile.logoUrl} onChange={e => setCompanyProfile({ ...companyProfile, logoUrl: e.target.value })} className="input-field" />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button onClick={saveCompanyProfile} disabled={savingProfile} className="btn-primary flex items-center gap-2 disabled:opacity-60"><Save className="w-4 h-4" /> {savingProfile ? 'Speichere...' : 'Speichern'}</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="crm-card p-6">
                            <h2 className="text-lg font-semibold text-white mb-6">Benachrichtigungen</h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-surface-700/50 rounded-lg">
                                    <div><p className="text-white font-medium">E-Mail-Benachrichtigungen</p><p className="text-sm text-surface-400">Erhalten Sie E-Mails für wichtige Ereignisse</p></div>
                                    <button onClick={() => setSettings({ ...settings, emailNotifications: !settings.emailNotifications })} className={`w-12 h-6 rounded-full transition-colors ${settings.emailNotifications ? 'bg-crm-primary' : 'bg-surface-600'}`}>
                                        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${settings.emailNotifications ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-surface-700/50 rounded-lg">
                                    <div><p className="text-white font-medium">Push-Benachrichtigungen</p><p className="text-sm text-surface-400">Erhalten Sie Browser-Benachrichtigungen</p></div>
                                    <button onClick={() => setSettings({ ...settings, pushNotifications: !settings.pushNotifications })} className={`w-12 h-6 rounded-full transition-colors ${settings.pushNotifications ? 'bg-crm-primary' : 'bg-surface-600'}`}>
                                        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${settings.pushNotifications ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-surface-700/50 rounded-lg">
                                    <div><p className="text-white font-medium">Wochenbericht</p><p className="text-sm text-surface-400">Erhalten Sie einen wöchentlichen Zusammenfassung</p></div>
                                    <button onClick={() => setSettings({ ...settings, weeklyDigest: !settings.weeklyDigest })} className={`w-12 h-6 rounded-full transition-colors ${settings.weeklyDigest ? 'bg-crm-primary' : 'bg-surface-600'}`}>
                                        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${settings.weeklyDigest ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'integrations' && (
                        <div className="crm-card p-6">
                            <h2 className="text-lg font-semibold text-white mb-6">Integrationen</h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 border border-surface-600 rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-surface-600 flex items-center justify-center"><Globe className="w-5 h-5 text-white" /></div>
                                        <div><p className="text-white font-medium">Google Workspace</p><p className="text-sm text-surface-400">Docs, Sheets, Maps</p></div>
                                    </div>
                                    <button className="btn-secondary text-sm">Verbinden</button>
                                </div>
                                <div className="flex items-center justify-between p-4 border border-surface-600 rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-surface-600 flex items-center justify-center"><Database className="w-5 h-5 text-white" /></div>
                                        <div><p className="text-white font-medium">Outscraper</p><p className="text-sm text-surface-400">Datenerweiterung</p></div>
                                    </div>
                                    <button className="btn-secondary text-sm">Konfigurieren</button>
                                </div>
                                <div className="flex items-center justify-between p-4 border border-surface-600 rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-surface-600 flex items-center justify-center"><Key className="w-5 h-5 text-white" /></div>
                                        <div><p className="text-white font-medium">Pomelli</p><p className="text-sm text-surface-400">Kontakanreicherung</p></div>
                                    </div>
                                    <button className="btn-secondary text-sm">Konfigurieren</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'email' && (
                        <div className="crm-card p-6">
                            <h2 className="text-lg font-semibold text-white mb-6">E-Mail Einstellungen</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="input-label">SMTP Server</label>
                                    <input type="text" placeholder="smtp.example.com" className="input-field" />
                                </div>
                                <div>
                                    <label className="input-label">SMTP Port</label>
                                    <input type="text" placeholder="587" className="input-field" />
                                </div>
                                <div>
                                    <label className="input-label">Benutzername</label>
                                    <input type="text" placeholder="Ihre E-Mail" className="input-field" />
                                </div>
                                <div>
                                    <label className="input-label">Passwort</label>
                                    <input type="password" placeholder="••••••••" className="input-field" />
                                </div>
                                <div className="pt-4">
                                    <button className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" /> Speichern</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="crm-card p-6">
                            <h2 className="text-lg font-semibold text-white mb-6">Sicherheit</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="input-label">Aktuelles Passwort</label>
                                    <input type="password" className="input-field" />
                                </div>
                                <div>
                                    <label className="input-label">Neues Passwort</label>
                                    <input type="password" className="input-field" />
                                </div>
                                <div>
                                    <label className="input-label">Passwort bestätigen</label>
                                    <input type="password" className="input-field" />
                                </div>
                                <div className="pt-4">
                                    <button className="btn-primary flex items-center gap-2"><Lock className="w-4 h-4" /> Passwort ändern</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'features' && (
                        <div className="crm-card p-6">
                            <h2 className="text-lg font-semibold text-white mb-6">Feature Toggles</h2>

                            {saveMessage && (
                                <div className="p-3 rounded-lg bg-surface-700 text-surface-200 text-sm mb-4">{saveMessage}</div>
                            )}

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-surface-700/50 rounded-lg">
                                    <div>
                                        <p className="text-white font-medium">Map Dashboard</p>
                                        <p className="text-sm text-surface-400">Grid-Rank Scans Dashboard (für CARTO Enrichment vorbereitet)</p>
                                    </div>
                                    <button onClick={() => toggleFlag('mapDashboard')} className={`w-12 h-6 rounded-full transition-colors ${featureFlags.mapDashboard ? 'bg-crm-primary' : 'bg-surface-600'}`}>
                                        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${featureFlags.mapDashboard ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-surface-700/50 rounded-lg">
                                    <div>
                                        <p className="text-white font-medium">Grid Rank Scan (Maps)</p>
                                        <p className="text-sm text-surface-400">Local Falcon light – Heatmap & Persistenz</p>
                                    </div>
                                    <button onClick={() => toggleFlag('gridRank')} className={`w-12 h-6 rounded-full transition-colors ${featureFlags.gridRank ? 'bg-crm-primary' : 'bg-surface-600'}`}>
                                        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${featureFlags.gridRank ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-surface-700/50 rounded-lg">
                                    <div>
                                        <p className="text-white font-medium">PageSpeed Insights</p>
                                        <p className="text-sm text-surface-400">Lighthouse Scores im Lead Search (kann langsamer sein / Quota)</p>
                                    </div>
                                    <button onClick={() => toggleFlag('pageSpeedInsights')} className={`w-12 h-6 rounded-full transition-colors ${featureFlags.pageSpeedInsights ? 'bg-crm-primary' : 'bg-surface-600'}`}>
                                        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${featureFlags.pageSpeedInsights ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-surface-700/50 rounded-lg border border-amber-500/30">
                                    <div>
                                        <p className="text-white font-medium">Similarweb (kostenpflichtig)</p>
                                        <p className="text-sm text-surface-400">Nur aktivieren wenn du eine bezahlte Traffic-Quelle nutzen willst</p>
                                    </div>
                                    <button onClick={() => toggleFlag('similarweb')} className={`w-12 h-6 rounded-full transition-colors ${featureFlags.similarweb ? 'bg-amber-400' : 'bg-surface-600'}`}>
                                        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${featureFlags.similarweb ? 'translate-x-6' : 'translate-x-0.5'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
