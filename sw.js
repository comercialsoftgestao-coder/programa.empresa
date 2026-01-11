/**
 * Service Worker para SOFTGESTÃO
 * Este arquivo permite o funcionamento offline (Modo Avião)
 * Cacheando as bibliotecas React, Tailwind, Firebase e o próprio HTML.
 */

const CACHE_NAME = 'softgestao-offline-cache-v3';

// Recursos que serão armazenados localmente no dispositivo (Cache-First)
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

// Instalação do Service Worker e armazenamento inicial do cache
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('SW: Armazenando bibliotecas externas no cache offline...');
            return cache.addAll(urlsToCache);
        })
    );
    self.skipWaiting();
});

// Ativação do Service Worker e limpeza de caches antigos
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('SW: Removendo cache obsoleto:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// Interceptação de requisições: Estratégia de Cache-First
// Tenta buscar no cache do celular primeiro para garantir o funcionamento offline.
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Se encontrar no cache (Modo Avião), retorna imediatamente
            if (cachedResponse) {
                return cachedResponse;
            }
            // Se não encontrar, busca na internet
            return fetch(event.request);
        }).catch(() => {
            // Fallback: Se estiver offline e o recurso não estiver no cache
            if (event.request.mode === 'navigate') {
                return caches.match('index.html');
            }
        })
    );
});