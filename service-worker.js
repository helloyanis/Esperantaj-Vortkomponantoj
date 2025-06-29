// Service Worker por PWA: kaŝmemoru la necesajn dosierojn por ke la app funkciu senrete.

const NOMA_STOKEJO = 'vortkomponantoj-stokejo-v1';
const DOSIEROJ_KAJHEĴ = [
  '/', 
  '/index.html',
  '/app.js',
  '/sistem-vortaro.json',
  '/web-worker-idb.js',
  '/web-worker-serĉi.js',
  '/manifest.json',
  '/assets/mdui/mdui.css',
  '/assets/mdui/mdui.js',
  '/assets/piktogramoj/icon.svg',
  '/.well-known/assetlinks.json',
];

// Instalaperiodo: kaŝmemoru la ĉefajn dosierojn
self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(NOMA_STOKEJO).then((stokejo) => {
      return stokejo.addAll(DOSIEROJ_KAJHEĴ);
    })
  );
  self.skipWaiting();
});

// Fono-strategio: unue respondas el kaŝmemoro, se ne, rekte de la reto
self.addEventListener('fetch', (evento) => {
  evento.respondWith(
    caches.match(evento.request, { ignoreSearch: true }).then((respondo) => {
      return (
        respondo ||
        fetch(evento.request).then((reteRespondo) => {
          // Kopiu en kaŝon ankaŭ
          return caches.open(NOMA_STOKEJO).then((stokejo) => {
            stokejo.put(evento.request, reteRespondo.clone());
            return reteRespondo;
          });
        })
      );
    })
  );
});

// Purigi malnovajn kaŝmemorojn ĉe "activate"
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((ŝlosiloj) =>
      Promise.all(
        ŝlosiloj.map((ŝlosilo) => {
          if (ŝlosilo !== NOMA_STOKEJO) {
            return caches.delete(ŝlosilo);
          }
        })
      )
    )
  );
});
