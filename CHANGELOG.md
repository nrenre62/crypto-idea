# Changelog

All notable changes to CryptoIdea are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) with pre-release tags.

> **Where this project is.** CryptoIdea (the user app **and** the admin app) ships as **one product at
> one version**. Nothing has been publicly released yet — everything built so far is **pre-release
> development** toward the first Firebase deploy, which will go out as a **public beta**: **`1.0.0-beta`**,
> targeted **2026-10-01**. Per SemVer, `1.0.0-beta` precedes the stable `1.0.0`; the pre-release ladder
> is pre-alpha → **alpha** (`1.0.0-alpha`) → **beta** (`1.0.0-beta`) → **release candidate**
> (`1.0.0-rc.1`) → **`1.0.0`** (stable, public).
>
> The development history below was **reconstructed from git history and the CRYP backlog** — it is not a
> set of tagged releases (there were none) and not a faked timeline; it's honest project history grouped
> by feature area. The full scheme lives in [`JIRA-PLAYBOOK.md`](docs/testing/JIRA-PLAYBOOK.md) §4.2.

## [1.0.0-beta] — target 2026-10-01 (first Firebase release, in progress)

The first public beta: the whole app + admin, deployed to a real Firebase project. Remaining work is
the go-live checklist plus a polish pass across the app and the docs.

### Added
- Provision the real Firebase project and retire the demo config (CRYP-85).
- Enable Point-in-Time Recovery + a backup schedule before the first deploy (CRYP-86).
- Custom domain / hosting path (CRYP-88).
- Swappable AI provider from the admin panel: the API key, generation/judge model ids, and API base
  URL are admin config (`config/app.ai`), so the provider or model can be changed by paste-and-save
  with no code edit. No provider name or model id remains as a bare code literal.
- SMTP-only email: any email provider works via SMTP (host/port/user/pass/from) configured in admin
  Settings; the landing signup form emails the site owner over SMTP. The previous hardcoded email-list
  integrations were removed.

### Changed
- Removed swappable-vendor company names from the codebase — function names, identifiers, and config
  fields are provider-neutral (e.g. the AI client seam and the outbound-email path name a function, not
  a company). The fixed single-service integrations (PayPal, CoinGecko, Termly, Sentry) keep their
  names. Documentation genericized to match.

### Security
- App Check enforcement in production (CRYP-89).
- Final pre-launch security checklist sign-off (CRYP-90).

### Docs / legal
- Privacy policy + terms of service finalized (CRYP-87).
- Documentation reorganized into a hub-and-spoke set — one canonical file per subject, cross-linked
  from a root index. The detailed point-in-time build records (design rounds, security / architecture
  / admin-panel audits, test and review reports, bug hunts) were consolidated into the canonical docs
  and this changelog; git preserves the originals.

---

## Pre-release development (toward 1.0.0-beta)

Everything below is complete but unreleased — the feature areas that make up the beta, grouped by CRYP
Epic (newest area first). These are **not** tagged releases.

### Security, data isolation & hardening
- Security audits (results folded into the code, the rules, and [SECURITY.md](docs/security/SECURITY.md)):
  a `secure-by-design` five-area review (2026-06-16) and a multi-agent `vibe-security` audit
  (2026-06-27, 8 confirmed findings) — every code-fixable finding fixed, tested, and verified.
- Secure-by-design audit: framework + reusable checklist (CRYP-70).
- Data-isolation audit — 23 cross-tenant probes, no IDOR (CRYP-71).
- Hardened Firestore security rules; deny-by-default Storage rules (CRYP-72, CRYP-73).
- OpenAPI spec (32 ops) + API-security review with 8 fixes; OpenAPI contract hardening + clean live scan
  (CRYP-74, CRYP-75).
- Client-bundle + git-history secret scan; secret-scanning git hooks + AI-agent guard (CRYP-76, CRYP-77).
- Spend caps + fail-loud scheduled jobs; deploy-time demo-config guard + Hosting/SW safety
  (CRYP-78, CRYP-79).
