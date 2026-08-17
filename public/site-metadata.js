/**
 * Injects analytics + cookie consent from the admin-managed public config
 * (/api/config → analytics{ga4,plausible}, legal{termlyUuid,cookieBanner}).
 * No-ops when nothing is configured. Loaded on the landing + app pages, so the
 * owner turns these on/off from the admin dashboard without touching code.
 * (For these external scripts to load in production, their domains must be in the
 *  Content-Security-Policy — see firebase.json.)
 */
(function () {
  function loadScript(src, attrs) {
    var s = document.createElement("script");
    s.src = src; s.async = true;
    if (attrs) Object.keys(attrs).forEach(function (k) { s.setAttribute(k, attrs[k]); });
    document.head.appendChild(s);
    return s;
  }
  fetch("/api/config").then(function (r) { return r.ok ? r.json() : null; }).then(function (c) {
    if (!c) return;
    var an = c.analytics || {}, lg = c.legal || {};
    // Termly cookie-consent banner (auto-blocks trackers until consent) — load first.
    if (lg.cookieBanner && lg.termlyUuid) {
      loadScript("https://app.termly.io/embed.min.js", { "data-auto-block": "on", "data-website-uuid": lg.termlyUuid });
    }
    // Google Analytics 4.
    if (an.ga4) {
      loadScript("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(an.ga4));
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", an.ga4);
    }
    // Plausible (privacy-friendly, cookieless).
    if (an.plausible) {
      loadScript("https://plausible.io/js/script.js", { "data-domain": an.plausible });
    }
  }).catch(function () { /* config unavailable — load nothing */ });
})();
