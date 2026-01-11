/**
 * Service Worker para SOFTGESTÃO
 * Versão: 6.0 - Instalação WebAPK Android
 */

const CACHE_NAME = 'softgestao-web-app-v6';

const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/react@18/umd/react.production.min.js',
    'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
    'https://unpkg.com/@babel/standalone/babel.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://unpkg.com/@phosphor-icons/web',
    'https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js',
    'https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js'
];

// Instalação
self.addEventListener('install', (event) => {
    console.log('⚙️ SW: Instalando Service Worker v6...');
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('📦 SW: Cacheando recursos essenciais...');
            return Promise.all(
                urlsToCache.map(url => {
                    return cache.add(url).catch(err => {
                        console.warn('⚠️ Erro ao cachear:', url, err);
                    });
                })
            );
        })
    );
});

// Ativação
self.addEventListener('activate', (event) => {
    console.log('✅ SW: Ativando Service Worker v6...');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ SW: Removendo cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );

    return self.clients.claim();
});

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
    // Para navegação - tenta rede primeiro, depois cache
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match('./index.html') || caches.match('./');
            })
        );
        return;
    }

    // Para outros recursos - cache primeiro, depois rede
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request).then((response) => {
                // Só cacheia respostas válidas
                if (!response || response.status !== 200 || response.type === 'error') {
                    return response;
                }

                // Clona a resposta para cachear
                const responseToCache = response.clone();

                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return response;
            });
        })
    );
});
