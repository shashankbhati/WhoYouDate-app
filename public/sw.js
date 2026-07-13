// Minimal service worker — its only jobs are (1) make the app installable (PWA)
// and (2) speed up repeat loads of immutable static assets.
//
// It deliberately NEVER caches HTML / navigations. This is an SSR app: a cached
// page embeds references to specific hashed JS chunks, and after a new deploy
// those chunks are renamed. Serving a stale page would point at deleted chunks
// and white-screen the site. So navigations always go straight to the network.
const CACHE = "wad-v2";
const STATIC = /\.(?:js|mjs|css|woff2?|ttf|png|svg|jpg|jpeg|webp|gif|ico)$/;

self.addEventListener("install", () => self.skipWaiting());

// On activate, delete any older caches (self-heals devices that cached a bad
// build from an earlier deploy) and take control of open pages immediately.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  // Never intercept page navigations — let the browser hit the network so it
  // always gets fresh HTML pointing at the current build's chunks.
  if (req.mode === "navigate") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // ignore cross-origin (Supabase, APIs)
  if (!STATIC.test(url.pathname)) return; // only cache hashed static assets

  // Stale-while-revalidate for static assets: fast repeat loads, fresh on network.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req)),
  );
});

// ── Web Push: a ping when your date replies / accepts / reacts (app closed) ──
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "WhoAmIDating";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icon.png",
      badge: "/icon.png",
      tag: data.tag,
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if (c.url.includes(url) && "focus" in c) return c.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
