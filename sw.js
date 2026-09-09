const CACHE_NAME = "pedidos-vaal-v7";
const ARCHIVOS = [
  "index.html",
  "app.js",
  "manifest.json"
];

// Al instalar una versión nueva, la activamos enseguida (sin esperar a cerrar todo)
self.addEventListener("install", (evento) => {
  self.skipWaiting();
  evento.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS))
  );
});

// Al activarse, toma control de las ventanas abiertas y borra cachés viejas
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

// Al pedir un archivo: primero intenta traerlo de internet;
// si no hay conexión, usa la copia guardada
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
