// Service Worker - SoftGestão v1.1 - COMPLETO
const CACHE_NAME = 'softgestao-v1-1-2026';

const urlsToCache = [
    './',
    './index.html',
    // CSS Frameworks
    'https://cdn.tailwindcss.com',
    // React
    'https://unpkg.com/react@18/umd/react.production.min.js',
    'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
    'https://unpkg.com/@babel/standalone/babel.min.js',
    // Chart.js
    'https://cdn.jsdelivr.net/npm/chart.js',
    // Phosphor Icons - TODOS os recursos
    'https://unpkg.com/phosphor-icons@1.4.2/web',
    'https://unpkg.com/phosphor-icons@1.4.2/src/css/phosphor.css',
    'https://unpkg.com/phosphor-icons@1.4.2/src/css/icons.css',
    // Google Fonts
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&display=swap'
];

// INSTALL
self.addEventListener('install', (event) => {
    console.log('🔧 SW instalando...');
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('📦 Cacheando recursos...');
            return Promise.allSettled(
                urlsToCache.map(url => 
                    cache.add(url).catch(err => 
                        console.warn('⚠️ Falha:', url)
                    )
                )
            );
        }).then(() => console.log('✅ Cache OK!'))
    );
});

// ACTIVATE
self.addEventListener('activate', (event) => {
    console.log('🚀 SW ativando...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Removendo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// FETCH - ESTRATÉGIA MELHORADA
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Firebase: sempre buscar online, fallback vazio
    if (url.hostname.includes('firebase') || 
        url.hostname.includes('googleapis.com') && url.pathname.includes('identitytoolkit')) {
        event.respondWith(
            fetch(event.request).catch(() => 
                new Response('{"offline":true}', {
                    headers: {'Content-Type': 'application/json'}
                })
            )
        );
        return;
    }

    // FONTES (WOFF2, WOFF, TTF) - CACHE FIRST AGRESSIVO
    if (event.request.url.match(/\.(woff2|woff|ttf|eot|otf)$/)) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) {
                    console.log('📝 Fonte do cache:', event.request.url);
                    return cached;
                }
                return fetch(event.request).then(response => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, clone);
                            console.log('💾 Fonte cacheada:', event.request.url);
                        });
                    }
                    return response;
                });
            })
        );
        return;
    }

    // CSS do Phosphor Icons e Google Fonts - CACHE FIRST
    if (url.hostname.includes('fonts.googleapis.com') || 
        url.hostname.includes('fonts.gstatic.com') ||
        (url.hostname.includes('unpkg.com') && url.pathname.includes('phosphor'))) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) {
                    return cached;
                }
                return fetch(event.request).then(response => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, clone);
                        });
                    }
                    return response;
                });
            })
        );
        return;
    }

    // CDNs gerais - CACHE FIRST
    if (url.hostname.includes('cdn.') || 
        url.hostname.includes('unpkg.com') ||
        url.hostname.includes('jsdelivr.net')) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) {
                    return cached;
                }
                return fetch(event.request).then(response => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, clone);
                        });
                    }
                    return response;
                });
            })
        );
        return;
    }

    // HTML - NETWORK FIRST
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, clone);
                    });
                    return response;
                })
                .catch(() => caches.match(event.request).then(cached => 
                    cached || caches.match('./index.html')
                ))
        );
        return;
    }

    // Outros recursos - CACHE FIRST
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            });
        })
    );
});

console.log('📱 SW SoftGestão v1.1 carregado!');
