# Architecture Audit — Layering Rules

> ⚠️ **HISTORICAL SNAPSHOT (2026-06-16) — superseded by [`docs/decisions/ARCHITECTURE.md`](../decisions/ARCHITECTURE.md).**
> This is a point-in-time audit, kept for history. The canonical, wired-in architecture rulebook is
> now [`ARCHITECTURE.md`](../decisions/ARCHITECTURE.md). Some numbers below are stale — see
> **"Since this audit"** immediately below before quoting any figure.

> **Since this audit (correcting the stale figures — code moved ahead, no re-audit needed to fix a count):**
> the backend is no longer "one flat 908-line `index.js`, 18 functions, no helper split." As of 2026-08
> it is **≈2,400-line `index.js` with 43 exported functions + 13 extracted pure-helper modules**
> (`guards`/`billing`/`validate-output`/`config-diff`/`observability`/`net-utils`/`stats-daily`/`features`/
> `signup-gate`/`announcement`/`universe-utils`/`duplicates`/`audit-diff`). Accurate framing: **"modular
> helpers + a per-handler-mixed `index.js`"**, not "flat monolith" (the per-handler controller+service+model
> mixing is still true and stays a documented by-design exception). Also: `admin-dashboard.jsx` is now
> **hook-driven** (`api/admin.js` + `useAdminDashboard`, fixed in `df83e51`) — the "Rule 1 biggest violation"
> row below is **resolved**. See [`ARCHITECTURE.md`](../decisions/ARCHITECTURE.md) D1/D2.

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

> **Update (2026-06-16): the Rule 1–3 violations have been fixed.** All extractable
> component/data-layer logic was moved to the correct layer (see "Resolution" at the bottom).
> Rules 4–6 remain a deliberate, documented backend-monolith choice (`NEXT-STEPS.md` §2).

| Rule | Layer | Verdict |
|---|---|---|
| 1. Components — JSX only | `src/components/`, shell | ✅ Fixed — P&L, usage%, subscription-decision, ForgotPass handler, and the admin panel's state all moved out |
| 2. Hooks — all state + logic | `src/hooks/` | ✅ Fixed — admin logic → `useAdminDashboard`; subscription decision → `useUpgrade` |
| 3. API layer — fetch only | `src/api/` | ✅ Fixed — duplicate `TIER_LIMITS`/`canAdd*` removed from `firebase-database.js` |
| 4. Controllers — req/res only | `functions/` | ❌ Not separated (by design) |
| 5. Services — external calls only | `functions/` | ❌ Not separated (by design) |
| 6. Models — DB queries only | `functions/` | ❌ Not separated (by design) |

*(The detailed findings below are the original audit; see "Resolution" at the end for what moved where.)*

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
3. ✅ **DONE (commit df83e51)** — extracted `admin-dashboard.jsx`'s ~20 `useState`s + 3 effects + all
   handlers into `useAdminDashboard`. Initially declined as a 1:1 no-reuse hook, but reconsidering:
   the dashboard is **self-contained** (no shared/injected state), so the extraction is *clean* —
   unlike the §1b portfolio-CRUD case which would have needed ~15 injected deps. De-risked by first
   expanding the interaction test to drive the user-detail/moderation flow, then refactoring under it.

**Leave as-is (intentional / documented):**
- Backend monolith (rules 4–6) — `NEXT-STEPS.md` §2 marks the split optional; for one serverless
  function, splitting adds files without real benefit (KISS).
- `CryptoIdea.jsx` CRUD + upgrade orchestrators — documented tradeoff in §1b (coupled to UI/auth/form
  state shared across the app; hook-ifying would relocate deps, not reduce them).
- `AddEntry` form-input logic — trivial, presentation-adjacent (historical-price autofill tied to the
  form fields).

---

## Resolution — what moved where (2026-06-16)

| Logic | From | To | Commit |
|---|---|---|---|
| Duplicate `TIER_LIMITS` + `canAdd*` | `api/firebase-database.js` | deleted (live copy in `useUpgrade.js`) | 26ecd78 |
| P&L math (`holdings`/`coinPnl`/`portfolioPnl`) | `Detail.jsx`, `CryptoIdea.jsx` | `utils/pnl.js` (+7 tests) | 3e4bfcb |
| Usage-% math | `CryptoIdea.jsx` | `utils/usage.js` (+3 tests) | 6c0903d |
| Subscription auto-downgrade decision | `CryptoIdea.jsx` | `useUpgrade.dueDowngrade` (+5 tests) | 6c0903d |
| Password-reset handler | `ForgotPass.jsx` | `CryptoIdea` ctx (component now presentation-only) | 4f2d0b5 |
| Admin panel state + handlers + effects | `admin-dashboard.jsx` | `hooks/useAdminDashboard.js` (test-guarded) | df83e51 |

Net: every component is now presentation + thin orchestration; pure business logic lives in
`utils/` or hooks. Rules 4–6 (backend MVC) remain intentionally unsplit per §2.
