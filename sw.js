/**
 * Service Worker Otimizado para SOFTGESTÃO
 * Versão: 5.0 (Suporte total Offline e Instalação WebAPK)
 */

const CACHE_NAME = 'softgestao-web-app-v5';

const urlsToCache = [
    './',
    'index.html',
    'manifest.json',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/react@18/umd/react.production.min.js',
    'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
    'https://unpkg.com/@babel/standalone/babel.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://unpkg.com/@phosphor-icons/web',
    'https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js',
    'https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.all(
                urlsToCache.map(url => {
                    return cache.add(url).catch(err => console.error('Erro ao cachear:', url));
                })
            );
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => caches.match('index.html'))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request);
        })
    );
});