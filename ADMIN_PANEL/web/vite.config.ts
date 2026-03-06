import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Tailwind v3 via PostCSS (postcss.config.js reads tailwind.config.js)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '127.0.0.1',
  },
})
