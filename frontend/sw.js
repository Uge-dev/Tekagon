const CACHE_NAME = 'tekagon-shell-v1';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/pages/dashboard.html',
  '/styles/style.css',
  '/styles/dashboard.css',
  '/js/runtime-config.js',
  '/js/api.js',
  '/js/auth.js',
  '/js/dashboard.js',
  '/Images/Asset 1.png',
  '/Images/Asset 2.png',
  '/Images/pwa-icons/icon-192.png',
  '/Images/pwa-icons/icon-512.png',
  '/Images/Tekagon-logo.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .catch(() => null)
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => null);
        return response;
      })
      .catch(() => caches.match(request).then(cached => cached || caches.match('/index.html')))
  );
});
