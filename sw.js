const CACHE_NAME = "pedidos-vaal-v8";
const ARCHIVOS = [
  "index.html",
  "app.js",
  "manifest.json"
];

self.addEventListener("install", (evento) => {
  self.skipWaiting();
  evento.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS))
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    Promise.all([
      caches.keys().then((nombres) =>
        Promise.all(nombres.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
      ),
      self.clients.claim()
    ])
  );
});

self.addEventListener("fetch", (evento) => {
  evento.respondWith(
    fetch(evento.request)
      .then((respuestaRed) => {
        const copia = respuestaRed.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(evento.request, copia));
        return respuestaRed;
      })
      .catch(() => caches.match(evento.request))
  );
});
