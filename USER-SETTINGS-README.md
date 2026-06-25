# User Accounts & Settings — as-built README

The **how-it-works / where-the-code-lives** guide for account creation, the settings
surface, and account security. Companion to the two design specs — [USER-CREATION.md](USER-CREATION.md)
(how an account is born) and [USER-SETTINGS.md](USER-SETTINGS.md) (what a signed-in user can
change) — and the reusable **`user-creation`** + **`user-settings`** skills.

> **Status (2026-06-25): Wave A BUILT.** All locally-buildable scope (creation C1–C7,
> settings S1–S10 → `NEXT-STEPS.md` §U **U1–U12**) is implemented, committed, and green:
> **unit 238 · integration 10 · rules 20.** Only **Wave B** (MFA, App Check / `beforeCreate`,
> server-side Identity-Platform password policy) remains — all need the Blaze plan + console
> config, so they're "verify at go-live". `currency` formatting is a deferred item.

---

## 1. The surface (what a user sees)

The **Account** screen ([src/components/Account.jsx](src/components/Account.jsx)) is a stack of
cards, danger last (no separate route — S1):

| Card | What it does | Save model |
|---|---|---|
| **Profile** | edit display name · change email (verify-before-update) | explicit Save (re-auth for email) |
| **Plan & Usage** | tier badge · usage bars (configured caps) · **AI-allowance meter** · `custom` badge on overridden limits · upgrade/downgrade · **Update payment method** (Pro+) | — |
| **Security** | change password (re-auth) · **sign out everywhere** | explicit Save |
| **Notifications** | weekly digest · product updates/marketing | **auto-save** toggles |
| **Appearance** | **theme: light / dark / system** | auto-save (applied app-wide) |
| **Privacy & data** | withdrawable **analytics consent** · export CSV/JSON · delete account | auto-save toggle / actions |
| **Danger zone** | delete account = **type `DELETE` + re-auth** → soft-delete (30-day trash) | high-friction |

Registration ([src/components/Login.jsx](src/components/Login.jsx)) captures **Terms + Privacy
(required) + marketing opt-in**, and an unverified user sees a dismissible **"verify your email"**
banner with Resend.

---

## 2. Where the code lives

| Concern | File(s) |
|---|---|
| Auth + account ops | [src/api/firebase-auth.js](src/api/firebase-auth.js) — `registerUser`, `verifyEmail`, `confirmPassword`, `changePassword`, `passwordError`, `updateDisplayName`, `changeEmail`, `updateUserSettings`, `CONSENT_VERSION` |
| Self-service callables (client) | [src/api/account.js](src/api/account.js) — `exportMyData`, `deleteMyAccount`, `restoreMyAccount`, `signOutEverywhere` |
| Admin callables (client) | [src/api/admin.js](src/api/admin.js) — `setUserTier`, `setPremiumLimits`, … |
| Session load (server-authoritative) | [src/hooks/useAuthSession.js](src/hooks/useAuthSession.js) — loads `tier`/`subscription`/`deleted`/`settings`/`premiumLimits`/`emailVerified` |
| Handlers + state + theme effect | [src/CryptoIdea.jsx](src/CryptoIdea.jsx) — `handleAuth`, delete/re-auth, `changeMyPassword`, `signOutEverywhere`, `saveDisplayName`, `requestEmailChange`, `toggleSetting`, the `data-theme` effect, tier-limit + `aiMonthlyCents` derivation |
| Settings/limit UI | [src/components/Account.jsx](src/components/Account.jsx) (`ToggleRow`, `Cust`) |
| Admin custom-limits editor | [src/components/admin-dashboard.jsx](src/components/admin-dashboard.jsx) (`PremiumLimitsEditor`) + [src/hooks/useAdminDashboard.js](src/hooks/useAdminDashboard.js) (`changePremiumLimits`) |
| Server callables / webhook | [functions/index.js](functions/index.js) — `signOutEverywhere`, `setPremiumLimits`, PayPal webhook `tierBeforeFailure` |
| Security boundary | [firestore.rules](firestore.rules) — `validUserData`/`validConsent`/`validSettings`, `configuredLimit` (reads `premiumLimits` for premium, clamped) |
| Theme + tokens | [src/styles/app.css](src/styles/app.css) — `html[data-theme="dark"]` overrides the shared `.ci-app` / `.research-root` tokens |

---

## 3. Data model (closed + validated)

`users/{uid}` — every owner-writable field is shape-checked in the rules; privileged fields are
server-only.

