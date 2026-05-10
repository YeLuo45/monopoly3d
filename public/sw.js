// Monopoly3D Service Worker — standalone (no workbox)
// Provides offline caching for game assets, audio, and Supabase API

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `monopoly3d-static-${CACHE_VERSION}`;
const ASSETS_CACHE = `monopoly3d-assets-${CACHE_VERSION}`;
const AUDIO_CACHE = `monopoly3d-audio-${CACHE_VERSION}`;
const API_CACHE = `monopoly3d-api-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/monopoly3d/',
  '/monopoly3d/index.html',
];

const MAX_AGE = {
  assets: 30 * 24 * 60 * 60, // 30 days
  audio: 30 * 24 * 60 * 60,
  api: 5 * 60,                // 5 minutes
};

// ─── Install: precache app shell ───────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate: purge old caches ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key =>
        key.startsWith('monopoly3d-') && key !== STATIC_CACHE && key !== ASSETS_CACHE && key !== AUDIO_CACHE && key !== API_CACHE
      ).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

// ─── Fetch: route-based caching ─────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Game assets (JS/CSS/fonts from GitHub Pages)
  if (
    url.origin === 'https://yeluo45.github.io' &&
    url.pathname.startsWith('/monopoly3d/assets/')
  ) {
    event.respondWith(cacheFirst(event.request, ASSETS_CACHE, MAX_AGE.assets));
    return;
  }

  // Audio assets
  if (
    url.origin === 'https://yeluo45.github.io' &&
    url.pathname.startsWith('/monopoly3d/audio/')
  ) {
    event.respondWith(cacheFirst(event.request, AUDIO_CACHE, MAX_AGE.audio));
    return;
  }

  // Supabase API: NetworkFirst
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(networkFirst(event.request, API_CACHE, MAX_AGE.api));
    return;
  }
});

// ─── Strategies ──────────────────────────────────────────────────────────────
async function cacheFirst(request, cacheName, maxAgeSeconds) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    const age = await ageFromCache(cached);
    if (age < maxAgeSeconds) return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cloned = response.clone();
      await cache.put(request, cloned);
    }
    return response;
  } catch {
    return cached || new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, cacheName, maxAgeSeconds) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      const age = await ageFromCache(cached);
      if (age < maxAgeSeconds) return cached;
    }
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function ageFromCache(response) {
  const dateHeader = response.headers.get('date');
  if (!dateHeader) return 0;
  return (Date.now() - new Date(dateHeader).getTime()) / 1000;
}
