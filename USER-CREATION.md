# Crypto Idea — User Creation (account & onboarding)

**Canonical spec for how an account is born:** registration → consent → default
profile → first usable portfolio. Companion to [USER-SETTINGS.md](USER-SETTINGS.md)
(what a user can change *after* signup) and [PRODUCT-DECISIONS.md](PRODUCT-DECISIONS.md)
(product/pricing decisions). Security model lives in [firestore.rules](firestore.rules);
the reusable framework is the **`user-creation`** skill.

> Decisions locked in the 2026-06-24 founder interview. This doc **wins** over any
> stale planning note for account-creation behavior. Limits/pricing come from
> [PRICING.md](PRICING.md); tiers are `free` (UI label **Starter**), `pro`, `premium`
> — the internal key is always `free`, never `starter`.

---

## 1. Locked decisions (creation)

| # | Decision | Choice | Why |
|---|---|---|---|
| C1 | **Consent at signup** | Terms **required** + Privacy **required** + marketing **opt-in (default off)** | GDPR-demonstrable, granular, standard. Records survive disputes. |
| C2 | **Email verification** | **Soft nudge + gate sensitive ops** — explore freely, resendable banner, verify required before money/PII ops | Low onboarding friction; protects what matters. Password sign-ups start unverified, so first profile create is never blocked. |
| C3 | **Password policy** | Fix the error message now (`6`→`8`); enforce server-side via **Identity Platform require-mode** at go-live | Client checks are bypassable; backend policy is the real boundary, but staging it keeps this increment small. |
| C4 | **Atomic onboarding write** | **Sequenced two-write create**: profile (`portfolioCount:0`), then a batch (default portfolio + counter→1) | A literal single batch is impossible: the counter rule needs the parent user doc to pre-exist (`getAfter==get+1`) and Firestore forbids two writes to one doc per batch. This is the rules-compatible equivalent; a failed 2nd step leaves a user with no portfolio (recoverable), never a corrupt half-state. |
| C5 | **Plan picker** | Add **"Skip for now / Explore Starter"** | Starter is already the default; don't force a choice before value is shown. |
| C6 | **Abuse prevention** | App Check enforcement + `beforeCreate` blocking function = **go-live checklist**, documented as such until then | Needs Blaze + console config; today the app is demo-grade against bot signups. |
| C7 | **Server-side input validation** | Trim + bounds-check name/email in `registerUser`, backed by a `validUserData()` **rules** create constraint | Client validation alone is bypassable via a crafted request. |

---

## 2. The flow (target state)

```
Register form (Login.jsx)
  ├─ name        → /^[A-Za-z\s]{2,30}$/  (client)         ┐ both layers
  ├─ email       → RFC-ish + Firebase format check        │ must pass
  ├─ password    → 8+  Aa1 + special  (client)            ┘
  ├─ ☑ I agree to the Terms of Service        (required)
  ├─ ☑ I have read the Privacy Policy          (required)
  └─ ☐ Email me product updates & offers       (optional, default off)
        │
        ▼  handleAuth() → registerUser(email, password, name, consent)
  createUserWithEmailAndPassword
  updateProfile({ displayName: name })
  sendEmailVerification               (non-fatal)
  ── (1) profile write ───────────────────────────────────
   set users/{uid}      { profile + consent + settings, portfolioCount:0 }
  ── (2) ONE writeBatch (counter rule needs the parent to exist first) ──
   set users/{uid}/portfolios/default { name:"My Portfolio", coinCount:0 }
   update users/{uid}.portfolioCount: increment(1)   → 1
  ─────────────────────────────────────────────────────────
        │
        ▼  Plan picker (Starter default)  ──[Skip for now]──► Portfolio
        ▼  Soft "verify your email" banner until emailVerified
```

Current code: [src/api/firebase-auth.js](src/api/firebase-auth.js) `registerUser`,
[src/components/Login.jsx](src/components/Login.jsx) register form + plan picker,
[src/hooks/useAuthSession.js](src/hooks/useAuthSession.js) post-login load,
[src/CryptoIdea.jsx](src/CryptoIdea.jsx) `handleAuth` + `saveProfile`.

---

## 3. The user document at creation

`users/{uid}` — everything written at signup. Server-authoritative fields
(`tier`, `subscription`, `deleted*`, `premiumLimits`) are **never** owner-writable.

