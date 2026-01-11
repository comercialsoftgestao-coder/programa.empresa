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
    self.skipWaiting(); // Ativa imediatamente

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 Cacheando recursos...');
                return cache.addAll(urlsToCache);
            })
            .then(() => console.log('✅ Cache criado com sucesso!'))
            .catch(err => console.error('❌ Erro ao cachear:', err))
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
            return self.clients.claim(); // Assume controle imediatamente
        })
    );
});

// FETCH - Estratégia de cache
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Sempre buscar Firebase/Google APIs online (não cachear)
    if (url.hostname.includes('firebaseio.com') || 
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('gstatic.com') ||
        url.hostname.includes('firebasestorage.googleapis.com')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Para navegação (HTML): Network First com fallback para cache
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Atualiza o cache com a versão mais recente
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // Se offline, serve do cache
                    return caches.match(event.request).then(cached => {
                        return cached || caches.match('./index.html');
                    });
                })
        );
        return;
    }

    // Para outros recursos (CSS, JS, imagens): Cache First com fallback para Network
    event.respondWith(
        caches.match(event.request)
            .then(cached => {
                if (cached) {
                    return cached; // Retorna do cache se existir
                }

                // Se não está em cache, busca na rede e cacheia
                return fetch(event.request).then(response => {
                    // Só cacheia respostas válidas
                    if (!response || response.status !== 200 || response.type === 'error') {
                        return response;
                    }

                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });

                    return response;
                });
            })
            .catch(() => {
                // Fallback em caso de erro
                console.log('⚠️ Falha ao buscar:', event.request.url);
            })
    );
});

console.log('📱 Service Worker SoftGestão carregado!');
