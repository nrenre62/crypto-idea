// D12: the shared Termly legal-doc embed, externalized from privacy.html/terms.html
// (CSP: no inline scripts). Which doc + host element come from the tag's data attrs.
(function () {
  var el = document.currentScript;
  if (!el) return;
  var key = el.getAttribute('data-doc');
  var hostId = el.getAttribute('data-host');
  fetch('/api/config').then(function (r) { return r.ok ? r.json() : null; }).then(function (c) {
    var id = c && c.legal && c.legal[key];
    if (!id) return;
    var host = document.getElementById(hostId);
    if (!host) return;
    host.textContent = '';
    var d = document.createElement('div');
    d.setAttribute('name', 'termly-embed'); d.setAttribute('data-id', id); d.setAttribute('data-type', 'iframe');
    host.appendChild(d);
    var s = document.createElement('script');
    s.src = 'https://app.termly.io/embed-policy.min.js'; s.id = 'termly-jssdk';
    document.body.appendChild(s);
  }).catch(function () {});
})();
