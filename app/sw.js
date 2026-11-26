/* Gait Check – offline cache so the demo works without venue Wi-Fi. Bump VERSION after changes. */
const VERSION = 'gc-v2';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/data.js', 'js/ui.js', 'js/charts.js', 'js/screens.js', 'js/app.js',
  'assets/rider.jpg', 'assets/blume.jpg', 'assets/trot.jpg', 'assets/icon.svg', 'assets/icon-192.png', 'assets/icon-512.png'
];
self.addEventListener('install', e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
// network first (always fresh when online), cache as fallback; fonts are cached as they load
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone();
      if (res.ok || res.type === 'opaque') caches.open(VERSION).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
