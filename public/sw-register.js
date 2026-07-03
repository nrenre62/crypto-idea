// D12: service-worker registration, externalized from app.html (CSP: no inline scripts).
// Production-only registration; local dev unregisters + clears caches (unchanged logic).
    (function () {
      if (!('serviceWorker' in navigator)) return;
      var isLocal = ['localhost', '127.0.0.1', ''].includes(location.hostname);
      if (isLocal) {
        navigator.serviceWorker.getRegistrations().then(function (rs) {
          rs.forEach(function (r) { r.unregister(); });
        });
        if (window.caches) caches.keys().then(function (ks) { ks.forEach(function (k) { caches.delete(k); }); });
      } else {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('/service-worker.js').then(function (reg) {
            // When a NEW version is deployed, auto-refresh this tab (skip first install).
            reg.addEventListener('updatefound', function () {
              var nw = reg.installing;
              if (!nw) return;
              nw.addEventListener('statechange', function () {
                if (nw.state === 'installed' && navigator.serviceWorker.controller) {
                  window.location.reload();
                }
              });
            });
          }).catch(function (err) { console.log('SW registration failed:', err); });
          // Check for a new version whenever the tab becomes visible again.
          document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'visible') {
              navigator.serviceWorker.getRegistration().then(function (reg) { if (reg) reg.update(); });
            }
          });
        });
      }
    })();
