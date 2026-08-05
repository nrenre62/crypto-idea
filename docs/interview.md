# Interview & Consistency Process

**Standing operating procedure for this project** (founder decision, 2026-07-17). Bound via a rule in
[`CLAUDE.md`](../CLAUDE.md) → Conventions, so it's loaded and applied every session.

**Purpose:** keep the **code, the rules, the README, and every MD doc in agreement.** One change to a
topic (pricing, tier limits, user settings, admin, API, security…) must be reflected *everywhere*
that topic lives — no silent drift. If we edit pricing, it changes across all the code/docs/MD files
at once, not just the one file that was mentioned.

---

## When this applies

**Trigger the full process** for any *substantive* change or question — anything that:
- adds or edits a **function, tool, option, category, or plan** (new or existing);
- is a **review**: code / settings / admin-panel / security / API / pricing;
- touches a **topic in the consistency map** below;
- or when the founder says "interview me."

**Skip to a one-line heads-up** for *trivial, obvious, single-file* fixes (a typo, a one-line copy
tweak, a lone comment) — make the change, say what changed, move on. **When unsure which bucket a
change is in, treat it as substantive.**

---

## The process (in order)

1. **Interview with plain-chat questions.** Ask about the goal, the options, and the trade-offs as
   **numbered plain text in the chat** and **wait for the founder's typed answer** — **never the
   `AskUserQuestion` tool or any option-box UI** (founder rule, 2026-08-03: questions are never
   timed or skippable; they stay in the conversation and must be answered). Don't guess intent on a
   substantive change.
2. **Find the gaps first.** Before proposing anything, read the related code + every related doc
   (use the map) and list where they **disagree, are stale, or are missing.** Surface the gaps
   explicitly to the founder. *(Shortcut: run **`/consistency-sweep <topic>`** — the read-only
   `consistency-sweep` subagent in [`.claude/agents/`](../.claude/agents/README.md) does exactly
   this hunt across the topic's map row and hands back a ranked gap list + `file:line` evidence +
   the sweep list. It reports only; the plan/edit/verify/commit steps below are still yours.)*
3. **Take context from the whole topic.** Reconcile against ALL related files — code, rules, README
   section, MD docs — not just the one file the founder named.
4. **Plan, then ask.** Present a clear plan (what changes, in which files, why). Get a clear "yes"
   before editing. **Never act without a plan.**
5. **Consistency sweep.** Apply the change to **every** file in the topic's row so nothing is left
   contradicting. A changed value (e.g. a price) changes in all N places in the same commit.
6. **Verify.** Run the relevant tests/build; report the real result, including any failures.
7. **Commit to NEXT-STEPS.** Log every plan/decision in [`docs/product/NEXT-STEPS.md`](product/NEXT-STEPS.md)
   — even deferred ones — so nothing is lost.
8. **Save + commit.** Commit with a clear message and push; update memory/skills with any reusable
   pattern or preference that emerged.

## On errors

If I hit or spot an error: **tell the founder plainly** — what it is, where, and why it matters —
then **ask in plain chat** (numbered questions, no boxes, no time limit) to decide the fix. Never
silently pick a solution to a real problem.

---

## The consistency map — topic → every file that must agree

When a topic changes, review and reconcile **all** of these. The **canonical** source (the one that
wins in a conflict) is **bold**.

### Pricing / plans (prices, annual, AI $ budget)
- Docs: **[`PRICING.md`](decisions/PRICING.md)** · [`BILLING.md`](decisions/BILLING.md) · [`PRODUCT-DECISIONS.md`](decisions/PRODUCT-DECISIONS.md) #19/#20/#21 · [`USER-BENEFITS.md`](product/USER-BENEFITS.md) · [`CACHE-POLICY.md`](decisions/CACHE-POLICY.md) (AI budget) · [`ai-tool-policy.md`](planning/ai-tool-policy.md)
- Code: `functions/index.js` (`DEFAULT_PLANS`, `mergePlans`, `getStats`) · `functions/billing.js` (`computeRevenue`) · `src/hooks/useAdminDashboard.js` (`DEFAULT_PLANS`) · `src/components/Login.jsx` (`PLAN_BENEFITS`) · `index.html` (landing plan cards)
- `README.md` (Tier Limits table)

### Tier limits (portfolios / coins / tx caps)
- Enforcement: **`firestore.rules`** (`configuredLimit` / `maxPortfolios` / `maxCoins` / `maxTx`)
- Code: `functions/index.js` (`DEFAULT_PLANS`) · `src/hooks/useUpgrade.js` (`TIER_LIMITS`, `limitsForTier`) · `src/hooks/useAdminDashboard.js` · `src/components/Login.jsx` (`PLAN_BENEFITS`)
- Docs: `README.md` (Tier Limits) · [`PRICING.md`](decisions/PRICING.md) · [`USER-BENEFITS.md`](product/USER-BENEFITS.md) · [`PRODUCT-DECISIONS.md`](decisions/PRODUCT-DECISIONS.md) #19/#20

### AI budget / usage (`aiMonthlyCents`, "~N/day")
- Docs: **[`PRICING.md`](decisions/PRICING.md) §4** · [`CACHE-POLICY.md`](decisions/CACHE-POLICY.md) C3 · [`ai-tool-policy.md`](planning/ai-tool-policy.md) · [`USER-BENEFITS.md`](product/USER-BENEFITS.md) · [`PRODUCT-DECISIONS.md`](decisions/PRODUCT-DECISIONS.md) #21 · [`BACKEND-ADMIN-DECISIONS.md`](decisions/BACKEND-ADMIN-DECISIONS.md)
- Code: `functions/index.js` (`aiMonthlyCents` in `DEFAULT_PLANS`) · `functions/guards.js` (`consumeDailyBudget`)

