# Security

The security model for CryptoIdea and the map to every security document. Firestore rules are the
access boundary; secrets never leave the server; only the built `dist/` reaches the browser. Start
here, then open the file for the area you need.

## The model in one screen

- **Firestore rules are the boundary.** `firestore.rules` is deny-by-default. Server-authoritative
  fields — `tier`, billing markers, `deleted`/`deletedAt`, `planChosen` — are never client-writable;
  privileged updates use closed-shape `hasOnly()` allowlists, and per-user counters can never be
  forged. A bypassed client check cannot leak or escalate anything. Verify every rule change with
  `npm run test:rules`.
- **Secrets stay server-side.** API keys live in Cloud Functions config and the locked `config/app`
  Firestore doc (`allow read, write: if false`). `getAdminConfig` returns set-flags, not values. The
  in-bundle web config is public by design. No secret ships in `dist/`.
- **Admin is a custom claim, in two roles.** `{admin:true, role:"owner"}` and
  `{admin:true, role:"manager"}` — never an email list. Every admin callable re-checks the claim
  server-side; a separate URL is not the boundary, the claim check is. The admin app is a separate
  bundle with no code in the user app.
- **Denial-of-wallet is bounded.** The CoinGecko proxy funnels through one choke point with a shared,
  cached universe, per-IP and per-uid rate limits, and unknown coin ids dropped before any upstream
  call, so cost stays flat regardless of traffic. See [API-SECURITY.md](API-SECURITY.md).
- **Output is encoded.** React auto-escapes; the static landing uses `textContent`, never `innerHTML`,
  for API data. The Content-Security-Policy ships no inline scripts.
- **Per-user isolation is enforced, not assumed.** Callables act on the authenticated uid, never a
  body-supplied one (no IDOR). See [ISOLATION.md](ISOLATION.md).
- **Data-lifecycle controls.** Soft-delete into a 30-day recovery trash, self-service GDPR
  export/delete/restore, and a server-only append-only audit trail of every privileged action.
- **No live-AI surface ships.** `ai-client.js` `askClaude` throws while `AI_PROXY_LIVE` is false, so
  no AI output renders and there is no prompt-injection or AI-output surface today. The server
  `researchAsk` proxy exists but nothing calls it in a live path yet; when it goes live it holds the
  provider key server-side and runs a fail-closed output validator (`functions/validate-output.js`) on
  every candidate before any text reaches the client. See [ARCHITECTURE.md](../decisions/ARCHITECTURE.md)
  ARCH-12.

## When to open what

- [API-SECURITY.md](API-SECURITY.md) — the whole HTTP surface (public `/api/*`, user + admin
  callables, the PayPal webhook), how each client connects, the server-only key model, and the key
  rotation / incident runbook. Open for anything touching an endpoint or a secret.
- [ISOLATION.md](ISOLATION.md) — the per-user data-isolation model and the cross-tenant probe
  results. Open before changing how one user's data is walled off from another's.
- [ARCHITECTURE.md](../decisions/ARCHITECTURE.md) — where security sits in the layered system.
- `firestore.rules` — the rules themselves, and `tests/rules/` — the proof they hold.

## How it's verified

- `npm run test:rules` — the security-rules test suite (deny-by-default, closed shapes, counter
  forgery, admin branches).
- `npm run test:integration` — live callables over HTTP, including auth and per-uid isolation.
- The pre-launch hardening steps (App Check enforcement, backups, MFA) live in
  [GO-LIVE-AUDIT.md](../product/GO-LIVE-AUDIT.md).

## See also

- [docs/INDEX.md](../INDEX.md) — the documentation map.
- [CONTRIBUTING.md](../../CONTRIBUTING.md) — the invariants a change must keep.
