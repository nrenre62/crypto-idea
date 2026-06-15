# Crypto Idea — Test Report

Overview of the automated tests and what each one guards. There are **three** test
suites; the layered-refactor work is covered by `test:unit`.

| Suite | Command | Needs emulator? | Count |
|---|---|---|---|
| Unit (component/hook) | `npm run test:unit` | No (jsdom, `api/` mocked) | 8 |
| Firestore rules | `npm run test:rules` | Yes (Firestore emulator) | 7 |
| Data-layer integration | `npm run test:integration` | Yes (Auth + Firestore emulators) | 4 |

Run everything: `npm run test:unit && npm run test:rules && npm run test:integration`
(the latter two start their own emulators via `firebase emulators:exec`).

---

## `npm run test:unit` — Vitest + jsdom + React Testing Library — **8/8 passing**

The `api/` layer is mocked, so these run fast with no Firebase/network. This is the
regression net for the in-progress screen/hook extraction.

### `tests/unit/useLivePrices.test.jsx` — the live-price hook (2)
- **seeds built-in mock prices on mount and stays 'demo' with an empty portfolio** — on
  mount the hook seeds `TOP_COINS` mock prices (so the UI isn't empty) and does **not** call
  `fetchPrices` when no coins are held (the `if(!portfolio.length)return` guard).
- **polls live prices for held coins and flips api to 'live'** — with a held coin it calls
  `fetchPrices(ids)`, merges the response over the seed, and sets `api` to `"live"`.

### `tests/unit/useCoinSearch.test.jsx` — the Add-Coin search hook (3)
- **returns built-in matches immediately (before any live result)** — local `TOP_COINS`
  matches (e.g. "sol" → Solana) appear synchronously, ahead of any network result.
- **merges live results after the debounce, deduped against built-in matches** — after the
  300ms debounce it merges `searchCoins()` results in, with no duplicate of a built-in match.
- **returns nothing for an empty query and does not hit the network** — empty query → `[]`,
  and `searchCoins` is never called.

### `tests/unit/CryptoIdea.smoke.test.jsx` — whole-component render (3)
Renders the real `CryptoIdea` component with every `api/*` module mocked; `onAuthChange` is
mocked to push a null user (logged out) or a fake user (logged in). This is the anchor that
catches breakage during screen extraction.
- **renders the login screen when logged out** — mounts the full tree; asserts the login UI.
- **navigates from login to the password-reset screen (ForgotPass via context)** — clicks
  "Forgot password?" and asserts the reset screen renders — exercises an extracted screen
  reading state through `AppContext`/`useApp()`.
- **renders the portfolio screen when logged in (exercises hdr/Ic/StatusDot)** — a
  no-subscription user renders the Portfolio screen, exercising the shared UI primitives and
  the `StatusDot` context consumer.

---

## `npm run test:rules` — Firestore security rules (7, emulator)
`tests/firestore-rules.test.js` (`@firebase/rules-unit-testing`) — owner-only access, users
can't change their own `tier`, counter-based plan limits, `/config` is server-only, and the
"configured plan limits override the built-in defaults" case.

## `npm run test:integration` — data layer (4, emulator)
`tests/data-layer.test.js` — exercises the **real** `api/firebase-auth.js` +
`api/firebase-database.js` code against the emulators (register → create portfolio → add
coin → add/delete transaction), verifying the writes + counter maintenance.

---

> Status note: the unit suite is run on every change during the refactor (`npm run test:unit`).
> The emulator suites are the security/data boundary — run them before deploying rule or
> data-layer changes. See `NEXT-STEPS.md` for what's still being built and the screens that
> still need test coverage added as they're extracted.
