import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

// Precache all assets from Vite manifest
precacheAndRoute(self.__WB_MANIFEST)

// Cache game assets: JS/CSS/fonts from GitHub Pages
registerRoute(
  /^https:\/\/yeluo45\.github\.io\/monopoly3d\/assets\/.*/i,
  new CacheFirst({
    cacheName: 'game-assets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  })
)

// Supabase API: NetworkFirst, fallback to cache
registerRoute(
  /^https:\/\/.*\.supabase\.co\/.*/i,
  new NetworkFirst({
    cacheName: 'supabase-api',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 5, // 5 minutes
      }),
    ],
  })
)

// Audio assets: CacheFirst
registerRoute(
  /^https:\/\/yeluo45\.github\.io\/monopoly3d\/audio\/.*/i,
  new CacheFirst({
    cacheName: 'audio-assets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      }),
    ],
  })
)