### Billing / PayPal (subscription lifecycle, webhook)
- Docs: **[`BILLING.md`](decisions/BILLING.md)** · [`PRICING.md`](decisions/PRICING.md) · [`BACKEND-ADMIN-DECISIONS.md`](decisions/BACKEND-ADMIN-DECISIONS.md) D5/D6 · `openapi.json`
- Code: `functions/index.js` (PayPal section) · `functions/billing.js` · `functions/guards.js` (cooldown) · `src/components/Login.jsx` + `src/hooks/useUpgrade.js` (upgrade/downgrade UI) · `firestore.rules` (subscription/tier server-only)

### User settings / account (profile, security, GDPR)
- Docs: **[`USER-SETTINGS.md`](product/USER-SETTINGS.md)** · [`USER-SETTINGS-README.md`](product/USER-SETTINGS-README.md) · [`USER-CREATION.md`](product/USER-CREATION.md)
- Code: `src/components/Account.jsx` · `src/hooks/useAuthSession.js` · `src/CryptoIdea.jsx` (handlers) · `firestore.rules` (users-doc shape + owner blocklist) · `functions/index.js` (self-service callables: `deleteMyAccount` / `restoreMyAccount` / `exportMyData` / `signOutEverywhere` / `reconcileMyCounters`)

### Admin panel
- Docs: **[`BACKEND-ADMIN-DECISIONS.md`](decisions/BACKEND-ADMIN-DECISIONS.md)**
- Code: `src/components/admin-dashboard.jsx` · `src/hooks/useAdminDashboard.js` · `admin.html` + `src/admin-main.jsx` (separate admin app) · `functions/index.js` (admin callables) · `firestore.rules` (`isAdmin`)

### API / Cloud Functions
- Docs: **`openapi.json`** (the complete contract) · [`API-SECURITY.md`](security/API-SECURITY.md) · `README.md` (Cloud Functions + CoinGecko proxy sections) · [`DATA-FLOW.md`](product/DATA-FLOW.md)
- Code: `functions/index.js` + `functions/{guards,billing,net-utils,universe-utils,validate-output}.js` · `firestore.rules`

### Security / rules / isolation
- Docs: **[`API-SECURITY.md`](security/API-SECURITY.md)** · [`SECURITY-AUDIT.md`](security/SECURITY-AUDIT.md) · [`ISOLATION.md`](security/ISOLATION.md)
- Code/config: `firestore.rules` · `storage.rules` · `functions/guards.js` · `functions/net-utils.js` · `.githooks/pre-commit` · `.gitignore`

### Caching / market data
- Docs: **[`CACHE-POLICY.md`](decisions/CACHE-POLICY.md)** · `README.md` (CoinGecko proxy) · [`DATA-FLOW.md`](product/DATA-FLOW.md)
- Code: `functions/index.js` (universe / cache / history) · `functions/universe-utils.js`

### Testing & issue tracking (Jira CRYP, test ↔ ticket traceability)
- Docs: **[`JIRA-WORKFLOW.md`](testing/JIRA-WORKFLOW.md)** · [`AGILE.md`](product/AGILE.md) (Definition of Done + testing conventions) · [`ERRORS.md`](testing/ERRORS.md) · `README.md` (Tests) · `CLAUDE.md` (Conventions) · `docs/testing/bug-hunts/` (hunt reports)
- Commands: `.claude/commands/jira-bug.md` · `.claude/commands/jira-fix.md` · `.claude/commands/jira-test-sync.md` · `.claude/commands/jira-bug-hunt.md`
- Code/config: `scripts/jira-test-map.js` + `tests/unit/jira-test-map.test.js` · `package.json` (test scripts) · `.githooks/pre-push` · `.gitignore` (`.tmp/`)

### Branding / logo (the CryptoIdea mark — tile + wordmark)
- Canonical: **`index.html` `.brand`/`.mark`** (source of truth — tile 28/r8/glyph 16, body-font wordmark 18px/600/−.01em; tile green `#0b6b4f`; hover `rotate(-6deg) scale(1.06)`)
- Code: `src/components/ui.jsx` (`<Logo>`) · `src/styles/app.css` (`.ci-logo*`) · `src/styles/admin-settings.css` (`.adm-logo`/`.adm-brand-txt`/`.adm-auth-brand`) · `src/admin-main.jsx` · `src/components/admin-dashboard.jsx` · `src/components/education-page.jsx` · `src/components/Loading.jsx` · `src/main.jsx` · `src/components/Portfolio.jsx` · `src/components/Login.jsx` · `src/components/ForgotPass.jsx` (live `<Logo>` consumers) · `src/features/research/hooks/useSharePulse.js` (ships a rendered brand mark on the Pulse share image) · `src/features/research/styles/research-tab.css` (a separate `--accent` copy) · `app.html` · `admin.html` · `terms.html` · `privacy.html`
- Tests: `tests/unit/Logo.test.jsx` · `tests/unit/brand-guard.test.js` + `scripts/check-brand.js` (now also enforces PRESENCE via the `findMissingLockups`/`findMissingFonts`/`findMissingSource` helpers — terms/privacy must carry the tile lockup + Fraunces/Hanken, education-page uses `<Logo`, both stylesheets carry the hover + `#0b6b4f`; two-word denylist is case-insensitive) · `tests/unit/education-page.test.jsx` · `tests/unit/Loading.test.jsx`

> **Keep this map current.** When a file moves or a new canonical doc is added (e.g. `BILLING.md`),
> update the affected row in the *same* change — the map itself is subject to the consistency rule.
