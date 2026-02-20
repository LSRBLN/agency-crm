import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: process.env.NODE_ENV === 'production'
                    ? 'https://agency-crm-backend-v2.azurewebsites.net'
                    : 'http://localhost:5000',
                changeOrigin: true,
            },
        },
    },
})
