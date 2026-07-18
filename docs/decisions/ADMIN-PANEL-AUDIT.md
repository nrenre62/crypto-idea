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
| Admin **MFA / 2FA** | `[tracked]` | A stolen admin password alone must not unlock real user data. Biggest admin-security gap. (OWASP MFA.) |
| **App Check** enforcement | `[tracked]` | Without client attestation the metered `/api` proxy is open to **denial-of-wallet** (flat-cost economics depend on it) and callables lack attestation. Per-IP limiter only partially covers it. |

### 🟠 High — needed at / soon after launch
| Capability | Tag | Why |
|---|---|---|
| **Subscription-status visibility** (PayPal `active`/`past_due`/`paused`/`canceled` per user) | `[new]` | You show a *derived* tier, not real PayPal state → blind to access-vs-billing mismatch. |
| **Failed-payment / dunning visibility** | `[new]` | Most SaaS churn is involuntary (declined cards). No "who's past_due" = silent revenue leak. |
| **Webhook delivery-failure view + manual replay** | `[new] [cheap]` | You already store `webhookEvents`; a missed webhook silently breaks entitlement/revenue with no detection. |
| **Per-feature kill-switches** | `[new] [cheap]` | Two global toggles today; can't disable one feature/upstream (e.g. AI) without a deploy. Extends `config/app.flags`. (LaunchDarkly.) |
| **Failure visibility + admin alerts** | `[new]` | No error/latency/upstream (CoinGecko, PayPal) visibility, no paging. Best solved with Sentry + an uptime monitor — *not* a hand-built dashboard. |
| **Hard server-side signups-off** (`beforeCreate`) | `[tracked]` | The toggle is a client gate; a scripted client bypasses it. |
| **Audit-log filter / pagination / export** | `[new]` | Today view-only latest-100, unfilterable, non-exportable → near-useless mid-incident. (WorkOS.) |

### 🟡 Medium — real value, workable without at first
- **Cancel / refund actions in-panel** `[new]` — *divergence from textbook: do these in the PayPal
  dashboard short-term; don't build money-moving actions yet.* Read-only status (above) comes first.
- **Growth metrics: MRR trend · churn · signup/conversion** `[new]` — point-in-time revenue only;
  needs a daily snapshot source. (GA4/Plausible cover engagement but can't see PayPal revenue/churn.)
- **User-list CSV/JSON export** `[new] [cheap]` — quick reporting/backup win. (React-Admin/Refine treat export as table-stakes.)
- **Config change versioning / diff / revert** `[new] [cheap]` — a save is logged but values aren't versioned; a bad edit can't be inspected or rolled back.
- **Audit immutability (append-only rules) + retention policy** `[tracked: C15] [cheap]` — client-denied but not tamper-evident; no retention TTL.
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
| **0 — Launch gate** | Don't expose real data/payments until done | MFA · App Check · `beforeCreate` hard signups · make `audit` append-only in rules | M (MFA is the weight) |
| **1 — Billing-ops visibility** ⭐ | Highest *new* value the day you go live | Persist (if not already) + show PayPal **subscription id + status** on the user card · **past_due/canceled** filter · **webhook-health** list. Read-only; cancels/refunds stay in PayPal | M |
| **2 — Operational safety net** | Stop flying blind | **Per-feature kill-switches** (extend `config/app.flags`) · wire **Sentry** + 1 uptime monitor + 2–3 alert rules (error spike / webhook fail / upstream) · tiny status strip in Overview | S–M |
| **3 — Audit & data hygiene** | Make the log usable | Audit filter + pagination + **CSV export** + source-IP field · retention TTL (ties to C15) · **user-list export** · config **versioning/diff** | S–M |
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

## 🎨 Settings redesign — match the app's paper design (📋 PLAN, 2026-07-18)

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
`app.css`. Email + AI reuse the same detail-card pattern. Build order: `NEXT-STEPS.md` §ADMIN (ADMIN-D).
Local-first / emulator-verifiable, no Blaze. When built, runs the §PROCESS interview+sweep (the `Admin`
map row) and a dark-mode pass like the app's design rounds.

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
