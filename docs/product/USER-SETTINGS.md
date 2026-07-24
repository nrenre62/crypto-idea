# Crypto Idea — User Settings (account surface)

**Canonical spec for everything a signed-in user can change.** Companion to
[USER-CREATION.md](USER-CREATION.md) (how the account is born) and
[PRODUCT-DECISIONS.md](../decisions/PRODUCT-DECISIONS.md). Security boundary =
[firestore.rules](../../firestore.rules) + the `functions/index.js` callables. Reusable
framework = the **`user-settings`** skill.

> Decisions locked in the 2026-06-24 founder interview. Tiers: `free` (UI **Starter**),
> `pro`, `premium` — internal key is always `free`. Limits/pricing: [PRICING.md](../decisions/PRICING.md).

> **Status (2026-06-25): BUILT.** Every S1–S10 decision below is implemented and committed
> (`NEXT-STEPS.md` §U **U1–U12**; unit 238 / integration 10 / rules 20 green), including full
> light/dark/system theming and `premiumLimits` end-to-end. The **as-built dev guide**
> (file map, testing, caveats) is [USER-SETTINGS-README.md](USER-SETTINGS-README.md). Only
> **Wave B** (MFA, App Check — go-live) remains. This doc stays the **design record**: the
> "Today" column in §3 and the **Done ✓** statuses in §8 reflect that the work shipped.

---

## 1. Locked decisions (settings)

| # | Decision | Choice |
|---|---|---|
| S1 | **Information architecture** | **Tabs/sections inside the existing Account screen** (no new route) |
| S2 | **First increment scope** | **All four**: Security + consent · Profile edit · Notifications · Appearance |
| S3 | **Currency vs theme** | **Wire theme (dark mode) now**; keep `currency` validated-but-deferred |
| S4 | **Notification scope** | **Email categories** (digest + marketing) in the settings map; persist now, send later |
| S5 | **Re-auth pattern** | **One shared `confirmPassword()` modal** wrapping `reauthenticateWithCredential` |
| S6 | **Account-delete friction** | **Re-auth + type `DELETE`** in an isolated red Danger Zone |
| S7 | **Sign-out everywhere** | **Build the `signOutEverywhere` revoke callable now** (`revokeRefreshTokens`) |
| S8 | **Premium custom limits** | **Implement end-to-end** (admin writes, rules enforce, Account displays) |
| S9 | **Payment-method update** | **Deep-link to PayPal's hosted update flow** (no vault API now) |
| S10 | **Email-change flow** | `verifyBeforeUpdateEmail` (not `updateEmail`); mirror to Firestore only after the link is clicked |

---

## 2. Information architecture (S1)

Sections render as cards/segments on the **Account** screen
([src/components/Account.jsx](../../src/components/Account.jsx)), top → bottom, danger last.
Mobile = full-width stacked cards (the app is phone-first); each control group has a
clear heading. The **Danger Zone** is visually isolated (red border + warning glyph,
not color alone) and physically farthest from any benign Save.

```
Account
├─ Profile           name (edit) · email (+verify state) · avatar initial · joined
├─ Plan & Usage      tier badge · usage meters · AI allowance meter · upgrade/downgrade
│                    · subscription status · Update payment method (Pro+)
├─ Security          change password · sign out everywhere · (2FA → go-live)
├─ Notifications     email: weekly digest · product updates/marketing
├─ Appearance        theme: light/dark/system (WIRED) · currency (deferred)
├─ Privacy & Data    export CSV · export JSON · consent toggles (marketing/analytics)
└─ Danger Zone       delete account  (re-auth + type DELETE)
```

### Save model (never mix within one card)

| Control type | Save | Feedback |
|---|---|---|
| Toggles / single-select (theme, notification switches, consent) | **Auto-save** on change | inline "Saved" tick |
| Text forms (display name, change password) | **Explicit Save** button, always enabled, bottom-left, active-verb label ("Save name") | inline confirmation; **preserve input on failure** |

WCAG 2.2: every field has a `<label>`; visible focus ring; full keyboard operability;
`aria-live` announces async save results; touch targets ≥ 44 px.

---

## 3. What's editable today vs. target

