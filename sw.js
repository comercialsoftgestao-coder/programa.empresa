/**
 * Service Worker Otimizado para SOFTGESTÃO
 * Versão: 4.0 (Suporte total Offline e Instalação WebAPK)
 * * Esta versão resolve o erro do "Dino" no Android e a tela vazia no iPhone.
 */

const CACHE_NAME = 'softgestao-web-app-v4';

// Lista de recursos essenciais para o "App Shell"
const urlsToCache = [
    './',
    'index.html',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/react@18/umd/react.production.min.js',
    'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
    'https://unpkg.com/@babel/standalone/babel.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://unpkg.com/@phosphor-icons/web',
    'https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js',
    'https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js'
];

// Evento de Instalação: Salva as bibliotecas e o HTML no cache do aparelho
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Força a atualização imediata do Service Worker
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('SW: Criando cache de ativos para suporte offline...');
            // Usamos map para tentar adicionar cada URL individualmente. 
            // Se uma falhar, as outras ainda são cacheadas.
            return Promise.all(
                urlsToCache.map(url => {
                    return cache.add(url).catch(err => console.error('Erro ao cachear:', url, err));
                })
            );
        })
    );
});

// Evento de Ativação: Limpa caches antigos para evitar conflitos de versão
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('SW: Limpando cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Permite que o SW controle as abas abertas imediatamente sem precisar de recarregamento
    return self.clients.claim();
});

// Evento de Fetch (Intercepção): O segredo para o Modo Avião
self.addEventListener('fetch', (event) => {
    // Para solicitações de navegação (abrir o site), sempre tenta o cache primeiro
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => caches.match('index.html'))
        );
        return;
    }

    // Estratégia Stale-While-Revalidate:
    // Entrega o que está no cache instantaneamente (modo offline), 
    // mas tenta buscar uma versão nova na rede em segundo plano para a próxima vez.
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // Atualiza o cache em segundo plano se houver conexão
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, networkResponse.clone());
                        });
                    }
                    return networkResponse;
                }).catch(() => { /* Silenciar erro de rede em modo avião */ });

                return cachedResponse;
            }

            // Se não estiver no cache, busca na internet normalmente
            return fetch(event.request);
        })
    );
});
