import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/monopoly3d/',
  server: {
    host: '127.0.0.1',
    port: 5174,
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
})
