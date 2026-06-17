# Crypto Idea — Test Report

**Date:** 2026-06-17
**Build:** v4.3.0 (commit at time of testing: see `git log`)
**Method:** Automated suites (`test:unit`, `test:rules`, `test:integration`) + manual exploratory
UI testing driven through the preview browser against the full local stack (emulators + Vite).

> How to reproduce the UI tests: `npm run start:all`, `node functions/scripts/seed-emulator.js`,
> then exercise the surfaces below. Seeded logins (all `test1234`): `admin@test.com`,
> `admin2@test.com` (admins), `pro@test.com`, `free@test.com`.

---

## 1. Automated tests — 106/106 PASS ✅

| Suite | Command | Result |
|---|---|---|
| Unit / component / hook (Vitest + jsdom) | `npm run test:unit` | **92 passed** (21 files) |
| Firestore security rules (node:test + emulator) | `npm run test:rules` | **10 passed** |
| Data-layer integration (node:test + emulator) | `npm run test:integration` | **4 passed** |

The `PERMISSION_DENIED` lines in the rules-suite output are **expected** — they are the negative
test cases asserting that disallowed writes are correctly rejected.

> ⚠️ A green suite is necessary but not sufficient: see **Finding F-1** — a real defect exists that
> none of these 106 tests catch. The suite gives false confidence on tier handling.

---

## 2. Manual UI tests

| # | Surface | Test | Result |
|---|---|---|---|
| T1 | Landing page | Loads, renders hero / DCA / benefits / pricing | ✅ PASS |
| T2 | Landing DCA calculator | Calculates; **recalculates live** on coin/amount/frequency/date change | ✅ PASS (see note N-1) |
| T3 | User app — login | `pro@test.com` logs in; **login does not enforce registration password rules** | ✅ PASS |
| T4 | User app — data load | Seeded portfolios + coins load (Portfolio 1 & 2, 6 assets) | ✅ PASS |
| T5 | User app — **tier display** | Pro user should show PRO tier + Pro limits | ❌ **FAIL — see F-1** |
| T6 | Admin — non-admin rejection | A logged-in non-admin opening `/admin` is signed out with a notice | ✅ PASS |
| T7 | Admin — login | `admin@test.com` reaches the dashboard | ✅ PASS |
| T8 | Admin — Overview stats | 4 total · 3 free · 1 pro · $10 est. revenue · 4 portfolios | ✅ PASS (see N-1) |
| T9 | Admin — Users tab | Full list shows all 4 users; search box present | ✅ PASS |

---

## 3. Findings

### F-1 — 🔴 HIGH: User tier is read from local device storage, never from Firestore — ✅ FIXED

**Symptom:** Logging in as the seeded **`pro@test.com`** shows the **"STARTER"** (free) badge and
free limits (`My Assets 6/10`), not Pro (200 coins).

**Root cause:** `src/hooks/useAuthSession.js` builds the session user from
`db.get("ci-profile-"+uid)` (local IndexedDB) with `tier:"free"` as the default. There is **no
reader for the `users/{uid}` Firestore document** in `src/api/firebase-database.js` (it only
touches the `portfolios`/`coins` subcollections), and `CryptoIdea.jsx` makes no server call to load
its own profile. So the authoritative tier — written by the admin panel (`setUserTier`), the PayPal
webhook, and the seed — **never reaches the client**.

**Impact (real-world):**
- A user who upgrades on one device shows as **free on every other device** and after any cache clear.
- An **admin granting Pro/Premium** is never reflected in the user's app.
- The seeded Pro user appears free (what T5 observed).

**Not a security hole:** `firestore.rules` still enforce the *real* server tier, so a
free-displaying Pro user is *under-served*, not over-privileged. But it breaks paid functionality
across devices — core to the SaaS.

**Why tests missed it:** all tier-dependent unit tests pass a `user` object in directly, so they
never exercise "where does tier come from on login." The fix must include a test that asserts the
session adopts the **server** tier.

**Fix applied (server = source of truth, matches the documented security model):**
1. Added `getUserProfile(uid)` to `src/api/firebase-database.js` reading `users/{uid}`.
2. In `useAuthSession.js`, it loads on auth change and server `tier`/`subscription` win over the
   local cache (local cache still used for non-authoritative settings).
3. TDD: a `useAuthSession` test where the server profile returns `tier:"pro"` and the session user
   ends up Pro (and a "stale local cache loses to server" test) — both failed before the fix — plus
   a `getUserProfile` round-trip integration test.

**Deeper root cause found during browser verification (the hard part):** with the reader wired in,
a fresh **reload** showed Pro correctly, but a fresh **login** still showed free. Cause: `loginUser()`
writes `lastLogin` on sign-in; that concurrent **pending write** makes the first profile read return
Firestore's *latency-compensated* partial view — a doc containing only `{ lastLogin }`, missing
`tier`. (`getDocFromServer` did **not** bypass this in firebase-js v12.) Final fix: `getUserProfile`
now **retries (≤2× / 400 ms) when the doc exists but `tier` is absent**, so the read waits out the
pending write and returns the full doc. Verified end-to-end: fresh login as `pro@test.com` → **PRO
badge + 6/200 limit** (was STARTER + 6/10).

---

## 4. Notes (not bugs)

- **N-1 — Emulator cold start:** the **first** call to a Cloud Function in the emulator cold-starts
  (several seconds), so the very first DCA calculation and the first admin Overview load briefly
  show no result / zeros before resolving. In production (warm functions + CDN-cached `/api`
  responses) this does not occur. **However**, the landing DCA `getHistory` fetch has **no timeout**
  — if `/api/history` ever hangs, the button sticks on "Calculating…" with no feedback. A small
  hardening opportunity (timeout + clear error), tracked as a low-priority follow-up.
- **History depth:** without a CoinGecko Demo key, `/api/history` returns ~365 days, so DCA start
  dates earlier than ~1 year are clamped to the earliest available point. Adding the free Demo key
  (go-live checklist) unlocks full history.
- **Date-picker button text** on the landing DCA appears in Hebrew — that is the OS/browser locale
  rendering of the native `<input type=date>`, not an app string.

---

## 5. Status

- Automated: **109/109 green** (unit 94 · rules 10 · integration 5) — +3 new tests added for F-1.
- Manual: **9/9 pass** — F-1 fixed and re-verified in the browser (fresh login → PRO + 6/200).
- Build: clean.
- Follow-up (not blocking): DCA fetch-timeout hardening (**N-1**).
