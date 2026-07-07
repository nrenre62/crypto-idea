# ISOLATION.md — user-data & admin separation: the guarantee, the audit, the hardening plan (§ISO)

**Date:** 2026-07-07 · **Status of the guarantee: VERIFIED SOUND (live).** Hardening items below are
📋 PLAN ONLY (build on "go"). · Founder decisions **ISO-D1…D4** locked (§3).
**How audited:** the `secure-by-design` skill checklist + a 22-agent adversarial workflow (6 map
dimensions → live cross-tenant/admin-access probes on the running emulator → completeness critic).
**36 candidate findings → 10 confirmed (all defense-in-depth; NONE a live cross-tenant breach) + 5
critic adds; 14 refuted.** Full machine-readable inventory:
[`docs/planning/isolation-audit-findings.json`](docs/planning/isolation-audit-findings.json).

---

## 1 · The isolation guarantee (what's true today, live-verified)

**Every user's data is isolated from every other user, and admin data is isolated from all users —
enforced server-side, not by the client.** 23 live cross-tenant probes against the running emulator
(two throwaway accounts) ALL denied correctly:

- **Per-user separation (logical, correct SaaS model).** One Firestore database; each account's data
  is a per-uid document subtree — `users/{uid}/portfolios/{pid}/coins/{coinId}/transactions/{txId}`
  and `users/{uid}/learn/progress`. Every read AND write requires `isOwner(userId)` =
  `request.auth.uid == userId` (or an admin claim). A signed-in user **cannot** read another user's
  doc, **cannot** list `/users` (no account enumeration), **cannot** traverse into another uid's
  subtree, and **cannot** run a `collectionGroup` query to bypass the per-uid parent (no
  collectionGroup rule exists → client group queries denied; the one group query in the codebase is
  server-side Admin SDK).
- **Admin data separated from all user accounts.** API keys/config (`config/**`) and the admin action
  log (`audit/**`) are **top-level collections `allow read, write: if false`** — NOT under any
  `users/{uid}`, and unreadable by ANY client including an admin's browser (they're written/read only
  by Cloud Functions via the Admin SDK). Admin power is a **Firebase custom claim `{admin:true}`**
  (set with the Admin SDK), never a field on a user document — so it can't be forged client-side.
- **Backend access is guard-first.** All 21 `onCall` callables + the `/api` proxy were probed: every
  one checks `context.auth.uid` (self) or `isAdminToken` (admin) **before** touching data. No IDOR —
  no callable acts on a uid/id from the request body without an ownership/admin check. A non-admin
  calling an admin callable is rejected; `exportMyData`/`deleteMyAccount` act only on the caller's uid.
- **Frontend exposure: none.** The user bundle loads **only the signed-in uid's own subtree** (every
  read/listener is keyed by the Auth-token uid, never a client-supplied id). The built `dist/` was
  checked: **admin code is in a separate `admin-*.js` chunk, absent from the user bundle.** The only
  Firebase config in the bundle is the public web config (non-secret by design); no real secret, no
  other user's data, no PII in URLs/logs/analytics.

**Bottom line for the founder's questions:** each account IS separated (per-uid subtree + rules); one
user CANNOT see or access another's data; users CANNOT see admin data; nobody sees another user's data
on the frontend; the backend is reached either through the rules-guarded client SDK (own data only) or
through guard-first Cloud Functions. The guarantee holds — the work below **hardens the edges and adds
tests that prove it can't silently regress.**

## 2 · Logical vs physical separation (the founder's "separate storage" ask)

You asked for each user "separated on storage." Today that's **logical** isolation: one database, per-uid
subtrees, rules as the wall. **Decision ISO-D1: keep logical, harden + prove it** — because:

- **This IS the correct, universal design.** Virtually every SaaS (and bank) multiplexes tenants in one
  datastore with per-tenant authorization. The audit confirmed it's airtight here.
- **Physical per-user separation (a database/project per account) is an anti-pattern for this app:** it
  breaks the shared-cache flat-cost model (§ Known notes — one `cache/universe` serves everyone),
  multiplies auth/billing/admin complexity, can't scale past a handful of accounts, and buys **no extra
  security** over correctly-enforced rules. It's only warranted by a specific compliance mandate, which
  this product doesn't have.
