import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: import.meta.env.VITE_BASE_URL || '/',
  plugins: [react()],
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1')
  },
  server: {
    port: 3000,
    host: true
  }
})
