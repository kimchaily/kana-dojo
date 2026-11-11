// Kana Dōjō – Service Worker. Die Version wird beim Build eingesetzt.
// Seite: zuerst Netz (immer die neuste Version), offline aus dem Cache.
// Schriften und Icons: aus dem Cache, im Hintergrund aufgefrischt.
const VERSION = '__VERSION__';
const CACHE = 'kanadojo-' + VERSION;
const SHELL = ['./', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('kanadojo-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // PR-Vorschauen unter preview/ laufen ohne Service Worker: immer direkt aus dem Netz,
  // und sie dürfen die zwischengespeicherte Produktion nicht überschreiben.
  if (url.origin === self.location.origin && url.pathname.indexOf('/preview/') >= 0) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./', copy));
          return res;
        })
        .catch(() => caches.match('./'))
    );
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !fonts) return;

  e.respondWith(
    caches.open(CACHE).then((c) =>
      c.match(req).then((hit) => {
        const net = fetch(req)
          .then((res) => {
            if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || net;
      })
    )
  );
});
