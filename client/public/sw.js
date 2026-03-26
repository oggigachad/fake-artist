const CACHE_NAME = 'fake-artist-v1';
const STATIC_ASSETS = [
    '/',
    '/manifest.json',
    '/icon-192.svg',
    '/icon-512.svg',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch: network-first for API/socket, cache-first for static
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET and socket.io requests
    if (event.request.method !== 'GET' || url.pathname.startsWith('/socket.io')) {
        return;
    }

    // Network-first for HTML pages (always fresh)
    if (event.request.headers.get('accept') ? .includes('text/html')) {
        event.respondWith(
            fetch(event.request)
            .then((response) => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                return response;
            })
            .catch(() => caches.match(event.request))
        );
        return;
    }

    // Cache-first for static assets
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).then((response) => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
                return response;
            });
        })
    );
});