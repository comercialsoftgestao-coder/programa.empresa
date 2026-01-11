// Service Worker - SoftGestão - VERSÃO LIMPA
const CACHE_NAME = 'softgestao-clean-2026';

// Lista de recursos para cachear
const urlsToCache = [
    './',
    './index.html',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/react@18/umd/react.production.min.js',
    'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
    'https://unpkg.com/@babel/standalone/babel.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://unpkg.com/phosphor-icons@1.4.2/web',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&display=swap'
];

// INSTALL
self.addEventListener('install', (event) => {
    console.log('SW: Instalando...');
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
            .then(() => console.log('SW: Cache criado'))
            .catch(err => console.error('SW: Erro ao cachear', err))
    );
});

// ACTIVATE
self.addEventListener('activate', (event) => {
    console.log('SW: Ativando...');

    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(name => {
                        if (name !== CACHE_NAME) {
                            console.log('SW: Removendo cache antigo', name);
                            return caches.delete(name);
                        }
                    })
                );
            })
            .then(() => self.clients.claim())
    );
});

// FETCH - Estratégia simples
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Firebase: sempre online
    if (url.hostname.includes('firebase') || 
        url.hostname.includes('googleapis.com') && url.pathname.includes('firestore')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Outros recursos: Cache First
    event.respondWith(
        caches.match(event.request)
            .then(cached => {
                if (cached) {
                    return cached;
                }
                return fetch(event.request)
                    .then(response => {
                        if (response && response.status === 200) {
                            const clone = response.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => cache.put(event.request, clone));
                        }
                        return response;
                    });
            })
            .catch(() => {
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            })
    );
});

console.log('SW: Carregado');
