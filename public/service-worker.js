/**
 * CryptoIdea - Service Worker
 * =============================
 * Enables offline support for the PWA.
 * Caches the same-origin app shell, Google Fonts, and CoinGecko prices/images.
 * Deliberately does NOT cache: non-GET requests, /api/** (the function and CDN
 * set correct per-endpoint TTLs, so the browser's HTTP cache handles it), and any
 * other cross-origin traffic — Firestore/Auth responses must never persist in
 * Cache Storage, where they would survive sign-out.
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

  // Google Fonts: cache first (immutable, public, unauthenticated). This branch
  // must sit ABOVE the same-origin guard below — the app's editorial type
  // (Fraunces + Hanken) is loaded cross-origin from both HTML entries, and
  // without it an offline reload silently falls back to the system font stack.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // ─── What this catch-all may touch ───
  // It used to cache EVERY remaining request, which meant authenticated Firestore
  // and Auth responses landed in on-disk Cache Storage and survived sign-out.
  // The origin guard is the load-bearing one: Firestore's WebChannel talks over
  // long-lived GET streams, so a method-only filter would still cache (and clone,
  // holding the stream open) that traffic.
  // /api/** is skipped too — the function and the CDN already set a correct
  // per-endpoint max-age, so the browser's own HTTP cache handles it properly
  // instead of the SW pinning a response with no expiry.
  const isCacheable =
    event.request.method === "GET" &&
    url.origin === self.location.origin &&
    !url.pathname.startsWith("/api/");
  if (!isCacheable) return;   // no respondWith → normal browser handling

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
