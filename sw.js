// Service worker: guarda la app en caché para que funcione sin conexión.
// Sube la versión cada vez que cambies archivos para que los dispositivos descarguen la nueva.
const VERSION = 'calistenia-v23';
const FILES = [
  './', './index.html', './manifest.webmanifest', './css/styles.css',
  './js/config.js', './js/quiz-data.js', './js/exercises.js', './js/planner.js', './js/foods.js', './js/foods-mas.js', './js/alimentos-chile.json', './js/anim.js', './js/nube.js', './js/merge.js', './js/store.js', './js/sync.js', './js/app.js', './js/anim3d.js',
  './js/vendor/three/three.module.min.js', './js/vendor/three/addons/loaders/GLTFLoader.js',
  './js/vendor/three/addons/utils/BufferGeometryUtils.js', './js/vendor/three/addons/utils/SkeletonUtils.js', './models/Hombre_Claro.glb', './models/Hombre_Moreno.glb',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png',
  './fonts/outfit-latin.woff2', './fonts/outfit-latin-ext.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Red primero (para recibir cambios), caché si no hay conexión.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
  );
});
