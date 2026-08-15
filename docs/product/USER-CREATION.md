# CryptoIdea — User Creation

Part of the [documentation index](../INDEX.md).

How an account is born in CryptoIdea: registration and consent, the server-authoritative user document, the validation that enforces its shape, and the mandatory plan gate that unlocks a user's data. Companion to [USER-SETTINGS.md](USER-SETTINGS.md) (what a user can change after signup); the security boundary is [firestore.rules](../../firestore.rules), summarized in [SECURITY.md](../security/SECURITY.md); layering rules live in [ARCHITECTURE.md](../decisions/ARCHITECTURE.md).

Tiers are `free` (UI label **Starter**), `pro`, and `premium`. The internal key is always `free`, never `starter`. Limits and pricing come from [PRICING.md](../decisions/PRICING.md).

## The signup flow

The register form ([src/components/Login.jsx](../../src/components/Login.jsx)) collects a name, email, password, two required consent checkboxes (Terms + Privacy) and one optional marketing opt-in (default off), then calls `registerUser(email, password, name, consent)` in [src/api/firebase-auth.js](../../src/api/firebase-auth.js).

```text
Register form (Login.jsx)
  ├─ name        → letters/spaces, 2–30  (client)
  ├─ email       → format check + Firebase Auth format check
  ├─ password    → 8+ with upper/lower/digit/special  (client)
  ├─ [x] I agree to the Terms of Service        (required)
  ├─ [x] I have read the Privacy Policy          (required)
  └─ [ ] Email me product updates & offers       (optional, default off)
        |
        v  registerUser(email, password, name, consent)
  createUserWithEmailAndPassword
  updateProfile({ displayName: name })
  sendEmailVerification               (non-fatal)
  set users/{uid}  { profile + consent + settings, portfolioCount: 0 }
        |
        v  mandatory plan gate  --[choose Starter]-->  chooseFreePlan
        v  soft "verify your email" banner until emailVerified
```

Registration writes only the user profile document. It does **not** create a portfolio — the default portfolio is created server-side the moment a plan choice is recorded (see the onboard gate below). Post-login load lives in [src/hooks/useAuthSession.js](../../src/hooks/useAuthSession.js); `handleAuth` and `saveProfile` live in [src/CryptoIdea.jsx](../../src/CryptoIdea.jsx).

## The user document at creation

`users/{uid}` holds everything written at signup. Server-authoritative fields (`tier`, `subscription`, `deleted*`, `premiumLimits`, `planChosen`) are never owner-writable — they are set only by Admin-SDK callables or the PayPal webhook.

```jsonc
{
  // identity (owner-editable name; email mirrors Auth)
  "name": "Example Name",          // string, 2–50 (rules) / 2–30 (client UX)
  "email": "user@example.com",
  "joined": "<serverTimestamp>",   // pinned to request.time on create; immutable after
  "lastLogin": "<timestamp>",      // owner-writable; refreshed on sign-in

  // plan (server-authoritative; rules force 'free' on create)
  "tier": "free",
  "portfolioCount": 0,

  // consent record (mandatory acceptances — a record, not a toggle)
  "consent": {
    "termsVersion": "<version>",
    "termsAcceptedAt": "<ISO timestamp>",
    "privacyVersion": "<version>",
    "privacyAcceptedAt": "<ISO timestamp>"
  },

  // preferences + withdrawable consents (closed, validated map)
  // Canonical schema in USER-SETTINGS.md. Marketing/analytics live here because
  // GDPR Art. 7(3) requires withdrawal to be as easy as opt-in.
  "settings": {
    "theme": "light",             // 'light' | 'dark' | 'system'
    "currency": "usd",            // validated; display formatting deferred
    "emailDigest": false,
    "emailMarketing": false,      // == the signup marketing opt-in
    "consentAnalytics": false,
    "updatedAt": "<ISO timestamp>"
  }
}
```

The create allowlist in `firestore.rules` accepts exactly these keys: `email`, `name`, `tier`, `joined`, `lastLogin`, `portfolioCount`, `settings`, `consent`. Any other key — including `subscription`, `billingCycle`, `premiumLimits`, `deleted`, `deletedAt`, and `planChosen` — is rejected by the closed-shape `hasOnly` constraint, so no privileged field can be self-seeded.

## Validation — three layers

Defense in depth: a crafted request that skips the UI still hits the rules. Every constraint below is enforced today.

| Field | Client (Login/CryptoIdea) | Server — `registerUser` | Server — `firestore.rules` |
|---|---|---|---|
| **name** | letters/spaces, 2–30, trimmed | trim + re-check | `validUserData`: string, size 2–50 |
| **email** | format regex + required | Firebase Auth format check | stored copy, non-empty string |
| **password** | 8+ upper/lower/digit/special | Firebase Auth floor | n/a (lives in Auth, not Firestore) |
| **consent** | both boxes required to submit | passed through to the write | `validConsent`: closed map, string fields ≤ caps |
| **settings** | defaults only at signup | written from defaults | `validSettings`: closed map, typed, enum/size caps |
| **tier** | n/a | hard-coded `'free'` | `tier == 'free'` on create |
| **portfolioCount** | n/a | `0` | `== 0` on create |
| **joined** | n/a | server timestamp | `== request.time` when present |

The rules functions that enforce this:

- `validUserData(d)` — `name` is a string of size 2–50.
- `validConsent(c)` — a closed map keyed only by `termsVersion`, `termsAcceptedAt`, `privacyVersion`, `privacyAcceptedAt`, each a string within its size cap.
- `validSettings(s)` — a closed map keyed only by `theme`, `currency`, `emailDigest`, `emailMarketing`, `consentAnalytics`, `updatedAt`, each optional but type/enum/size checked when present. `planChosen` is deliberately excluded, so a client cannot smuggle the data gate into `settings`.

The owner-**update** rule uses a closed-shape allowlist on the changed keys — an owner may only touch `name`, `settings`, `consent`, `portfolioCount`, and `lastLogin`, with the same `validUserData`/`validSettings`/`validConsent` checks applied when present, and `portfolioCount` allowed to move by at most +1. Cover every branch with `npm run test:rules`.

## The onboard gate

`planChosen` is a server-only top-level user field that gates all app data. In `firestore.rules`, `isChosen(userId)` returns true when `planChosen == true` **or** the user's `tier` is not `free`, and every owner branch of `portfolios`, `coins`, `transactions`, and `learn` requires it. A signed-in user (or a bot holding their token) who has not recorded a plan choice is denied every data path — read and write — until the gate is cleared. Admin branches are not gated, so staff can manage any account regardless of onboarding state. The user document itself stays readable and writable so onboarding, logout, delete, and the gate UI still work.

The flag is set only server-side:

- The **free path** is the `chooseFreePlan` callable ([functions/index.js](../../functions/index.js)): authenticated, per-uid budget-limited, idempotent, and audited. It sets `planChosen: true` and calls `ensureDefaultPortfolio`.
- The **paid path** is the PayPal webhook (and the emulator-only `devSetMyTier`), which records `planChosen: true` alongside a non-free `tier` and calls `ensureDefaultPortfolio`.

`ensureDefaultPortfolio(uid)` runs in a Firestore transaction: if the user has no portfolio documents it creates the `default` portfolio (`My Portfolio`, `coinCount: 0`) and sets `portfolioCount` to 1; otherwise it reconciles `portfolioCount` to the real count. The transaction makes the read-then-create atomic, so a client watching its own document the instant `isChosen` flips true cannot race in a second portfolio past the free cap.

On the client, `useAuthSession` reads the server `planChosen` flag into the session user. For a not-yet-chosen free user it skips the portfolio load and live listener entirely (the rules would deny those reads) and lets the plan gate render; when the user chooses, the gate's reload picks up the server-created default. The plan chooser is non-dismissible while a choice is still required (no close button, scrim, or Esc).

## Email verification policy

Email verification is a soft nudge, never a hard block on first use:

- **Sent** at registration via `sendEmailVerification` (non-fatal if it fails), with a resend available from the app.
- **Surfaced**: `useAuthSession` reads `fbUser.emailVerified`; when false, the app shows a dismissible "Verify your email — Resend" banner and never blocks the app. Password sign-ups start unverified, so the first profile create is never gated on it.
- **Enforced where it matters**: because tier changes, payment, `exportMyData`, and `deleteMyAccount` are server-side callables, the mailbox-ownership check belongs there (`context.auth.token.email_verified`), not in the client. Low-stakes self-data and preference writes stay ungated so onboarding is not broken.

The rationale is standard for Firebase Auth: `request.auth.uid` proves token possession, not mailbox ownership, so money/tier/PII operations gate on `email_verified` while low-stakes self-data stays open.

## Abuse prevention

- **Signups switch** — `config/app.flags.signupsEnabled` is enforced server-side by the `beforeCreateUser` blocking function ([functions/index.js](../../functions/index.js)). It runs inside account creation, so a scripted or stale client cannot create an account while signups are paused. It reads `config/app` fresh (not through the cached config) and **fails open**: an unreadable config allows the signup, so a storage blip cannot silently kill the signup funnel. The pure decision is unit-tested in [functions/signup-gate.js](../../functions/signup-gate.js). The Admin SDK is exempt, so seeding and admin-created users are unaffected. Deploying a blocking function requires Identity Platform on the project.
- **App Check** — go-live console configuration, not code: set `VITE_RECAPTCHA_SITE_KEY` at build time and enable App Check enforcement (web = reCAPTCHA v3) for Auth and Firestore in the Firebase console. Callable App Check is enforced platform-side, so it is intentionally not wired into the callables in code. Until App Check enforcement is enabled, the app is demo-grade against mass registration.
- **Deferred**: disposable-email / domain blocklists and per-IP rate limiting. Firebase gives the client no way to distinguish refusal reasons, so adding a second refusal path would require reworking the honest client message first.

## Tier at creation

Every account starts on `free`/Starter, enforced by the rules create constraint (`tier == 'free'`), not just the client. Paid tiers are granted only server-side (the admin `setUserTier` callable or the PayPal webhook); there is no path for a user to self-assign a paid tier. Tier behavior after creation — upgrade, downgrade, custom limits, and the AI allowance — is covered in [USER-SETTINGS.md](USER-SETTINGS.md).

## Best practices applied

- Granular, demonstrable consent with withdrawal as easy as opt-in (GDPR Art. 7(3)): mandatory acceptance records are stored separately from the withdrawable marketing/analytics toggles.
- `email_verified` gating lives in the rules/callable layer, not the client, and never hard-blocks the first profile create.
- Closed-shape profile rules (`keys().hasOnly`, typed fields, size caps) prevent self-privilege-escalation, the most common Firebase rules bug.