```jsonc
{
  // ── identity (owner-editable name; email mirrors Auth) ──
  "name": "Ada Lovelace",          // string, 2–50 (rules) / 2–30 (client UX)
  "email": "ada@example.com",
  "joined": "<serverTimestamp>",   // server-only after create

  // ── plan (server-authoritative; rules force 'free' on create) ──
  "tier": "free",
  "portfolioCount": 0,             // → 1 in the same batch

  // ── consent record (mandatory acceptances; C1) ──
  "consent": {
    "termsVersion": "2026-06-24",
    "termsAcceptedAt": "2026-06-24T10:00:00.000Z",
    "privacyVersion": "2026-06-24",
    "privacyAcceptedAt": "2026-06-24T10:00:00.000Z"
  },

  // ── preferences + withdrawable consents (closed, validated map) ──
  // Canonical schema in USER-SETTINGS.md §4. Marketing/analytics live here
  // because GDPR Art. 7(3) requires withdrawal to be as easy as opt-in.
  "settings": {
    "theme": "light",             // 'light' | 'dark' | 'system'  (WIRED)
    "currency": "usd",            // validated; formatting deferred
    "emailDigest": false,
    "emailMarketing": false,      // == the signup marketing opt-in
    "consentAnalytics": false,
    "updatedAt": "2026-06-24T10:00:00.000Z"
  }
}
```

> **Removed orphan:** the old registration wrote `settings:{currency,theme}` that
> nothing read. We keep `settings` but as a **closed, rules-validated** map that the
> Appearance/Notifications/Privacy tabs actually use (see USER-SETTINGS.md).

---

## 4. Validation — three layers

Defense in depth: a crafted request that skips the UI still hits the rules.

| Field | Client (Login/CryptoIdea) | Server — `registerUser` | Server — `firestore.rules` |
|---|---|---|---|
| **name** | `/^[A-Za-z\s]{2,30}$/`, trimmed | trim + re-check 2–30 letters/spaces | `validUserData`: `name is string && size 2..50` |
| **email** | format regex + required | Firebase Auth format check | (stored copy) non-empty string |
| **password** | 8+ upper/lower/digit/special | Firebase floor (go-live: Identity Platform policy) | n/a (lives in Auth, not Firestore) |
| **consent** | both boxes required to enable submit | passed through to the batch | `validConsent`: closed map, string fields ≤ caps |
| **settings** | defaults only at signup | written from defaults | `validSettings`: closed map, typed, enum/size caps |
| **tier** | n/a | hard-coded `'free'` | `request.resource.data.tier == 'free'` |
| **portfolioCount** | n/a | `0` then `increment(1)` | `== 0` on create |

### Rules to add (in the existing `validLearnProgress`/`validJournal` style)

```
// users/{uid} — create
allow create: if isOwner(userId)
              && request.resource.data.tier == 'free'
              && request.resource.data.get('portfolioCount', 0) == 0
              && validUserData(request.resource.data)
              && (!('consent'  in request.resource.data) || validConsent(request.resource.data.consent))
              && (!('settings' in request.resource.data) || validSettings(request.resource.data.settings));

function validUserData(d) {
  return d.name is string && d.name.size() >= 2 && d.name.size() <= 50;
}
function validConsent(c) {
  return c is map
         && c.keys().hasOnly(['termsVersion','termsAcceptedAt','privacyVersion','privacyAcceptedAt'])
         && c.termsVersion is string && c.termsVersion.size() <= 20
         && c.termsAcceptedAt is string && c.termsAcceptedAt.size() <= 40
         && c.privacyVersion is string && c.privacyVersion.size() <= 20
         && c.privacyAcceptedAt is string && c.privacyAcceptedAt.size() <= 40;
}
// validSettings — defined canonically in USER-SETTINGS.md §4 (shared with the
// owner-update rule). Keep ONE copy in firestore.rules.
```

The owner-**update** rule must keep blocking server-only keys and now also shape-check
`name`/`consent`/`settings` when present — full version in [USER-SETTINGS.md](USER-SETTINGS.md) §5.
Cover every branch with `npm run test:rules`.

---

## 5. Email verification policy (C2)

- **Sent** at registration (already happens, non-fatal). Add a `verifyEmail()` resend
  in `firebase-auth.js` (`sendEmailVerification(auth.currentUser)`).
- **Surfaced**: `useAuthSession` reads `fbUser.emailVerified`; if `false`, the app shows
  a dismissible **"Verify your email — [Resend]"** banner on Portfolio. Never blocks the app.
- **Enforced where it matters** — because `tier`, payment, `exportMyData`, and
  `deleteMyAccount` are **server-side callables**, the gate lives *there*:
  `if (!context.auth.token.email_verified) throw ...` before upgrade-intent and data export.
  In `firestore.rules`, add an `emailVerified()` helper for any *client-written* sensitive
  field added later; today the client writes only its own low-stakes data + preferences,
  which stay ungated so onboarding isn't broken (password sign-ups start unverified).

