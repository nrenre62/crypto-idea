# User Settings

Canonical reference for everything a signed-in CryptoIdea user can change on the Account screen: which settings exist, where they persist, how they are validated, and how the screen is structured. The security boundary is Firestore rules plus the account callables.

## The Account screen

The Account screen ([src/components/Account.jsx](../../src/components/Account.jsx)) is a drill-in settings panel — a home list plus detail views — not a separate route. A shared `SettingsScreen` shell frames each view with a bordered back control, a single title, and a padded body. Opening a drill-in resets scroll to the top so the sticky header is always in view.

### Home

The home view shows, top to bottom:

- Identity block — avatar initial, display name, email, and a tier badge (`STARTER` / `PRO` / `PREMIUM`).
- Plan usage — two progress bars: portfolios used against the configured cap, and coins in the active portfolio against its cap. Bar color grades green under 70 percent, amber under 90 percent, red at or above 90 percent.
- Settings list — navigation rows into Profile, Plan & billing, Portfolios, and Security; an inline Email-digest toggle; an inline Appearance theme selector (Light / Dark / System); and a navigation row into Privacy & data.
- Logout button.

### Profile

- Display name — editable text field (letters and spaces only, 2–30 characters). Saved with an explicit "Save name" button; input is preserved on failure.
- Change email — enter the new address plus the current password to confirm, then send a confirmation link. The email swaps only after the link is clicked (verify-before-update). Shows the current address and an "unverified" marker when the mailbox is not yet confirmed.

### Plan & billing

- Usage bars — portfolios, coins in the active portfolio, and total transactions across all portfolios (counted from the persisted per-coin `txCount`), each against its configured cap. A "custom" tag appears next to a cap that a per-user premium override has changed.
- AI research — reads "Live" with no budget or usage numbers. AI cost and usage are internal levers surfaced only in the admin dashboard, never to users.
- Joined date.
- Subscription status — renewal date for an active paid plan; a 7-day payment-failed grace notice; a cancelled-plan end date with the tier it lands on. Includes the scheduled-downgrade and future-start re-subscribe states.
- Actions — upgrade to Pro / Premium, downgrade, keep-plan (un-cancel), re-subscribe to Premium (a cycle-picker confirm modal), and a deep link to PayPal's hosted recurring-payments page to update the payment method. Upgrade CTAs are hidden when paid plans are toggled off at launch; an existing subscriber's cancel and manage flow stays available.

### Portfolios

Lists the account's portfolios with the active one marked. Each row can be renamed or deleted; an empty portfolio deletes via a two-tap "Remove" pill that auto-disarms, while a portfolio holding coins requires a blocking, count-aware warning modal. A name field adds a new portfolio (up to the configured cap).

### Security

- Change password — current password plus a new one meeting the shared policy (minimum 8 characters with upper, lower, number, and special). Firebase auto-revokes other sessions on a password change.
- Sign out everywhere — revokes refresh tokens on every device.

### Privacy & data

- Allow product analytics — withdrawable consent toggle (auto-save).
- Product updates & offers — withdrawable marketing toggle (auto-save).
- Data export — download the portfolio as a CSV spreadsheet, or export everything as JSON.
- Delete account — type `DELETE` plus the current password; the account is signed out and moved to a 30-day restorable trash before permanent erasure.
- Links to the Privacy Policy and Terms.

Transactional emails (security and payment) have no toggle — they always send.

### Save model

Two save models, never mixed within one card:

- Toggles and single-selects (theme, notification switches, consent) auto-save on change.
- Text forms (display name, change password) use an explicit, active-verb Save button and preserve input on failure.

## The settings data model

Preferences live in a closed, typed map at `users/{uid}.settings`, written with its defaults at signup and updated in place afterward.

```jsonc
{
  "theme": "light",          // 'light' | 'dark' | 'system'  — applied app-wide
  "currency": "usd",         // enum string, validated; display formatting deferred
  "emailDigest": false,      // weekly portfolio digest
  "emailMarketing": false,   // product updates / offers == withdrawable marketing consent
  "consentAnalytics": false, // analytics/cookie consent
  "updatedAt": "<ISO>"       // last write, ISO string
}
```

Notes:

- Mandatory Terms and Privacy acceptance is a separate `consent` record (version plus timestamp), not a withdrawable toggle — see [USER-CREATION.md](USER-CREATION.md).
- `currency` is stored and validated now; wiring `Intl.NumberFormat` across price and P&L displays is a later increment.
- Theme is applied app-wide via a root `data-theme` attribute over shared CSS-variable tokens.

Partial preference changes are written with `updateUserSettings` ([src/api/firebase-auth.js](../../src/api/firebase-auth.js)) using `setDoc(..., { merge: true })`; the rules validate the full merged map.

### Server-authoritative fields

