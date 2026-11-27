const cacheName = "bansay-shell-v1";
const appRoot = new URL("./", self.location.href);

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    const response = await fetch(appRoot, { cache: "reload" });
    if (!response.ok) throw new Error("BANSAY app shell is unavailable.");
    const html = await response.clone().text();
    const assets = [...html.matchAll(/(?:src|href)="([^"]*\/assets\/[^"]+)"/g)]
      .map((match) => new URL(match[1], appRoot));
    await cache.addAll(assets);
    await cache.put(appRoot, response);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== appRoot.origin || url.pathname.startsWith("/api/")) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match(appRoot)));
    return;
  }
  if (/^\/(assets|fonts)\//.test(url.pathname) || /\/logo-[\w-]+\.svg$/.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(cacheName);
      const saved = await cache.match(event.request);
      if (saved) return saved;
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    })());
  }
});
