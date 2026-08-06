# Build Progress — one line per step

**Purpose.** A running ledger of what the agents have built, so any agent (or the founder)
can see the progress at a glance. **One row per step**, answering two questions:

- **What was before?** — the state before the step.
- **What was built?** — what the step changed / added.

**How to append (every future step adds ONE row):** add a new row at the BOTTOM of the table
with the next number, today's date, the "before" state, and what you built. Keep it to one line.
This is a human-readable log, not a source of truth for decisions — the canonical backlog is
[`NEXT-STEPS.md`](NEXT-STEPS.md), the campaign ledger is [`BUILD-LOOP.md`](BUILD-LOOP.md), and the
factory that produces new steps is [`AGENT-FACTORY.md`](AGENT-FACTORY.md).

> The rows below 1–33 are the milestone history reconstructed from git + the CLAUDE.md changelog
> (2026-06-06 → 2026-08-05). Some rows group several closely-related commits (e.g. the design
> polish rounds) to stay scannable; the per-commit detail lives in `git log`.

| # | Date | What was before? | What was built? |
|---|------|------------------|-----------------|
| 1 | 2026-06-06 | Nothing — empty repo | Initial Crypto Idea app: Vite + React 18 + Firebase portfolio tracker + DCA calculator PWA scaffold |
| 2 | 2026-06-16 | Public API + rules with only basic bounds | Security hardening: strict rate-limit on the public subscribe write (C1), SSRF guard on the email apiUrl (M1/M3/L1/L2), bounded coin/tx field sizes & ranges (M2) |
| 3 | 2026-06-17 | No data export; hard-delete only | Account CSV export (holdings + transactions) + soft-delete 30-day trash with self-restore + admin Trash tab |
| 4 | 2026-06-18 | Diagrams updated by hand, drifted | Diagram-drift detector + `/finish` redraw step |
| 5 | 2026-06-21 | No thesis capture | Journal: persist investment thesis + thesis-review decision on the coin doc |
| 6 | 2026-06-23 | Names/FOMO copy risk; loose plan tiers | No-names voice + anti-FOMO copy + build-time dist name-guard; tier reconfig (Pro 3/50, Premium 15/1000) + 1,000-coin hard clamp |
| 7 | 2026-06-23 | Learn tab static; research signals unfed | Persist Learn progress; wire real XP/level/streak + quiz-gated completion; thread the coin journal into Research holdings |
| 8 | 2026-06-24 | Thin Learn library; no research funnel; no AI safety net | 9-module / 50-lesson Learn library; manual-research funnel fields on the journal; conviction rubric reducer + 4-state pills; fail-closed AI-output validator (regex prefilter) |
| 9 | 2026-06-25 | Mobile-only layout | Responsive app shell (centered column widening on desktop) + 2-up grids for Learn / Journal / Research + narrower shell for forms & detail |
| 10 | 2026-06-26 | Pre-mockup design | Design Revamp: portfolio value summary card, 3-up asset grid, floating desktop nav, token-circle consistency, tinted % pills, dark-mode sweep, Journal/Research redesign |
| 11 | 2026-06-27 → 06-29 | Design Pass 1 gaps | Design Pass 2 (DP-1…DP-12): portfolio switcher, coin-info market data, `/api/prices` vol+supply, Search redesign + cached trending, Account drill-in settings, final dark-mode + responsive sweep |
| 12 | 2026-06-30 → 07-01 | Rough edges after DP2 | Design Rounds 6–19: card consistency, Journal readability popups, positive-only Buy/Sell (fixes the misleading error), paper background, shared `<Modal>`, market-cap-tier Risk, portfolio rename/delete-confirm, newest-first tx + pager, desktop popups |
| 13 | 2026-07-02 | Rounds 20–28 pending | Design Rounds 20–28: module-scoped Learn player, tx-row redesign, rank-based Risk via `/api/prices` rank, journal auto-save + Incomplete badge, clickable `<CoinIcon>` + CoinInfo overlay, billing plan-flow popups + double-charge guard |
| 14 | 2026-07-03 | No real billing hardening | BL-1/BL-2: PayPal idempotent webhook, plan-aware tiers, period-end cancellation, cycle-true revenue, per-uid rate limiter; admin capabilities (grant/revoke, trash, sign-out-all-devices) + audit log |
| 15 | 2026-07-03 | Cache/UX/CSP gaps | Cache tiers + freshness (C7/C12/C14/C15), multi-device live sync (onSnapshot watchers), dropped CSP `script-src` `unsafe-inline` (dist ships zero inline scripts) |
| 16 | 2026-07-07 | Open-shape rules; no onboarding gate | ISO-1/2/5 closed-shape rules + isolation tests; R31/R32 forced plan choice, downgrade select-then-confirm, admin delete via trash, suspension freeze, Research drag order |
| 17 | 2026-07-18 | Admin = weaker separation | ADMIN-SEC: server roles (owner/manager), owner protection, step-up re-auth, owner-only rule writes, role-aware admin UI + docs/OpenAPI consistency sweep |
| 18 | 2026-07-20 | Pre-go-live risks | Go-live Phase 0: spend caps, a rules hole fix, cache headers, SW scope, deploy guard |
| 19 | 2026-07-21 | No bug workflow | Jira workflow: `/jira-bug` → failing-test → fix loop + test-result sync; autonomous `/jira-bug-hunt` report pipeline |
| 20 | 2026-07-24 → 07-25 | Admin ops thin; panel off-brand | ADMIN-0…5 (signup gate, feature kill-switches, growth metrics, billing-ops visibility, audit depth, team-scale support) + ADMIN-UI mockup-match reskin |
| 21 | 2026-08-01 | Mixed settings framing; two-word brand; tx-delete risk | USER-SET-UI framed panels; unified `<Logo>` + "Crypto Idea"→"CryptoIdea" (LOGO); numeric-input + per-tx-delete hardening (TX-SAFE); signup in-flight lock + duplicate-email detector (AUTH-DUP); server-enforced plan-selection gate (ONBOARD-GATE) |
| 22 | 2026-08-03 | Manual, all-by-hand build process | Agent Factory: consistency-sweep + secure-by-design + test-tier-verifier + design-consistency reviewers, then the 15-subagent roster + `/build-feature` orchestrator with G1/G2/G3 human gates |
| 23 | 2026-08-04 → 08-05 | Brand mark inconsistent across surfaces | LOGO-2 + LOGO-parity: unified tile+wordmark lockup on app / admin / legal / loading / share surfaces + a brand guard that enforces presence and denylist |
| 24 | 2026-08-05 | 4 Dependabot PRs open, no automated check on them | Verified + merged Dependabot #6/#10/#11/#12 (sharp/undici/ip-address/hono) by hand — `npm ci` + build + `test:unit` green; all dev-only |
| 25 | 2026-08-06 | No server-side CI; any PR (incl. bots') merges to master unchecked; factory has no maintenance lane | **Tier A:** GitHub Actions CI (`build` + `test:unit`, meant to be a required check) + grouped `dependabot.yml` (root + functions + actions) + this progress log |
