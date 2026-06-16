# Architecture Audit — Layering Rules

> Generated 2026-06-16. Read-only audit of the codebase against a strict 6-rule layered
> architecture. No code was changed. Rules 1–3 cover the frontend (`components`/`hooks`/`api`),
> rules 4–6 the backend (`functions/`).

## Rules audited
1. **Components** — JSX only, no fetch, no logic
2. **Hooks** — all state and business logic
3. **API layer** — fetch functions only
4. **Controllers** — req/res only
5. **Services** — external API calls only
6. **Models** — database queries only

## Two corrections to keep in mind
- **No component imports `firebase/*` directly** — every component reaches the backend through
  `src/api/*`. So the "no fetch/SDK calls in components" half of Rule 1 is *satisfied*; the
  violations are about **logic**, not data access.
- **A hook holding business logic is Rule 2 working as intended**, not a violation
  (`useUpgrade`'s tier math is correctly placed).

---

## Summary

| Rule | Layer | Verdict |
|---|---|---|
| 1. Components — JSX only | `src/components/`, shell | ⚠️ Partial — no fetch leaks, but business logic in 4 files |
| 2. Hooks — all state + logic | `src/hooks/` | ✅ Hooks are clean; ⚠️ but not *all* logic lives in them (leaks into components) |
| 3. API layer — fetch only | `src/api/` | ⚠️ Partial — proxy wrappers clean; data layer carries business rules |
| 4. Controllers — req/res only | `functions/` | ❌ Not separated (by design) |
| 5. Services — external calls only | `functions/` | ❌ Not separated (by design) |
| 6. Models — DB queries only | `functions/` | ❌ Not separated (by design) |

---

## Rule 1 — Components: JSX only (no fetch, no logic)

**Data-access: clean.** No component calls `fetch`/`httpsCallable`/`firebase/*` directly. ✅

**Logic violations:**

| File | Lines | Violation |
|---|---|---|
| `components/admin-dashboard.jsx` | 43–155 | **Biggest one.** Holds *all* its own data-loading + state inline (`loadConfig`, `saveConfig`, `loadUserList`, `loadAudit`, `lookup`, `changeTier`, `toggleSuspend`, `doDelete`) plus the mount/tab `useEffect`s. Hook-level work living in a component. |
| `CryptoIdea.jsx` | 156–370 | Shell holds auth handlers, portfolio/coin/tx CRUD, **P&L + usage-% math** (322–336), and **subscription-status logic** (342–370). |
| `components/Detail.jsx` | 18–43 | P&L computation (cost basis, gains, `totalPnl`, `totalPnlPct`) in the component. |
| `components/AddEntry.jsx` | 19–34 | Historical-price autofill, launch-date clamping, `priceIsHist` comparison (borderline — form-input behavior). |
| `components/ForgotPass.jsx` | 8–16 | Calls `resetPassword()` api directly in its own handler + email-regex validation, instead of receiving a handler from context like `Login`/`Contact` do. (Minor inconsistency.) |

**Clean (14):** `Loading`, `ui`, `StatusDot`, `PortfolioBar`, `pro-success`, `education-page`, `Account`, `Portfolio`, `Search`, `CoinInfo`, `Login`, `Contact`, `main.jsx`, `admin-main.jsx`.

> `CryptoIdea.jsx`'s CRUD + upgrade orchestrators are **documented as intentional** in `NEXT-STEPS.md`
> §1b (coupled to auth/UI state; extracting would relocate deps, not reduce them). The *P&L/usage
> math* and *subscription logic*, though, are genuine extractable logic. `admin-dashboard.jsx` is
> the known un-refactored screen (§1c hint).

## Rule 2 — Hooks: all state and business logic

**The hooks themselves are compliant** — each holds state and delegates fetching to the api layer:
- `useAuthSession`, `useCoinSearch`, `useLivePrices`, `usePortfolios`, `useUpgrade` — all clean;
  none call `fetch`/`httpsCallable` directly. ✅

**The violation is the inverse of the rule's intent:** "*all* business logic in hooks" is not met,
because logic leaks into `CryptoIdea.jsx` and `admin-dashboard.jsx` (Rule 1 above). The right hooks
exist; some logic just isn't in them yet.

## Rule 3 — API layer: fetch functions only

The api layer is really **two sub-layers**:

- **Proxy/callable wrappers — clean** ✅: `coingecko.js`, `config.js`, `account.js`, `admin.js`
  are thin `fetch`/`httpsCallable` wrappers, exactly as the rule wants.
- **Firebase data layer — carries business rules** ⚠️:

| File | Lines | Violation |
|---|---|---|
| `api/firebase-database.js` | 236–274 | `TIER_LIMITS` constant + `canAddPortfolio()` / `canAddCoin()` — **business rules** in the fetch layer. Worse: it **duplicates** the `TIER_LIMITS` already in `useUpgrade.js` (two sources of truth for plan limits). |
| `api/firebase-auth.js` | 22–64, 68–81 | `registerUser` orchestrates default-portfolio + profile setup; `loginUser` writes `lastLogin`. Setup logic bundled into auth wrappers. |

**Not counted as violations:** the batched writes with counter `increment()` in
`firebase-database.js` (`createPortfolio`, `addTransaction`, etc.). Atomic multi-doc persistence is
normal **data-access** work — that's what a model does. This exposes a real tension: **Rule 3
("fetch only") contradicts Rule 6 ("models = DB queries")**. On the frontend,
`firebase-database.js` *is* the model layer, so judging it as "fetch only" mislabels normal
persistence. The only true Rule-3 issue there is the **tier-limit business logic**.

## Rules 4, 5, 6 — Controllers / Services / Models (backend)

**Verdict: these layers don't exist as separate units.** There is no `controllers/`, `services/`,
or `models/` folder. `functions/index.js` (908 lines) is a flat monolith where **every one of the
18 functions mixes all three concerns** — parse `req`/`context` + call external API + read/write
Firestore in the same body. Representative cases:

| Lines | Function | Concerns mixed |
|---|---|---|
| 160–178 | `cancelSubscription` | req/res **+** PayPal API **+** Firestore write (4+5+6) |
| 206–258 | `paypalWebhook` | PayPal verify API **+** Firestore writes (5+6) |
| 351–363 | `setUserTier` | auth/req **+** Firestore write **+** audit write (4+6) |
| 643–659 | `refreshMarkets` | CoinGecko `fetch` **+** Firestore cache write (5+6) |
| 717–908 | `api` (main handler) | All three across `prices`/`search`/`history`/`subscribe` actions (4+5+6) |

…and the other 13 callables follow the same controller+model pattern.

> **This is deliberate and documented.** `NEXT-STEPS.md` §2 calls the MVC split **OPTIONAL** and
> states the monolith is "a defensible choice for a single serverless function." So it's a 100%
> violation against rules 4–6 *as written*, but an intentional architecture decision, not an oversight.

---

## What to fix vs. leave

**Cheap, genuine wins:**
1. ✅ **DONE (commit 26ecd78)** — removed the duplicate `TIER_LIMITS` + `canAddPortfolio`/`canAddCoin`
   from `firebase-database.js`; single source of truth is `useUpgrade.js`. Kills the drift risk.
2. ✅ **DONE (commit 3e4bfcb)** — extracted P&L math into pure `utils/pnl.js` (+ 7 unit tests);
   `Detail.jsx` and `CryptoIdea.jsx` now call it.
3. 🔁 **RECONSIDERED — `admin-dashboard.jsx` → `useAdminDashboard` hook: declined on KISS grounds.**
   It would be a **1:1 hook used by exactly one component** — relocating ~20 `useState`s + handlers
   into a new file without enabling reuse or cutting coupling. That's the same call the project
   already made for portfolio CRUD in `NEXT-STEPS.md` §1b ("relocates deps, not reduces them —
   anti-KISS"). Applying that precedent consistently, the extraction isn't a clear win.
   **Instead (commit pending):** added the missing safety net — an interaction test
   (`tests/unit/admin-dashboard.test.jsx`) that mounts the panel, mocks the API, and clicks through
   all four tabs. That fills the real gap (the admin panel had zero coverage) and de-risks future
   edits, which is the actual value here.

**Leave as-is (intentional / documented):**
- Backend monolith (rules 4–6) — `NEXT-STEPS.md` §2 marks the split optional; for one serverless
  function, splitting adds files without real benefit (KISS).
- `CryptoIdea.jsx` CRUD + upgrade orchestrators — documented tradeoff in §1b.
- `AddEntry`/`ForgotPass` form-input logic — trivial, presentation-adjacent.
