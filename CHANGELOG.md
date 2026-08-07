# Changelog

All notable changes to CryptoIdea are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **How to read this.** The version groups below organize the **shipped feature areas** by release,
> mirroring the CRYP backlog's Epics and the [`JIRA-PLAYBOOK.md`](docs/testing/JIRA-PLAYBOOK.md) §4.2
> version scheme. They were **reconstructed from git history and the backlog** — they are not yet
> git-tagged, and the **public launch (`1.0.0`) is pending** the go-live work. This is honest project
> history, not a faked timeline; exact release dates will be stamped when the versions are cut.

## [Unreleased] — 1.0.0 Public launch (in progress)

### Added
- Provision the real Firebase project and retire the demo config (CRYP-85).
- Enable Point-in-Time Recovery + a backup schedule before the first deploy (CRYP-86).
- Custom domain / hosting path (CRYP-88).

### Security
- App Check enforcement in production (CRYP-89).
- Final pre-launch security checklist sign-off (CRYP-90).

### Docs / legal
- Privacy policy + terms of service finalized (CRYP-87).

---

## [0.8.0] — Security, data isolation & hardening

### Security
- Secure-by-design audit: framework + reusable checklist (CRYP-70).
- Data-isolation audit — 23 cross-tenant probes, no IDOR (CRYP-71).
- Hardened Firestore security rules; deny-by-default Storage rules (CRYP-72, CRYP-73).
- OpenAPI spec (32 ops) + API-security review with 8 fixes; 42Crunch OAS hardening + clean live scan
  (CRYP-74, CRYP-75).
- Client-bundle + git-history secret scan; secret-scanning git hooks + AI-agent guard (CRYP-76, CRYP-77).
- Spend caps + fail-loud scheduled jobs; deploy-time demo-config guard + Hosting/SW safety
  (CRYP-78, CRYP-79).
- Cache policy: flat-cost market data, tiered AI budget (CRYP-80).
- GO-LIVE audit — 60 findings + a 7-phase runbook; Phase 0 launch-safety build (CRYP-81, CRYP-82).

## [0.7.0] — Admin panel & operations

### Added
- Owner / manager roles + a never-fewer-than-two-admins guard (CRYP-58).
- Separate `/admin` web app with session isolation (CRYP-59).
- Full users list — search + pagination + per-user detail (CRYP-60).
- Maintenance + signups toggles via public config (CRYP-61).
- Launch gate: signups-off enforcement, admin-MFA scaffold, audit choke point (CRYP-62).
- Billing-ops visibility; kill-switches + cron heartbeats + Sentry; audit search + CSV export + source
  IP; growth metrics; view-as + announcements + bulk actions + admin notes (CRYP-63…CRYP-67).
- Admin paper reskin + Overview card-fidelity passes (CRYP-68, CRYP-69).

## [0.6.0] — Billing & subscriptions (PayPal)

### Added
- Plan tiers + admin-editable prices & limits (CRYP-50).
- PayPal subscription create + already-paid guard; idempotent, plan-aware webhook (CRYP-51, CRYP-52).
- Keep-data downgrade + grey-lock + reactivate; Premium downgrade chooser; period-end re-checkout;
  suspension freeze + honest status; no-refund policy on every billing surface (CRYP-53…CRYP-57).

## [0.5.0] — AI research (secure LLM surface)

### Added
- Server-side Claude proxy with the key held server-only (CRYP-43).
- Denial-of-wallet caps: budget + cooldown + App Check (CRYP-44).

### Security
- LLM output validation: naming allow/deny wall + advice / price-target blocker; red-team probe suite
  with zero false positives; graceful offline fallback (CRYP-45…CRYP-48).
- Shared per-resource cache — cost-flat, tiered freshness (CRYP-49).

## [0.4.0] — Conviction engine & core features

### Added
- Journal: thesis capture with auto-save + validation (CRYP-35).
- Portfolio Risk from real market-cap-rank tiers (CRYP-36).
- Research: Portfolio Pulse; allocation + custom coin order (CRYP-37, CRYP-38).
- Learn: lesson player + quizzes (CRYP-39).
- Search: trending coins & discovery (CRYP-40).
- Transactions: add / edit with honest amounts (CRYP-41).
- The moat, end-to-end: thesis → signals → Learn (CRYP-42).

## [0.3.0] — Design system & responsive UI

### Added
- 5-tab responsive shell — one layout, phone → desktop (CRYP-26).
- v18 marketing landing page (CRYP-27).

### Changed
- Design Pass 1 & 2 mockup alignment; unified white-card modal system; full dark-mode sweep; consistent
  tab headers + error-toast system (CRYP-28…CRYP-31).
- Journal, Research, and Learn surface redesigns (CRYP-32, CRYP-33, CRYP-34).

## [0.2.0] — Accounts, authentication & user settings

### Added
- Firebase Authentication — sign-up / sign-in (CRYP-19).
- Per-user data model + security-rules foundation (CRYP-20).
- Account & settings surface (CRYP-21).
- Recoverable account deletion — soft-delete + 30-day restore (CRYP-22).
- Forced plan choice for new users (CRYP-23).
- Multi-device real-time sync (CRYP-24).
- Right-to-erasure data hygiene (CRYP-25).

## [0.1.0] — Product foundation

### Added
- Portfolios & holdings — create / edit / delete with plan-limit enforcement (CRYP-12).
- Live market data — cached CoinGecko prices, cost-flat (CRYP-13).
- Pivot to a conviction & discipline tool (28 locked decisions) (CRYP-14).
- Solo-Agile delivery workflow — backlog + Definition of Done (CRYP-15).
- Layered architecture + central app-state refactor (CRYP-16).
- Canonical decision & design documentation; reusable delivery toolkit / skills library
  (CRYP-17, CRYP-18).

### Tooling
- Jira-integrated test workflow (bug → failing-test → fix loop + result sync) and the autonomous
  `/jira-bug-hunt` (CRYP-1, CRYP-2); Vitest + node:test suites (CRYP-83).
