import { useState } from 'react';

const API = import.meta.env.VITE_API_URL || '';

export default function AEOSimulator() {
    const [query, setQuery] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [location, setLocation] = useState('Berlin Wedding');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const runSimulation = async () => {
        if (!query) return;
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API}/api/audits/aeo-simulate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ query, businessName, location })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setResult(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-white mb-6">🔍 AEO-Simulator</h1>
            <p className="text-gray-400 mb-6">
                Teste, wie KI-Suchmaschinen (Gemini, ChatGPT, Siri) auf spezifische Kundenanfragen reagieren.
            </p>

            <div className="bg-gray-800 rounded-xl p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Suchanfrage *</label>
                        <input
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="z.B. Bester Bäcker in Wedding"
                            className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Unternehmen</label>
                        <input
                            type="text"
                            value={businessName}
                            onChange={e => setBusinessName(e.target.value)}
                            placeholder="z.B. Bäckerei Schmidt"
                            className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>
                <div className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-sm text-gray-400 mb-1">Standort</label>
                        <input
                            type="text"
                            value={location}
                            onChange={e => setLocation(e.target.value)}
                            className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <button
                        onClick={runSimulation}
                        disabled={loading || !query}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                        {loading ? '⏳ Simuliere...' : '🚀 Simulation starten'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-900/50 border border-red-500 text-red-300 rounded-lg p-4 mb-6">
                    {error}
                </div>
            )}

            {result && (
                <div className="bg-gray-800 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-white">Ergebnis</h2>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${result.result?.visible
                                ? 'bg-green-900/50 text-green-400'
                                : 'bg-red-900/50 text-red-400'
                            }`}>
                            {result.result?.visible ? '✅ Sichtbar' : '❌ Nicht sichtbar'}
                        </span>
                    </div>

                    <div className="mb-4">
                        <div className="flex justify-between text-sm text-gray-400 mb-1">
                            <span>AEO-Score</span>
                            <span>{result.result?.score}/100</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-3">
                            <div
                                className={`h-3 rounded-full transition-all duration-500 ${result.result?.score >= 70 ? 'bg-green-500' :
                                        result.result?.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                style={{ width: `${result.result?.score || 0}%` }}
                            />
                        </div>
                    </div>

                    <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
                        <h3 className="text-sm font-medium text-gray-300 mb-2">KI-Analyse</h3>
                        <p className="text-gray-400 text-sm">{result.result?.reasoning}</p>
                    </div>

                    <div className="text-xs text-gray-500">
                        Abfrage: "{result.query}" | {result.timestamp}
                    </div>
                </div>
            )}
        </div>
    );
}