| Setting | Today | Target |
|---|---|---|
| Display name | read-only | **editable** (updateProfile + saveProfile), 2–30 letters |
| Email | read-only | **change** via `verifyBeforeUpdateEmail` + re-auth (S10) |
| Email verified state | not shown | **banner + resend** |
| Password | forgot-flow only (must sign out) | **change in-app** behind re-auth |
| Theme | written, never read | **light/dark/system**, persisted + applied |
| Currency | written, never read | **validated + stored**; formatting deferred |
| Notifications | none | **digest + marketing** toggles |
| Consent (marketing/analytics) | none | **toggles**, withdrawal = opt-in |
| Sign out everywhere | none | **revoke callable** (S7) |
| Default portfolio | localStorage only | `profile.defaultPortfolioId` (Pro+) |
| Payment method | status only | **PayPal-hosted link** (S9) |
| Delete account | 2-click, no re-auth | **re-auth + type DELETE** (S6) |
| AI allowance | invisible | **server-authoritative meter** |
| Premium custom limits | phantom dead code | **real, admin-set, rules-enforced** (S8) |

---

## 4. The settings data model (canonical)

`users/{uid}.settings` — a **closed, typed, size-capped** map (the
`validLearnProgress`/`validJournal` discipline). This is the single source of truth;
[USER-CREATION.md](USER-CREATION.md) writes its defaults at signup.

```jsonc
"settings": {
  "theme": "light",            // 'light' | 'dark' | 'system'   — WIRED (S3)
  "currency": "usd",           // enum string ≤ 8 chars         — validated, deferred
  "emailDigest": false,        // weekly portfolio digest        (S4)
  "emailMarketing": false,     // product updates / offers == marketing consent
  "consentAnalytics": false,   // analytics/cookie consent
  "updatedAt": "2026-06-24T…"  // ISO, ≤ 40 chars
}
```

Notes:
- **Transactional emails** (payment-failed, security) have **no toggle** — they always
  send; only `emailDigest`/`emailMarketing` are user-controllable. Keeps the map small
  and matches "you can't opt out of essential mail."
- **Mandatory** Terms/Privacy acceptance lives in the separate `consent` map
  (USER-CREATION.md §3), not here — those are records, not withdrawable toggles.
- `currency` is stored and validated now; `Intl.NumberFormat` wiring across price/P&L
  displays is a later increment (S3).

### Firestore rules — `validSettings()`

```
function validSettings(s) {
  return s is map
         && s.keys().hasOnly(['theme','currency','emailDigest','emailMarketing','consentAnalytics','updatedAt'])
         && (!('theme' in s)            || s.theme in ['light','dark','system'])
         && (!('currency' in s)         || (s.currency is string && s.currency.size() <= 8))
         && (!('emailDigest' in s)      || s.emailDigest is bool)
         && (!('emailMarketing' in s)   || s.emailMarketing is bool)
         && (!('consentAnalytics' in s) || s.consentAnalytics is bool)
         && (!('updatedAt' in s)        || (s.updatedAt is string && s.updatedAt.size() <= 40));
}
```

---

## 5. Owner-update rule (the security boundary)

