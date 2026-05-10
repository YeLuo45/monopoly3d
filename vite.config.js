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
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Monopoly3D',
        short_name: 'Monopoly3D',
        description: '3D Monopoly Board Game',
        theme_color: '#1e3a5f',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/monopoly3d/',
        icons: [
          {
            src: 'apple-touch-icon.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'apple-touch-icon.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      injectManifest: {
        swSrc: 'public/sw.js',
        swDest: 'dist/sw.js',
      },
    }),
  ],
})
