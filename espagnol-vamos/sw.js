/* ¡Vamos! — service worker : le jeu reste jouable hors connexion.
   Changer VERSION à chaque mise à jour du jeu pour que le téléphone récupère les nouveaux fichiers. */
const VERSION = 'vamos-v2';
const FILES = ['./', './index.html', './content.js', './art.js', './engine.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// réseau d'abord (pour avoir la dernière version), cache si hors connexion
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const sameOrigin = new URL(req.url).origin === self.location.origin;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && (sameOrigin || req.url.startsWith('https://fonts.'))) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});