Extends the current `users/{uid}` update rule
([firestore.rules:102](../../firestore.rules#L102)). Server-only keys stay blocked and now
include **`premiumLimits`** (admin-only, S8); shape is checked when present.

```
allow update: if isAdmin() || (
  isOwner(userId)
  // server-authoritative fields owners may NEVER write:
  && !request.resource.data.diff(resource.data).affectedKeys()
        .hasAny(['tier','joined','deleted','deletedAt','premiumLimits'])
  && counterDeltaOk('portfolioCount')
  // closed-shape checks when the field is present in the write:
  && (!('name'     in request.resource.data) || validUserData(request.resource.data))
  && (!('settings' in request.resource.data) || validSettings(request.resource.data.settings))
  && (!('consent'  in request.resource.data) || validConsent(request.resource.data.consent))
);
```

> Without this, an owner can write a 1000-char `name` (breaks the Account render) or
> `settings:{theme:null, extra:'x'}`. `hasOnly` + type checks turn the profile into a
> closed schema; privileged fields stay server-controlled. Cover every branch with
> `npm run test:rules`.

---

## 6. Security flows

All sensitive Auth ops share **one** re-auth helper (S5). Firebase throws
`auth/requires-recent-login` for these — catch it everywhere and re-prompt.

```js
// firebase-auth.js — the one helper everything reuses
import { reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
export async function confirmPassword(currentPassword) {
  const u = auth.currentUser;
  const cred = EmailAuthProvider.credential(u.email, currentPassword);
  await reauthenticateWithCredential(u, cred);   // throws on wrong pw / stale session
}
```

| Flow | Steps | Notes |
|---|---|---|
| **Change password** | `confirmPassword(old)` → `updatePassword(new)`; same 8+/Aa1+special rule | Firebase **auto-revokes other sessions** on password change → doubles as sign-out-everywhere |
| **Change email** (S10) | `confirmPassword(pw)` → `verifyBeforeUpdateEmail(user, newEmail, actionCodeSettings)` | Email swaps **only after** the new-address link is clicked; mirror to Firestore then, never optimistically (`updateEmail` is deprecated under email-enumeration protection, default-on since 2023-09-15) |
| **Delete account** (S6) | type `DELETE` + `confirmPassword(pw)` → `deleteMyAccount` callable (soft-delete, 30-day trash) | Re-auth blocks an open/hijacked session from deleting |
| **Sign out everywhere** (S7) | `signOutEverywhere` callable → `admin.auth().revokeRefreshTokens(uid)` | New `functions/index.js` callable; forces every device to re-auth. Verify with `verifyIdToken(idToken, true)` **only** on sensitive backend ops |
| **Verify email** | banner → `verifyEmail()` resend | non-blocking (USER-CREATION.md §5) |

`actionCodeSettings.url` → the app origin (`APP_URL`), already an env var.

---

## 7. Tier-aware settings

### Usage & AI allowance meters
- **Usage bars** already exist (portfolios/coins/tx). Keep; ensure they read the
  **configured** caps (`site.plans`), not hardcoded numbers, so admin overrides show.
- **AI allowance meter** — ~~surface `aiMonthlyCents` server-authoritatively~~
  **SUPERSEDED by CACHE-POLICY C7 / NEXT-STEPS C-A4 (built 2026-07-03):** users never see
  an AI budget/usage number — the Plan & billing row reads **"AI research · Live"** with
  no figures (caching/cost is an internal lever, invisible to users — C6). Usage and
  $-cost move to the **admin** dashboard (C-B7, with the B2 enforcement counter). The
  server-side budget itself is the per-uid daily counter in `functions/guards.js`.

### Premium custom limits — implement end-to-end (S8)
The `premiumLimits` override read at `CryptoIdea.jsx:277` is currently **dead** (never
written/loaded). Make it real:

1. **Admin UI** (`admin-dashboard.jsx`) — per-user `premiumLimits {portfolios?, coins?, transactions?}`.
2. **Callable** `setPremiumLimits` writes `users/{uid}.premiumLimits` (admin-only).
3. **Rules** — `configuredLimit()` for a **premium** user reads `premiumLimits` first,
   then `config/app.plans`, then the default — **all clamped to `hardMax`** (coins can
   never exceed 1,000 — decision #20). `premiumLimits` is in the owner-update **blocklist**
   (§5) so it's server-only.
4. **Account** — show "custom" vs "tier default" when a custom limit is set.
5. **Tests** — `test:rules` with an overridden per-user limit.

> Security: custom limits may only **lower or raise within `hardMax`**, never past the
> product ceiling — same two-layer agreement (`mergePlans` `Math.min` ↔ rules `hardMax`)
> that already protects against denial-of-wallet.

### Downgrade trim must respect configured limits
`trimToTier()` ([useUpgrade.js:87](../../src/hooks/useUpgrade.js#L87)) trims to **hardcoded**
`TIER_LIMITS` while enforcement reads **configured** `config/app.plans`. If an admin
raised a cap, a downgrade silently deletes data the admin meant to keep. **Fix:** pass
`site.plans` into `useUpgrade`/`trimToTier`; add a rules-backed test with an overridden cap.

### Plan & billing card
- Subscription status (renews / cancelled / payment-failed grace) — already present.
- **Update payment method** (Pro+) — button deep-links to PayPal's hosted update page (S9).
- **`tierBeforeFailure`** — record the paid tier when a charge fails (PayPal webhook or
  first client detection) so support/analytics don't lose "was Pro" after auto-downgrade.
  Add/confirm a `PAYMENT.SALE.DENIED`/failure handler in the webhook.

### Tier naming hygiene
One-line comment at each tier-key definition (`DEFAULT_PLANS`, `TIER_LIMITS`,
`configuredLimit`): *"free (aka Starter), pro, premium — internal key is `free`, UI label
Starter."* Ensure no code ever checks `'starter'`.

---

## 8. Gaps → status

**Done ✓** = shipped (`NEXT-STEPS.md` §U U1–U12) · **Go-live** = launch checklist (Wave B) · **Deferred** = backlog.

| Gap | Sev | Fix | Status |
|---|---|---|---|
| No change-password (must sign out) | High | §6 re-auth + `updatePassword` | **Done ✓** |
| Account delete has no re-auth | High | §6 S6 re-auth + type DELETE | **Done ✓** |
| No display-name edit | Med | §3 editable name + validation | **Done ✓** |
| Orphan `settings` map (unread, unvalidated) | Med→Low | §4 wired + `validSettings` | **Done ✓** |
| Theme never applied (no dark mode) | Low | §7 wire `settings.theme` | **Done ✓** |
| No notification prefs | Med | §4 digest + marketing toggles | **Done ✓** |
| No consent toggles / withdrawal | High | §4 marketing/analytics toggles | **Done ✓** |
| AI allowance invisible / client-sourced | High | §7 server-authoritative meter | **Done ✓** |
| `premiumLimits` phantom dead code | High | §7 implement end-to-end (S8) | **Done ✓** |
| Downgrade trims to hardcoded, not configured, caps | High | §7 pass `site.plans` to trim | **Done ✓** |
| No "sign out everywhere" | High | §6 revoke callable (S7) | **Done ✓** |
| No "Update payment method" (churn on failure) | High | §7 PayPal link (S9) | **Done ✓** |
| Change-email naive `updateEmail` would fail/hijack | High | §6 `verifyBeforeUpdateEmail` (S10) | **Done ✓** |
| Lost paid tier after payment-fail downgrade | Med | §7 `tierBeforeFailure` | **Done ✓** |
| Default-portfolio pref only in localStorage | Low | §3 `defaultPortfolioId` | **Deferred** |
| Restore has no cooldown (delete/restore harassment) | Low | 24h `restoreLockedUntil` | **Deferred** |
| In-app card details (last-4/expiry) | — | PayPal vault + SSRF-safe proxy | **Deferred** |
| 2FA/MFA for users & admins | Med | Identity Platform TOTP | **Go-live** |
| Full channel × category notification matrix | — | push/in-app + frequency + quiet hours | **Deferred** |

---

## 9. Best practices applied (with sources)

- **Settings IA & save model** — predictable sections, danger isolated, one save model
  per form, inline "Saved" over toasts.
  GitHub Primer <https://primer.style/product/ui-patterns/saving/> ·
  Memorable <https://memorable.design/saas-settings-page-examples/>
- **Destructive-action friction by severity** — type-to-confirm + re-auth for irreversible.
  Smashing <https://www.smashingmagazine.com/2024/09/how-manage-dangerous-actions-user-interfaces/> ·
  NN/G <https://www.nngroup.com/articles/proximity-consequential-options/>
- **Re-auth before sensitive ops; `verifyBeforeUpdateEmail`; `revokeRefreshTokens`** —
  Firebase manage-users <https://firebase.google.com/docs/auth/web/manage-users> ·
  manage-sessions <https://firebase.google.com/docs/auth/admin/manage-sessions>
- **Closed-shape rules / no self-privilege-escalation** —
  <https://firebase.google.com/docs/firestore/security/rules-fields>
- **Notification prefs & GDPR withdrawal (Art. 7(3))** —
  SuprSend <https://www.suprsend.com/post/notification-preference-center>
- **Usage meters + contextual upgrade nudges (not timers)** —
  Appcues <https://www.appcues.com/blog/best-freemium-upgrade-prompts>
- **WCAG 2.2 + ARIA tabs + ≥44 px targets** —
  <https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA>

---

## 10. Build order & Definition of Done

> **Steps 1–6 are DONE** (shipped as `NEXT-STEPS.md` §U U1–U12, each TDD'd + committed);
> step 7 (Go-live) is Wave B. As-built detail: [USER-SETTINGS-README.md](USER-SETTINGS-README.md).

1. ✓ **Rules + model** — `validSettings`/`validConsent`/`validUserData`, owner-update
   blocklist incl. `premiumLimits`. `test:rules` green first (TDD).
2. ✓ **Re-auth core** — `confirmPassword()` helper + shared modal; gate delete (re-auth +
   type DELETE).
3. ✓ **Security tab** — change password; `signOutEverywhere` callable + button.
4. ✓ **Profile tab** — editable name; email-verify banner/resend; change-email
   (`verifyBeforeUpdateEmail`).
5. ✓ **Notifications + Appearance + Privacy tabs** — digest/marketing/analytics toggles
   (auto-save); theme light/dark/system applied via a root `data-theme` attribute + shared
   CSS-variable tokens; currency stored.
6. ✓ **Tier surface** — server-authoritative AI meter; configured-cap usage bars;
   downgrade-trim fix; `premiumLimits` end-to-end (admin + rules + display); PayPal
   update link; `tierBeforeFailure`.
7. **Go-live** — MFA enrolment (the enforcement gate is built: ADMIN-0 `flags.requireAdminMfa`, default OFF), App Check (console-only) — shared with USER-CREATION §6.

**DoD per increment:** KISS + secure, `test:unit`/`test:rules` green, re-auth on every
sensitive op, no secret shipped, rules verified in the emulator, committed, this doc
updated if behavior changed.