```jsonc
{
  "name": "Ada Lovelace",                 // owner-editable, 2–50 (validUserData)
  "email": "ada@example.com",             // mirrors Firebase Auth
  "tier": "free",                         // SERVER-ONLY (free=Starter / pro / premium)
  "joined": "<serverTimestamp>",          // SERVER-ONLY
  "portfolioCount": 1,
  "premiumLimits": { "coins": 800 },      // SERVER-ONLY admin override (rules-clamped)
  "deleted": false, "deletedAt": null,    // SERVER-ONLY (soft-delete)
  "tierBeforeFailure": "pro",             // SERVER-ONLY (last paid tier after a fail/cancel)

  "consent": {                            // mandatory acceptances — a RECORD (validConsent)
    "termsVersion": "2026-06-24", "termsAcceptedAt": "<ISO>",
    "privacyVersion": "2026-06-24", "privacyAcceptedAt": "<ISO>"
  },
  "settings": {                           // owner-writable prefs — closed map (validSettings)
    "theme": "light",                     // 'light' | 'dark' | 'system'  (WIRED app-wide)
    "currency": "usd",                    // validated; Intl formatting deferred
    "emailDigest": false,
    "emailMarketing": false,              // == withdrawable marketing consent
    "consentAnalytics": false,
    "updatedAt": "<ISO>"
  }
}
```

The owner-update rule blocks `tier`/`joined`/`deleted`/`deletedAt`/`premiumLimits` and shape-checks
`name`/`settings`/`consent` when present. Auto-save toggles write a **partial** settings change with
`setDoc(..., {merge:true})`; the rules validate the **full merged** map.

---

## 4. Security model (the non-negotiables)

- **Re-auth before sensitive ops.** `confirmPassword()` (one shared helper) gates change-password,
  change-email, and delete. Catch `auth/requires-recent-login` and re-prompt.
- **Email change** uses `verifyBeforeUpdateEmail` (never `updateEmail`); the swap lands only after
  the user clicks the link sent to the **new** address.
- **Delete** = type `DELETE` + re-auth → `deleteMyAccount` callable → soft-delete + 30-day trash.
- **Sign out everywhere** = `signOutEverywhere` callable → `admin.auth().revokeRefreshTokens(uid)`
  (changing the password also auto-revokes other sessions).
- **Tiers + custom limits are server-authoritative.** Owners can't write `tier` or `premiumLimits`;
  `configuredLimit()` clamps every limit to `hardMax` (coins ≤ 1,000 — #20) so a custom limit can
  raise *within*, never past, the product ceiling. Client caps and rules agree.
- **AI allowance** comes from `/api/config` plans (server), not a client constant.

---

## 5. Testing

```bash
npm run test:unit         # Vitest (jsdom, api/ mocked) — Account/Login/useUpgrade/admin-api …
npm run test:rules        # firestore.rules vs the emulator — shape rules + premiumLimits clamp
npm run test:integration  # real firebase-auth/db vs auth+firestore emulators — registration + consent + settings
```

**Running while `start:all` is up (ports 8080/9099 busy):** the rules/integration suites follow
`FIRESTORE_EMULATOR_HOST` / `FIREBASE_AUTH_EMULATOR_HOST`, so point them at an **isolated** emulator
on free ports instead of clearing the live one:

```bash
# isolated firebase config (firestore:8099, auth:9098, ui off) committed temporarily, then:
npx firebase emulators:exec --only firestore --config <iso>.json "node --test tests/firestore-rules.test.js"
npx firebase emulators:exec --only auth,firestore --config <iso>.json "node --test --test-force-exit tests/data-layer.test.js"
```

---

## 6. Caveats (verify on next restart / go-live)

- **New Cloud Functions register only on a stack restart.** The `signOutEverywhere` /
  `setPremiumLimits` callables and the webhook `tierBeforeFailure` path are wired,
  rules/UI/wrapper-tested, and syntax-checked, but exercising the actual Admin-SDK / webhook
  **writes** needs `start:all` restarted (the emulator hot-reloads edits, not new triggers).
- **Wave B is go-live only:** MFA/TOTP, App Check enforcement + `beforeCreate`, and the
  server-side Identity-Platform password policy need Blaze + console config (code sketches in
  USER-CREATION.md §6).

---

## 7. See also

- [USER-CREATION.md](USER-CREATION.md) · [USER-SETTINGS.md](USER-SETTINGS.md) — the design specs (locked decisions).
- [NEXT-STEPS.md](NEXT-STEPS.md) §U — the increment backlog (U1–U15) with done/remaining status.
- `user-creation` + `user-settings` skills — the reusable, stack-agnostic frameworks.
