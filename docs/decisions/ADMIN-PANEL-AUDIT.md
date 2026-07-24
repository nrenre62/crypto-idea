# Admin Panel — Research Audit & Build Plan

> **Status: 📋 PLAN (2026-07-18).** This is a scored gap-audit of the existing admin panel against
> external best practice, plus a phased build plan. **Nothing here is built yet.** Building any item
> triggers the normal [interview & consistency SOP](../interview.md) (interview → find gaps → plan →
> sweep every file in the topic's `Admin` map row → verify → commit).
> Backlog entry: [`NEXT-STEPS.md`](../product/NEXT-STEPS.md) §ADMIN. Composes with §BL (admin
> capabilities), §4 go-live (MFA / App Check), §C (config/kill-switches), §U (settings).

## How this was researched

A limited-but-grounded pass (2026-07-18): four parallel read-only research agents pulled from **real
developer documentation and open-source repos** (no marketing pages), then a synthesis pass
cross-referenced the findings against the actual code in
[`src/components/admin-dashboard.jsx`](../../src/components/admin-dashboard.jsx),
[`src/api/admin.js`](../../src/api/admin.js) and `functions/index.js`.

Primary sources: React-Admin, Refine, AdminJS, Directus (admin-framework table-stakes) · Stripe &
PayPal billing docs, PostHog, ChartMogul (SaaS metrics + billing ops) · OWASP cheat sheets
(Authorization / Access-Control / Logging / MFA / Session / Auth), Auth0, WorkOS, Firebase custom
claims (security / RBAC / audit) · LaunchDarkly, Unleash, Firebase Remote Config, Sentry, Supabase,
Cloudflare, Medusa, Discourse, Ghost (flags / observability / support / moderation / comms). Full
URL list at the bottom.

**Context that shapes the scoring:** solo founder, **pre-launch**, product is a **non-custodial**
crypto research / portfolio-tracker / DCA tool — it holds no funds and executes no trades, so
KYC/AML/custody/settlement controls are **out of scope**. Payments = PayPal subscriptions. KISS-first.

## Headline

The panel already covers ~18 of ~40 best-practice capabilities — including several early products
skip (isolated `/admin` app, soft-delete/trash with recovery, a real audit log, server-side editable
config, privacy-by-design aggregate-only views). Remaining gaps cluster in **four areas**: billing
operations visibility, failure/observability, audit-log depth, and growth metrics. Score of the gaps:
**2 critical · 7 high · ~13 medium · ~12 low.**

Recurring theme: **most valuable gaps are cheap because they extend patterns already in the code**
(`config/app.flags` → per-feature kill-switches + announcement banner; `webhookEvents` → webhook
health; `getStats` → trend snapshots; `config/app` save → versioning).

Tags used below: `[tracked]` already on a go-live/backlog doc · `[new]` surfaced by this research ·
`[cheap]` extends an existing pattern.

## ✅ What the panel already has (keep)

- **Core admin UX** — searchable + paginated (50/page) user list; per-user detail/edit cards;
  settings edit forms; explicit live/error/loading state; point-in-time KPI overview (tier counts,
  net-of-fees revenue estimate, aggregate usage, tier stacked-bar).
- **User & account ops** — lookup + profile + edit; change tier + per-user custom limits;
  suspend/un-suspend; force sign-out (revoke sessions); soft-delete → 30-day trash → restore/purge;
  grant/revoke admin (type-email confirm).
- **Security & privacy (notably strong)** — separate `/admin` app with isolated auth; `{admin:true}`
  claim set + re-verified **server-side** on every callable; deny-by-default Firestore rules; min-2
  admins; **aggregate-only / counts-only** views (never exposes holdings); erasure-with-recovery.
- **Config & audit** — server-driven remote config (plans/limits/pricing/keys/toggles/analytics via
  `/api/config`); two global kill-switches (maintenance, signups); server-only audit log capturing
  actor → target → action → time.

## ❌ Gaps, scored

### 🔴 Critical — close before real users + live payments
| Capability | Tag | Why |
|---|---|---|
| Admin **MFA / 2FA** ◑ **GATE BUILT 2026-07-24** | `[tracked]` | A stolen admin password alone must not unlock real user data. Biggest admin-security gap. (OWASP MFA.) **The server-side gate now exists** — `guards.requireMfa` on the shared `assertRole`, so it covers every admin callable at once — behind `config/app.flags.requireAdminMfa`, **default OFF**. **Enrolment (Identity Platform) is still infra**, so nothing is enforced yet; go-live is a flag flip, not new auth code. |
| **App Check** enforcement | `[tracked]` | Without client attestation the metered `/api` proxy is open to **denial-of-wallet** (flat-cost economics depend on it) and callables lack attestation. Per-IP limiter only partially covers it. |

### 🟠 High — needed at / soon after launch
| Capability | Tag | Why |
|---|---|---|
| **Subscription-status visibility** (PayPal `active`/`past_due`/`paused`/`canceled` per user) | `[new]` | You show a *derived* tier, not real PayPal state → blind to access-vs-billing mismatch. |
| **Failed-payment / dunning visibility** | `[new]` | Most SaaS churn is involuntary (declined cards). No "who's past_due" = silent revenue leak. |
| **Webhook delivery-failure view + manual replay** | `[new] [cheap]` | You already store `webhookEvents`; a missed webhook silently breaks entitlement/revenue with no detection. |
| ~~**Per-feature kill-switches**~~ ✅ BUILT | `[new] [cheap]` | Two global toggles today; can't disable one feature/upstream (e.g. AI) without a deploy. Extends `config/app.flags`. (LaunchDarkly.) **Shipped 2026-07-24** — `marketData`/`checkout`/`aiResearch`, default-ON, server-enforced. |
| **Failure visibility + admin alerts** ◑ PARTLY BUILT | `[new]` | No error/latency/upstream (CoinGecko, PayPal) visibility, no paging. Best solved with Sentry + an uptime monitor — *not* a hand-built dashboard. **2026-07-24:** Sentry wired (functions-only, DSN in Settings) + cron heartbeats + an Overview status strip. **The account, the uptime monitor and the alert rules remain go-live infra** — nothing pages you yet. |
| ~~**Hard server-side signups-off** (`beforeCreate`)~~ ✅ BUILT | `[tracked]` | The toggle is a client gate; a scripted client bypasses it. **Shipped 2026-07-24** — `exports.beforeCreateUser` refuses inside account creation; verified live that a paused signup creates **no Auth account**. Fail-OPEN on an unreadable config (founder decision). ⚠️ Deploying needs Identity Platform. |
| **Audit-log filter / pagination / export** | `[new]` | Today view-only latest-100, unfilterable, non-exportable → near-useless mid-incident. (WorkOS.) |

### 🟡 Medium — real value, workable without at first
- **Cancel / refund actions in-panel** `[new]` — *divergence from textbook: do these in the PayPal
  dashboard short-term; don't build money-moving actions yet.* Read-only status (above) comes first.
- **Growth metrics: MRR trend · churn · signup/conversion** `[new]` — point-in-time revenue only;
  needs a daily snapshot source. (GA4/Plausible cover engagement but can't see PayPal revenue/churn.)
- **User-list CSV/JSON export** `[new] [cheap]` — quick reporting/backup win. (React-Admin/Refine treat export as table-stakes.)
- **Config change versioning / diff / revert** `[new] [cheap]` — a save is logged but values aren't versioned; a bad edit can't be inspected or rolled back.
- ~~**Audit immutability (append-only rules) + retention policy**~~ ✅ **RESOLVED 2026-07-24 — and the
  original framing was wrong.** "Append-only rules" cannot be built: the rules already `deny read, write`
  for every client (*stronger* than append-only), and the **Admin SDK bypasses rules entirely**, so no
  rule can constrain the only writer there is. Loosening to `allow create` would hand clients a write
  path and buy nothing. What shipped instead is the real control — a **single-writer choke point**
  (`audit` reached in exactly three places: add in `writeAudit`, read in `listAudit`, expire in
  `purgeOldAudit`) pinned by a source-scan test, plus a rules test covering client **writes** (only
  reads were covered before). Retention TTL was already shipped as `purgeOldAudit` (365 d).
- **RBAC admin roles (least-privilege)** `[new]` — all admins are equal; fine for 2 founders, **required before any non-founder gets access**.
- **User impersonation / "view-as"** `[new]` — powerful support tool; build carefully (logged, time-boxed, bannered). (Harness model.)
- **In-app announcement banner / broadcast** `[new] [cheap]` — reuse the config surface + the reserved email integration.
- Also: bulk user actions · step-up re-auth + admin session timeout + admin login history (bundle with MFA) · invoice history & pause/resume (PayPal covers) · per-field filters (tier/status) + saved views · before/after diff in audit entries.

### ⚪ Low — polish / defer
Content-moderation queue (*theses are private-by-default → revisit only if shareable*) · per-user
activity timeline · private admin notes · uptime/cron heartbeat monitors · rate-limit/abuse dashboard
· IP allowlisting (dynamic founder IP) · formal break-glass account (min-2-admins covers it) · cohort
retention / NRR / LTV (external tools first) · proration preview (N/A — manual override) · status page
/ incident comms · i18n · guessers · percentage/staged rollout · targeting segments · responsive-admin polish.

## 📋 Build plan (phased, KISS-first)

| Phase | Focus | Items | Effort |
|---|---|---|---|
| **0 — Launch gate** ✅ **BUILT 2026-07-24** | Don't expose real data/payments until done | **`beforeCreate` hard signups-off** (built + emulator-verified; fail-OPEN on an unreadable config; deploying needs Identity Platform) · **admin MFA gate** (server-side, `guards.requireMfa` on the shared `assertRole`, flag-gated **default OFF**; enrolment stays infra) · ~~make `audit` append-only in rules~~ — **already satisfied and the ask was wrong**: a total client deny is *stronger* than append-only, and rules can't bind the Admin SDK, so the real control is a **single-writer choke point** + a source-scan test · ~~App Check~~ — **no code by H1** (console-only) | M (MFA is the weight) |
| **1 — Billing-ops visibility** ⭐ | Highest *new* value the day you go live | Persist (if not already) + show PayPal **subscription id + status** on the user card · **past_due/canceled** filter · **webhook-health** list. Read-only; cancels/refunds stay in PayPal | M |
| **2 — Operational safety net** ✅ **BUILT 2026-07-24** | Stop flying blind | **Per-feature kill-switches** (`marketData`/`checkout`/`aiResearch`, enforced server-side at one `cgFetch()` choke point) · **cron heartbeats** (`health/jobs`) + a status strip in Overview · **Sentry wired functions-only** behind a DSN in Settings. ~~1 uptime monitor + 2–3 alert rules~~ — those need a deployed project + a Sentry account, so they stay **go-live infra** | S–M |
| **3 — Audit & data hygiene** ✅ **BUILT 2026-07-24** | Make the log usable | Audit filter + pagination + **CSV export** + source-IP field · ~~retention TTL~~ (already shipped as `purgeOldAudit`, 365 d) · **user-list export** (CSV; JSON not built) · config **versioning/diff** (before→after, secrets redacted) | S–M |
| **4 — Growth metrics** | See the business move | Daily scheduled snapshot `stats/daily/{date}` → Overview renders **MRR/subs/signup trend + churn** (reuses `getStats` math) | M |
| **5 — Team-scale & support** | When a non-founder joins or it's needed | **RBAC roles** · impersonation (logged) · announcement banner · bulk actions · per-field filters · private notes | varies |

**Ordering rationale:** Phase 0 items are launch-blockers already partly tracked. Phase 1 is the
biggest *new* payoff — once real PayPal money flows, "is this person actually paying?" is a daily
question the panel currently can't answer. Phases 2–3 are mostly cheap extensions of existing
patterns. Phase 4 needs one small new data source. Phase 5 waits for a second operator or scale.

## Key judgment calls (where this diverges from the textbook)

- **Refunds/cancels:** don't build money-moving actions into the panel yet — the PayPal dashboard
  already does this safely. Surface **read-only** subscription status first.
- **Observability:** wire **Sentry + an uptime monitor + alert rules** rather than hand-building an
  in-panel health dashboard. Cheaper, better, less code.
- **Content moderation:** journal theses are **private-by-default**, so abuse exposure is low →
  scored **low**. Revisit only if theses ever become shareable/public.
- **Break-glass / IP allowlist:** the min-2-admins design + dynamic founder IP make these low-value
  now; skip until scale/team demand them.

## 🎨 Settings redesign — match the app's paper design (✅ BUILT 2026-07-23 — with ADMIN-D3)

> **✅ BUILT 2026-07-23 (ADMIN-D + ADMIN-D3).** The Settings tab is reskinned to the `.ci-app` paper
> drill-in exactly as specced below: home = a **Configuration** status card + the Maintenance/Signups
> **switches inline** + a **row per category** → paper detail cards; the Configuration card is **IN**;
> maintenance keeps its **amber warning** colour (`.switch.warn`). Design-only — `saveConfig` /
> `saveControls` and every handler are unchanged. **ADMIN-D3 folded in:** the owner-only Admin access
> grant/revoke flow is now the **last Settings row** (its own detail view); the separate "Admin access"
> top-level tab is **gone** (owner tabs 6→5). Files: `src/components/admin-dashboard.jsx` (local
> `settingsView` + `NavRow`/`CtrlRow`/`Switch`/`DHead`, mirrors `Account.jsx`; saves live in the detail
> views), `admin.html` (Fraunces/Hanken fonts), `src/admin-main.jsx` (`app.css` + new admin-only
> **`src/styles/admin-settings.css`**, verified out of the user bundle). **Dark mode N/A** — the admin app
> never sets `html[data-theme]`, so Settings renders **light paper**. Verified **552/552 unit · build
> clean · browser-checked as owner**. Scope was the Settings tab **only**; the header, tab bar and the
> other four tabs stay grey until **ADMIN-D2**.

**Decision (founder, 2026-07-18):** reskin the admin **Settings** tab to match the app's user-settings
(**Account**) screen. Today admin Settings is a flat scroll of grey, inline-styled cards in a visual
language of its own; the user app uses the `.ci-app` **paper design system** (`src/styles/app.css` —
Fraunces + Hanken Grotesk, deep-green `--accent`, rounded white cards, pill switches). **Design-only**
— the `saveConfig` logic and handlers are untouched (same as the earlier Account design migration).

**The structural move:** adopt the Account screen's **iOS-style drill-in list** (`settings-row` +
`sr-icon`/`sr-label`/`sr-chev`, home → detail views). The current cards map with nothing dropped:
- **App Controls** (maintenance, signups) → the **two global switches inline** on the Settings home
  (like Account's Email-digest `Switch`), maintenance rendered as a warning state.
- **API keys · Email & integrations · Plans & pricing · AI (reserved) · Analytics & legal** → one
  **tappable row each** → a detail **card** built from `card`/`card-title`/`acct-label`/`field-input`/
  `acct-btn.accent`; Plans keeps its per-tier numeric grid; Analytics keeps the cookie-banner toggle
  (as the app's pill `switch`).
- **New element proposed:** a **Configuration** summary card at the top of the home (green/amber
  status dots for Payments / Market data / Email / Analytics / AI) mirroring Account's "Plan usage"
  card — an at-a-glance read of what's connected. Optional; drop if unwanted.

**Mockup:** [`docs/mockups/admin-settings/index.html`](../mockups/admin-settings/index.html) —
4 screens (home + API keys + Plans & pricing + Analytics & legal), light + dark, tokens taken 1:1 from
`app.css`. Email + AI reuse the same detail-card pattern. The later **interactive full-panel mockup**
([`admin-panel/index.html`](../mockups/admin-panel/index.html), § below) implements this same drill-in and
adds the other four tabs — read the two together. Build order: `NEXT-STEPS.md` §ADMIN (ADMIN-D).
Local-first / emulator-verifiable, no Blaze. When built, runs the §PROCESS interview+sweep (the `Admin`
map row) and a dark-mode pass like the app's design rounds.

## 🔐 Admin roles, owner protection & sensitive-area re-auth (security — founder 2026-07-18)

> **✅ BUILT 2026-07-18** — `8c7ea66` (server roles + owner protection + step-up) · `9e1b1d4`
> (owner-only rules) · `3aa3de0` (role-aware UI + Admin access tab) · `485bb5b` (`lookupUser` role).
> Verified: **527 unit · 36 rules · 35/35 live role probes** against the emulator · build clean ·
> browser-checked as owner and as manager. **Two holes beyond this spec were found and closed:**
> (1) `firestore.rules` was role-blind, so a manager could skip every callable and write/delete user
> documents directly from devtools — the blanket `users` update/delete branches are now
> `isAdminOwner()`; (2) a manager could **suspend** both owners (disabling their Auth accounts) and
> lock the founders out while `MIN_ADMINS` still read 2 — owner-target protection now covers
> tier / limits / suspend / sign-out / trash / delete. **Before deploying:** run
> `node functions/scripts/set-admin.js <email> --role=owner` for both real owner accounts (until
> then they are legacy role-less admins and Settings fails closed for them), and back up the
> service-account key — it is the only way to mint an owner.

**Security finding (🟠 high) — owner-deletion bypass.** Today admin = a flat `{admin:true}` claim and
`MIN_ADMINS=2` blocks a delete/demote only when it would leave **fewer than 2 admins total**. So an
admin can promote two throw-away accounts from the Users tab (count → 4), then delete the two real
owner accounts (still ≥2 remain) — a rogue or compromised admin can seize sole control and lock the
founders out. The floor protects the *count*, not the *specific owners*. (Requires an already-admin
actor, so not a public exploit — but it defeats the "founders can't be locked out" guarantee.)

**Decisions (founder interview, 2026-07-18):**
- **Two admin roles via custom claims.**
  - **Owner** = `{admin:true, role:"owner"}`, set **only** by `functions/scripts/set-admin.js` with a
    service-account key — **never grantable/revocable from the panel**. Exactly 2. Un-deletable,
    un-demotable, and can't self-delete (server-enforced). This is what makes the owners un-removable
    by identity, closing the bypass.
  - **Manager** = `{admin:true, role:"manager"}`, granted/revoked by an **owner** from a new
    owner-only **Admin access** area (never the Users tab). Scope: **accounts only, no settings.**
- **Role → access matrix:**

  | Area | Owner | Manager |
  |---|---|---|
  | Overview · Users · Trash (restore) · Audit | ✅ | ✅ |
  | Change tier · suspend · sign-out · custom limits · move-to-trash | ✅ | ✅ |
  | **Settings** (App Controls · API keys · Plans & pricing · Email · Analytics/legal) | ✅ | ❌ hidden + server-denied |
  | **Admin access** (grant/revoke managers) | ✅ | ❌ |
  | Permanent purge (hard-delete from Trash) | ✅ | ❌ |
  | Being deleted / demoted | ❌ never | ✅ (by an owner) |

- **Grant-admin moves out of the Users tab** → the per-user "Make admin / Remove admin role" button
  is removed. A manager is added only from the owner-only **Admin access** area, via this flow:
  **(1)** search the user by **email** (find the correct address, reuses `lookupUser`) → **(2)** type
  the target's email **twice** and they must match → **(3)** a **warning** confirmation → **(4)** gated
  by the owner **password** (below). Owners appear here as locked/protected entries with no revoke button.
- **Sensitive-area password gate = a ~10-minute unlock.** Enter the owner password once
  (`reauthenticateWithCredential`) to unlock the sensitive areas for ~10 min, then it auto-re-locks.
  The **real boundary is server-side**: sensitive callables require `token.role === "owner"` **and** a
  **fresh `auth_time`** (within ~600 s) — a stale token is rejected with a "re-authenticate" error and
  the client re-prompts. Applies to: **Settings** (App Controls, **API keys**, **Plans & pricing**,
  Email, Analytics/legal → all of `saveConfig`/`getAdminConfig`) and **grant/revoke manager**. The
  client timer is only UX; the freshness check is the control.
- **Manager walls (UI + server).** Managers never see the Settings tab, Admin access, permanent purge,
  or any grant-admin control (hidden in the UI **and** denied in the callables — `getAdminConfig`/
  `saveConfig`/grant/revoke add an owner check on top of today's `admin:true` check).

**What it supersedes / absorbs:** the audit's "RBAC admin roles" (was 🟡 medium) and "Step-up
re-authentication" (was 🟡 medium/partial) rows are now committed here; the owner-deletion bypass is a
new 🟠 high finding. Note `role:"owner"` being **script-only** also removes the current
type-email-to-confirm grant/revoke UI in the Users tab and refines the `MIN_ADMINS` logic (kept as a
secondary floor). **It also overrides three areas of the full-panel mockup**, which was drawn earlier the
same day — see § Full-panel mockup → "Three areas SUPERSEDED by §ADMIN-SEC". True authenticator-app
**MFA stays deferred to go-live** (needs Identity Platform —
§ADMIN-0 / §4) — this increment is the password re-auth + roles, all buildable + emulator-testable now.

**Files this will touch when built (Admin consistency map — plan only, not yet edited):**
`functions/index.js` (owner-vs-manager checks on each callable; owner-protection guards on
`deleteUser`/`adminTrashUser`/`deleteMyAccount`; `auth_time` freshness on sensitive callables;
`grantManager`/`revokeManager` replace the panel's `setAdminClaim` usage) · `functions/guards.js`
(`requireOwner`/`requireManager`/`requireFreshAuth` helpers) · `functions/scripts/set-admin.js`
(`--owner` role) · `firestore.rules` (the `users` doc shape already blocks self-setting `isAdmin`;
confirm `role` can't be self-written) · `src/api/admin.js` + `src/api/admin-auth.js` (grant/revoke
manager, reauthenticate helper, role read, owner-gated config) · `src/components/admin-dashboard.jsx`
(remove Users-tab grant-admin; role-aware tabs; owner-only Settings + Admin-access; unlock/password
modal; the email-twice + warning grant flow) · `src/hooks/useAdminDashboard.js` (role + unlock
state/timer + new actions) · docs: `CLAUDE.md` "Admin & privacy", `BACKEND-ADMIN-DECISIONS.md`,
`ISOLATION.md`, `API-SECURITY.md` + `openapi.json`, this file, `NEXT-STEPS.md` §ADMIN (ADMIN-SEC).
Local-first / emulator-verifiable, no Blaze. Runs the full §PROCESS interview+sweep when built.

## 🖼️ Full-panel mockup — all five tabs (✅ BUILT 2026-07-24 via ADMIN-D2; mockup by founder 2026-07-18)

> **✅ BUILT (ADMIN-D2, 2026-07-24):** the four remaining tabs (Overview · Users · Trash · Audit) plus
> the header, segmented tab bar, role notice, step-up unlock modal and footer are now on the `.ci-app`
> paper design — the whole panel is paper, no grey left. The two new capabilities shipped: **one shared
> toast** (`adm-toast`) replacing `savedMsg`/`actionMsg`, and **pre-empting a blocked owner delete** with
> a warn toast instead of opening the typed-DELETE confirm. The three ADMIN-SEC-superseded areas were NOT
> built as drawn. The build constraints below were honoured except the **dark pass**, which is **N/A** for
> the admin app (it never sets `html[data-theme]`, so it renders light paper only — see § Settings redesign).
> a11y gaps fixed (user rows → keyboard `<button>`s, tier-bar keeps a text legend, trash urgency is
> colour + a word, card titles are headings). Grids ported to the app's `auto-fit` responsive standard.
> `adm-*` classes live in `src/styles/admin-settings.css`, verified out of the user bundle.

**Mockup:** [`docs/mockups/admin-panel/index.html`](../mockups/admin-panel/index.html) — an **interactive**
prototype of the whole panel (Overview · Users · Trash · Settings · Audit) in the `.ci-app` paper design.
Tabs switch, the Settings drill-in works, and the Overview numbers are computed live from the seeded
users, so the revenue/usage/tier maths can be read straight off the page. Supersedes nothing — the
earlier Settings-only mockup ([`admin-settings/index.html`](../mockups/admin-settings/index.html)) stays
as ADMIN-D's spec; this one is the **visual spec for the rest of the panel** (ADMIN-D2).

**It is a reskin, not new function.** Reconciled against the shipped code and this plan (method below):
**35 of its capabilities already ship today** — it reproduces the current panel almost feature-for-feature
in the new design language. Only **three** things are genuinely new, all cosmetic:

| New in the mockup | Severity | Note |
|---|---|---|
| Paper design extended to **Overview / Users / Trash / Audit** (ADMIN-D covers Settings only) | 🟡 med | Without it the panel is half-paper, half-grey. → **ADMIN-D2** |
| **One toast** for every mutating action, replacing the two inconsistent inline status fields (`savedMsg` in Settings, `actionMsg` in Users/Trash — which even colour differently per tab) | ⚪ low | Fixes a real inconsistency; fold into ADMIN-D2 |
| **Pre-empting a blocked delete** — clicking Delete on an admin toasts instead of opening the typed-DELETE confirm | ⚪ low | Today the confirm opens, the call fires, and the server error surfaces late. Zero security value (the server check is authoritative); the shipped copy already *promises* this behaviour |

Everything else maps to work already planned: the Settings drill-in + Configuration status card → **ADMIN-D**
(the mockup answers "optional; drop if unwanted" — it's in, with a live amber/green Email dot); view-only
Audit → **ADMIN-3** owns filter/pagination/export/IP; no billing state on the user card → **ADMIN-1**;
point-in-time-only Overview → **ADMIN-4** owns MRR/churn trend (**✅ BUILT 2026-07-24** — a **Growth** card of hand-rolled inline-SVG sparklines + 7/30-day deltas + **net** paid churn, fed by one aggregate snapshot per UTC day in `statsDaily/{date}`; every figure reads "collecting" rather than a fake 0 until the history genuinely reaches back that far. Full log: `NEXT-STEPS.md` §ADMIN-4).

### ⚠️ Three areas SUPERSEDED by §ADMIN-SEC (do not build as drawn)

The mockup was drawn before the roles/security decisions above were locked. Where they disagree,
**ADMIN-SEC wins** (founder, 2026-07-18) — it is the fix for the owner-deletion bypass:

| Mockup shows | Build instead (ADMIN-SEC) |
|---|---|
| An **ADMIN ROLE** card in the Users-tab detail — "Make admin / Remove admin role", type-the-email to confirm | **Remove it.** Managers are added only from the owner-only **Admin access** area (email search → type email twice → warning → owner password) |
| A **single flat admin** — every tab, Settings, permanent purge and grant-admin visible unconditionally | **Owner vs manager.** Managers get Overview/Users/Trash/Audit only; Settings, Admin access, permanent purge and every grant control are UI-hidden **and** callable-denied |
| Settings / **API keys** / **Plans & pricing** open and save with **no gate** | **~10-min owner-password unlock** on the client; server requires `role:"owner"` + fresh `auth_time` |

Also restate the footnote copy: the mockup's *"Admins can't be deleted — demote first"* and *"the server
keeps at least 2 admins"* become **owners can never be deleted or demoted** (`MIN_ADMINS` stays only as a
secondary floor). The mockup's *"Admin 2FA will additionally gate this at go-live"* line is still correct
(§ADMIN-0) — but the password re-auth ships **first**, so the copy should mention both.

*(Four further conflicts were claimed during review and refuted on inspection — the `MIN_ADMINS`
footnote, a missing stats-failure state, "dropped affordances", and missing dark mode. Recorded so they
aren't re-litigated.)*

### What actually changes visually

Grey inline-styled cards on `#F5F5F5` with an SF-Pro stack → the paper system: cream `#f8f7f3` page,
white cards at **22px** radius with the two-layer shadow, ink `#15140f`, and warmer semantics (green
`#0a6b4d`, amber `#b8841f`, purple `#7d4bbf`, danger `#bf4730`). Hanken Grotesk for UI with **Fraunces
reserved for the H1, sub-screen titles and every large numeral**. New sticky translucent header with the
CryptoIdea brand lockup + `· Admin`; the tab row becomes a white **segmented pill**; the status dot
becomes a pulsing "Live Data" badge. Users' detail and all of Settings move into a **680px centred
drill-in** with a tinted header strip + back chevron. Badges consolidate to one pill recipe (`SUSP` →
`SUSPENDED`), and destructive chrome gains a gradation (neutral outline → amber Suspend → red Delete →
solid fill only on the final typed-confirm).

### Build constraints (carry these into ADMIN-D2)

- **Strip the prototype artefacts:** the hard-coded `who:'admin@test.com'` on audit rows, the
  `showSampleData` seed, three unbound Refresh buttons, and the **uncontrolled inputs** — every Settings
  field except the provider select and the 18 plan inputs has a placeholder but no value/onChange, and
  its Save toasts without reading anything. Wire them to the existing handlers; `saveConfig` is untouched.
- **Keep the maintenance toggle's warning colour.** The mockup renders maintenance and signups both green;
  the shipped panel correctly renders maintenance in orange, and ADMIN-D already requires a warning state.
- **Responsive:** the mockup is a fixed 1140px track with `repeat(4,1fr)` / `1.15fr 1fr 1fr` grids and
  **no media queries**. The app's standard is a 1040px track with `repeat(auto-fit,minmax(280px,1fr))`
  (§R / `responsive-app`). Port it to auto-fit — the admin panel is desktop-first but must not break narrow.
- **Dark mode:** this mockup is light-only (hard-coded literals, no CSS vars). The Settings mockup has
  both modes; ADMIN-D2 needs the same dark pass, using `app.css` tokens rather than inline literals.
- **Accessibility to fix on the way in:** the tier bar is unlabelled divs, user rows are clickable
  `div`s with no keyboard affordance, card titles aren't headings, and Trash urgency is colour-only.
  The mockup's `style-hover`/`style-focus` attributes must become real CSS.
- **Leave room** in the user-detail layout for ADMIN-1's billing block and in the audit row for ADMIN-3's
  controls, so those screens aren't redesigned twice.

**Method:** a 3-phase workflow — 4 agents reading the mockup's tabs + 1 on the shipped code + 1 on this
plan, a reconciliation pass, then **one adversarial verifier per claim** instructed to refute. 8 claimed
conflicts → **3 confirmed, 4 refuted, 1 partial** (the responsive gap); 3 new capabilities → all confirmed
absent from the code. The refuted claims are listed above so they don't come back.

## Sources

- React-Admin — Features: https://marmelab.com/react-admin/Features.html · List states: https://marmelab.com/react-admin/List.html
- Refine — useExport: https://refine.dev/docs/core/hooks/utilities/use-export/ · Import/Export: https://refine.dev/docs/guides-concepts/import-export/
- AdminJS — Actions: https://docs.adminjs.co/basics/action
- Directus — Explore (filter/search/batch/export): https://directus.com/docs/guides/content/explore
- Stripe — Subscription lifecycle: https://docs.stripe.com/billing/subscriptions/overview · Cancel: https://docs.stripe.com/billing/subscriptions/cancel · Smart Retries (dunning): https://docs.stripe.com/billing/revenue-recovery/smart-retries · Refunds: https://docs.stripe.com/refunds · Invoices: https://docs.stripe.com/billing/invoices/subscription · Disputes: https://docs.stripe.com/disputes/api · Webhooks: https://docs.stripe.com/webhooks
- PayPal — Pause/Resume subscriptions: https://developer.paypal.com/docs/subscriptions/customize/pause-resume/
- PostHog — Revenue analytics: https://posthog.com/docs/revenue-analytics/dashboard · Product analytics: https://posthog.com/docs/product-analytics · Retention: https://posthog.com/docs/product-analytics/retention · Funnels: https://posthog.com/docs/product-analytics/funnels · Announcements: https://posthog.com/docs/product-tours/creating-announcements
- ChartMogul — SaaS metrics cheat sheet: https://chartmogul.com/resources/saas-metrics-cheat-sheet/
- OWASP — Authorization: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html · Access Control: https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html · Logging: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html · MFA: https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html · Session: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html · Authentication: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- Auth0 — RBAC permissions: https://auth0.com/docs/manage-users/access-control/configure-core-rbac/manage-permissions
- WorkOS — Audit Logs: https://workos.com/docs/audit-logs
- Firebase — Custom claims: https://firebase.google.com/docs/auth/admin/custom-claims · Remote Config: https://firebase.google.com/docs/remote-config · Rollouts: https://firebase.google.com/docs/remote-config/rollouts/about
- Microsoft Entra — Emergency access accounts: https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/security-emergency-access
- Harness — User impersonation: https://developer.harness.io/docs/platform/role-based-access-control/user-impersonation/
- AuditKit — SOC 2 log retention: https://auditkit.dev/blog/soc-2-audit-log-requirements
- NordLayer — IP allowlisting: https://nordlayer.com/blog/ip-whitelisting-for-cloud-security/
- LaunchDarkly — Kill switch: https://launchdarkly.com/docs/home/flags/killswitch · Change history: https://launchdarkly.com/docs/home/releases/change-history
- Unleash — Activation strategies: https://docs.getunleash.io/concepts/activation-strategies · Gradual rollout: https://docs.getunleash.io/guides/gradual-rollout
- Atlassian Statuspage — Schedule maintenance: https://support.atlassian.com/statuspage/docs/schedule-maintenance/ · Incidents: https://support.atlassian.com/statuspage/docs/create-manage-and-communicate-incidents/
- Ghost — Announcement bar: https://ghost.org/help/announcement-bar/
- Sentry — Alert types: https://docs.sentry.io/product/alerts/alert-types/ · Monitors: https://docs.sentry.io/product/monitors-and-alerts/monitors/
- Supabase — Reports: https://supabase.com/docs/guides/telemetry/reports
- Cloudflare — Rate limiting: https://developers.cloudflare.com/waf/rate-limiting-rules/
- Medusa — Manage customers: https://docs.medusajs.com/user-guide/customers/manage
- Chatwoot — Private notes: https://www.chatwoot.com/features/private-notes/
- Discourse — Moderation / review queue: https://meta.discourse.org/t/discourse-moderation-guide-part-3-managing-content/406266
