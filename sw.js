/**
⚙️ SERVICE WORKER (v4.0 - OPTIMIZED & PWA READY)
- Cache actualizado a v4.0
- Rutas alineadas con la estructura de carpetas
- Salto de versión inmediato y toma de control de pestañas
- Excepción para tráfico de Firebase (API no se cachea)
*/
const CACHE_NAME = 'wps-selector-v4.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/wps-calculator.js',
  './js/pro-system.js',
  './js/ads-manager.js',
  './js/firebase-config.js',
  './admin.html',
  './js/admin.js',
  './manifest.json'
  // Si agregas iconos PWA, descomenta y ajusta las rutas:
  // './icons/icon-192.png',
  // './icons/icon-512.png'
];

// 1️⃣ INSTALACIÓN: Precargar assets estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('📦 Cacheando archivos v4.0...');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.error('⚠️ Error al cachear:', err));
    })
  );
  self.skipWaiting(); // Activa el nuevo SW inmediatamente sin esperar cierre de pestañas
});

// 2️⃣ ACTIVACIÓN: Limpiar cachés obsoletos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim(); // Toma control inmediato de todas las pestañas abiertas
});

// 3️⃣ FETCH: Estrategia híbrida (Cache First para UI, Network First para API)
self.addEventListener('fetch', event => {
  // No interceptar peticiones POST ni llamadas a Firebase Firestore/Storage
  if (event.request.method !== 'GET' || event.request.url.includes('firestore.googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).catch(() => {
        // Fallback: si falla la red y no hay caché, sirve la home
        return caches.match('./index.html');
      });
    })
  );
});