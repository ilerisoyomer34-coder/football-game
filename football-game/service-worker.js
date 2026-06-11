const CACHE_NAME = 'ultimate-football-26-v2';

const ASSETS = [
  './',
  './index.html',
  './ultimate-football-26.html',
  './assets/icon-192.svg',
  './assets/icon-512.svg',
  './css/style.css',
  './js/main.js',
  './js/Game.js',
  './js/Ball.js',
  './js/Team.js',
  './js/Player.js',
  './js/PlayerModel.js',
  './js/AIController.js',
  './js/InputController.js',
  './js/Field.js',
  './js/Goal.js',
  './js/GameCamera.js',
  './js/AudioManager.js',
  './js/ParticleSystem.js',
  './js/UI.js',
  './js/config.js',
  './manifest.json',
];

// Install: pre-cache all game files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for local assets, network-first for CDN (Three.js)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network-first for CDN resources
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for local assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200) return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
