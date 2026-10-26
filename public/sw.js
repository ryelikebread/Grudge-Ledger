// Offline cache. Bump VERSION whenever any file in public/ changes.
const VERSION = "grudge-ledger-v4";
const FILES = ["./", "index.html", "merge.js", "manifest.webmanifest", "fonts/fonts.css", "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png",
  "fonts/BlackOpsOne-normal-400.woff2", "fonts/BodoniModa-italic-500.woff2", "fonts/BodoniModa-normal-500.woff2", "fonts/BodoniModa-normal-700.woff2",
  "fonts/Caveat-normal-500.woff2", "fonts/Caveat-normal-700.woff2", "fonts/CormorantGaramond-normal-500.woff2", "fonts/CormorantGaramond-normal-600.woff2",
  "fonts/CormorantGaramond-normal-700.woff2", "fonts/CourierPrime-normal-400.woff2", "fonts/CourierPrime-normal-700.woff2",
  "fonts/ShareTechMono-normal-400.woff2", "fonts/SpecialElite-normal-400.woff2"];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.includes("/api/")) return; // sync calls always go to the network
  const heavy = /\/(fonts|icons)\//.test(url.pathname);
  if (heavy) { e.respondWith(caches.match(req).then(hit => hit || fetch(req))); return; }
  // Pages and scripts: network first so updates show up, cache when offline.
  e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res; }).catch(() => caches.match(req, { ignoreSearch: true })));
});