> Rationale (Firebase): `request.auth.uid` proves token possession, not mailbox
> ownership. Gate money/tier/PII on `request.auth.token.email_verified`; keep
> low-stakes self-data ungated. Sources in §9.

---

## 6. Abuse prevention (C6 — go-live)

`signupsEnabled` / `maintenance` are **client-only gates today** (`Login.jsx`,
`CryptoIdea.jsx`). A bot can call Firebase Auth directly. Before public launch:

1. **App Check** — set `VITE_RECAPTCHA_SITE_KEY` at build; enable enforcement in the
   Firebase console for Auth + Firestore (web = reCAPTCHA v3). Init already exists in
   `firebase.config.js`.
2. **`beforeCreate` blocking function** (`functions/index.js`) — enforce `signupsEnabled`
   **server-side**, rate-limit by `context.ipAddress`, optionally block disposable domains.
   This is the real signups-off switch.
3. Until both ship, **document the app as demo-grade** against mass registration.

---

## 7. Tier at creation

Every account starts **`free`/Starter** — enforced by the rules create constraint
(`tier == 'free'`), not just the client. Paid tiers are granted only server-side
(admin `setUserTier` or the PayPal webhook). There is **no** path for a user to
self-assign a paid tier. See [USER-SETTINGS.md](USER-SETTINGS.md) §6 for tier behavior
*after* creation (upgrade/downgrade, custom limits, AI allowance).

---

## 8. Gaps → status

From the gap audit (creation slice). Status: **Now** = this increment · **Go-live** =
launch checklist · **Deferred** = backlog.

| Gap | Sev | Fix | Status |
|---|---|---|---|
| Verification sent but never checked/resendable | High | §5 banner + `verifyEmail()` resend + callable gate | **Now** |
| No Terms/Privacy/marketing consent capture | High | §1 C1, §3 consent record + `validConsent` | **Now** |
| Password error says "6" but rule is "8" | Low | Align message in `firebase-auth.js` | **Now** |
| Non-atomic onboarding write (portfolio can be orphaned) | Low | §2 single `writeBatch` | **Now** |
| No server-side name/email validation | Med | §4 `registerUser` + `validUserData` | **Now** |
| No profile-shape rules (any name length, any settings) | Med | §4 `validUserData`/`validConsent`/`validSettings` | **Now** |
| Plan picker forces a choice | Low | §1 C5 "Skip for now" | **Now** |
| No App Check / `beforeCreate` / server signups gate | High | §6 | **Go-live** |
| No 2FA/MFA (users or admins) | Med | Identity Platform TOTP enrollment | **Go-live** |
| Disposable-email / domain policy | Low | `beforeCreate` allow/deny list | **Deferred** |

---

## 9. Best practices applied (with sources)

- **Granular, demonstrable consent; withdrawal as easy as opt-in** (GDPR Art. 7(3)) —
  separate mandatory acceptance records from withdrawable marketing/analytics toggles.
  <https://secureprivacy.ai/blog/first-party-data-collection-compliance-gdpr-ccpa-2025>
- **`email_verified` gating belongs in the rules/callable layer, not the client; don't
  hard-block first profile create** (password sign-ups start unverified).
  <https://firebase.google.com/docs/rules/rules-and-auth>
- **Server-enforced password policy** (Identity Platform require-mode, `minLength ≥ 8`,
  mirror client with `validatePassword`). <https://docs.cloud.google.com/identity-platform/docs/password-policy>
- **Closed-shape profile rules** (`keys().hasOnly`, typed fields, size caps) prevent
  self-privilege-escalation — the single most common Firebase rules bug.
  <https://firebase.google.com/docs/firestore/security/rules-fields>
- **Atomic multi-doc writes** via `writeBatch`. <https://firebase.google.com/docs/firestore/manage-data/transactions>

---

## 10. Build order & Definition of Done

Ship as small, test-guarded increments (AGILE.md). Suggested order:

1. **Rules + validation** — `validUserData`/`validConsent`/`validSettings`, atomic
   create constraint. `npm run test:rules` green first (TDD).
2. **`registerUser`** — accept `consent`, single `writeBatch`, server-side name/email
   trim+check, fix the password message. Add `verifyEmail()`.
3. **Register form** — Terms/Privacy required checkboxes + marketing opt-in; pass consent.
4. **Onboarding polish** — "Skip for now" on the plan picker; email-verify banner +
   resend wired via `useAuthSession`.
5. **Go-live checklist** — App Check enforcement, `beforeCreate`, MFA (separate, documented).

**DoD per increment:** KISS + secure, `npm run test:unit`/`test:rules` green, no secret
shipped, rules verified in the emulator, committed with a clear message, this doc updated
if behavior changed.
