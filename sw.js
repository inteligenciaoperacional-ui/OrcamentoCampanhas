const CACHE_NAME = 'campanhas-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './firebase.js',
  './manifest.json'
];

// Instala e cacheia os arquivos principais
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Limpa caches antigos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Serve do cache, tenta rede, fallback para cache
self.addEventListener('fetch', e => {
  // Não cacheia requisições do Firebase ou Google Sheets
  if (e.request.url.includes('firestore') ||
      e.request.url.includes('googleapis') ||
      e.request.url.includes('googleusercontent') ||
      e.request.url.includes('cloudinary') ||
      e.request.url.includes('gstatic')) {
    e.respondWith(fetch(e.request));
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(response => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(e.request, response.clone());
          return response;
        });
      });
    }).catch(() => caches.match('./index.html'))
  );
});
