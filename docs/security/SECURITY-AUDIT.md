# Security Audit — Crypto Idea

| | |
|---|---|
| **Date** | 2026-06-27 |
| **Method** | `vibe-security` skill methodology, run as a multi-agent audit (8 dimension finders → adversarial per-finding verification against the real `firestore.rules` / Cloud Functions → completeness critic) |
| **Scope** | Shipped code only: `src/`, `functions/`, `firestore.rules`, `firebase.json`, `*.html`, `public/`, `vite.config.js`, `scripts/`. Excluded: `node_modules/`, `dist/`, `coverage/`, `tests/`, mockups, standalone landing-page iterations |
| **Stack** | Firebase (Auth + Firestore + Cloud Functions) + Vite + React PWA; PayPal subscriptions; CoinGecko price proxy |
| **Coverage** | 17 candidate issues raised → **6 confirmed** + **2 found by the completeness pass** that the dimensions missed → **11 refuted** by verification (a server-side control already prevents them) |

---

## Executive summary

**No Critical findings.** For an AI-assisted ("vibe-coded") build this is a strong result — the server-side enforcement held up under attack: closed-shape validation on `settings`/`consent`, immutable `tier`, admin-by-custom-claim, source maps off in prod, CORS scoped to the read-only proxy, and signature-verified PayPal webhooks all verified working.

**Confirmed: 6** (2 High · 1 Medium · 3 Low). **Missed by the dimension audits, surfaced by the completeness critic: 2** (1 Medium · 1 Low). **Refuted: 11.**

Two facts that frame everything below:

- **The in-app upgrade flow is currently a client-side *simulation*.** [`src/components/Login.jsx:65`](../../src/components/Login.jsx) runs a `setTimeout` then writes `tier` to `window.storage` (local), not Firestore; the real `createSubscription` callable is never invoked from the client. So there is **no "free Pro" via the UI today**. However, the **server-side PayPal webhook, `cancelSubscription`, and `createSubscription` callables in `functions/index.js` are real, deployable code** — that is where finding **H1** applies.
- **The live-AI surface is entirely inert.** `src/features/research/api/ai-client.js` `askClaude()` throws unconditionally, and `functions/validate-output.js` is never imported by any deployed function. There is **no prompt-injection or AI-output XSS surface shipped today.** This becomes live work when the AI proxy is built — see [Deferred / future work](#deferred--future-work).

### Findings at a glance

| ID | Severity | Title | Primary location |
|----|----------|-------|------------------|
| H1 | 🔴 High | Owner-update rule is a blocklist, not a closed shape → billing fields are client-writable | `firestore.rules:118` |
| H2 | 🔴 High | CoinGecko proxy denial-of-wallet via attacker-chosen coin ids | `functions/index.js` (`/api/prices`, `/api/history`) |
| M1 | 🟠 Medium | Per-IP rate limiter trivially bypassable (spoofable XFF + per-instance store) | `functions/index.js:765` |
| M2 | 🟠 Medium | Unthrottled authenticated callables (`exportMyData`, `createSubscription`) | `functions/index.js:563`, `:166` |
| L1 | 🟡 Low | App Check initialized client-side but never verified server-side on `/api` | `functions/index.js:870` |
| L2 | 🟡 Low | CSP allows `'unsafe-inline'` in `script-src` | `firebase.json:22` |
| L3 | 🟡 Low | CSV formula (DDE) injection in portfolio export | `src/utils/export-csv.js:11` |
| L4 | 🟡 Low | Soft-deleted account retains full data access (client-only enforcement) | `functions/index.js:514` |

---

## 🔴 High

### H1 — Owner-update rule is a *blocklist*, not a closed shape → server-authoritative billing fields are client-writable

- **Location:** [`firestore.rules:118-126`](../../firestore.rules) (and the create rule at `:104-109`); downstream: `functions/index.js` `cancelSubscription` (~201-213), `PAYMENT.SALE.COMPLETED` (~267-275), `BILLING.SUBSCRIPTION.ACTIVATED` (~257-263)
- **Class:** Broken field-level access control / privilege escalation (CWE-639 / deny-list instead of allow-list)
- **Confidence:** High (verified against the rule text and both downstream handlers)

**What's wrong.** The owner-update branch only *forbids* five keys:

```
!request.resource.data.diff(resource.data)
    .affectedKeys().hasAny(['tier', 'joined', 'deleted', 'deletedAt', 'premiumLimits'])
```

There is no `hasOnly()` closed-shape constraint, and the `validUserData` / `validSettings` / `validConsent` checks are conditional (`!('name' in …) || …`), so they don't restrict arbitrary extra keys. **Every field not on the forbidden list is owner-writable** — including the billing fields that only the PayPal webhook (Admin SDK) is supposed to set: `paypalSubscriptionId`, `upgradedAt`, `lastPayment`, `tierBeforeFailure`. (Confirmed: no client code writes these; the admin dashboard only *reads* `tierBeforeFailure`. The rule is the sole gate, and it doesn't hold.)

