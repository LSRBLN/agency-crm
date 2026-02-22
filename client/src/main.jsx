import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App.jsx'
import './index.css'

console.info('[Gemini CRM] client bundle loaded')

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

axios.interceptors.request.use((config) => {
    try {
        const token = localStorage.getItem('token')
        if (token) {
            config.headers = config.headers || {}
            if (!config.headers.Authorization && !config.headers.authorization) {
                config.headers.Authorization = `Bearer ${token}`
            }
        }
    } catch {
        // ignore
    }
    return config
})

axios.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status
        if (status === 401) {
            try {
                localStorage.removeItem('token')
            } catch {
                // ignore
            }
            if (window.location.pathname !== '/login') {
                window.location.href = '/login'
            }
        }
        return Promise.reject(error)
    }
)

if (API_BASE_URL) {
    axios.defaults.baseURL = API_BASE_URL

    const originalFetch = window.fetch.bind(window)
    window.fetch = (input, init) => {
        if (typeof input === 'string' && input.startsWith('/')) {
            return originalFetch(`${API_BASE_URL}${input}`, init)
        }
        return originalFetch(input, init)
    }
}

// Ensure fetch calls to our API also include Authorization by default.
{
    const originalFetch = window.fetch.bind(window)
    window.fetch = (input, init = {}) => {
        const url = typeof input === 'string' ? input : input?.url
        const isApiCall = typeof url === 'string' && (url.startsWith('/api/') || (API_BASE_URL && url.startsWith(`${API_BASE_URL}/api/`)))

        if (!isApiCall) {
            return originalFetch(input, init)
        }

        let token = null
        try {
            token = localStorage.getItem('token')
        } catch {
            token = null
        }

        if (!token) {
            return originalFetch(input, init)
        }

        const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined))
        if (!headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`)
        }

        return originalFetch(input, { ...init, headers })
    }
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
