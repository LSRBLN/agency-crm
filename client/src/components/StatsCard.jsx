import { useEffect, useRef, useState } from 'react'

export default function StatsCard({ icon: Icon, label, value, suffix = '', color = 'brand', delay = 0 }) {
    const [display, setDisplay] = useState(0)
    const ref = useRef(null)

    const colorMap = {
        brand: 'from-brand-600/20 to-brand-700/10 border-brand-500/20 text-brand-400',
        emerald: 'from-emerald-600/20 to-emerald-700/10 border-emerald-500/20 text-emerald-400',
        amber: 'from-amber-600/20 to-amber-700/10 border-amber-500/20 text-amber-400',
        rose: 'from-rose-600/20 to-rose-700/10 border-rose-500/20 text-rose-400',
    }

    useEffect(() => {
        const timeout = setTimeout(() => {
            const duration = 1200
            const steps = 40
            const increment = value / steps
            let current = 0
            const timer = setInterval(() => {
                current += increment
                if (current >= value) {
                    setDisplay(value)
                    clearInterval(timer)
                } else {
                    setDisplay(Math.floor(current))
                }
            }, duration / steps)
            return () => clearInterval(timer)
        }, delay)
        return () => clearTimeout(timeout)
    }, [value, delay])

    return (
        <div
            ref={ref}
            className={`glass-card p-6 bg-gradient-to-br ${colorMap[color]} border animate-slide-up`}
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{label}</p>
                    <p className="text-3xl font-bold text-white">
                        {display.toLocaleString('de-DE')}{suffix}
                    </p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${colorMap[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </div>
    )
}