**Attacker impact** (once the PayPal backend is live):

1. **Free Pro by piggybacking a real payer.** `PAYMENT.SALE.COMPLETED` upgrades *every* user doc whose `paypalSubscriptionId` equals the paid subscription's `billing_agreement_id`. An attacker who learns an active subscriber's id writes it onto their own doc; on the victim's next recurring payment the attacker is silently upgraded to `pro` at the company's expense.
2. **Cancel another customer's subscription (griefing / DoS).** `cancelSubscription` reads `subscriptionId` straight from the caller's own doc and calls PayPal cancel with the app's credentials, **with no check that the id belongs to the caller**. Plant a victim's id, click Cancel, the server cancels the victim's paid subscription.

**Why High, not Critical.** Both attacks require knowing a victim's PayPal subscription / billing-agreement id, which is not publicly broadcast — so exploitation is targeted, not mass-scalable. The webhook signature check (`verifyPayPalWebhook`) does **not** mitigate this: it proves PayPal sent a genuine event, it cannot detect that the `paypalSubscriptionId → uid` mapping was poisoned by a client write.

**Fix (primary — convert to a closed allow-list):**

```diff
  allow update: if isAdmin() || (
                  isOwner(userId)
-                 && !request.resource.data.diff(resource.data)
-                       .affectedKeys().hasAny(['tier','joined','deleted','deletedAt','premiumLimits'])
+                 // Closed shape: owner may touch ONLY these self-service fields.
+                 // Everything server-authoritative (tier/joined/deleted*/premiumLimits +
+                 // billing: paypalSubscriptionId/upgradedAt/lastPayment/tierBeforeFailure)
+                 // is denied by absence — written only by the Admin SDK.
+                 && request.resource.data.diff(resource.data)
+                       .affectedKeys().hasOnly(['name','settings','consent','portfolioCount'])
                  && counterDeltaOk('portfolioCount')
                  && (!('name'     in request.resource.data) || validUserData(request.resource.data))
                  && (!('settings' in request.resource.data) || validSettings(request.resource.data.settings))
                  && (!('consent'  in request.resource.data) || validConsent(request.resource.data.consent))
                );
```

**Companion fixes (do all three):**

1. Apply the same `hasOnly()` closed shape to the **create** rule at `firestore.rules:104-109` — it has the identical blocklist gap, letting a user set billing fields at doc-creation time.
2. **Defense in depth** in `cancelSubscription`: after reading `subscriptionId` from the user doc, fetch the subscription from PayPal (`GET /v1/billing/subscriptions/{id}`) and confirm `subscription.custom_id === userId` before cancelling, so a poisoned id can never be acted on even if a rule regresses.
3. Add a **rules test** asserting an owner update that includes `paypalSubscriptionId` is denied.

---

### H2 — CoinGecko proxy: denial-of-wallet via attacker-chosen coin ids

- **Location:** `functions/index.js` `/api/prices` on-demand refetch (~888-923), `/api/history` (~981-1004)
- **Class:** Uncontrolled resource consumption / denial-of-wallet (CWE-770)
- **Confidence:** High

**What's wrong.** The cost model assumes upstream CoinGecko calls are shared and bounded by "distinct coins held across all users." That guarantee does **not** hold for ids the attacker invents:

