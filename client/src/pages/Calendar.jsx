import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Clock, User, MapPin, Edit, Trash2 } from 'lucide-react'

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

const initialForm = {
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    all_day: false,
    contact_id: '',
    deal_id: '',
    color: '#3b82f6',
}

function toLocalInputValue(date) {
    if (!date) return ''
    const d = new Date(date)
    const pad = (v) => String(v).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function Calendar() {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [view, setView] = useState('month')
    const [events, setEvents] = useState([])
    const [contacts, setContacts] = useState([])
    const [deals, setDeals] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [form, setForm] = useState(initialForm)
    const [selectedEvent, setSelectedEvent] = useState(null)

    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    async function loadData() {
        setLoading(true)
        setError('')
        try {
            const [eventsRes, contactsRes, dealsRes] = await Promise.all([
                axios.get('/api/calendar', { headers }),
                axios.get('/api/contacts', { headers }),
                axios.get('/api/deals', { headers }),
            ])
            setEvents(Array.isArray(eventsRes.data) ? eventsRes.data : [])
            setContacts(Array.isArray(contactsRes.data) ? contactsRes.data : [])
            setDeals(Array.isArray(dealsRes.data) ? dealsRes.data : [])
        } catch (err) {
            setError(err.response?.data?.error || 'Kalender konnte nicht geladen werden')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const contactMap = useMemo(() => contacts.reduce((acc, c) => ({ ...acc, [c.id]: c }), {}), [contacts])
    const dealMap = useMemo(() => deals.reduce((acc, d) => ({ ...acc, [d.id]: d }), {}), [deals])

    const getDaysInMonth = (date) => {
        const year = date.getFullYear()
        const month = date.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const days = []
        const startPadding = (firstDay.getDay() + 6) % 7

        for (let i = startPadding - 1; i >= 0; i--) {
            days.push({ date: new Date(year, month, -i), isCurrentMonth: false })
        }
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push({ date: new Date(year, month, i), isCurrentMonth: true })
        }
        const remaining = 42 - days.length
        for (let i = 1; i <= remaining; i++) {
            days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })
        }
        return days
    }

    const days = getDaysInMonth(currentDate)
    const today = new Date()

    const getEventsForDate = (date) => {
        const target = date.toISOString().split('T')[0]
        return events.filter((event) => String(event.start_time || '').startsWith(target))
    }

    const weekDays = useMemo(() => {
        const monday = new Date(currentDate)
        const day = (monday.getDay() + 6) % 7
        monday.setDate(monday.getDate() - day)
        return Array.from({ length: 7 }).map((_, index) => {
            const date = new Date(monday)
            date.setDate(monday.getDate() + index)
            return date
        })
    }, [currentDate])

    const dayEvents = useMemo(() => getEventsForDate(currentDate), [currentDate, events])

    function nextMonth() {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    }

    function prevMonth() {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    }

    function resetForm() {
        setShowForm(false)
        setEditingId(null)
        setForm(initialForm)
    }

    function openCreate(date = null) {
        const start = date ? new Date(date) : new Date()
        start.setMinutes(0, 0, 0)
        const end = new Date(start)
        end.setHours(start.getHours() + 1)

        setForm({
            ...initialForm,
            start_time: toLocalInputValue(start),
            end_time: toLocalInputValue(end),
        })
        setEditingId(null)
        setShowForm(true)
    }

    function openEdit(event) {
        setForm({
            title: event.title || '',
            description: event.description || '',
            start_time: toLocalInputValue(event.start_time),
            end_time: toLocalInputValue(event.end_time),
            all_day: Boolean(event.all_day),
            contact_id: event.contact_id || '',
            deal_id: event.deal_id || '',
            color: event.color || '#3b82f6',
        })
        setEditingId(event.id)
        setShowForm(true)
    }

    async function saveEvent(e) {
        e.preventDefault()
        try {
            const payload = {
                ...form,
                start_time: form.start_time ? new Date(form.start_time).toISOString() : null,
                end_time: form.end_time ? new Date(form.end_time).toISOString() : null,
                contact_id: form.contact_id || null,
                deal_id: form.deal_id || null,
            }

            if (!payload.title || !payload.start_time) {
                setError('Titel und Startzeit sind erforderlich')
                return
            }

            if (editingId) {
                await axios.put(`/api/calendar/${editingId}`, payload, { headers })
            } else {
                await axios.post('/api/calendar', payload, { headers })
            }

            resetForm()
            await loadData()
        } catch (err) {
            setError(err.response?.data?.error || 'Termin konnte nicht gespeichert werden')
        }
    }

    async function removeEvent(id) {
        if (!window.confirm('Termin wirklich löschen?')) return
        try {
            await axios.delete(`/api/calendar/${id}`, { headers })
            if (selectedEvent?.id === id) setSelectedEvent(null)
            await loadData()
        } catch (err) {
            setError(err.response?.data?.error || 'Termin konnte nicht gelöscht werden')
        }
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Kalender</h1>
                    <p className="text-surface-400 mt-1">Termine und Aktivitäten planen</p>
                </div>
                <button onClick={() => openCreate()} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Neuer Termin</button>
            </div>

            {error && <div className="mb-4 p-3 rounded-lg bg-rose-500/15 text-rose-300 text-sm">{error}</div>}

            {showForm && (
                <form onSubmit={saveEvent} className="crm-card p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input className="input-field" placeholder="Titel*" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                    <input className="input-field" placeholder="Beschreibung" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    <input className="input-field" type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
                    <input className="input-field" type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                    <input className="input-field" type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
                    <label className="input-field flex items-center gap-2"><input type="checkbox" checked={form.all_day} onChange={(e) => setForm({ ...form, all_day: e.target.checked })} />Ganztägig</label>
                    <select className="input-field" value={form.contact_id} onChange={(e) => setForm({ ...form, contact_id: e.target.value })}>
                        <option value="">Kontakt (optional)</option>
                        {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}
                    </select>
                    <select className="input-field" value={form.deal_id} onChange={(e) => setForm({ ...form, deal_id: e.target.value })}>
                        <option value="">Deal (optional)</option>
                        {deals.map((deal) => <option key={deal.id} value={deal.id}>{deal.name}</option>)}
                    </select>
                    <div className="md:col-span-1 flex gap-2 justify-end">
                        <button type="button" onClick={resetForm} className="btn-secondary">Abbrechen</button>
                        <button type="submit" className="btn-primary">{editingId ? 'Speichern' : 'Erstellen'}</button>
                    </div>
                </form>
            )}

            <div className="crm-card p-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <button onClick={prevMonth} className="btn-icon"><ChevronLeft className="w-4 h-4" /></button>
                        <h2 className="text-xl font-semibold text-white">{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
                        <button onClick={nextMonth} className="btn-icon"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setCurrentDate(new Date())} className="btn-secondary text-sm">Heute</button>
                        <div className="flex rounded-lg overflow-hidden border border-surface-600">
                            <button onClick={() => setView('day')} className={`px-3 py-1.5 text-sm ${view === 'day' ? 'bg-crm-primary text-white' : 'bg-surface-700 text-surface-300'}`}>Tag</button>
                            <button onClick={() => setView('week')} className={`px-3 py-1.5 text-sm ${view === 'week' ? 'bg-crm-primary text-white' : 'bg-surface-700 text-surface-300'}`}>Woche</button>
                            <button onClick={() => setView('month')} className={`px-3 py-1.5 text-sm ${view === 'month' ? 'bg-crm-primary text-white' : 'bg-surface-700 text-surface-300'}`}>Monat</button>
                        </div>
                    </div>
                </div>

                {loading && <div className="text-surface-400 text-sm">Kalender wird geladen...</div>}

                {!loading && view === 'month' && (
                    <div className="grid grid-cols-7 gap-1">
                        {DAYS.map((day) => <div key={day} className="text-center text-sm font-medium text-surface-400 py-2">{day}</div>)}
                        {days.map((day, index) => {
                            const dayEvents = getEventsForDate(day.date)
                            const isToday = day.date.toDateString() === today.toDateString()
                            return (
                                <div key={index} className={`min-h-[100px] p-2 border border-surface-700 ${!day.isCurrentMonth ? 'bg-surface-800/50' : ''} ${isToday ? 'bg-crm-primary/10' : ''}`}>
                                    <div className={`text-sm mb-1 ${isToday ? 'text-crm-primary font-bold' : day.isCurrentMonth ? 'text-surface-200' : 'text-surface-500'}`}>{day.date.getDate()}</div>
                                    {dayEvents.slice(0, 2).map((event) => (
                                        <div key={event.id} onClick={() => setSelectedEvent(event)} className="text-xs p-1 rounded mb-1 truncate cursor-pointer text-white" style={{ backgroundColor: event.color || '#3b82f6' }}>
                                            {event.title}
                                        </div>
                                    ))}
                                    {dayEvents.length > 2 && <div className="text-xs text-surface-500">+{dayEvents.length - 2} mehr</div>}
                                    <button onClick={() => openCreate(day.date)} className="text-[10px] text-surface-500 hover:text-surface-300 mt-1">+ Termin</button>
                                </div>
                            )
                        })}
                    </div>
                )}

                {!loading && view === 'week' && (
                    <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                        {weekDays.map((day) => {
                            const list = getEventsForDate(day)
                            const isToday = day.toDateString() === today.toDateString()
                            return (
                                <div key={day.toISOString()} className="border border-surface-700 rounded-lg p-3">
                                    <div className={`text-sm mb-3 ${isToday ? 'text-crm-primary font-semibold' : 'text-surface-300'}`}>
                                        {DAYS[(day.getDay() + 6) % 7]} • {day.toLocaleDateString('de-DE')}
                                    </div>
                                    <div className="space-y-2">
                                        {list.map((event) => (
                                            <div key={event.id} className="text-xs p-2 rounded cursor-pointer text-white" style={{ backgroundColor: event.color || '#3b82f6' }} onClick={() => setSelectedEvent(event)}>{event.title}</div>
                                        ))}
                                        {list.length === 0 && <div className="text-xs text-surface-500">Keine Termine</div>}
                                        <button onClick={() => openCreate(day)} className="text-xs text-surface-500 hover:text-surface-300">+ Termin</button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {!loading && view === 'day' && (
                    <div className="space-y-3">
                        <div className="text-sm text-surface-300">{currentDate.toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        {dayEvents.map((event) => (
                            <div key={event.id} className="crm-card p-3 cursor-pointer" onClick={() => setSelectedEvent(event)}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-medium text-white">{event.title}</div>
                                        <div className="text-xs text-surface-400">{new Date(event.start_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</div>
                                    </div>
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: event.color || '#3b82f6' }} />
                                </div>
                            </div>
                        ))}
                        {dayEvents.length === 0 && <div className="text-sm text-surface-500">Keine Termine an diesem Tag</div>}
                        <button onClick={() => openCreate(currentDate)} className="btn-secondary">Termin hinzufügen</button>
                    </div>
                )}
            </div>

            {selectedEvent && (
                <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
                    <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <h2 className="text-xl font-bold text-white">{selectedEvent.title}</h2>
                                <button onClick={() => setSelectedEvent(null)} className="btn-icon text-2xl">×</button>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-surface-300"><Clock className="w-4 h-4" /><span>{selectedEvent.start_time ? new Date(selectedEvent.start_time).toLocaleString('de-DE') : '-'}</span></div>
                                {selectedEvent.contact_id && <div className="flex items-center gap-3 text-surface-300"><User className="w-4 h-4" /><span>{contactMap[selectedEvent.contact_id]?.name || 'Kontakt'}</span></div>}
                                {selectedEvent.deal_id && <div className="flex items-center gap-3 text-surface-300"><CalendarIcon className="w-4 h-4" /><span>{dealMap[selectedEvent.deal_id]?.name || 'Deal'}</span></div>}
                                <div className="flex items-center gap-3 text-surface-300"><MapPin className="w-4 h-4" /><span>{selectedEvent.description || 'Keine Beschreibung'}</span></div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button className="btn-primary flex-1 flex items-center justify-center gap-2" onClick={() => { openEdit(selectedEvent); setSelectedEvent(null) }}><Edit className="w-4 h-4" />Bearbeiten</button>
                                <button className="btn-secondary flex-1 flex items-center justify-center gap-2" onClick={() => removeEvent(selectedEvent.id)}><Trash2 className="w-4 h-4" />Löschen</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