- Cache policy: flat-cost market data, tiered AI budget (CRYP-80).
- GO-LIVE audit — 60 findings + a 7-phase runbook; Phase 0 launch-safety build (CRYP-81, CRYP-82).

### Admin panel & operations
- Owner / manager roles + a never-fewer-than-two-admins guard (CRYP-58).
- Separate `/admin` web app with session isolation (CRYP-59).
- Full users list — search + pagination + per-user detail (CRYP-60).
- Maintenance + signups toggles via public config (CRYP-61).
- Launch gate: signups-off enforcement, admin-MFA scaffold, audit choke point (CRYP-62).
- Billing-ops visibility; kill-switches + cron heartbeats + Sentry; audit search + CSV export + source
  IP; growth metrics; view-as + announcements + bulk actions + admin notes (CRYP-63…CRYP-67).
- Admin paper reskin + Overview card-fidelity passes (CRYP-68, CRYP-69).

### Billing & subscriptions (PayPal)
- Plan tiers + admin-editable prices & limits (CRYP-50).
- PayPal subscription create + already-paid guard; idempotent, plan-aware webhook (CRYP-51, CRYP-52).
- Keep-data downgrade + grey-lock + reactivate; Premium downgrade chooser; period-end re-checkout;
  suspension freeze + honest status; no-refund policy on every billing surface (CRYP-53…CRYP-57).

### AI research (secure LLM surface)
- Server-side Claude proxy with the key held server-only (CRYP-43).
- Denial-of-wallet caps: budget + cooldown + App Check (CRYP-44).
- LLM output validation: naming allow/deny wall + advice / price-target blocker; red-team probe suite
  with zero false positives; graceful offline fallback (CRYP-45…CRYP-48).
- Shared per-resource cache — cost-flat, tiered freshness (CRYP-49).

### Conviction engine & core features
- Journal: thesis capture with auto-save + validation (CRYP-35).
- Portfolio Risk from real market-cap-rank tiers (CRYP-36).
- Research: Portfolio Pulse; allocation + custom coin order (CRYP-37, CRYP-38).
- Learn: lesson player + quizzes (CRYP-39).
- Search: trending coins & discovery (CRYP-40).
- Transactions: add / edit with honest amounts (CRYP-41).
- The moat, end-to-end: thesis → signals → Learn (CRYP-42).

### Design system & responsive UI
- 5-tab responsive shell — one layout, phone → desktop (CRYP-26).
- v18 marketing landing page (CRYP-27).
- Design Pass 1 & 2 mockup alignment; unified white-card modal system; full dark-mode sweep; consistent
  tab headers + error-toast system (CRYP-28…CRYP-31).
- Journal, Research, and Learn surface redesigns (CRYP-32, CRYP-33, CRYP-34).

### Accounts, authentication & user settings
- Firebase Authentication — sign-up / sign-in (CRYP-19).
- Per-user data model + security-rules foundation (CRYP-20).
- Account & settings surface (CRYP-21).
- Recoverable account deletion — soft-delete + 30-day restore (CRYP-22).
- Forced plan choice for new users (CRYP-23).
- Multi-device real-time sync (CRYP-24).
- Right-to-erasure data hygiene (CRYP-25).

### Product foundation
- Portfolios & holdings — create / edit / delete with plan-limit enforcement (CRYP-12).
- Live market data — cached CoinGecko prices, cost-flat (CRYP-13).
- Pivot to a conviction & discipline tool (28 locked decisions) (CRYP-14).
- Solo-Agile delivery workflow — backlog + Definition of Done (CRYP-15).
- Layered architecture + central app-state refactor (CRYP-16).
- Canonical decision & design documentation; reusable delivery toolkit / skills library
  (CRYP-17, CRYP-18).
- Jira-integrated test workflow + autonomous `/jira-bug-hunt` (CRYP-1, CRYP-2); Vitest + node:test
  suites (CRYP-83).
