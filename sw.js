const CACHE_NAME = 'reforma-master-v11-icons-fixed';
const DYNAMIC_CACHE = 'reforma-dynamic-v11';

// URLs críticas para cache imediato
const CRITICAL_URLS = [
  '/',
  '/index.html',

  // React e bibliotecas principais
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',

  // Tailwind CSS
  'https://cdn.tailwindcss.com',

  // Chart.js
  'https://cdn.jsdelivr.net/npm/chart.js',

  // Phosphor Icons - CSS E FONTES
  'https://unpkg.com/@phosphor-icons/web@2.0.3/src/regular/style.css',
  'https://unpkg.com/@phosphor-icons/web@2.0.3/src/bold/style.css',
  'https://unpkg.com/@phosphor-icons/web@2.0.3/src/fill/style.css',
  'https://unpkg.com/@phosphor-icons/web@2.0.3/src/duotone/style.css'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker v11...');

  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW] Cacheando recursos críticos...');

      // Usar allSettled para não quebrar se algum falhar
      const results = await Promise.allSettled(
        CRITICAL_URLS.map(url => 
          cache.add(url).catch(err => {
            console.warn(`[SW] Falha ao cachear ${url}:`, err);
            return null;
          })
        )
      );

      const sucessos = results.filter(r => r.status === 'fulfilled').length;
      console.log(`[SW] ${sucessos}/${CRITICAL_URLS.length} recursos cacheados`);

      return cache;
    }).then(() => {
      console.log('[SW] Instalação completa! Ativando...');
      return self.skipWaiting(); // Ativa imediatamente
    })
  );
});

// Ativar e limpar caches antigos
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando Service Worker v11...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name !== DYNAMIC_CACHE)
          .map(name => {
            console.log('[SW] Deletando cache antigo:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Service Worker v11 ativado!');
      return self.clients.claim(); // Controla todas as páginas imediatamente
    })
  );
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Estratégia CACHE FIRST para fontes (WOFF, WOFF2, TTF)
  if (request.url.match(/\.(woff2?|ttf|otf|eot)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          console.log('[SW] ✓ Fonte do cache:', url.pathname);
          return cached;
        }

        console.log('[SW] ⬇ Baixando fonte:', url.pathname);
        return fetch(request).then((response) => {
          // Cachear a fonte para próxima vez
          if (response.ok) {
            return caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, response.clone());
              return response;
            });
          }
          return response;
        }).catch(err => {
          console.error('[SW] ✗ Erro ao buscar fonte:', err);
          return new Response('Fonte não disponível offline', { 
            status: 404,
            statusText: 'Not Found' 
          });
        });
      })
    );
    return;
  }

  // Estratégia CACHE FIRST para CSS de ícones
  if (request.url.includes('@phosphor-icons') || request.url.includes('style.css')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          console.log('[SW] ✓ CSS ícones do cache');
          return cached;
        }

        return fetch(request).then((response) => {
          if (response.ok) {
            return caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, response.clone());
              return response;
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Estratégia CACHE FIRST para CDNs (React, Tailwind, Chart.js)
  if (
    url.hostname.includes('unpkg.com') ||
    url.hostname.includes('cdn.tailwindcss.com') ||
    url.hostname.includes('cdn.jsdelivr.net')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          console.log('[SW] ✓ CDN do cache:', url.hostname);
          return cached;
        }

        return fetch(request).then((response) => {
          if (response.ok) {
            return caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, response.clone());
              return response;
            });
          }
          return response;
        }).catch(() => {
          console.warn('[SW] CDN offline:', url.hostname);
          return new Response('{}', { 
            headers: { 'Content-Type': 'application/javascript' }
          });
        });
      })
    );
    return;
  }

  // Firebase - NETWORK FIRST com fallback
  if (url.hostname.includes('firebaseio.com') || url.hostname.includes('googleapis.com')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            return caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, response.clone());
              return response;
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) {
              console.log('[SW] ⚠ Firebase offline - usando cache');
              return cached;
            }
            return new Response(JSON.stringify({ offline: true, error: 'Firebase offline' }), {
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // Estratégia CACHE FIRST para outros recursos locais
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        if (response.ok && request.method === 'GET') {
          return caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, response.clone());
            return response;
          });
        }
        return response;
      });
    }).catch((err) => {
      console.error('[SW] Erro no fetch:', err);

      // Fallback para página offline
      if (request.destination === 'document') {
        return caches.match('/index.html');
      }

      return new Response('Recurso não disponível offline', {
        status: 503,
        statusText: 'Service Unavailable'
      });
    })
  );
});

// Mensagens do app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((names) => {
        return Promise.all(names.map(name => caches.delete(name)));
      }).then(() => {
        return self.clients.matchAll();
      }).then((clients) => {
        clients.forEach(client => client.postMessage({ type: 'CACHE_CLEARED' }));
      })
    );
  }
});
