// Service Worker v16 - SoftGestão - OTIMIZADO iOS
const CACHE_NAME = 'softgestao-v16-2026';

// Recursos CRÍTICOS - instalados individualmente
const CRITICAL_RESOURCES = [
    './',
    './index.html',
    './manifest.json'
];

// CDNs e Bibliotecas - instaladas separadamente
const CDN_RESOURCES = [
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/react@18/umd/react.production.min.js',
    'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
    'https://unpkg.com/@babel/standalone/babel.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://unpkg.com/phosphor-icons@1.4.2/web',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&display=swap'
];

// INSTALL - Instalação ROBUSTA individual
self.addEventListener('install', (event) => {
    console.log('🔧 [SW v16] Instalando...');

    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            console.log('📦 [v16] Abrindo cache...');

            // 1. Cacheia recursos críticos PRIMEIRO
            for (const url of CRITICAL_RESOURCES) {
                try {
                    await cache.add(url);
                    console.log('✅ [v16] Crítico:', url);
                } catch (err) {
                    console.warn('⚠️ [v16] Falha crítico:', url, err);
                }
            }

            // 2. Cacheia CDNs um por um (iOS precisa assim)
            for (const url of CDN_RESOURCES) {
                try {
                    const response = await fetch(url, { 
                        mode: 'cors',
                        cache: 'no-cache' 
                    });
                    if (response.ok) {
                        await cache.put(url, response);
                        console.log('✅ [v16] CDN:', url);
                    }
                } catch (err) {
                    console.warn('⚠️ [v16] Falha CDN:', url, err);
                }
            }

            console.log('✅ [v16] Instalação completa!');
            return self.skipWaiting();
        })
    );
});

// ACTIVATE - Limpa caches antigos
self.addEventListener('activate', (event) => {
    console.log('🚀 [v16] Ativando...');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ [v16] Removendo cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('✅ [v16] Ativo e assumindo controle!');
            return self.clients.claim();
        })
    );
});

// FETCH - CACHE FIRST ABSOLUTO (iOS precisa disso)
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Firebase/Firestore: sempre tenta online, fallback JSON vazio
    if (url.hostname.includes('firebaseio.com') || 
        url.hostname.includes('firestore.googleapis.com') ||
        url.hostname.includes('identitytoolkit.googleapis.com') ||
        url.hostname.includes('securetoken.googleapis.com') ||
        url.hostname.includes('firebasestorage.googleapis.com')) {

        event.respondWith(
            fetch(event.request, { cache: 'no-store' })
                .catch(() => {
                    console.log('📡 [v16] Firebase offline');
                    return new Response(JSON.stringify({ offline: true }), {
                        headers: { 'Content-Type': 'application/json' },
                        status: 200
                    });
                })
        );
        return;
    }

    // CACHE FIRST ABSOLUTO para tudo que não é Firebase
    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((cachedResponse) => {

                // Se está em cache, retorna IMEDIATAMENTE (iOS precisa disso)
                if (cachedResponse) {
                    console.log('💾 [v16] Do cache:', url.pathname);
                    return cachedResponse;
                }

                // Se não está em cache, tenta buscar e cacheia
                return fetch(event.request).then((networkResponse) => {

                    // Só cacheia respostas válidas
                    if (networkResponse && networkResponse.status === 200) {
                        // Clone a resposta
                        const responseClone = networkResponse.clone();

                        // Cacheia assincronamente (não bloqueia)
                        cache.put(event.request, responseClone).then(() => {
                            console.log('💾 [v16] Cacheado:', url.pathname);
                        });
                    }

                    return networkResponse;

                }).catch((err) => {
                    console.warn('⚠️ [v16] Offline e sem cache:', url.pathname);

                    // Fallback para HTML - retorna index.html
                    if (event.request.mode === 'navigate') {
                        return cache.match('./index.html').then((fallback) => {
                            return fallback || new Response('Offline', { 
                                status: 503,
                                statusText: 'Service Unavailable' 
                            });
                        });
                    }

                    // Para outros recursos, retorna erro
                    return new Response('Network error', {
                        status: 408,
                        statusText: 'Request Timeout'
                    });
                });
            });
        })
    );
});

console.log('📱 [SW v16] SoftGestão carregado - iOS Optimized!');
