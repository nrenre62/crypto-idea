# Data Integrity

How CryptoIdea keeps a user's portfolio state honest and self-correcting: writes report their true reason for failing, broken session state repairs itself, per-user counters cannot be forged, an over-limit downgrade keeps data instead of deleting it, and a pending downgrade resolves through fail-closed server callables.

Part of [Security](../security/SECURITY.md) — this is a product-behavior view of the same rules boundary. See also [Architecture](../decisions/ARCHITECTURE.md) and the [docs index](../INDEX.md).

## Verify-then-toast on writes

Every mutating write returns `{ success, error, code, reason }`. On a rejected write the data layer (`src/api/firebase-database.js`) classifies the denial into a `reason` — `'limit'`, `'missing-target'`, `'invalid-or-denied'`, or `'not-found'` — instead of guessing.

The UI (`src/CryptoIdea.jsx`) shows the limit-and-upgrade message ONLY when `reason === 'limit'`:

- `'limit'` also triggers a counter reconciliation (see below), because a limit denial after a passing local pre-check means the counter has drifted high.
- `'missing-target'` shows a "no longer exists — resyncing" message and lets the self-heal effect repair the dangling id.
- Any other reason shows neutral, honest copy — never the upgrade prompt.

Every failure site logs `res.error` to the console via `failToast`, so diagnostics are not silently discarded. Client-side length caps mirror the `firestore.rules` bounds (thesis / change-my-mind / each funnel field ≤ 2000 chars, portfolio name ≤ 50, transaction amount and price within bounds) so an over-length input is rejected before it reaches the server rather than surfacing as a fake limit.

## Active-portfolio self-heal

The session hook (`src/hooks/useAuthSession.js`) and a reconciliation effect in `src/CryptoIdea.jsx` keep the active-portfolio id valid at all times:

- Zero-portfolio account (a failed registration step or a delete race) recreates the default portfolio on load, so no session strands on a phantom "default" id that every write fails against.
- A transient portfolio-load failure surfaces a Retry state instead of the phantom default.
- Whenever `portfolios` changes and `activePortId` is no longer in the set, the effect re-points it to the first portfolio — covering a remote delete of the active portfolio and any other dangling id.
- Writes never target a ghost id: the add paths guard against an `activePortId` that is not in the loaded set.

## Forge-proof counters

Per-user counters (`portfolioCount`, `coinCount`, `txCount`) cannot be driven down by a client, which would otherwise let a user slip past a tier cap.

- `firestore.rules` `counterNoForge(field)` allows a client counter write only to stay equal or rise by exactly 1 (the create path's `+1`). A client can never decrement.
- Client deletes therefore leave the counter fail-safe high (it can only make the cap stricter), never low.
- The `reconcileMyCounters` callable (`functions/index.js`) recomputes `portfolioCount` / `coinCount` / `txCount` from the real documents in the caller's own tree, using the Admin SDK so it bypasses the client rule. It acts only on `context.auth.uid` (no cross-tenant access), is bounded by a per-uid daily budget, and is audited.
- The client fires `reconcileMyCounters` silently after a delete (to bring a fail-safe-high count back to truth) and again on a `'limit'` denial (to correct drift so the user can retry against the real count).

The `users/{uid}` document is a closed shape: the create allowlist uses `hasOnly`, and the privileged, server-only fields (`subscription`, `billingCycle`, `tierBeforeFailure`, `paypalSubscriptionId`, `premiumLimits`, `deleted`, `deletedAt`, `planChosen`) are blocked from any client write. The blanket admin write/delete branches over user data are owner-only, so a manager's browser token cannot bypass the closed shape or `counterNoForge` from devtools.

## Keep-data downgrade with grey-lock

A downgrade never deletes user data. Over-limit items are kept and rendered locked:

- `lockedPortfolioIds` / `lockedCoinIds` (`src/hooks/useUpgrade.js`) derive the locked set from the current effective caps (which already fold in `premiumLimits`).
- A locked portfolio or coin renders dimmed with an "Over plan limit" tag and a tap-explainer offering Upgrade; the whole active portfolio can lock if it is itself over the portfolio cap.
- Deleting a locked item is always allowed, so a user can get back under the cap without upgrading.

Because nothing is deleted locally or server-side, the live sync watchers have nothing to "undo".

## Re-checkout resolution

A cancellation never drops a tier immediately — access runs to `endDate`, and the daily subscription sweep applies the real transition. Two fail-closed callables in `functions/index.js` persist the user's downgrade decision, since owners cannot write the `subscription` marker themselves:

- `resolveRecheckout` clears the kept `subscription` marker once the user resolves a pending re-checkout. It acts on `context.auth.uid` only and is audited.
- `reactivateSubscription` ("Keep my plan") is the fail-closed un-cancel, decided by the pure `billing.keepPlanPatch`. Every pending cancellation in this app already has a terminally-cancelled PayPal subscription, so the patch never un-cancels back to a paid tier. When a future-start scheduled subscription exists (the server-only `subscription.scheduledNext` marker), the callable keeps the cancel-to-free marker, drops the schedule, and cancels the not-yet-started PayPal subscription — the user re-subscribes rather than silently regaining paid access. It uses `update()` (not a merge) so dropping the schedule actually deletes it in Firestore.

Both callables are emulator-testable and audited through the single-writer audit choke point.
