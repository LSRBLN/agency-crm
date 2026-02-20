export default function ScoreGauge({ score = 0, size = 180, label = 'Visibility Score' }) {
    const radius = (size - 20) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (score / 100) * circumference

    function getColor(s) {
        if (s >= 70) return { stroke: '#10b981', text: 'text-emerald-400', label: 'Gut' }
        if (s >= 40) return { stroke: '#f59e0b', text: 'text-amber-400', label: 'Mittel' }
        return { stroke: '#f43f5e', text: 'text-rose-400', label: 'Kritisch' }
    }

    const color = getColor(score)

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="-rotate-90">
                    <circle
                        cx={size / 2} cy={size / 2} r={radius}
                        stroke="rgba(255,255,255,0.05)" strokeWidth="10" fill="none"
                    />
                    <circle
                        cx={size / 2} cy={size / 2} r={radius}
                        stroke={color.stroke} strokeWidth="10" fill="none"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-4xl font-bold ${color.text}`}>{score}</span>
                    <span className="text-xs text-gray-500 mt-1">/ 100</span>
                </div>
            </div>
            <div className="text-center">
                <p className="text-sm font-medium text-gray-300">{label}</p>
                <p className={`text-xs font-semibold ${color.text}`}>{color.label}</p>
            </div>
        </div>
    )
}
