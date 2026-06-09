/**
 * Crypto Idea - Service Worker
 * =============================
 * Enables offline support for the PWA.
 * Caches app shell, fonts, and API responses.
 *
 * Place this file at the ROOT of your hosting directory (dist/sw.js)
 */

// __BUILD__ is replaced with a unique id at deploy (scripts/stamp-sw.js), so the
// service worker changes every build → browsers detect the update → tabs refresh.
const BUILD = "__BUILD__";
const CACHE_NAME = "crypto-idea-" + BUILD;
const STATIC_CACHE = "crypto-idea-static-" + BUILD;
const API_CACHE = "crypto-idea-api-v1";

// Files to cache immediately on install (app shell)
const APP_SHELL = [
  "/",
  "/index.html",
  "/app.html",
  "/manifest.json",
];

// ─── Install: Cache app shell ───
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log("[SW] Caching app shell");
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// ─── Activate: Clean old caches ───
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== API_CACHE)
          .map((key) => {
            console.log("[SW] Removing old cache:", key);
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();
});

// ─── Fetch: Serve from cache, fallback to network ───
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // CoinGecko API: Network first, cache fallback (5 min cache)
  if (url.hostname === "api.coingecko.com") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(API_CACHE).then((cache) => {
            cache.put(event.request, clone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // CoinGecko images: Cache first (they rarely change)
  if (url.hostname === "assets.coingecko.com") {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(event.request, clone);
          });
          return response;
        });
      })
    );
    return;
  }

  // App shell / page navigations: NETWORK FIRST, fall back to cache when offline.
  // (Cache-first served stale pages after every deploy — network-first means users
  // always get the latest HTML while still working offline.)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
