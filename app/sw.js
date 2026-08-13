// Cache-first per il guscio dell'app, network-first per i dati.
// Il supermercato non ha campo: tutto ciò che serve a decidere deve stare in cache.
const CACHE = "semaforo-spesa-v1";
const GUSCIO = [
  "./", "./index.html", "./manifest.webmanifest", "./icona-192.png", "./icona-512.png",
  "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js",
];
const DATI = ["soglie.json", "scansioni.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE)
    // addAll fallisce tutto se una sola risorsa non risponde: qui il CDN è opzionale
    .then(c => Promise.allSettled(GUSCIO.map(u => c.add(u))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const eDato = DATI.some(d => url.pathname.endsWith(d));

  if (eDato) {
    // rete per prima: le soglie cambiano, ma offline vale l'ultima copia
    e.respondWith(
      fetch(e.request).then(r => {
        const copia = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copia));
        return r;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
    if (res.ok && url.origin === location.origin) {
      const copia = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copia));
    }
    return res;
  })));
});
