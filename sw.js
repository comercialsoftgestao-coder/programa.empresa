/**
 * SOFTGESTÃO - Service Worker v2
 * Este ficheiro garante o funcionamento offline e estabilidade no iOS/iPhone.
 */

const CACHE_NAME = 'softgestao-v2-2026';

// Lista de ficheiros e bibliotecas para guardar no dispositivo
const urlsToCache = [
    './',
    'index.html',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/react@18/umd/react.production.min.js',
    'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
    'https://unpkg.com/@babel/standalone/babel.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://unpkg.com/@phosphor-icons/web',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&display=swap',
    // Bibliotecas críticas do Firebase (Versão 12.7.0 conforme o index.html)
    'https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js',
    'https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js'
];

// Instalação: Cria o cache e guarda os ficheiros iniciais
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('SW: A preparar cache para uso offline...');
            return cache.addAll(urlsToCache);
        })
    );
});

// Ativação: Limpa versões de cache obsoletas
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('SW: A remover cache antigo:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Interceção de Pedidos (Fetch)
self.addEventListener('fetch', (event) => {
    // Processamos apenas pedidos de leitura (GET)
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then(cachedResponse => {
            // 1. Se estiver no cache, entrega imediatamente (Estratégia Cache-First)
            if (cachedResponse) {
                return cachedResponse;
            }

            // 2. Se não estiver no cache, tenta a rede
            return fetch(event.request).then(networkResponse => {
                // Se a resposta for válida, guarda uma cópia no cache para a próxima vez
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // 3. Fallback Offline: Se a rede falhar e for navegação, entrega o index.html
                if (event.request.mode === 'navigate') {
                    return caches.match('index.html') || caches.match('./');
                }
            });
        })
    );
});