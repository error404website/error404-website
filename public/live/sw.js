// /live/ offline worker: once the show is preloaded, the page and every song work with no network.
// Songs, instrumentals and set patches are put in the "e404-live-v1" cache by the page's PRELOAD; this worker
// serves them from there, and keeps a copy of the page shell (HTML + hashed JS/CSS) as it loads.
const AUDIO = "e404-live-v1";
const SHELL = "e404-live-shell-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  // songs, instrumentals, set patches: cache first (they're versioned by ?v= / file name)
  if (/^\/(audio|live\/inst|live\/patch)\//.test(url.pathname)) {
    e.respondWith(caches.open(AUDIO).then((c) => c.match(e.request).then((hit) => hit || fetch(e.request))));
    return;
  }
  // the page, its data and the hashed bundles: network first, fall back to the last copy offline
  if (url.pathname.startsWith("/live/") || url.pathname.startsWith("/_app/") || url.pathname.startsWith("/fonts/")) {
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          if (r.ok) {
            const copy = r.clone();
            caches.open(SHELL).then((c) => c.put(e.request, copy));
          }
          return r;
        })
        .catch(() => caches.open(SHELL).then((c) => c.match(e.request))),
    );
  }
});
