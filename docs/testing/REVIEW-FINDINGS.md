# Codebase Review — Completeness & Integrity

> Generated 2026-06-16. Full-codebase review of: (1) incomplete features, (2) empty/stubbed files,
> (3) broken connections, (4) missing imports. Findings are evidence-backed (build + tests + a
> context-wiring cross-check), not guesses.

## Verification baseline
- `npm run build` → **clean** (all chunks built, zero errors) → every import *resolves* and every named export exists.
- `npm run test:unit` → **65/65 pass**.
- Context cross-check: all **130** `useApp()` destructured reads across 11 components map to the **97**
  keys `CryptoIdea.jsx` provides — no `undefined` wiring.

---

## 1. Incomplete features

| Feature | Status | Detail |
|---|---|---|
| **Education-page email signup** | 🔴 **Stub (real bug)** | `src/components/education-page.jsx:126` — Subscribe button is `onClick={() => { if (email.includes("@")) setSubmitted(true); }}`. It shows "You're in ✓" but **never calls `/api/subscribe`** — emails are silently discarded. The landing page (`index.html`) wires the same form correctly. |
| **Email providers** | 🟠 **Partial** | Admin Settings offers **6** providers (`src/components/admin-dashboard.jsx:455–461`: ActiveCampaign, GetResponse, Mailchimp, SendGrid, Resend, Brevo) but the backend (`functions/index.js`) only implements **GetResponse + ActiveCampaign**. Selecting any of the other 4 saves fine, then returns **501 "provider not implemented"** at `functions/index.js:893`. |
| **Rename portfolio** | 🟠 **Built but unwired** | `src/api/firebase-database.js:63 renamePortfolio()` is a complete data-layer function with **zero callers** — the UI never exposes renaming. |
| **Admin 2FA / MFA** | ⚪ **Deferred (documented)** | No code exists; `NEXT-STEPS.md §4` lists it as a go-live task. |
| **App Check (reCAPTCHA)** | 🟡 **Config-gated** | Code is present in `src/api/firebase.config.js`; inactive until `VITE_RECAPTCHA_SITE_KEY` + console enforcement are set (documented). |
| **Termly privacy/terms** | 🟡 **Config-gated** | `privacy.html`/`terms.html` auto-embed once IDs are set in admin Settings; show placeholder text until then (documented). |

> Fully functional (verified, not stubs): the landing DCA calculator, landing email capture, admin
> Settings save/load (all 5 forms), scheduled `refreshMarkets`/`refreshCoinList`.

## 2. Empty or stubbed files

- **Empty files: none.** Smallest source file is `src/hooks/app-context.js` (8 lines) — real content.
- **Stubbed functions: none** in the strict sense (no no-op bodies, no `throw "not implemented"`, no
  hardcoded placeholder returns). The only two "looks-done-but-isn't" spots are the **education-page
  onClick** and the **501 provider default** above — both captured in #1.

## 3. Broken connections between files

**None found** — checked three ways, not assumed:
- Build resolves every module/named export.
- The full `useApp()` → `ctx` cross-check passed (every consumer key is provided).
- All inter-module imports compile and 65 tests exercise the wiring.

One **documentation** rot, not code: `README.md:85` shows
`import { onAuthChange, getUserProfile } from "./firebase/auth.js"` — that path doesn't exist (the
real file is `src/api/firebase-auth.js`). A stale example snippet, harmless to runtime.

## 4. Missing imports

**None.** A missing/renamed named import fails the Vite/rollup build, and the build is clean. The
inverse problem — **exports with no importers (dead code)** — does exist:

| Export | File | Note |
|---|---|---|
| `getUserProfile()` | `src/api/firebase-auth.js:107` | No callers (only the stale README snippet). |
| `updateUserTier()` | `src/api/firebase-auth.js:131` | No callers (tier changes go through the admin Cloud Function). |
| `renamePortfolio()` | `src/api/firebase-database.js:63` | No callers → the unwired feature in #1. |
| `TIER_LIMITS`, `canAddPortfolio()`, `canAddCoin()` | `src/api/firebase-database.js:236,265,271` | No external callers; **duplicate** of the live `TIER_LIMITS` in `useUpgrade.js`. Also flagged in `ARCHITECTURE-AUDIT.md` as a correctness risk (two tables can drift). |

---

## Bottom line

The codebase is **structurally sound** — no empty files, no broken imports, no broken context
wiring, all tests green. The real gaps are a small number of **half-wired features**, in priority order:

1. **Education-page Subscribe button silently drops leads** (`src/components/education-page.jsx:126`)
   — the only one that actively misleads a user; ~3-line fix to call the subscribe endpoint like the
   landing page.
2. **4 of 6 email providers 501** — either implement Mailchimp/SendGrid/Resend/Brevo, or trim the
   admin dropdown to the 2 that work (KISS — quick).
3. **Dead exports incl. duplicate `TIER_LIMITS`** — delete unused, consolidate the limits table.

### Follow-up tasks — ALL DONE
- [x] Fix education-page Subscribe to POST `/api/subscribe` (+ honeypot) like `index.html`. — commit c1a7a3a
- [x] Reconcile email providers: trimmed the admin dropdown to ActiveCampaign + GetResponse (the implemented ones). — commit 3e4c70a
- [x] Remove dead exports (`getUserProfile`, `updateUserTier`, `renamePortfolio`) and consolidate `TIER_LIMITS` into one source (`useUpgrade.js`). — commit 26ecd78
- [x] Fix the stale import example in `README.md:85`. — commit e4bac05

> Note: `renamePortfolio` was removed as dead code rather than wired to a UI. If you want an
> in-app "rename portfolio" feature, that's a deliberate feature add (re-introduce the data-layer
> fn + an inline edit in `Account.jsx`) — say the word.