- `/api/prices` treats any id not fresh in the universe as "stale" and issues a live `GET /simple/price?ids=<attacker ids>` (up to 500 ids/request). Garbage ids are only written back to the universe when CoinGecko actually returns them, so a fresh garbage id never produces a cache entry — **every request is a new paid upstream call.**
- `/api/history` is worse per call: any unseen id triggers `coins/{id}/market_chart` (CoinGecko's most expensive endpoint), and the cache is written **only on `r.ok`**, so a wrong/garbage id is never cached and every request is an uncached upstream hit.

**Attacker impact.** Combined with the rate-limiter bypass (M1), one bot drives the project past its paid CoinGecko quota — extra spend and/or a `429` outage for real users — at near-zero attacker cost. Even *without* spoofing, the nominal 60/min/IP allows ~86,400 `market_chart` calls/day from a single IP, exceeding a CoinGecko Lite (~100k/mo) budget in under two days.

**Why High.** Availability + cost impact, requires sustained automated abuse, no auth needed; not data compromise or RCE.

**Fix (load-bearing — bound upstream to known coins):**

```js
// /api/prices — only refetch ids that already exist in the known universe;
// unknown/garbage ids are dropped BEFORE any upstream fetch. Tighten the cap too.
const universe = await getUniverse();
for (const id of ids) {
  const m = universe[id];
  if (!m) continue;                       // unknown id → no upstream call, no output
  const fresh = (now - (m.at || 0)) < HOT_TTL;
  out[id] = { usd: m.p, usd_24h_change: m.ch, usd_market_cap: m.mc };
  if (!fresh) stale.push(id);
}
const MAX_ONDEMAND = 50;                   // bound the upstream fan-out per request
if (stale.length > MAX_ONDEMAND) stale.length = MAX_ONDEMAND;

// /api/history — reject unknown ids and negative-cache failures so a garbage
// id can't be re-fetched on every request.
if (!universe[id]) { res.status(404).json({ prices: [] }); return; }
// …after a failed/empty upstream response:
if (!r.ok) { await ref.set({ updatedAt: Date.now(), prices: [], failed: true }); }
```

Then apply the fixed per-IP + global daily upstream-call budget from **M1** specifically to these on-demand fetch paths.

---

## 🟠 Medium

### M1 — Per-IP rate limiter is trivially bypassable

- **Location:** [`functions/index.js:765-773`](../../functions/index.js) (`rateLimited`); call sites ~878 (`api`) and ~1011 (`subscribe`)
- **Class:** Improper rate limiting / trusting client-controlled header (CWE-290 / CWE-307)
- **Confidence:** High

**What's wrong.** Two independent bypasses, each defeating the only request-rate control on the unauthenticated `/api/*` surface:

1. The key is `req.headers['x-forwarded-for'].split(',')[0]` — the **leftmost** hop, which the client fully controls (behind Firebase Hosting/GFE the trustworthy client IP is the *appended, rightmost* hop). Rotating `X-Forwarded-For` per request yields a fresh bucket every time, so the 60/min (and 5/min subscribe) cap never trips.
2. The counter lives in `const _rl = {}` — **in-memory per function instance.** Cloud Functions autoscales, so the effective ceiling is per-instance and multiplies under load.

No other control replaces it: App Check enforcement is absent server-side (L1), and the subscribe honeypot is defeated by simply omitting the `hp` field. This finding is what makes **H2** practical and also undermines the `/api/subscribe` email-provider abuse control.

**Why Medium (not High).** The heavy read endpoints are cache-protected by design, so a flood mostly drives Cloud Function invocations + Firestore reads rather than unbounded paid calls; the genuinely open vectors are the on-demand-fetch DoW (H2) and `/api/subscribe` spam. No path to data compromise or auth bypass.

**Fix:**

```js
// Trust the platform-appended client IP, not the attacker-supplied first hop,
// and back the counter with a SHARED store so the cap holds across autoscaled instances.
function clientIp(req) {
  const xff = String(req.headers["x-forwarded-for"] || "").split(",").map(s => s.trim()).filter(Boolean);
  return req.ip || (xff.length ? xff[xff.length - 1] : "") || "unknown";
}
async function rateLimited(req, bucket = "read", limit = RATE_LIMIT) {
  const ip = clientIp(req);
  const key = `${bucket}:${ip}:${Math.floor(Date.now() / RATE_WINDOW)}`;
  const ref = db.doc(`rateLimits/${key.replace(/[^a-zA-Z0-9_:.-]/g, "_")}`);
  const count = await db.runTransaction(async (t) => {
    const s = await t.get(ref);
    const c = (s.exists ? s.data().c : 0) + 1;
    t.set(ref, { c, exp: Date.now() + RATE_WINDOW }, { merge: true });
    return c;
  });
  return count > limit;
}
```

---

### M2 — Unthrottled authenticated callables *(missed by the dimension audits; found by the completeness pass)*

- **Location:** `functions/index.js` `exportMyData` (~563-586), `createSubscription` (~166-194); cf. `deleteMyAccount` (~514-530)
- **Class:** Denial-of-wallet on an authenticated surface (CWE-770)
- **Confidence:** Medium

**What's wrong.** The IP limiter is wired **only into the `api` HTTP function, never the `onCall` callables.** Firebase verifies the ID token on `onCall`, but there is no per-caller rate limit and no App Check:

- `exportMyData` does an **unbounded recursive read** of the caller's entire portfolio/coins/transactions tree on every invocation — a signed-in attacker can loop it to inflate Firestore read cost.
- `createSubscription` makes **two live outbound PayPal API calls per invocation** (`getPayPalToken` then `POST /v1/billing/subscriptions`) — loopable into PayPal-API rate-limit exhaustion and junk-subscription creation.

Authentication ≠ rate limiting. This is a distinct surface from H2 (those are unauthenticated HTTP; these are authenticated callables).

**Fix.** Add a per-uid token bucket (Firestore-backed, same pattern as M1) and/or App Check enforcement to the expensive/outbound callables.

---

## 🟡 Low

### L1 — App Check is initialized client-side but never verified server-side on `/api`

- **Location:** `functions/index.js:870-878` (the `api` entry — no App Check check); cf. `src/api/firebase.config.js:56-65`
- **Class:** Missing server-side validation of a security control (CWE-602)

App Check on a raw `onRequest` HTTP function is **not** automatic (unlike `onCall`); it must be read from the `X-Firebase-AppCheck` header and verified with `admin.appCheck().verifyToken()`. That verification is absent, so the intended bot defense for the denial-of-wallet surface is non-functional server-side. **Low** because these endpoints are intentionally public (the anonymous landing-page DCA calculator must call them) and the DoW blast radius is bounded by the caching architecture, not by App Check.

**Fix** (defense-in-depth; keep anonymous reads working — App Check attests the app/origin, not the user):

```js
async function appCheckOk(req) {
  const token = req.header("X-Firebase-AppCheck");
  if (!token) return false;
  try { await admin.appCheck().verifyToken(token); return true; } catch { return false; }
}
// In exports.api, require a valid token for the abuse-sensitive actions:
const guarded = ["prices", "history", "subscribe"];
if (guarded.includes(action) && !(await appCheckOk(req))) {
  res.status(401).json({ error: "App Check required" }); return;
}
```
Also allow the `X-Firebase-AppCheck` header through CORS and enable App Check *enforcement* for the function in the Firebase console.

---

### L2 — CSP allows `'unsafe-inline'` in `script-src`

- **Location:** [`firebase.json:22`](../../firebase.json)
- **Class:** Weak CSP / reduced XSS containment (CWE-1021)

`script-src 'self' 'unsafe-inline' …` neutralizes CSP's script-injection protection: if any XSS sink ever appears, the CSP won't block it. **No live XSS sink exists today** (verified: no `innerHTML`/`dangerouslySetInnerHTML`/`eval` in `src/`; the one landing-page `innerHTML` is fed only server-coerced numbers), so this is a hardening gap, rated Low. The rest of the header set is strong (`frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, HSTS, `nosniff`).

**Fix.** `'unsafe-inline'` is currently load-bearing — `app.html` registers the service worker inline and `index.html` carries the landing/DCA logic inline; a bare removal would break the PWA. Externalize those inline scripts (e.g. `public/sw-register.js`, a bundled landing module), then drop `'unsafe-inline'` from `script-src` (or switch to SHA-256 hashes). Leaving `'unsafe-inline'` in `style-src` is acceptable (far lower risk). Optionally switch the one numeric `innerHTML` at `index.html:826` to `textContent`/`append` so it can never become a sink.

---

### L3 — CSV formula (DDE) injection in portfolio export

- **Location:** [`src/utils/export-csv.js:11-15`](../../src/utils/export-csv.js) (`esc`)
- **Class:** Formula injection / CSV injection (CWE-1236)

`esc()` only quotes cells containing `" , \n \r`; it never neutralizes a leading formula trigger. A cell beginning with `= + - @` is evaluated as a formula when the downloaded `.csv` is opened in Excel / LibreOffice / Sheets (`=HYPERLINK(…)` can exfiltrate other cells; legacy `=cmd|…` DDE can launch a process on unpatched Excel). Portfolio name and coin name/symbol reach cells un-neutralized (rules only length/type-check them). **Low** because the dominant vector (portfolio name) is self-export only, and modern spreadsheets prompt before evaluating imported formulas — but the product sells the file as a "safe export," so the fix is warranted.

**Fix:**

```diff
 function esc(v) {
-  const s = v == null ? "" : String(v);
+  let s = v == null ? "" : String(v);
+  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;   // defang spreadsheet formula injection (CWE-1236)
   return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
 }
```
Add a unit test feeding a portfolio name of `=HYPERLINK("http://x","y")` and asserting the output cell starts with `'=`.

---

### L4 — Soft-deleted account retains full data access *(missed by the dimension audits; found by the completeness pass)*

- **Location:** `functions/index.js:514-530` (`deleteMyAccount`); `firestore.rules` (no `deleted` gate); `src/hooks/useAuthSession.js:64-65` (client gate)
- **Class:** Client-side-only enforcement of a data-lifecycle control (CWE-602) / GDPR-erasure gap

`deleteMyAccount` sets `users/{uid}.deleted = true` but deliberately does **not** disable the Auth account, and `firestore.rules` never consults `deleted` on any read/write (it appears in rules only inside the owner-update blocklist, never as an access gate). The only thing stopping a "deleted" user from continuing to read/write all their data is the React `RestoreAccount.jsx` screen — trivially bypassed by calling the Firestore SDK/REST API directly with the still-valid token. **Own-data only** (no cross-user IDOR), so it's an integrity/compliance gap, not a confidentiality breach.

**Fix.** Gate writes in rules on `get(/databases/$(database)/documents/users/$(uid)).data.get('deleted', false) == false`, and/or revoke the user's refresh tokens (`admin.auth().revokeRefreshTokens(uid)`) on soft-delete so the live session can't keep operating.

---

## Refuted findings (11)

The adversarial verification pass rejected these — in each case a server-side control already prevents the issue, or the surface is inert in shipped code. Listed so a future reviewer doesn't re-raise them without re-checking the cited control.

| Candidate | Why it's not exploitable |
|-----------|--------------------------|
| **AI prompt-injection** (system-prompt concatenation) | The entire AI path is dead: `askClaude()` throws unconditionally; no `researchAsk`/LLM call exists in `functions/`. No live surface. |
| **AI output XSS / unwired output validator** | Same — `validate-output.js` is never imported by a deployed function; AI output is never rendered. Latent, not live. |
| **"Free Pro" via the upgrade UI** | The flow is a client-side simulation writing to `window.storage` (local), not Firestore; the real `createSubscription` is never called. Revenue/trust gap, not a privilege bypass. (The *real* server billing path is covered by H1.) |
| **Yearly/Premium not honored (webhook hardcodes `tier:'pro'`)** | Correctness/revenue bug, not an attacker-exploitable security issue. |
| **Cancel/downgrade only in local storage** | `confirmDowngrade()` writes to `window.storage`, never Firestore — it cannot affect server state, so no security impact. |
| **User-doc *create* lets owner set server-only fields** | Real gap, but folded into **H1** (the same `hasOnly()` fix closes the create rule). |
| **Login account-enumeration** | Firebase email-enumeration protection (default since 2023-09) collapses "no account" and "wrong password" to `auth/invalid-credential`; the distinct error map entries are dead code. |
| **No server-side AI cost ceiling** | Correct, but the AI path is inert; this is deferred work, not a live hole. |
| **Source maps exposed in prod** | Verified control: `vite.config.js:40` sets `build.sourcemap: false`; build script adds no `--sourcemap`. |
| **Admin app reachable by loading `/admin`** | Verified control: `isAdmin()` = server-verified `request.auth.token.admin == true`; gates privileged paths in rules + callables. A separate HTML file is not the protection — the claim is. |
| **CORS `*` on state-changing endpoints** | Verified control: `Access-Control-Allow-Origin: *` appears only on the read-only `api` proxy; `paypalWebhook` verifies the signature; state-changers are token-auth `onCall`. |
| **`innerHTML` on the landing pricing toggle** | Verified control: `config` writes are admin-only and forced through numeric coercion (`mergePlans`/`num()`), so the value is always a finite number — never attacker markup. |

---

## Completeness-pass notes (Info)

Beyond M2 and L4 (promoted above), the critic flagged two Info-level items worth tracking:

- ~~**`signupsEnabled` is client-gated only.**~~ **FIXED 2026-07-24 (ADMIN-0).** `exports.beforeCreateUser` (`functions/index.js`) refuses inside account creation, so `createUserWithEmailAndPassword` no longer succeeds when the toggle is off — verified on the emulator that **no Auth account is created**. Decision logic is pure + unit-tested (`functions/signup-gate.js`) and **fails OPEN** on an unreadable config, so the gate can only ever fire because a human flipped it. Deploying it requires Identity Platform (go-live).
- **`lookupUser` is an email→account oracle**, but it's admin-claim-gated (`functions/index.js:390-416`), so not attacker-reachable. Confirm `src/api/admin.js` only invokes it from the admin app.

---

## Prioritized remediation plan

1. **H1** — close `firestore.rules` to `hasOnly()` (update **and** create) + ownership check in `cancelSubscription` + rules test. Surgical; blocks the only privilege/griefing path. **Do before the PayPal backend goes live.**
2. **M1 + H2 together** — fix the rate-limiter IP source + move to a shared store, then bound the proxy to known coin ids with negative caching. M1 makes H2 practical, so they pair.
3. **L3** — 2-line CSV defang + unit test. Trivial, clearly correct.
4. **M2 · L1 · L4 · L2** — hardening. L2 needs a small refactor (externalize inline scripts) before `'unsafe-inline'` can be removed.

---

## Deferred / future work

When the **live AI research proxy** is built (the currently-inert `askClaude` / `researchAsk` path), it must ship with: the AI provider key server-side only; per-user server-side usage/cost caps; user input as a separate message (not concatenated into the system prompt); the `validate-output.js` validator wired **server-side and fail-closed** (regenerate-capped or safe fallback); and AI text rendered via React-escaped children / `textContent`, never `innerHTML`. None of these are gaps today only because the path is dead.

---

## Methodology

Run via the `vibe-security` skill methodology as a deterministic multi-agent workflow:

1. **8 dimension finders** (secrets/env, Firebase rules, auth/authz, rate-limiting & denial-of-wallet, payments, AI/LLM, deployment, data/input-validation), each reading the actual shipped files. Mobile and Supabase/Convex dimensions were N/A for this stack.
2. **Adversarial per-finding verification** — every candidate was independently re-checked against `firestore.rules` and the relevant Cloud Function, defaulting to "refuted" unless genuinely exploitable after accounting for server-side controls. This rejected 11 of 17 candidates.
3. **Completeness critic** — a final pass for surfaces the dimensions missed (this is what surfaced M2 and L4).

Run stats: 26 agents · ~1.6M tokens · 305 tool calls. This report reflects the verified output; severities are the verifiers' adjusted ratings, not the finders' initial claims.
