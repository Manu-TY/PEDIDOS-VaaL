const CACHE_NAME = "pedidos-vaal-v2";
const ARCHIVOS = [
  "index.html",
  "app.js",
  "manifest.json"
];

// Cuando se instala, guarda los archivos en caché
self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS))
  );
});

// Cuando pide un archivo, primero mira si está en caché
self.addEventListener("fetch", (evento) => {
  evento.respondWith(
    caches.match(evento.request).then((respuesta) => respuesta || fetch(evento.request))
  );
});

// Borra cachés viejos cuando cambia CACHE_NAME
self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(
        nombres
          .filter((nombre) => nombre !== CACHE_NAME)
          .map((nombre) => caches.delete(nombre))
      )
    )
  );
});