Privileged fields on `users/{uid}` are written only by Admin-SDK callables and the PayPal webhook, never by the owner:

- `tier` — `free` (UI label Starter), `pro`, or `premium`; the internal key is always `free`.
- `premiumLimits` — an optional admin-set per-user override (for example a raised coin cap). The rules read it first for premium users and clamp every limit to the product `hardMax`, so a custom limit can raise within, never past, the ceiling.
- `subscription`, `billingCycle`, `tierBeforeFailure`, `paypalSubscriptionId` — billing state trusted by the server.
- `deleted` / `deletedAt` — soft-delete markers.
- `planChosen` — the onboarding gate flag that unlocks all app data.

The session loader ([src/hooks/useAuthSession.js](../../src/hooks/useAuthSession.js)) reads these from Firestore so they are correct on a fresh device, letting the server copy win over any local cache. `emailVerified` is read fresh from Firebase Auth to drive the verify-email nudge.

## Validation and the security boundary

An owner may touch only a closed set of keys on their own profile; every field is shape-checked when present. See [../security/SECURITY.md](../security/SECURITY.md) for the full rule.

The owner-update rule constrains the changed keys to `name`, `settings`, `consent`, `portfolioCount`, and `lastLogin`, keeps `portfolioCount` un-forgeable, and validates `name`, `settings`, and `consent` shapes. Any other key — the billing, tier, soft-delete, `premiumLimits`, or `planChosen` fields, or an unknown key such as `admin` or `role` — is rejected by default.

The `validSettings` rule enforces the closed map:

```javascript
function validSettings(s) {
  return s is map
         && s.keys().hasOnly(['theme', 'currency', 'emailDigest', 'emailMarketing', 'consentAnalytics', 'updatedAt'])
         && (!('theme' in s)            || s.theme in ['light', 'dark', 'system'])
         && (!('currency' in s)         || (s.currency is string && s.currency.size() <= 8))
         && (!('emailDigest' in s)      || s.emailDigest is bool)
         && (!('emailMarketing' in s)   || s.emailMarketing is bool)
         && (!('consentAnalytics' in s) || s.consentAnalytics is bool)
         && (!('updatedAt' in s)        || (s.updatedAt is string && s.updatedAt.size() <= 40));
}
```

`hasOnly` blocks any unknown key — including an attempt to smuggle in `planChosen`, which is a server-only top-level field, not a settings key. `validUserData` bounds the display name to 2–50 characters; `validConsent` shape-checks the mandatory acceptance record.

## Security flows

All sensitive Auth operations share one re-auth helper, `confirmPassword`, which re-proves the password just before the operation. Firebase throws `auth/requires-recent-login` for these operations; callers catch it and re-prompt.

- Change password — `confirmPassword(old)` then `updatePassword(new)`. Firebase auto-revokes other sessions, so this doubles as sign-out-everywhere.
- Change email — `confirmPassword(pw)` then `verifyBeforeUpdateEmail`. The address swaps only after the link sent to the new address is clicked; `updateEmail` is never used (it is deprecated under email-enumeration protection).
- Delete account — type `DELETE` plus `confirmPassword(pw)`, then the `deleteMyAccount` callable performs a soft-delete into the 30-day trash.
- Sign out everywhere — the `signOutEverywhere` callable revokes the account's refresh tokens, forcing every device to re-authenticate.
- Verify email — a non-blocking banner resends the verification email.

Self-service callables (`exportMyData`, `deleteMyAccount`, `restoreMyAccount`, `signOutEverywhere`) act on the caller's own uid, so there is no cross-user access path.

## Notifications

Two user-controllable email categories persist in the settings map: `emailDigest` (weekly portfolio digest) and `emailMarketing` (product updates and offers, which doubles as the withdrawable marketing consent). Both auto-save. Delivery uses the configured email provider seam. Transactional email (security, payment) is always sent and has no toggle.

## Tier-aware surfaces

- Usage bars read the configured caps from the plans config, not hardcoded numbers, so admin overrides show through.
- Premium custom limits are real end-to-end: an admin writes `premiumLimits`, the rules enforce it clamped to `hardMax`, and the Account screen tags the affected caps as "custom".
- The Plan & billing card shows subscription status, upgrade and downgrade actions, and a deep link to PayPal's hosted page for updating the payment method.
- Tier naming stays consistent everywhere: `free` (UI label Starter), `pro`, `premium`; no code checks for a literal `'starter'` key.

## Remaining at go-live

User and admin MFA (Identity Platform TOTP) and App Check enforcement are console-and-Blaze work, verified at go-live rather than buildable locally.

## See also

- [../security/SECURITY.md](../security/SECURITY.md) — the `validSettings` rule and the owner-update boundary.
- [USER-CREATION.md](USER-CREATION.md) — how an account is born, including the `consent` record.
- [../INDEX.md](../INDEX.md) — the documentation index.
