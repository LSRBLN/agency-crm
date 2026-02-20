import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { Upload, FileSpreadsheet, Check, AlertCircle } from 'lucide-react'

export default function CSVUploader({ onUpload }) {
    const [dragOver, setDragOver] = useState(false)
    const [status, setStatus] = useState(null) // null | 'parsing' | 'success' | 'error'
    const [count, setCount] = useState(0)
    const fileRef = useRef()

    async function handleFile(file) {
        if (!file) return
        setStatus('parsing')

        const formData = new FormData()
        formData.append('file', file)

        try {
            const token = localStorage.getItem('token')
            const response = await fetch('/api/leads/upload-metrics', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            })

            if (!response.ok) throw new Error('Upload fehlgeschlagen')

            const data = await response.json()
            setCount(data.createdCount + data.updatedCount)
            setStatus('success')
            onUpload?.() // Signal parent to refresh leads
        } catch (error) {
            console.error('Upload Error:', error)
            setStatus('error')
        }
    }

    return (
        <div
            className={`glass-card p-8 text-center cursor-pointer transition-all duration-300 ${dragOver ? 'border-brand-500 bg-brand-600/10 scale-[1.01]' : 'hover:border-white/10'
                }`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
            onClick={() => fileRef.current?.click()}
        >
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => handleFile(e.target.files[0])} />

            {status === null && (
                <div className="space-y-3">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-surface-600 flex items-center justify-center">
                        <Upload className="w-7 h-7 text-gray-400" />
                    </div>
                    <p className="text-gray-300 font-medium">CSV-Datei hierher ziehen</p>
                    <p className="text-xs text-gray-500">oder klicken zum Auswählen • Manis AI / SimilarWeb Export</p>
                </div>
            )}

            {status === 'parsing' && (
                <div className="space-y-3 animate-pulse-subtle">
                    <FileSpreadsheet className="w-10 h-10 mx-auto text-brand-400" />
                    <p className="text-gray-300">Wird verarbeitet...</p>
                </div>
            )}

            {status === 'success' && (
                <div className="space-y-3 animate-fade-in">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-600/20 flex items-center justify-center">
                        <Check className="w-7 h-7 text-emerald-400" />
                    </div>
                    <p className="text-emerald-400 font-medium">{count} Leads importiert</p>
                    <button onClick={e => { e.stopPropagation(); setStatus(null) }} className="text-xs text-gray-500 hover:text-gray-300">
                        Weitere Datei hochladen
                    </button>
                </div>
            )}

            {status === 'error' && (
                <div className="space-y-3 animate-fade-in">
                    <AlertCircle className="w-10 h-10 mx-auto text-rose-400" />
                    <p className="text-rose-400 font-medium">Fehler beim Parsen</p>
                    <button onClick={e => { e.stopPropagation(); setStatus(null) }} className="text-xs text-gray-500 hover:text-gray-300">
                        Erneut versuchen
                    </button>
                </div>
            )}
        </div>
    )
}
