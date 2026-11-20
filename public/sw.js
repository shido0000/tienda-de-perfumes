/**
 * Service worker de la PWA de Mist & Mood.
 *
 * Estrategia deliberadamente conservadora:
 *  - Navegaciones y API: SIEMPRE red primero. Una reserva o un cambio de stock
 *    nunca puede salir de una caché vieja.
 *  - Estáticos de /_next/static y fuentes: caché primero (son inmutables).
 *  - Sin conexión: se muestra la página /offline guardada.
 *  - Push: aviso de reserva nueva al administrador, abriendo el panel al tocarlo.
 *
 * Nada de precachear HTML dinámico: servir una portada vieja desde caché haría
 * que el cliente viera precios y stock desactualizados.
 */
const VERSION = "mistmood-v6";
const STATIC_CACHE = `${VERSION}-static`;
const OFFLINE_CACHE = `${VERSION}-offline`;
const OFFLINE_URL = "/offline";
const PRECACHE = ["/offline", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(OFFLINE_CACHE);
      await Promise.all(
        PRECACHE.map((url) => cache.add(new Request(url, { cache: "reload" })).catch(() => {})),
      );
      await self.skipWaiting();
    })(),
  );
});

// El aviso de "versión nueva" del cliente manda SKIP_WAITING para activar el
// service worker nuevo de inmediato (en lugar de esperar a que se cierren todas
// las pestañas).
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();

  // El administrador cambió el logo: borramos las cachés de estáticos para que
  // el ícono/logo nuevo se descargue en la próxima visita (sin reinstalar).
  if (event.data && event.data.type === "REFRESH_ICONS") {
    event.waitUntil(
      (async () => {
        const names = await caches.keys();
        await Promise.all(
          names
            .filter((n) => n.endsWith("-static") || n.endsWith("-offline"))
            .map((n) => caches.delete(n)),
        );
        const all = await self.clients.matchAll({ type: "window" });
        all.forEach((c) => c.postMessage({ type: "ICONS_REFRESHED" }));
      })(),
    );
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Nunca cachear API ni rutas privadas: datos siempre frescos.
  if (url.pathname.startsWith("/api/")) return;

  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:css|js|woff2?|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname);

  if (isStatic) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone()).catch(() => {});
        return res;
      })(),
    );
    return;
  }

  // Navegaciones: red primero, /offline si no hay conexión.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req);
        } catch {
          const cache = await caches.open(OFFLINE_CACHE);
          const offline = await cache.match(OFFLINE_URL);
          return (
            offline ??
            new Response("<h1>Sin conexión</h1>", {
              headers: { "Content-Type": "text/html; charset=utf-8" },
            })
          );
        }
      })(),
    );
  }
});

// ---- Notificaciones push ------------------------------------------------

self.addEventListener("push", (event) => {
  let payload = { title: "Mist & Mood", body: "Tenés novedades en la tienda.", url: "/admin" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    if (event.data) payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      // El dueño puede poner un logo propio: la notificación usa ESE ícono.
      icon: payload.icon || "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: payload.tag || "mistmood",
      renotify: true,
      data: { url: payload.url || "/admin", icon: payload.icon || null },
      vibrate: [90, 60, 90],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/admin";

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        if (client.url.includes(target) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
      return undefined;
    })(),
  );
});
