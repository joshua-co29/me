const CACHE_NAME = 'sentinel-edu-v4';
const CORE_SHELL_ASSETS = [
    './',
    './index.html',
    './login.html',
    './dashboard.html',
    './engine.html',
    './students.html',
    './incidents.html',
    './schools.html',
    './leaderboard.html',
    './participation-points.html',
    './teacher-dashboard.html',
    './dean-dashboard.html',
    './counselor-dashboard.html',
    './principal-dashboard.html',
    './auth.js',
    './data/seed.js',
    './config/matrixWeights.js',
    './style/style.css',
    './manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_SHELL_ASSETS)).catch(() => null)
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    // Never cache or spoof API / health endpoints in the Service Worker
    if (url.pathname.startsWith('/api/')) return;

    // Network-first for all same-origin GET requests; cache fallback when offline
    event.respondWith(
        fetch(req)
            .then((res) => {
                if (res && res.ok) {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then((c) => c.put(req, clone)).catch(() => {});
                }
                return res;
            })
            .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    );
});

