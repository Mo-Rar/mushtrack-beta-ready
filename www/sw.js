// MushTrack Service Worker
// Stratégie : network-only pour app.js / styles.css / index.html (toujours frais)
//             cache-first pour images et icônes (statiques, changent rarement)

const CACHE_NAME = "mushtrack-static-v5";

// ── Push notifications ───────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}

  const title = data.title || "MushTrack";
  const options = {
    body: data.body || "Rappel d'entraînement",
    icon: data.icon || "/assets/icon-192.png",
    badge: data.badge || "/assets/icon-192.png",
    tag: data.tag || "mushtrack",
    renotify: data.renotify || false,
    data: data.data || { url: "/" }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((c) => c.url.includes(self.location.origin) && "focus" in c);
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
// ────────────────────────────────────────────────────────────────────────────

const STATIC_ASSETS = [
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./assets/mode-hiver.jpg",
  "./assets/mode-ete.jpg"
];

// À l'installation : on pré-cache uniquement les images
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

// À l'activation : supprime tous les anciens caches (v15, v16, v17, v18, v19...)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // HTML, JS, CSS → toujours depuis le réseau (jamais de cache)
  // Si hors ligne : affiche un message simple plutôt qu'une vieille version
  if (
    url.origin === self.location.origin && (
      request.mode === "navigate" ||
      url.pathname.endsWith(".html") ||
      url.pathname.endsWith(".css") ||
      url.pathname.endsWith(".js")
    )
  ) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          `<!DOCTYPE html><html><head><meta charset="utf-8"><title>MushTrack</title>
          <style>body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fff8f5;color:#333}
          h1{color:#fc4c02}p{max-width:300px;text-align:center;color:#666}</style></head>
          <body><h1>🐕 MushTrack</h1><p>Connexion requise pour charger l'application.<br>Vérifie ta connexion et réessaie.</p>
          <button onclick="location.reload()" style="margin-top:20px;padding:12px 24px;background:#fc4c02;color:#fff;border:none;border-radius:10px;font-size:1rem;cursor:pointer">Réessayer</button>
          </body></html>`,
          { headers: { "Content-Type": "text/html" } }
        )
      )
    );
    return;
  }

  // Images et icônes → cache-first (statiques)
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
