# DATA-INTEGRITY.md — honest errors, self-healing state, keep-data downgrade (§DI / "Round 30")

**Date:** 2026-07-07 · **Status: 📋 PLAN ONLY — build on "go"** (founder decision D7)
**Trigger:** founder bug report — *"error when I try to add a new coin on my Starter account; I only have 2 coins"* with the toast **"You've reached this portfolio's coin limit — upgrade for more."**
**How audited:** live-emulator reproduction matrix + a 27-agent adversarial workflow (6 mapping
dimensions → every finding verified by 2 independent lenses: code-trace refuter + UI-reachability
→ completeness critic). **36 findings confirmed + 5 critic additions; 2 refuted.**
Full machine-readable inventory: [`docs/planning/data-integrity-findings.json`](docs/planning/data-integrity-findings.json).

---

## 1 · The diagnosed founder bug (ERRORS.md §A4)

The account was **not** at any limit (verified: `coinCount=2`, real docs 2, limit 10; a byte-exact
replica of the app's write succeeded). The failing add went through the **Buy-Journal popup with a
thesis** (founder confirmed). Chain:

1. The thesis / change-my-mind / funnel textareas have **no client length cap** (`thesisError`
   checks presence only; `cleanFunnel` trims but never caps; no `maxLength` anywhere in the flow).
2. `firestore.rules` `validJournal`/`validFunnel` reject any field **> 2000 chars** → the whole
   `addCoin` batch is denied as `permission-denied`.
3. `apiErrorMessage` (src/utils/errors.js) maps **every** `permission-denied` at the addCoin call
   site to the coin-limit + upgrade message — a blind guess, empirically wrong here.

The same blind mapping mislabels ≥10 other non-limit failures (missing parent portfolio, name
bounds, stale ids, auth lapse …) as "you've reached a limit — upgrade". That whole class is what
§DI fixes.

## 2 · Founder decisions (2026-07-07 interview)

| # | Decision |
|---|----------|
| D1 | **Verify-then-toast**: on a rejected write, re-check the server (parent exists? count truly ≥ limit?) and show the real reason. The limit/upgrade message appears **only when the limit is genuinely reached**. |
| D2 | **Full self-heal**: broken state (zero portfolio docs, dangling active-portfolio id, drifted counters) is repaired automatically — recreate the default portfolio, re-point the active id, server callable recomputes counters. |
| D3 | **Keep data, block adds** on downgrade: never delete user data. The client-only "trim" (and its server-delete alternative) is **retired**; over-limit data stays, adding is blocked honestly. **Supersedes R29's `trimToTier`-on-completion behavior** (the R29 popup flows themselves stay). |
| D4 | **Grey-lock over-limit UX**: items beyond the plan cap render locked (dimmed + "Over plan limit" tag); tapping one explains + offers Upgrade / remove-others. Deleting is always allowed so users can get back under the cap. |
| D5 | **Thesis cap 2000 + live counter** on every thesis/funnel input (matches the server rule; no rules change). |
| D6 | Include all four hardening extras: live `users/{uid}` watcher · offline detection · suspend revokes tokens · admin Plans blank-field = default. |
| D7 | **Plan only now**; build on "go". |

## 3 · Confirmed gap inventory (condensed)

Severity: 🔴 high · 🟡 medium · ⚪ low. Wave = the fix wave in §4.
Full scenarios + fix ideas per gap: `docs/planning/data-integrity-findings.json`.

### Error labeling (the lie itself)
| # | Sev | Gap | Wave |
|---|-----|-----|------|
| G1 | 🔴 | Nothing anywhere distinguishes "at the real limit" from any other `permission-denied` — the limit toast is a blind guess | DI-1 |
| G2 | 🔴 | addCoin: ≥5 distinct non-limit failures all surface as the coin-limit + upgrade toast (the founder bug) | DI-1 |
| G3 | 🔴 | Transaction **edit** shows the tx-limit upgrade message where a limit is structurally impossible (edit touches no counter) | DI-1 |
| G4 | 🟡 | createPortfolio: a >50-char name (add inputs have no cap; rename does) is reported as the portfolio-limit toast | DI-1 |
| G5 | 🟡 | addTransaction: missing/stale coin doc, out-of-bounds values, legacy-invalid docs → all wear the tx-limit toast | DI-1 |
| G6 | 🟡 | Seven no-limit operations (deletes, rename, thesis ops) default to "…you may have reached a plan limit." on any denial | DI-1 |
| G7 | ⚪ | "Check your connection." mislabels `not-found` (tx deleted on another device) as a network problem | DI-1 |

### Active-portfolio id (split-brain writes)
| # | Sev | Gap | Wave |
|---|-----|-----|------|
| G8 | 🔴 | Remote delete of the ACTIVE portfolio: the metas watcher removes it from state but never repairs `activePortId` — every write then targets a ghost id → fake limit toast | DI-2 |
| G9 | 🔴 | Registration step-2 failure / any zero-portfolio account = permanent phantom "default": UI looks normal, every addCoin fails, **no recovery path** (the code comment claims "recoverable on next load" — it isn't) | DI-2 |
| G10 | 🟡 | Forced sign-out paths never reset portfolios/activePortId/ci-active-port — next login on a shared device can show the PREVIOUS account's coins (privacy leak) and write to its portfolio id | DI-2 |
| G11 | 🟡 | trimToTier can drop the active portfolio from local state → `activePortId` dangles → addCoin **silently succeeds into an invisible portfolio** | DI-2/DI-4 |
| G12 | ⚪ | logout()'s `ci-active-port` cleanup is immediately re-written by the persistence effect (C-R2a shared-device cleanup never actually happens) | DI-2 |
| G13 | 🔴 | getPortfolios failure at login: silent `return` leaves the phantom default; the later metas watcher repairs only the ARRAY, not the id — split-brain for every user whose portfolio id isn't "default" | DI-2 |
| G14 | 🟡 | deletePortfolio on a stale/phantom entry passes rules (delete of a nonexistent doc is allowed) and still decrements `portfolioCount` → corrupt counter; two stale devices can reach ZERO portfolios | DI-3 |

### Counter integrity (drift is permanent)
| # | Sev | Gap | Wave |
|---|-----|-----|------|
| G15 | 🔴 | Re-adding a coin the server already has = rules **update** path → `coinCount` inflates forever (a false "limit" fires before the real cap) — 8/8 reproduced | DI-3 |
| G16 | 🟡 | removeCoin decrements unconditionally → stale/duplicate delete drives `coinCount` below real (even negative) | DI-3 |
| G17 | ⚪ | Nothing ever reconciles a drifted counter — every drift is permanent | DI-3 |
| G18 | 🟡 | deletePortfolio double-decrement (same class as G16, portfolio level) | DI-3 |
| G19 | 🟡 | deleteTransaction decrements unconditionally → `txCount` deflates → tx-limit overshoot | DI-3 |
| G31 | 🔴 | Re-adding a coin the UI failed to show ALSO **clobbers `journal`/`addedAt`** on the existing doc (set() overwrites), or toasts the fake limit when it has ≥2 txs | DI-3 |

### Downgrade "trim" (client theater)
| # | Sev | Gap | Wave |
|---|-----|-----|------|
| G20 | 🔴 | The trim is screen-only: server data never deleted, everything resurrects on reload; no server path trims either | DI-4 |
| G21 | 🔴 | The C-A3 live watchers UNDO the trim on screen within seconds (no reload needed) | DI-4 |
| G22 | 🟡 | Trim can leave `activePortId` dangling (see G11) | DI-2/4 |
| G23 | 🟡 | declineProRecheckout ("Continue with Starter") can never persist — owners can't clear the server `subscription` marker, so the re-checkout popup recurs on every load and device | DI-4 |
| G24 | ⚪ | Trim keeps the WRONG survivors vs the dialog's promise (keeps oldest portfolios, alphabetical coins, **oldest** transactions — drops the newest) — moot once D3 retires deletion, but dialog copy must change | DI-4 |

### Rules-validity failures reachable from real input
| # | Sev | Gap | Wave |
|---|-----|-----|------|
| G25 | 🔴 | Buy-Journal thesis/changeMyMind/funnel >2000 chars → addCoin denied → coin-limit toast (**the founder's actual trigger**) | DI-1 |
| G26 | 🟡 | Journal-tab writers (Add thesis, Edit, Save findings, both R24 auto-save-on-X paths) hit the same 2000 rule → misleading "plan limit" | DI-1 |
| G27 | 🟡 | Tx amount >1e15 or price >1e9 passes client validation → tx-limit toast | DI-1 |
| G28 | 🟡 | Create-portfolio has no 50-char cap (rename does) → portfolio-limit toast | DI-1 |

### Watchers / sync robustness
| # | Sev | Gap | Wave |
|---|-----|-----|------|
| G30 | 🔴 | Silent portfolio-load failure (or zero-portfolio account) strands the session on the phantom default (see G9/G13) | DI-2 |
| G32 | 🟡 | Remote deletion of the active portfolio never resets `activePortId` (see G8) | DI-2 |
| G33 | ⚪ | watchPortfolios permanent stream failure is fully silent (watchCoins got the C-A3 toast; the metas watcher didn't) | DI-5 |
| G34 | 🟡 | watchCoins swallows mid-processing failures **permanently** (docChanges deltas are relative to delivery, not processing) — a new coin can stay invisible, feeding the G15/G31 re-add corruption | DI-5 |
| G35 | ⚪ | Optimistic appends race the wholesale-replace watchers → transient duplicate rows (double keys, double-counted totals) — deterministic, 8/8 | DI-5 |
| G36 | ⚪ | Non-active portfolios keep stale/empty coins after the metas merge → Account usage bars + downgrade impact preview compute from stale data | DI-5 |

### Critic additions (session/config hardening)
| # | Sev | Gap | Wave |
|---|-----|-----|------|
| G37 | 🟡 | No live watcher / mid-session re-check on `users/{uid}` — tier flips (sweep, admin), premiumLimits, trash never reach an open session → stale sessions mass-produce the false toast | DI-6 |
| G38 | 🔴 | App Check failure modes unhandled — at go-live enforcement, a blocked reCAPTCHA turns EVERY write into `permission-denied` → the limit toast app-wide (go-live checklist item) | DI-6/§4 |
| G39 | 🟡 | Offline completely unhandled: saves hang forever; offline retaps queue duplicate commits that replay into G15 counter drift | DI-6 |
| G40 | ⚪ | Suspension/trash don't stop writes (suspend only disables Auth without revoking tokens; rules never check `deleted`) | DI-6 |
| G41 | ⚪ | Admin Plans editor: a cleared field becomes a hard **0** (locks out an entire tier); no "reset to default" | DI-6 |

**Refuted (no action):** coin name >64 / symbol >20 / thumb >512 from today's live search+trending
feed (mechanism unguarded but no triggering data exists — DI-1 still adds cheap clamps as
defense-in-depth); the emulator-reseed stale-browser-session repro (real mechanism, but dev-only —
prod Firestore is never wiped; noted for local testing: **after a stack restart, log out/in**).

## 4 · Fix waves (build order)

### DI-1 · Honest errors — verify-then-toast (D1, D5) — fixes G1–G7, G25–G28
- **Data layer** (`firebase-database.js`): on `permission-denied` from addCoin / createPortfolio /
  addTransaction, run one classification read (`getDocFromServer` the parent + fresh count/limit
  passed in by the caller) and return a `reason`: `'limit' | 'missing-target' | 'invalid-or-denied'`
  (plus `'not-found'` where the SDK already says so). Keep `{success:false, error, code}` shape,
  add `reason`.
- **UI** (`CryptoIdea.jsx` + `utils/errors.js`): the limit/upgrade toast fires ONLY on
  `reason:'limit'`. `'missing-target'` → "That portfolio/coin no longer exists — resyncing…" +
  trigger the DI-2 self-heal. Everything else → neutral honest copy. `console.error(res.error)`
  at every failure site (diagnostics stop being discarded). Remove `limitMsg` from the tx-EDIT
  site (G3); sweep the 7 generic sites (G6) + the not-found mislabel (G7).
- **Client validation parity** (mirror `firestore.rules` bounds, R10-2b pattern):
  thesis/changeMyMind/each funnel field ≤2000 with `maxLength` + a live "1,980 / 2,000" counter
  shown near the cap — on ALL writers: Search Buy-Journal, Journal add/edit/findings, both R24
  X-save paths (`cleanFunnel` also caps at 2000); create-portfolio name ≤50 (+`maxLength`);
  tx amount ≤1e15 / price ≤1e9 with specific messages; defense clamps in the data layer for coin
  name ≤64 / symbol ≤20 / thumb ≤512.
- **Tests:** unit per message path; integration test asserting a >2000 thesis never reaches the
  server and a real at-cap add returns `reason:'limit'`.

### DI-2 · Active-portfolio self-heal (D2) — fixes G8–G13, G30, G32
- **Reconciliation effect** (single source of truth): whenever `portfolios` changes, if
  `activePortId` isn't in it → `setActivePortId(portfolios[0]?.id)`. Covers remote delete, load
  repair, any dangling id.
- **Zero-portfolio heal:** load success + 0 docs → `createPortfolio("My Portfolio")` (registration
  parity; makes the registerUser "recoverable on next load" comment true).
- **getPortfolios retry** (mirror getUserProfile's) + on persistent failure show a visible error
  state with Retry — never the silent phantom default.
- **Write guards:** addCoin & friends refuse to write when `activePortId` ∉ loaded portfolios
  (belt-and-braces; returns `'missing-target'`).
- **Sign-out hygiene:** the auth-null branch resets portfolios/activePortId + deletes
  `ci-active-port` (G10 privacy leak); fix the logout ordering so the persistence effect can't
  resurrect the key (G12).

### DI-3 · Counter integrity — guarded mutations + reconcile (D2) — fixes G14–G19, G31
- Convert addCoin / removeCoin / deletePortfolio / deleteTransaction to `runTransaction`:
  **add** → if the coin doc already exists return `'already-exists'` (client resyncs + honest
  toast; never a blind `set()` clobbering `journal`/`addedAt`); **deletes** → if the doc doesn't
  exist return `'not-found'` WITHOUT touching the counter.
- **`reconcileMyCounters` callable** (Admin SDK, caller's own tree only): recomputes
  portfolioCount/coinCount/txCount from real docs. Client invokes it when DI-1 classification
  detects drift (denied as 'limit' while the fresh server count is below the cap). Runs in the
  emulator today — no Blaze needed.
- **Rules:** unchanged (counterDeltaOk still bounds normal writes; the callable bypasses via
  Admin SDK). New rules tests pin the guarded-mutation behaviors.

### DI-4 · Keep-data downgrade + grey-lock (D3, D4) — fixes G20–G24, G11
- **Retire the trim:** delete `trimToTier`/`trimPortfolios` usage from every downgrade path
  (Login completion, declineProRecheckout, checkSubscriptionStatus). `limitsForTier` stays (it
  feeds the lock derivation). Nothing is deleted locally or server-side, so the watchers can't
  "undo" anything (G21 moot).
- **Grey-lock derivation** (pure util + tests): given portfolios + tier limits → locked set =
  portfolios beyond the cap (by `order`) and, inside kept portfolios, the **newest-added coins
  beyond the coin cap** (oldest keep priority = matches "your existing data is safe" messaging).
  Locked rendering: dimmed card + "Over plan limit" tag; tap → shared Modal explainer with
  Upgrade / OK (deleting is always allowed to get back under). Portfolio tab, PortfolioBar,
  Account rows, Journal/Research read the same derivation.
- **Copy:** downgrade dialogs re-worded — data is KEPT; over-limit items lock until you're under
  the limit or upgrade again (`getTrimImpact` → `overLimitImpact` counts for the dialog).
- **Persist the R29 decisions server-side (G23):** new callables `resolveRecheckout`
  (clears the kept `subscription` marker after the user picks "Continue with Starter" /
  approves Pro) and `reactivateSubscription` ("Keep my plan" un-cancel) — owners can't write the
  marker themselves (BL-1 blocklist). Emulator-testable now; **moves up from the §BL-4 go-live
  bullet** (BL-4 keeps only the Identity-Platform items).

### DI-5 · Watcher robustness — fixes G33–G36
- watchCoins: a failed processing pass schedules a **full re-sync** (getCoins re-read) instead of
  permanently dropping the snapshot's changes.
- watchPortfolios: `onError` → toast (parity with watchCoins).
- De-dup the optimistic appends by id (addCoin/addPortfolio) so watcher replacements can't
  transiently duplicate rows.
- On portfolio switch, re-fetch the newly-active portfolio's coins if its meta came in empty
  (stale-metas gap).

### DI-6 · Session & config hardening (D6) — fixes G37–G41
- **Live `users/{uid}` watcher:** tier / premiumLimits / deleted / subscription changes reach the
  open session (toast on tier change; restore-screen on trash). Completes C-A3.
- **Offline detection:** `navigator.onLine` + online/offline listeners → banner/toast "You're
  offline — changes can't save"; block mutating writes while offline (prevents queued duplicate
  replays feeding G15).
- **suspendUser also revokes refresh tokens** (functions; 1 line + audit entry).
- **Admin Plans editor:** blank field = "use default" (null passes through, `mergePlans` treats
  null as default); explicit 0 rejected client- and server-side (min 1).
- **App Check failure handling** → §4 go-live checklist: map App-Check denials to an honest
  "verification failed — reload" message; verify with enforcement ON in staging.

## 5 · Testing & DoD (per wave)
Vitest unit for every new util/message path · rules tests for guarded mutations · node:test
integration for classification, transactions, reconcile callable, zero-portfolio heal · walkthrough
e2e: the founder scenario (long thesis) now caps at 2000 and saves; a forced missing-portfolio
state self-heals; downgrade locks instead of deleting. Suites green (unit/rules/integration) +
`npm run build` clean + live browser sweep before each wave's commit (AGILE.md DoD).

## 6 · Interplay notes
- **Supersedes:** the destructive trim semantics everywhere (R29's `trimToTier(newTier)` on
  purchase completion, U10's trim-to-configured-limits correctness work — the *limits* logic
  survives as the lock derivation). ERRORS.md §A1/§A2's `apiErrorMessage` evolves into the
  verify-then-toast classifier (§A4).
- **Feeds Wave B:** `reconcileMyCounters` + the guards ride the same callable/emulator patterns
  as `functions/guards.js`; the live user-doc watcher is what makes server-side AI-budget/tier
  changes visible mid-session.
- **BL-4:** now only Identity Platform (beforeCreate signups-off, admin 2FA) — the
  reactivate/resolve callables move into DI-4.