- What "separation" should mean here, and what §ISO delivers: **provable** logical isolation (automated
  cross-tenant tests), **closed** per-user document shape (no privileged-by-default fields), and
  **complete** erasure reach — not a physical re-architecture.

## 3 · Founder decisions (2026-07-07)

| # | Decision |
|---|----------|
| ISO-D1 | Keep the logical per-uid model; **harden every rule/callable + add automated cross-tenant/admin-access tests that PROVE isolation**; document the guarantee (this file). No physical re-architecture. |
| ISO-D2 | Admin/config/audit already live in separate top-level collections + a custom claim; **confirm + lock it with tests** (a normal user AND an admin's browser can never read config/audit; no user doc can grant itself admin). No separate admin project. |
| ISO-D3 | Erasure: **remove all of the user's own data everywhere**; the admin **audit log is RETAINED** (email+uid) under the existing fixed **12-month** retention purge (accountability), not scrubbed on demand. |
| ISO-D4 | Scope: **audit + harden + prove** — write this doc, fix every real gap, add the regression tests. Build on "go" with the other queued rounds. |

## 4 · Confirmed gaps to harden (all defense-in-depth — no live breach)

Severity mirrors the audit. None is a current cross-tenant leak; each closes a latent path or proves a
guarantee. Full detail per item in the findings JSON.

| # | Sev | Gap | Wave |
|---|-----|-----|------|
| G1 | 🟡 med | **Closed-shape the `users/{uid}` doc.** create/update use a field *blocklist*, not a `hasOnly` *allowlist* — an owner can persist arbitrary top-level keys incl. `admin:true`/`isAdmin:true`/`role` on their OWN doc. Harmless today (nothing trusts a profile field for authz — every decision reads the signed claim), BUT it makes "a new field is privileged-by-default" FALSE. The moment any future code trusts a profile field, this becomes self-serve privilege escalation. (Pre-empts the exact `secure-by-design` "when the server starts trusting a field" trap.) | ISO-1 |
| G2 | ⚪ low | **Explicit deny for `rateLimits/**`, `webhookEvents/**`, `cache/**`.** They're safe only via Firestore's implicit default-deny (probes confirmed denied), unlike `config`/`audit` which are explicit `if false`. Add explicit deny blocks so a future broad `match /{document=**}` catch-all can't silently open them; `cache/**` holds only shared public market data (no per-user data). | ISO-1 |
| G3 | ⚪ low | **Null-safe `isAdmin()`.** `request.auth.token.admin == true` raises a rules eval error for tokens without the claim (fails safe → deny, but brittle). Use `request.auth.token.get('admin', false) == true`. | ISO-1 |
| G4 | ⚪ low | **Shared-device erasure hygiene.** self-delete + sign-out-everywhere call bare `logoutUser()` and skip the `ci-profile-<uid>` / `ci-active-port` localStorage cleanup that the normal Log-out does → the erased/departed user's cached name/email/tier survives on the device. (Folds into DI-2 sign-out hygiene.) | ISO-3 |
| — | ℹ️ | **Verified sound (locked with tests, no code change):** complete rule isolation · guard-first callables/no IDOR · admin-claim-only identity · config/audit walled off · no admin code in the user bundle · single-DB logical tenancy is the correct design. | ISO-2 |

### Critic additions (infra / go-live)
| # | Sev | Gap | Wave |
|---|-----|-----|------|
| G5 | 🟡 med | **Backup / PITR / scheduled-export is one un-partitioned surface right-to-erasure never reaches.** Decide a policy: rely on PITR's bounded window (7-day auto-expiry) as the documented retention, and/or scrub on the next scheduled export. Document it in the privacy policy. | ISO-4 (go-live) |
| G6 | 🟡 med | **Functions runtime service account has project-wide access** — per-tenant + admin/user isolation rests entirely on app-code guards with no infra least-privilege. Scope the runtime SA to least privilege at deploy. | ISO-4 (go-live) |
| G7 | 🟡 med | **No token revocation on privilege change** — admin-claim revoke + user suspend don't force-expire existing tokens, and no callable uses `checkRevoked`; stale privileged authority ~1h. (Overlaps **R31-6** suspend→revokeRefreshTokens; extend to admin-revoke + `checkRevoked` on the sensitive callables.) | ISO-4 (+ R31-6) |
| G8 | ⚪ low | **App Check not enforced end-to-end** — no attestation that requests to the rules boundary/callables come from the real app. (Already a go-live item; see §4 checklist + DI-6/G38.) | §4 go-live |
| G9 | ℹ️ | **No `storage.rules` committed** — Storage is unused, but commit a deny-by-default `storage.rules` scoping any object to `users/{uid}/…` so the tenancy boundary exists before the first upload feature. | ISO-5 |

## 5 · Fix waves (build order — all local-first except the go-live-tagged infra)

### ISO-1 · Harden the rules (G1–G3) — the one that matters most
- **Closed-shape `users/{uid}`:** add `request.resource.data.keys().hasOnly([...])` to create and
  `diff().affectedKeys().hasOnly([...])`-style allowlisting to update (allowed owner-writable set:
  `name, settings, consent, portfolioCount` + the existing server-only blocklist kept for the
  privileged subset). Unknown keys (`admin`/`isAdmin`/`role`/junk) → rejected. Add `joined` to the
  create blocklist. Keeps G1 pre-empted: new fields are privileged-by-default.
- Explicit `allow read, write: if false` blocks for `rateLimits/{document=**}`, `webhookEvents/**`,
  `cache/**` (defense-in-depth; cache stays proxy-only).
- Null-safe `isAdmin()`.
- **Rules tests** for each: owner-writes-`admin:true` DENIED, owner-writes-unknown-key DENIED,
  client read of rateLimits/webhookEvents/cache DENIED, admin still works.

### ISO-2 · Prove isolation (the "prove it" the founder asked for)
A dedicated regression suite (extends `tests/firestore-rules.test.js`) that FAILS if isolation ever
breaks: user A cannot get/list/write any of user B's user-doc/portfolio/coin/tx/learn; no client can
read `config`/`audit`/`cache`/`rateLimits`/`webhookEvents`; no user doc can grant itself admin
(closed shape); a non-admin call to every admin callable is rejected (extends the callable tests);
`exportMyData` returns only the caller's data. This is the living proof of §1, not a one-time audit.

### ISO-3 · Shared-device erasure hygiene (G4)
`deleteMyAccount` + `signOutEverywhere` clear `ci-profile-<uid>` + `ci-active-port` before signing
out (reuse the Log-out cleanup). **Fold into DI-2** sign-out hygiene — same code path.

### ISO-4 · Infra least-privilege + revocation + backup policy (G5–G7, go-live)
- Least-privilege runtime service account at deploy (documented in the go-live checklist).
- Token revocation on privilege change: suspend + admin-revoke call `revokeRefreshTokens`; sensitive
  callables verify `checkRevoked` (extends R31-6; ~1h stale-authority window → immediate).
- Backup/PITR erasure-reach policy: document PITR's 7-day bounded window as the retention story +
  privacy-policy disclosure (ISO-D3: user data erased live; backups age out on their own schedule).

### ISO-5 · Deny-by-default `storage.rules` (G9)
Commit `storage.rules` scoping any future object to `users/{uid}/…` with `request.auth.uid == uid`,
wired into `firebase.json`, even though Storage is unused today.

## 6 · Testing & DoD
Every ISO-1 rule change ships with a rules test (deny + allow) · ISO-2 is itself the test deliverable ·
`npm run test:rules` green · no behavior change to legitimate flows (verify seeded users still
read/write their own data). AGILE.md DoD per wave; docs (this file + privacy policy for ISO-4)
updated.

## 7 · Interplay
- **Overlaps folded, not duplicated:** ISO-3 ⊂ DI-2 (sign-out hygiene); ISO-4 token-revocation extends
  **R31-6** (suspend→revoke); App Check (G8) is the existing §4/DI-6 go-live item.
- The **closed-shape rule (G1)** is the structural fix behind the `secure-by-design` "re-audit who can
  write a field the server starts trusting" lesson — shipping it now means future features can't
  accidentally trust an owner-writable profile field.
