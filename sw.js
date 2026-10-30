// sw.js - Service Worker Seguro para PWA (Sem erros de ERR_FAILED)
const CACHE_NAME = 'sem-perder-a-data-v4';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/css/style.css?v=4',
  './assets/js/app.js?v=4',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Usa Promise.allSettled para garantir que a instalação NUNCA falhe
      return Promise.allSettled(
        CORE_ASSETS.map((url) => cache.add(url).catch((err) => console.log('Aviso cache:', url, err)))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Não intercepta chamadas não-GET nem chamadas de API
  if (req.method !== 'GET' || req.url.includes('/api') || req.url.includes('api.php')) {
    return;
  }

  // Estratégia Network-First com fallback para Cache (nunca gera ERR_FAILED)
  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return networkRes;
      })
      .catch(() => {
        return caches.match(req).then((cachedRes) => {
          if (cachedRes) return cachedRes;
          // Se for uma requisição de página HTML, entrega a página principal em cache
          if (req.headers.get('accept')?.includes('text/html')) {
            return caches.match('./') || caches.match('./index.html');
          }
        });
      })
  );
});
