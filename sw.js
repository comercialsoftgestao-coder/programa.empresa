// Service Worker - SoftGestão v1.0
const CACHE_NAME = 'softgestao-v1-2026';

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

// INSTALL - Cacheia recursos essenciais
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker instalando...');
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 Cacheando recursos...');
                // Cacheia recursos um por um para não falhar se algum der erro
                return Promise.allSettled(
                    urlsToCache.map(url => 
                        cache.add(url).catch(err => {
                            console.warn('⚠️ Falha ao cachear:', url, err);
                        })
                    )
                );
            })
            .then(() => console.log('✅ Cache criado!'))
    );
});

// ACTIVATE - Limpa caches antigos
self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker ativando...');

    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Removendo cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('✅ Service Worker ativo!');
            return self.clients.claim();
        })
    );
});

// FETCH - Estratégia de cache
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Firebase/Google APIs: sempre online (não cachear dados do Firebase)
    if (url.hostname.includes('firebaseio.com') || 
        url.hostname.includes('firebasestorage') ||
        url.hostname.includes('identitytoolkit') ||
        url.pathname.includes('firebase')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                // Se offline, retorna resposta vazia JSON para evitar erro
                return new Response('{"offline": true}', {
                    headers: { 'Content-Type': 'application/json' }
                });
            })
        );
        return;
    }

    // Para CDNs e recursos externos: Cache First com Network Fallback
    if (url.hostname.includes('cdn.') || 
        url.hostname.includes('unpkg.com') || 
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('gstatic.com')) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) {
                    return cached;
                }
                return fetch(event.request).then(response => {
                    if (response && response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return response;
                }).catch(err => {
                    console.warn('⚠️ Offline e sem cache para:', event.request.url);
                    return cached; // Retorna cache mesmo se antigo
                });
            })
        );
        return;
    }

    // Para HTML (navegação): Network First com Cache Fallback
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    return caches.match(event.request).then(cached => {
                        return cached || caches.match('./index.html');
                    });
                })
        );
        return;
    }

    // Para outros recursos: Cache First
    event.respondWith(
        caches.match(event.request)
            .then(cached => {
                if (cached) {
                    return cached;
                }

                return fetch(event.request).then(response => {
                    if (!response || response.status !== 200) {
                        return response;
                    }

                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });

                    return response;
                }).catch(() => {
                    console.warn('⚠️ Recurso não disponível offline:', event.request.url);
                });
            })
    );
});

console.log('📱 Service Worker SoftGestão carregado!');
