# Crypto Idea — Product Backlog (Next Steps)

> This is the **prioritized product backlog** for our [Agile workflow](AGILE.md): top = next.
> Each item is a small, shippable increment finished to the **Definition of Done** in AGILE.md.
> The architecture refactor (§1) is complete. The current priority is the **2026-06-22 product
> direction** (§0, canonical: [`PRODUCT-DECISIONS.md`](../decisions/PRODUCT-DECISIONS.md)) — finish the conviction
> engine, Learn, and the tier reconfig behind a secure AI proxy. Go-live tasks (§4) follow.

See also: [`AGILE.md`](AGILE.md) (how we work + Definition of Done),
[`src/ARCHITECTURE.md`](../../src/ARCHITECTURE.md) (layer rules + migration detail),
[`README.md`](../../README.md) (backend/proxy/deploy), [`CLAUDE.md`](../../CLAUDE.md) (conventions).

---

## FLOATING-HEADER. Pinned brand-bar header on every tab + Account, 30px top gap, sticky settings headers  (✅ BUILT 2026-08-09 · CRYP-102 · branch master-6mrr02 · design-only · founder interview 2026-08-09)

**Founder ask (2026-08-09, plain-chat interview + interactive spacing mockup):** the header must stay
on screen while the page scrolls — on all 5 tabs and in Account — with breathing room above it and a
paper-tone bar behind it. Design-only; handlers/state/routing unchanged. Responsive (mobile + desktop),
**no new layout `@media`** (the sticky bar + gap are the same markup both widths), dark-safe (light stays
byte-for-byte, dark flips via token).

**🟩 Locked decisions (founder answered all 8):**
1. **Floating/sticky header** on every bottom-nav tab (Portfolio · Research · Journal · Learn · Search):
   **only the brand bar** pins (logo + BETA + LIVE/PAUSED + plan badge + the account **M** avatar). The
   value card, asset list, and all body content scroll **under** the pinned bar.
2. **Top gap = 30px total** above the header content (replaces the current `.apphead` `14px` top padding),
   **mobile + desktop**, every header. Confirmed via the interactive mockup ("replace with 30px total").
3. **Settings screens** (Account home + every drill-in: Profile · Plan & billing · Portfolio · Security ·
   Privacy & data): the **settings header + its divider line** get the 30px gap above them and pin; the
   **settings card body sits below** with its normal spacing — the 30px is *above the header/border only*,
   never inside the card.
4. **Scroll-to-top on drill-in open** — opening any settings item resets the scroll to the top so the
   title is visible, even if the operator had scrolled down.
5. **Header background `#F6F5F0` in light** (the existing `--paper` tone), **matching dark paper tone in
   dark** — dark-block-only (`html[data-theme="dark"]`), light untouched. Header bar bg only.
6. **Field gap = 8px** between the stacked inputs in **Profile** (new email ↔ current password) and
   **Security** (new password ↔ confirm) — today they're flush/merged.
7. Re-confirm of #1: **just the brand bar sticks** (value card is not part of the frozen header).
8. **Research** header gets the same 30px + `#F6F5F0` bar; its Overview/Coins/Ask sub-nav already floats.

**Plan of record (file-by-file, KISS, design-only):**
- `src/styles/app.css` — `.ci-app .apphead` → `position:sticky; top:0; z-index`, `padding-top:30px`,
  `background:var(--paper)` + subtle bottom hairline/shadow; dark-block override for the bar bg; the
  settings header (`.set-scr-head`) becomes a sticky top bar with the 30px gap (split out of the
  `overflow:hidden` `.set-scr` card so sticky isn't clipped — card body sits below); `.fields` gap → 8px.
  One rule covers Portfolio/Journal/Learn/Search (all share `.apphead`).
- `src/features/research/styles/research-tab.css` — Research header 30px + `#F6F5F0` (+ dark), scoped
  under `.research-root` (never `.ci-app`).
- `src/CryptoIdea.jsx` — the shell-level floating **avatar** (`.app-avatar`, currently
  `position:absolute; top:14px`) is unified **into the pinned brand bar** so it sticks with the row
  (tap still opens Account; behavior identical). Bump/retire the old absolute `top`.
- `src/components/Account.jsx` — restructure `SettingsScreen` so the header pins (30px gap) and the body
  card scrolls below; add a `scrollTo(0)` effect keyed on the settings `view`; 8px field gap.
- `src/components/Portfolio.jsx` / `HeaderTags.jsx` — header wrapper touch only if the avatar
  unification needs it (keep the shared `.apphead`/`.title` markup).
- Docs: `docs/design/DESIGN-PASS.md` (new round), this log (status), `CLAUDE.md` (design convention note).

**Tests:** the `scrollTo(0)`-on-view-change effect and the avatar-in-header structure are unit-testable
(vitest) — red-first. Pure-CSS sticky/spacing/`#F6F5F0` has no jsdom layout to assert; covered by the
interactive mockup + a `design-consistency` review (scoping · dark-block light-unchanged · responsive
no-new-`@media` · no-names) before commit. No rules/functions/openapi surface touched.

**Provenance:** 🟩 GREEN locked plan → G1 interview satisfied by this block (done 2026-08-09); G2
non-blocking plan-of-record; built through the loop on branch `master-6mrr02` (fresh off `master`), one PR.

**As built (✅ 2026-08-09 · CRYP-102, design-only, client-only):** shipped exactly as planned —
the four `.ci-app` tabs share ONE `.ci-app .apphead` sticky rule (`position:sticky; top:0; z-index:4;
padding:30px 56px 14px 18px; background:var(--paper); box-shadow:0 1px 0 var(--line)`); Research pins
header+sub-nav together via its own `.research-stickyhead` wrapper (`position:sticky; top:0; z-index:16`)
around `.apphead`+`.segwrap` (no magic-number offset). The account **M** avatar is the single shell-level
`.avatar-dock` (zero-height `position:sticky; top:0; z-index:20`) wrapping the one `.app-avatar`
(`top:28px; right:18px`) for all 5 tabs — supersedes the old `position:absolute; top:14px` shell avatar.
Settings did Option B as PURE CSS (DOM unchanged): `.set-scr` is now a transparent layout wrapper, the
white card frame moved onto `.set-scr-body`, and `.set-scr-head` is a sticky paper-tone bar (30px top
pad + `border-bottom`); plus a `scrollTo(0,0)` effect on drill-in open and an 8px stacked-field gap.
Full as-built spec: `DESIGN-PASS.md` (Round 35).

---

## JOURNAL-POLISH. Journal/thesis type-scale + floating coin header + honest disclaimers  (🟩 GREEN — locked 2026-08-09 · design + honest-copy · founder interview 2026-08-09)

**Founder ask (2026-08-09, plain-chat interview + screenshots):** tighten the Journal/thesis surfaces
(type sizes, the duplicated coin name, the delete-confirm visibility, empty-state) AND fix two **false**
copy claims — the thesis does NOT currently feed the AI/Research (no connection is wired), and the journal
is NOT "only you" (an owner-admin can view a thesis per account via the audited `viewUserAsAdmin`). Next
build-loop component after FLOATING-HEADER. Design-only + copy; handlers/state/routing unchanged. Dark-safe,
responsive, no new `@media`, no-names guard clean.

**🟩 Locked decisions (founder answered the interview):**
1. **Tab footer disclaimers → 14px**, and **keep each tab's own line** (do NOT unify the text): Portfolio
   "Prices via CoinGecko · Not financial advice" (13px→14px), Research keeps its line, Learn keeps
   "For educational purposes only — not financial advice", Journal keeps its privacy note (edited, #9).
   **Search** currently has NO disclaimer → **add "Prices via CoinGecko · Not financial advice"** (same as
   Portfolio), 14px.
2. **Kill the duplicate coin name in the thesis detail overlay** — `JournalDetail`'s `<Modal title={coin.name}>`
   renders the name at top AND again in `.bj-coin-head` next to the logo. Drop the Modal title's coin name;
   keep the logo+name row where it is.
3. **Question type-scale:** `.q-label` (headline, e.g. "Why are you buying this?") → **16px**; `.q-sub`
   (description) → **14px**.
4. **Make the logo+name row (`.bj-coin-head`) the FLOATING (sticky) header** inside the thesis overlay —
   don't move it; content scrolls under it; the Modal X stays. (Pairs with #2.)
5. **Delete-thesis confirm:** when `confirmDel` opens, **scroll the two buttons into view** (they currently
   render below the fold in the long modal); **8px gap** between "Yes, delete thesis" and "Keep it".
6. **Empty "No thesis yet — tap 'Add thesis' above…"** → wrap in a **card/pill** + **16px** (already
   auto-hides once a thesis exists — conditional on `entries.length===0`).
7. **Section headings** "Needs a thesis (N)" and "Your theses (N)" (`.sec-label h2`) → **16px**.
8. **AddThesis callout:** `.bjc-label` → **16px**, `.bjc-text` → **14px**, and **drop the false AI claim** —
   new text (founder-approved): *"Your thesis lives with this coin. When the market drops, you'll know
   exactly why you bought — and whether that reason still holds."* (removes "and powers your Research & Ask").
9. **Journal footer note (`JOURNAL_NOTE`)** → **truthful** copy (founder chose B1):
   *"Your journal is visible only to you and the CryptoIdea team."* (no AI claim; honest that an admin can
   view it — matches the audited owner-only `viewUserAsAdmin`).

**Plan of record (file-by-file, design + copy only):**
- `src/components/Journal.jsx` — `JOURNAL_NOTE` string (#9); drop `Modal title` coin name in `JournalDetail`
  (+ `ThesisBreakdown` if it double-renders) (#2); sticky `.bj-coin-head` wiring (#4); `AddThesis` callout
  text (#8); delete-confirm scroll-into-view (a `ref` + `scrollIntoView` when `confirmDel` flips true) (#5);
  wrap the "No thesis yet" empty line in a pill element (#6).
- `src/components/Search.jsx` — add the "Prices via CoinGecko · Not financial advice" footer disclaimer (#1).
- `src/styles/app.css` — `.disclaimer`/`.disclaimer-lg` → 14px unification (#1); `.q-label` 16px / `.q-sub`
  14px (#3); `.bj-coin-head` sticky (#4); the 8px delete-button gap (#5); the empty-state pill (#6);
  `.sec-label h2` 16px (#7); `.bjc-label` 16px / `.bjc-text` 14px (#8).
- `src/features/research/styles/research-tab.css` — the Research `.disclaimer` → 14px if it's the tab footer
  (confirm during build; keep `.research-root`-scoped).
- Docs: `docs/design/DESIGN-PASS.md` (round entry), this log (status), `CLAUDE.md` if the JOURNAL note copy
  is referenced.

**Honesty note (why #8/#9 matter):** CLAUDE.md's Research section states the thesis-→-AI link is **Wave B,
not yet wired** — so the current "powers your Research & Ask" / "helps the AI" copy is false today. When the
Wave-B proxy actually consumes journal context, the AI phrasing can be reinstated in that increment.

**Tests:** the delete-confirm `scrollIntoView` (#5) and the "No thesis yet" pill presence/absence (#6) are
unit-testable (`tests/unit/Journal.test.jsx`) — red-first. Pure-CSS type sizes / sticky header have no jsdom
layout → covered by `design-consistency` + screenshots. The copy strings (#8/#9) are assertable in the
Journal test (exact text). No rules/functions/openapi surface.

**Provenance:** 🟩 GREEN locked plan → G1 satisfied by this block; G2 non-blocking plan-of-record; build on a
fresh branch off `master` after FLOATING-HEADER merges, one PR. Sizing: mostly CSS + copy + small JSX — if it
nears ~200 lines, split disclaimers (#1) from the thesis-overlay work.

---

## FACTORY-INTERVIEW-GATE. Ad-hoc build = mandatory interview; a written NEXT-STEPS plan skips only G1  (✅ BUILT 2026-08-08 · docs/command only · CRYP-98)

**Founder rule (2026-08-08):** the interview→plan phase is enforced by **provenance**, so any operator
running the loop interviews before building unless a plan already exists.
- **PLANNED** — a `NEXT-STEPS` key carrying a **written/locked plan** (a real plan block or the 🟩 GREEN
  "locked decisions" marker) → **G1 interview skipped** (the written plan is G1). **G2 still runs, never
  skipped**, as a **non-blocking plan-of-record** (`architect` drafts the file-by-file plan, it's shown,
  the build proceeds).
- **AD-HOC** — a free-text "build / design / fix this **now**" from chat, or a `NEXT-STEPS` **stub with
  no plan** → **G1 interview MANDATORY, no exceptions**; **G2 blocking** (no code before the yes). A bug
  is interviewed **before** `/jira-bug` → `/jira-fix`.
- **No trivial carve-out for build/design/fix** — even a one-liner is interviewed. The one-line-heads-up
  path survives only for a **pure doc typo / copy / comment** (not a build/design/fix).
- Enforced at **any** entry point, not just `/build-feature`.
- **Consistency sweep (6 files):** `.claude/commands/build-feature.md` (Absolute rule + Preflight §3.5
  classification + G1/G2/outer-loop), `CLAUDE.md` (Interview convention), `docs/interview.md` (flow +
  narrowed carve-out), `docs/product/AGENT-FACTORY.md` (gate table + pipeline diagram),
  `docs/product/BUILD-LOOP.md` (ledger gate step), this log.

## AGENT-FACTORY. Autonomous feature assembly line (dev tooling — ✅ ROSTER BUILT 2026-08-03; first end-to-end run pending)

Canonical: **[`AGENT-FACTORY.md`](AGENT-FACTORY.md)**. A `/build-feature` orchestrator that carries
one backlog item through the full [Definition of Done](AGILE.md) via a fixed sequence of
specialized agents (each fires when the previous finishes), pausing only at the **three human
gates** — interview, plan approval, merge approval (founder decision: the factory replaces the
founder's *hands*, never the *decisions* or the interview). Founder interview 2026-08-03 locked:
**layer-specialized builders** (rules/functions/client), a **main-session orchestrator command**
(so the gates can ask the founder in **plain chat** — a background Workflow can't ask at all), and
**write the blueprint first**. Roster = 4 built review agents (`consistency-sweep`/`secure-by-design`/`test-tier-verifier`/
`design-consistency`) + 12 to build (spec-drafter, architect, test-author, 3 builders,
api-contract-verifier, simplifier, docs-scribe, integrator, fix-controller, orchestrator). Build
order in AGENT-FACTORY.md §6: orchestrator + fix-controller first, then the gate-assist agents,
then test-author, the builders, docs-scribe + integrator, and the stage-6 quality reviewers.
Local-first, no new deps; each agent built to the `jira-*` bar and validated before it's trusted in
the line.

**Status ✅ ROSTER BUILT 2026-08-03:** all 12 exist — 11 subagents in `.claude/agents/`
(spec-drafter, architect, test-author, rules/functions/client-builder, api-contract-verifier,
simplifier, docs-scribe, integrator, fix-controller) + the `/build-feature` orchestrator command.
The 4 review agents (`consistency-sweep`/`secure-by-design`/`test-tier-verifier`/`design-consistency`)
are wired in as stages. **Not yet exercised end-to-end** — the first `/build-feature <small item>` run
is the integration test; start low-risk.

**Update 2026-08-04 — continuous loop, no stop between items (founder rule):** removed the *mechanical*
stops so the loop "build[s] items one after another without stop until finish." `BUILD-LOOP.md` dropped
its per-item **compact-and-resume** step (build → verify → commit → tick → *straight to the next*; the
"Resume prompt" became a **Recovery prompt** used only if a session actually restarts), and the factory's
outer loop (`AGENT-FACTORY.md` §5 + `/build-feature` step 15) now **auto-advances** to the next queued
item after G3 instead of asking "shall I continue?". **Decisions preserved:** the three human gates
(G1/G2/G3), 🔶 CHECKPOINT interviews, and real-failure stops all stay — "no stop" removes only the
mechanical pauses, never the founder's decisions. (Honest caveat: harness *auto*-compaction can't be
switched off, but progress lives in the ledger files, so it no longer halts the run.)

---

## PR-WORKFLOW. Canonical PR standard + factory wiring (PR-per-component default)  (✅ BUILT 2026-08-06 · docs/config only)

Founder research note *"PR Explained"* → a repo-canonical PR standard, and the Agent Factory now
**opens a PR per component by default** at G3 (founder decision 2026-08-06; supersedes the old "no PR
unless asked"). Decisions locked: (1) PR-per-component default · (2) keep `claude/…` branches ·
(3) new canonical doc · (4) adopt GitHub issues (`Closes #`) · (5) squash-merge + delete + CI-green +
repo settings.

- **New:** [`PR-WORKFLOW.md`](PR-WORKFLOW.md) (the standard: title/body/size/CI/squash/linking/repo
  settings) + `.github/pull_request_template.md` (Why / What / How tested / Screenshots / Checklist,
  CRYP key + `Closes #`).
- **Wired:** `integrator.md` (PR opened at G3, not "no PR unless asked") · `build-feature.md` (step 17
  opens the PR by default + a one-PR/~200-line absolute rule) · `AGENT-FACTORY.md` (G3 table, assembly
  line, roster, §7 conventions, §8 open-question resolved) · `architect.md` (~200-line split rule) ·
  `AGILE.md` DoD (one PR per PR-WORKFLOW.md).
- **Founder GitHub-UI follow-up (not code — can't be set from the agent environment):** set Squash as
  the default merge + disable Merge/Rebase + enable auto-delete head branches; branch protection on
  `master` requiring the CI checks. Listed in `PR-WORKFLOW.md` §10.

---

## JIRA-PLAYBOOK. Full-project Jira planning standard + factory G1 Story wiring  (✅ BUILT 2026-08-07 · Track A, docs/config only)

Founder research note *"Jira workflow"* → a repo-canonical **planning** playbook, closing the gap that
the repo's Jira docs were **bug-only** while the live CRYP board had already grown into a **9-Epic /
79-Story roadmap** (the docs literally said "ignore Epic"). Interview decisions locked (2026-08-07):
(1) new doc `JIRA-PLAYBOOK.md` · (2) templates in the playbook + wire Story-creation into the Agent
Factory **G1** (no new slash-commands) · (3) adopt **Components** (surfaces) · (4) adopt
**Versions/Releases** · (5) README "How I built this" + a `CHANGELOG.md` · (6) align `/jira-fix` to
`claude/…` branches. Founder scoped this to **Track A (repo docs)** — the live-board mutations
(create components/versions, tag issues, delete the CRYP-84 duplicate) are **Track B, deferred**.

- **New:** [`JIRA-PLAYBOOK.md`](../testing/JIRA-PLAYBOOK.md) (hierarchy · Epic/Story/Task/Bug templates
  with Given/When/Then AC · Kanban WIP=1 · Components §4.1 · Versions §4.2 · labels · the Rovo-MCP
  **OAuth-not-token** correction · portfolio-presentation arc) + root **`CHANGELOG.md`** (Keep-a-Changelog,
  seeded from the backlog, honestly framed as reconstructed-from-git).
- **Wired:** `JIRA-WORKFLOW.md` (de-staled §2 — "ignore Epic" retired, Components/Versions adopted,
  playbook cross-link) · `jira-fix.md` (`fix/CRYP-…` → `claude/cryp-<n>-slug`, so CI fires on push) ·
  `build-feature.md` (G1 files a CRYP Story; transition to Done at merge; a one-Story-per-component
  absolute rule) · `spec-drafter.md` (AC drafted Story-ready, Given/When/Then) · `interview.md`
  (consistency-map row) · `CLAUDE.md` (Jira-planning bullet) · `README.md` ("How I built this").
- **Versioning (founder, 2026-08-07):** the app **and** admin ship as **one product at one version**.
  The first Firebase deploy goes out as a **public beta** — **`1.0.0-beta`**, **target 2026-10-01** —
  then `1.0.0` when stable (SemVer pre-release ladder documented in `JIRA-PLAYBOOK.md` §4.2). Fixed the
  bogus `"version": "4.0.0"` in `package.json` + `functions/package.json` → `1.0.0-beta` (metadata only,
  build-safe — `stamp-sw.js` doesn't read it). `CHANGELOG.md` retargeted to `1.0.0-beta` and the fake
  `0.1–0.8` "releases" collapsed into one honest "pre-release development" history (nothing was ever
  tagged/deployed). Until 2026-10-01: fix the major things + polish the app and the docs.
  - **Repo-wide version sweep (2026-08-07, follow-up):** aligned every remaining **product**-version
    string to `1.0.0-beta` — `deploy.sh` (`Deploy v4.0.0` → `v1.0.0-beta`), both `package-lock.json`
    roots (root + `packages[""]`), and `openapi.json` `info.version` (`1.0.0` → `1.0.0-beta`). Verified
    nothing else carries a product version (the SW stamp, Sentry, HTML entries, and manifest do not; the
    web-manifest spec has no version field). **Dependency** versions were left untouched — only the
    project's own version fields changed.
- **Duplicate flagged for founder cleanup (Jira UI — no delete tool over the connection):** **CRYP-84**
  (Story) re-files the work of **CRYP-1 + CRYP-2** (Tasks) — delete CRYP-84, keep the two Tasks.
- **Track B (deferred, founder's go):** create the 9 Components + the `v0.x`/`v1.0` Versions via the
  Rovo MCP and tag the Done stories; founder deletes CRYP-84 + any unclear Epics in the Jira UI.

---

## AUTH-DUP. Prevent duplicate-signup double-submit + admin dedupe detector  (✅ BUILT 2026-08-01 · client lock + read-only admin callable)

Founder report (2026-08-01, with a screenshot showing **two `mark@test.com` rows** in the admin
Users list): pressing **Create Account / Log in** twice within 1–2 seconds — because the button
didn't respond fast enough — created **duplicate accounts for the same email**. Fix the double-submit
and give the owner a way to see any duplicates that already exist.

**Root cause (verified in code):** `handleAuth` ([`src/CryptoIdea.jsx`](../../src/CryptoIdea.jsx) ~L282)
is `async` and `await`s `registerUser` / `loginUser`, but the submit button
([`src/components/Login.jsx`](../../src/components/Login.jsx) ~L214) is a plain `type="submit"` that
is **never disabled while the request is in flight**, and there's **no re-entry lock**. A second
click (or Enter) before the first `await` resolves fires a **second `registerUser` concurrently**.
The seed script creates admin/admin2/manager/legacy/free/pro only — never `mark` — so the two `mark`
rows came from the real flow firing twice.

**Prod vs development — important, and the reason this is lower-blast-radius than it looks:**
- **Production** (real Firebase Auth / Identity Platform) enforces email uniqueness **transactionally**
  — the second concurrent `createUserWithEmailAndPassword` is rejected with `auth/email-already-in-use`,
  so **two accounts with the same email cannot both be created**. The double-click just produces an
  ugly error.
- **Development** (the Auth **emulator**) is a lightweight single-process check with no concurrency
  constraint, so two near-simultaneous creates can **both** slip past the "email exists?" test → two
  accounts. **This is what produced the duplicate `mark` rows** — an emulator artifact, not a
  production outcome.
- The double-submit itself is a real bug in **both** environments; production merely hides the worst
  symptom.

**Firestore-rules clarification (answers "check rules / I need enforcement rules"):** Firestore
security rules **cannot** enforce email uniqueness — a rule only sees the one document being written
and can't query "does any *other* user doc already use this email?" ([`firestore.rules`](../../firestore.rules)
validates each user doc's *shape* only). The email-uniqueness "rule" already exists — it lives in
**Firebase Auth**, not in firestore.rules. So the real defenses are the client in-flight lock (below)
plus Auth's native constraint; a Firestore rule is the wrong tool here.

### Part A — Client in-flight lock (the fix; founder chose "client lock only", KISS)

The single always-correct fix — stop the button from firing twice at the source. No new backend
(founder declined the server-callable pre-check; Auth's native uniqueness is the server guarantee in
prod).

- **Hard re-entry lock:** a `useRef` `authBusyRef` in `handleAuth`. At the top: `if (authBusyRef.current) return;`.
  Keep the existing **synchronous** validation early-returns *before* taking the lock (so a validation
  bail-out never leaves it stuck), then set `authBusyRef.current = true` immediately before the async
  auth call and reset it in a **`finally`**. A ref (not state) is the reliable lock because a state
  update is async and wouldn't block a same-tick second call.
- **Visual disable:** a companion `authBusy` **state** (set/cleared alongside the ref) exposed via
  context, driving the button in Login.jsx: `disabled={authBusy}` with a busy label
  (`"Creating account…"` / `"Logging in…"`). This also disables the Enter-key resubmit, since the form's
  `onSubmit` runs the same guarded `handleAuth`.
- **Both flows:** applies to **login and register** (founder said "login or register button"). Login
  double-submit can't duplicate an account, but the same lock removes the double request + error flash.

### Part B — Admin duplicate-email detector (founder chose "also add a detector")

A **read-only** owner-facing check that flags any two accounts sharing an email — also catches the one
*production* path that can still surface a same-email pair: someone soft-deletes (trash) then
re-registers the same email before the 30-day purge.

- **New read-only callable** `findDuplicateEmails` in [`functions/index.js`](../../functions/index.js),
  modeled on the existing `listUsers` (L1311) — **admin-claim-gated**, iterates `admin.auth().listUsers`
  pages up to the same 5000 cap, groups by **lowercased** email, and returns only emails with **≥2
  accounts**, each with minimal fields (`uid`, `email`, `tier`/`disabled`/`creationTime`). Auth is the
  source of truth for "how many accounts exist" (hard-deleted users are already gone; a soft-deleted one
  is still an Auth user, shown with `disabled: true` so the owner can tell which to remove). Read-only —
  no new write path.
- **Pure grouping helper** (unit-testable, e.g. `src/utils/…` or a functions helper): given a list of
  `{uid,email,…}`, return a map of `lowercased-email → [accounts]` filtered to `length ≥ 2`. This is the
  bit the test pins.
- **Admin UI:** a small read-only section/card (Overview or Users tab) — **"Duplicate emails: N"**,
  expandable to list each email and its accounts (uid, tier, created, disabled). The owner resolves via
  the **existing** delete/trash flow; the detector only *reads*. Admin is **light-paper only** — no
  dark-mode work. Scope any new CSS class under the admin root (grep before reusing a class name — the
  `.adm-note` / `.grid-auto` collision trap).

### Existing `mark` dupes (cleanup)

They're a local-emulator artifact. Clear them by resetting the emulator data — delete `./emulator-data`
(start empty) or delete it then `npm run seed` (reset to the 6-account baseline). No production concern;
no code needed for cleanup.

**Acceptance:**
- **A:** invoking `handleAuth` twice in the same tick calls `registerUser` **exactly once** (unit test
  with a mocked, slow-resolving `registerUser`); the button is `disabled` with a busy label during the
  await; same guard proven for login. Manual: rapid double-click Create Account in the emulator produces
  **one** account, not two.
- **B:** the pure grouping helper returns only emails with ≥2 accounts, **case-insensitively**, and
  excludes single-account emails (unit test); the `findDuplicateEmails` callable re-checks the admin
  claim and returns minimal read-only fields; the UI shows the count and the offending accounts.

**Security note (secure-by-design):** no new write surface — Part A is client-only UX + the existing
Auth constraint; Part B is one admin-gated read-only callable returning minimal fields. Both fit KISS.

**Status: ✅ BUILT 2026-08-01 (BUILD-LOOP item 6).** As built:
- **Part A** — `handleAuth` ([`src/CryptoIdea.jsx`](../../src/CryptoIdea.jsx)) now runs ALL synchronous
  validation first, THEN takes a `useRef` re-entry lock (`authBusyRef`) + a companion `authBusy` state
  around the async `registerUser`/`loginUser` call, reset in a `finally`. `authBusy` is exposed via
  context and drives the [`Login.jsx`](../../src/components/Login.jsx) submit button
  (`disabled={authBusy}` + "Creating account…" / "Logging in…"), which also blocks the Enter-key
  resubmit. Mirrors TX-SAFE Part B's `addingRef` pattern.
- **Part B** — new **read-only, `assertAdmin`-gated** `findDuplicateEmails` callable
  ([`functions/index.js`](../../functions/index.js), modeled on `listUsers`) backed by the pure
  [`functions/duplicates.js`](../../functions/duplicates.js) `groupDuplicateEmails` (lowercased+trimmed
  grouping, ≥2 only, most-duplicated-first). Client wrapper in `src/api/admin.js`; loaded on the Overview
  by `useAdminDashboard`; a read-only **"Duplicate emails"** Overview card (all-clear / count + expandable
  account list) in `admin-dashboard.jsx` (`.adm-dup-*` scoped under the admin root). No new write path.
- **Verification:** 16 new tests (RED first, commit `9995b59`) — `duplicates.test.js` (pure helper),
  `CryptoIdea.authlock.test.jsx` (two same-tick submits → one auth call, both flows + bail-out-doesn't-stick),
  `Login.test.jsx` (busy button), `admin-dashboard.test.jsx` (all-clear + count + expand). Full unit suite
  **916/916**, build clean (dist name-guard). `firestore.rules` untouched (email uniqueness lives in Firebase
  Auth, not in rules). Existing local-emulator `mark` dupes are cleared by resetting `./emulator-data` (no code).

---

## TX-SAFE. Buy/Sell numeric-input hardening + one-tap-deletes-only-one-transaction  (✅ BUILT 2026-08-01 · client-only)

Founder report (2026-08-01, client-side user app, account `mark@test.com`, coin **HYPE**; two
screenshots):
1. **Garbage in the number fields.** In the Buy/Sell form the **Amount (HYPE)** field accepts an
   *unlimited* run of `e`, unlimited `.`, and `+`. No cap on how many digits you can enter. (Same
   applies to **Price per coin**.) Founder: "make it only for numbers … theres needs to be a cap on the
   numbers. 15 digits?"
2. **One delete removes two transactions.** Tapping the trash on **one** transaction arms the two-step
   "Delete?" on **two** rows at once, and confirming deletes both. Founder: the two-step must work "only
   on the one that i click … its cant work on any other on the list … if i have 50 transactions or more."

### Part A — Numeric-input hardening (Amount + Price)

**Root cause (verified in code):** both inputs in [`src/components/AddEntry.jsx`](../../src/components/AddEntry.jsx)
are `<input type="number">` (Amount ~L71, Price ~L76) whose `onChange` only strips `-`
(`e.target.value.replace(/-/g,"")`). A `type="number"` box natively accepts `e`/`E` (scientific
notation) and `+`, and doesn't stop a second `.`; when the text is not a valid number the browser
**keeps showing the raw garbage** while `.value` silently returns `""` (the "badInput" state — which is
exactly why the field looks full of `e` but the submit button, `disabled={!eAmt||!ePrice}` at ~L95,
stays disabled). There is **no digit cap** on input. The server *does* bound magnitude before the write
(`_amt>1e15` / `_prc>1e9` → clear message, [`src/CryptoIdea.jsx`](../../src/CryptoIdea.jsx) ~L722-723)
and the Firestore rules reject non-finite numbers — but only *after* submit; nothing constrains what
can be typed.

**Founder decisions (AskUserQuestion 2026-08-01):**
- **Cap = 15 digit characters** total, **both** Amount and Price (the decimal point does **not** count
  toward the 15). Aligns with JS float precision (~15–17 significant digits) and sits under the server's
  amount bound.
- **Keep `type="number"`** — the up/down **spinner arrows stay** (founder wants them).
- **The decimal point `.` is essential and must stay** — crypto amounts/prices are fractional
  (`0.5` BTC, `0.000006` BTC are legit). *This is the one non-negotiable:* the filter blocks garbage but
  must never block a single `.`.

**Fix (keeps spinners + `.`, blocks only garbage):**
- A shared **pure** helper in [`src/utils/format.js`](../../src/utils/format.js) (next to `fmtPriceInput`),
  unit-tested (TDD): `sanitizeDecimal(str, {maxDigits:15})` → allow digits and **at most one** `.`;
  strip `e`, `E`, `+`, `-`, and any second `.`; enforce ≤15 digit chars (dot excluded); return the
  cleaned string. Leading `.` is normalised (`.5`→`0.5` on blur, not mid-type).
- Wire both fields through it: `onChange` runs `setEAmt(sanitizeDecimal(e.target.value))` (backstop for
  paste/spinner/IME), plus an `onKeyDown` guard that `preventDefault`s `e`/`E`/`+`/`-`, a second `.`, and
  a 16th digit — so the field never even enters the badInput state. `onPaste` goes through the same
  sanitizer. `type="number"`, `min="0"`, `step="any"`, `inputMode="decimal"` all stay.
- **Server stays the source of truth (defense in depth):** keep the existing pre-write bounds; the
  client cap is UX. Make the client cap and the server bound *consistent + commented* so they can't drift.

### Part B — Delete only the transaction you clicked (founder chose "fix root cause + symptom")

**Root cause (verified in code):** the delete-confirm state and the React row `key` are both keyed on
the transaction id `e.id` ([`src/components/Detail.jsx`](../../src/components/Detail.jsx) — `key={e.id}`
~L108, `armed = confirmTxId===e.id` ~L124-126, single `confirmTxId` state ~L38). Two rows can end up
with the **same `e.id`** because `addEntry` **optimistically appends** the new tx to local state
**without a dedupe guard** ([`src/CryptoIdea.jsx`](../../src/CryptoIdea.jsx) ~L761-762), while the
live-sync listener `dbWatchCoins` has **often already delivered that same doc** (same Firestore id) —
so the entry lands **twice with an identical id**. (`addCoin` avoids exactly this by guarding its append
with `p.some(x=>x.id===c.id)` ~L635; transactions were left unguarded.) Duplicate id → **duplicate React
key** → the single `confirmTxId` arms **both** rows and `remEntry`'s `filter(e=>e.id!==eid)` removes
**both**. A second way real duplicate docs get created: the **Add Buy / Save Changes** button
(AddEntry ~L95) is **not disabled while the write is in flight**, so a double-click fires
`dbAddTransaction` twice (two unique docs) — the same re-entry gap as [AUTH-DUP](#auth-dup-prevent-duplicate-signup-double-submit--admin-dedupe-detector).
The DB layer itself is already correct: `addTransaction` uses a Firestore **auto-id** (unique per doc)
and `deleteTransaction` deletes exactly one doc by `txId`
([`src/api/firebase-database.js`](../../src/api/firebase-database.js) L367-369, L408-419).

**Fix (source + symptom):**
1. **Idempotent optimistic append** — guard `addEntry`'s `setPortfolio` / `setSel` appends with
   `some(x=>x.id===en.id) ? entries : [...entries, en]` (mirror `addCoin` at L635). Kills the
   listener-vs-optimistic double-insert at the source.
2. **Defensive dedupe-by-id at render** — in `Detail.jsx`, dedupe the sorted rows by `id` before
   `.map` (belt-and-suspenders: a duplicate id can never render two rows / collide a key again).
3. **In-flight lock on submit** — a `useRef` re-entry guard in `addEntry` + a companion busy state that
   disables the Add Buy / Save Changes button with a busy label while the write awaits (same pattern as
   AUTH-DUP Part A). Stops double-click from creating real duplicate docs. (The `+ Buy` / `- Sell`
   buttons in Detail only *open* the form — no lock needed there.)
4. With unique ids restored, the existing `confirmTxId` (single value) arms **exactly one** row and
   `remEntry` deletes **exactly one** doc — the two-step confirm is inherently scoped to the clicked
   row, at any list size (the 50/page pager is unaffected).

**Existing duplicates (no destructive migration):** real duplicate docs already created by past
double-adds remain **individually deletable** once the fix lands (each has a unique id); phantom
local-only duplicates disappear on reload. We will **not** auto-bulk-delete transactions — that's
irreversible financial data; the user removes any unwanted rows manually.

**Acceptance:**
- **A:** typing `e`/`E`/`+`/`-`/a second `.` into Amount or Price is rejected; a single `.` and the
  spinners still work; input is capped at 15 digit chars; `sanitizeDecimal` unit tests cover
  garbage-strip, single-dot, `0.000006`-style fractions, the 15-digit boundary, and paste. Manual:
  the HYPE Amount field can no longer be filled with `e`.
- **B:** with a mocked slow `dbAddTransaction`, calling `addEntry` twice in one tick creates **one**
  local entry (idempotent append) and the button is disabled+busy during the await; rendering a coin
  whose entries contain a duplicate id shows **one** row; tapping delete on a row arms/deletes **only
  that row** (unit/interaction test), proven with ≥2 identical-looking transactions and in a 50+ list.

**Security / KISS note (secure-by-design):** no new backend surface. Part A is client UX over the
existing server bounds; Part B removes a local-state duplication bug and reuses the existing
per-doc delete. Pure helpers are unit-tested; no new dependency.

**Status: ✅ BUILT 2026-08-01 (client-only; no backend/rules).**
- **Part A** — three pure helpers in [`src/utils/format.js`](../../src/utils/format.js):
  `sanitizeDecimal` (keep digits + at most one dot, cap 15 digit chars, strip `e`/`E`/`+`/`-`/
  extra dots), `blockDecimalKey` (keydown guard, **badInput-aware** so a 2nd dot can't slip
  through the number input's own `.value` sanitization), `normalizeLeadingDot` (`.5`→`0.5` on
  blur). Both fields in [`AddEntry.jsx`](../../src/components/AddEntry.jsx) wired through
  onChange + onKeyDown + onPaste + onBlur; `type="number"`, spinners, and the single `.` all
  stay (locked decisions). The server bound (`_amt>1e15`/`_prc>1e9`) stays the source of truth
  and is now commented against the 15-digit client cap so they can't drift.
- **Part B** — `appendUnique` (idempotent optimistic append in `addEntry`, mirrors `addCoin`) +
  `dedupeById` (defensive render dedupe in [`Detail.jsx`](../../src/components/Detail.jsx)) +
  a `useRef` re-entry lock + `addingTx` busy state that disables the submit button while a
  write is in flight. With unique ids restored, the existing single `confirmTxId` arms exactly
  one row and `remEntry` deletes exactly one doc, at any list size.
- **Verify:** 24 new tests (RED first, then green) — full suite **900/900**, build clean
  (dist name-guard passed). Part A also confirmed in a **real browser** via an inlined replica
  of the handlers (keydown blocks `e`/`E`/`+`/`-`/2nd-dot/16th-digit; input caps at 15; paste
  sanitizes; blur normalizes) — the live Buy/Sell form is behind auth, so it wasn't logged into.

---

## ONBOARD-GATE. Mandatory, server-enforced plan-selection gate for every un-chosen user  (✅ BUILT 2026-08-01 · server flag + rules gate + non-dismissible modal · App Check + rules-deploy are go-live steps)

Founder ask (2026-08-01): a **new registration currently opens straight into the account** with no
plan step the user can't get past. Add a **plan-selection gate** — a popup shown to a new user
**before** they reach the account, offering **Starter / Pro / Premium**, that they **cannot click out
of** until they select one. It **must be enforced so no user — and no bot — can break it.**

**IMPORTANT — this partly exists (R31-2) but is breakable.** A picker with **Starter ($0) / Pro /
Premium** cards *does* pop up after registration ([`src/components/Login.jsx`](../../src/components/Login.jsx)
L154-174), with no skip link in the forced state. The gaps that let a user/bot past it (all verified in
code):
- **G1 — desktop has a working close (X).** The gate `<Modal>` only hides its X during payment
  *processing* (`hideClose={upgradeStep==="processing"}`, [`src/CryptoIdea.jsx`](../../src/CryptoIdea.jsx)
  L966), so during plan-pick the **X is clickable** → `closePlanFlow` drops the user into the account
  with no plan chosen. (This is the "I just open the account" report.)
- **G2 — one-shot, not a real gate.** `setShowPlan(true)` fires only at the *register* action
  (L306). On reload / re-login while no plan was chosen, **nothing re-shows it** → free access. The
  overlay isn't tied to the `planChosen` flag.
- **G3 — client-only; bots aren't stopped.** The gate is pure client state. A bot with an auth token
  calls Firestore/callables directly and never sees the popup. And `planChosen` is **client-writable**
  today (`updateUserSettings`, L386) — a user could set it themselves.
- **G4 — free satisfies it.** Picking Starter clears the gate with no payment (fine per the decision
  below — Starter stays free — but the *choice* must still be mandatory + server-recorded).

**Founder decisions (AskUserQuestion 2026-08-01):**
1. **Mandatory choice, keep free Starter** — the gate forces one of **Starter ($0) / Pro / Premium**;
   Starter is free, so it's a forced *choice*, not a paywall. (No paid-only wall; no removal of the free
   tier.)
2. **Full server-enforced gate** — a **server-set** flag gates all app data in Firestore rules, so a
   direct-API caller is denied. The popup is only the UX layer.
3. **Applies to all un-chosen accounts** — anyone whose account has no recorded plan choice is gated on
   next login, not just brand-new signups (closes it for accounts already created, e.g. `mark@test.com`).

### Part A — Server-authoritative gate flag (the "no bot" core)

- **One canonical, server-only field** on the user doc — `planChosen` (bool) — that is the source of
  truth. Rules add it to the **immutable-by-client** set (alongside `tier`/`role`/`deleted`/`deletedAt`
  in [`firestore.rules`](../../firestore.rules)): the client can **never** write `planChosen`. (secure-by-design:
  a field that gates access must not be self-settable — the same lesson as `tier`.)
- **Set it only server-side, two paths:**
  - **Free (Starter):** a **new callable `chooseFreePlan`** (Admin SDK) sets `planChosen=true`, keeps
    `tier:"free"`, and creates the user's **default portfolio** if missing. **App-Check-gated,
    per-uid rate-limited (reuse `guards.js`), idempotent, and audited** (reuse the single-writer audit
    choke point).
  - **Paid (Pro/Premium):** the existing **PayPal webhook** already sets `tier` server-side on a
    completed payment — extend it to also set `planChosen=true`. (`createSubscription` stays callable
    pre-choice, since it's the *path* to choosing a paid plan.)
- **Derived "chosen" for existing paid users:** the effective test is `planChosen == true || tier !=
  "free"`, so current Pro/Premium users are **never** gated (no lock-out, no backfill needed for them).
  Free accounts with no recorded choice are the ones gated.

### Part B — Firestore-rules enforcement (denies bots/API)

- **Deny read/write of all app data until chosen.** Gate the portfolio data tree —
  `users/{uid}/portfolios/**` (portfolios, coins, transactions, journal, learn) — behind
  `isChosen(uid)` (`planChosen==true || tier!="free"`). A not-yet-chosen user (or a bot with their
  token) gets **permission-denied** on every data path. The **user doc itself stays readable/writable**
  for the minimal bits onboarding/logout/delete need + rendering the gate.
- **Reconcile the "default" portfolio creation.** Registration currently writes the `default` portfolio
  client-side; once portfolio writes are gated, that must move **server-side** into `chooseFreePlan` /
  the paid-onboarding path (so the first portfolio appears exactly when a plan is recorded). Verify no
  client path tries to create it pre-choice.
- **Rules regression tests** (node:test rules suite): no-choice free user **denied** portfolio
  read/write; after `planChosen=true` **allowed**; paid user always allowed; **client write of
  `planChosen` denied**.

### Part C — Client gate (unbreakable UX; fixes G1/G2)

- **Derive the gate, don't trigger it once.** Render the mandatory plan modal whenever
  `user && !isChosen && screen!=="login"` — so it re-appears every session/reload until a plan is
  recorded (fixes G2). Retire the register-only `setShowPlan(true)` trigger as the sole entry.
- **Truly non-dismissible when forced:** `hideClose` = **true whenever forced** (not just processing),
  `dismissOnScrim={false}` (already), **Escape disabled**, and a **focus-trap** so tab/click can't reach
  the app behind it. The forced state already hides the skip link (L179) — keep. Back from billing
  returns to the plan list, never out (L121 — keep).
- **Starter choice goes through the server:** the Starter card calls `chooseFreePlan` (not the old
  client `markPlanChosen`), then refreshes the profile so `planChosen` flips from the server truth and
  the gate clears. Pro/Premium go through the existing PayPal flow → webhook sets it.
- **Escape hatch (avoid a dead-end):** the forced gate still offers **Log out** and links to
  **Terms/Privacy** — a user who isn't ready can leave; they just can't reach the *account* without
  choosing. Order gates so **suspension/offline** states show their own message *before* the plan gate.

### Bot protection (honest scope)

The rules gate means **no data access without a recorded choice**; **App Check** on `chooseFreePlan` /
`createSubscription` stops non-app clients from scripting the choice. Note App Check is **console-only
until go-live** (see [ADMIN-0] / GO-LIVE-AUDIT) — so "no bot" is fully realized only once App Check is
enforced at launch; the rules gate + rate-limit hold regardless. A bot *can* legitimately pick free
(that's an allowed choice by decision #1) but is bounded by the per-uid rate limit and only ever gets
free-tier caps.

**Acceptance:**
- A no-choice free user (or a raw API call with their token) is **denied** every portfolio/coin/tx/
  journal read+write by rules; a chosen user is allowed; a client attempt to set `planChosen` is denied
  (rules tests).
- `chooseFreePlan` sets `planChosen=true`, is **idempotent**, rate-limited, App-Check-gated, audited,
  and creates the default portfolio (unit test).
- The gate popup re-appears on reload/re-login until chosen; when forced it has **no X, no scrim/Esc
  close**, and the app behind is unreachable; **Log out** works from it (interaction test). Existing
  paid users are never gated.

**Security / KISS note (secure-by-design):** the security control is the **server** (rules gate +
server-only flag + one rate-limited, audited callable); the popup is UX. No new dependency; reuse
`guards.js`, the audit choke point, and the PayPal webhook. This is a **go-live blocker** — monetization
+ access control.

**Status: ✅ BUILT 2026-08-01** (all three locked decisions honoured; founder greenlit "gate existing
free accounts fully" + "build locally, hand off App Check/deploy"). As-built:
- **Part A (server):** `planChosen` is now a **server-only top-level** user field (removed from
  `validSettings`, added to the users create blocklist — was gap G3). New `chooseFreePlan` callable
  ([functions/index.js](../../functions/index.js)): auth + per-uid `consumeDailyBudget` + **idempotent**
  + `ensureDefaultPortfolio` + audited. App Check is enforced **platform-side** at go-live (console),
  NOT wired in code — consistent with every other callable (CLAUDE.md: `appCheckOk` stays zero-call-site
  to avoid a duplicate control + second lockout surface). The PayPal webhook ACTIVATED case and
  `devSetMyTier` also set `planChosen` + seed the default portfolio for paid tiers.
  `ensureDefaultPortfolio` is the ONE server helper that creates `portfolios/default`.
- **Part B (rules):** `isChosen(uid)` = `planChosen==true || tier!="free"`; every OWNER branch of
  portfolios/coins/transactions/learn (read+create+update+delete) requires it; admin branches
  untouched. Client can never write `planChosen` (create hasOnly + blocklist; update affectedKeys).
- **Part C (client):** registration no longer creates the portfolio; the modal is **derived**
  (`showPlan || forcedPlan`, re-appears every session — fixes G2); truly non-dismissible when forced
  (no X, no scrim/Esc, focus-trap — fixes G1); Starter → `chooseFree` (server), paid via PayPal;
  `useAuthSession` carries the server `planChosen` into the client user.
- **Verified:** rules suite **48/48** (`test:rules:solo`), integration **24/24** (`test:integration:solo`
  incl. chooseFreePlan idempotency + a not-chosen user denied end-to-end), unit **917/917**, build clean.
- **Go-live (founder-only, can't be done locally):** ① `firebase deploy --only firestore:rules` (push the
  new gate); ② enable **App Check** enforcement platform-side in the Firebase console for `chooseFreePlan`
  / `createSubscription` (per-service, no code/flag). Until then "no bot" rests on the rules gate +
  per-uid rate limit; App Check enforcement lands at launch.
- **⚠️ Go-live blocker surfaced by the adversarial review (paid path + gate):** the client's PayPal
  button ([Login.jsx](../../src/components/Login.jsx) billing step) is still the **pre-go-live
  simulation** — it optimistically `setUser({tier})` and never calls `createSubscription`. Because the
  gate derives `planChosen` from `tier!=="free"`, a *forced* (un-chosen) user who picks a PAID plan
  clears the gate on the OPTIMISTIC tier. **In DEV this is correct** (`devSetMyTier` records
  `planChosen`+tier server-side, so client and server agree). **In a real deploy the paid path MUST record
  the choice server-side (the PayPal webhook already sets `planChosen`) AND the client must gate on the
  server-confirmed choice, not an optimistic tier** — otherwise the gate clears while `firestore.rules`
  still denies all data (a broken empty state; recovers on reload, but a transient profile-load failure
  keeps the cached tier). This rides with the existing **real-PayPal go-live blocker** (BILLING.md) — the
  free path is fully server-enforced today; the paid path is DEV-correct and completed by the PayPal work.

---

## STORAGE-LIMIT. Remove the phantom per-tier "Storage" row from Plan Limits  (✅ BUILT 2026-08-01)

Founder ask (2026-08-01), from the admin **Plan Limits** card screenshot (Starter 5 MB / Pro 500 MB /
Premium 15 GB): *"What's with the storage size? Is it enforced? Is it useful — I can't go beyond the
portfolios/coins/transactions limit anyway, so how much max storage would each account use if maxed out?"*

**Investigation (verified in code, 2026-08-01):**
- **The storage numbers are a display-only string in ONE place** — `src/components/admin-dashboard.jsx`
  (the `TIERS` map `storage:"5 MB"/"500 MB"/"15 GB"` at ~L29-31, rendered at ~L613). Nothing measures
  bytes, counts them, or checks them. Grep of `functions/**` for storage/bytes/quota finds only
  `UNIVERSE_SOFT_LIMIT` (a guard on the SHARED `cache/universe` doc — unrelated to per-user plans) and
  `"no new storage"` comments. **Storage is enforced nowhere.**
- **It is admin-panel-only — NOT user-facing.** No match in `index.html` (landing), `Login.jsx`
  (`PLAN_BENEFITS`), or `PRICING.md` (its tier table lists Portfolios / Coins / Tx / Live-AI only). So
  today it's an internal inconsistency, not a broken customer promise — fix it before it leaks into
  user-facing pricing.
- **The real caps ARE server-enforced** — portfolios/coins/tx via maintained counters in
  `firestore.rules` (`portfolioCount`/`coinCount`/`txCount`, each `<= max…`, with `counterNoForge`
  fail-safe so a client can't forge the count down). Founder's belief is correct; a bot can't beat these.

**Why storage is redundant AND inconsistent (the max-footprint analysis):** transactions dominate
(`portfolios × coins × tx`); each tx doc bills ~0.3–1 KB effective (doc + auto-indexes replicating the
long `users/…/transactions/{id}` path). Journals (≤~12 KB/coin) are minor at paid tiers.

| Tier | Max transactions | Realistic max data | Displayed "limit" | Verdict |
|---|---|---|---|---|
| Starter | 1×10×50 = 500 | ~0.5 MB | 5 MB | ~10× too generous — unreachable |
| Pro | 3×50×2,000 = 300,000 | ~150–500 MB | 500 MB | near max by coincidence |
| Premium | 15×1,000×5,000 = 75,000,000 | ~11–75 GB | 15 GB | **too LOW — a maxed account exceeds it** |

The caps already bound the byte footprint, so a storage limit measures nothing new; where the two
disagree, Starter's is unreachable while **Premium's 15 GB is *below* what its own tx caps permit** — if
storage were ever enforced it would contradict the caps and could lock a legitimately-maxed Premium user
out of their own data. Storage also isn't part of the positioning (`PRICING.md` §6: *"our Premium's wedge
isn't capacity"*).

**Founder decision (AskUserQuestion 2026-08-01): REMOVE the storage row.** (Rejected: "keep but make
honest" = a display-only number nobody enforces; "actually enforce storage" = extra moving parts against
KISS that would fight the tx caps.)

**Fix (trivial, single-file, display-only — `src/components/admin-dashboard.jsx`):**
1. Delete the `storage:"…"` key from each of the three `TIERS` entries (`free`/`pro`/`premium`).
2. Delete the render row `<div className="pk">Storage</div><div className="pv" …>{t.storage}</div>` from
   the Plan Limits card. Card then shows Portfolios / Coins / Tx / Price only — matching the enforced +
   priced dimensions exactly.
3. Grep-sweep `storage`/`Storage`/`MB`/`GB` for any straggler before committing (none expected — it's
   admin-only). No rules, functions, tests, or user-facing copy change.

**Acceptance:** the admin Plan Limits card no longer shows a Storage line; `npm run build` clean; grep
confirms no `5 MB`/`500 MB`/`15 GB` remains in `src/`. **Note (separate, optional):** if a "capacity
story" is ever wanted for users, express it as the honest enforced caps (*"up to N transactions"*), never
as megabytes — capture that as its own item, don't fold it here.

**Status: ✅ BUILT 2026-08-01** (first item of the [BUILD-LOOP](BUILD-LOOP.md) campaign). Removed the
`storage` key from all three `TIERS` entries and the Storage render row in `admin-dashboard.jsx`; the
Plan Limits card now shows only the enforced + priced dimensions (Portfolios / Coins / Tx/coin / Price).
Regression test `tests/unit/admin-dashboard.test.jsx` → "Plan Limits card shows no Storage row"; grep of
`src/` confirms no `5 MB`/`500 MB`/`15 GB` remains. `test:unit` (856) green · `build` clean.

---

## USER-SET-UI. User account settings — admin-style framed panels (bordered back-box + divided header), responsive (mobile + desktop)  (✅ BUILT 2026-08-01)

Founder ask (2026-08-01, with Account/Portfolio/Profile screenshots): make the **user account
settings** screens have **borders**, with a **clear distinction for the size of settings** — apply it to
the Account home **and** every individual settings screen (Profile, Plan & billing, Portfolios, Security,
Privacy & data). Match the **admin settings** design I already applied + documented ("the same new design
changes … Admin panel settings should apply for user settings for the design structure"). **Design-only.**

**UPDATE (founder, 2026-08-01, same day):** apply this **same framed design to MOBILE too — NOT
desktop-only**. *"same design as for desktop, also for mobile, for user settings. It's much more clear …
Verify it's responsive."* So it becomes **ONE responsive design** at every width (framed panel full-width
on phones, bounded/centred on desktop). This **supersedes** the original "borders on desktop only" wording
— every "desktop-only / mobile unchanged" note below is replaced by "all sizes".

**Founder decisions (AskUserQuestion 2026-08-01):**
- **Scope = the WHOLE settings area** — the Account home (avatar + plan-usage + settings list) AND every
  drill-in, one consistent framed "settings panel" look **at every screen size** (mobile + desktop).
- **Desktop style = inline framed panel** — settings stay in the page flow, framed (border + divided
  header + bordered back-box + bounded width), exactly like the admin settings. **NOT** a centered popup
  (rejected — would diverge from the named admin reference, even though the app's *other* desktop
  drill-ins are popups).

**The admin reference (what to mirror):** the admin `DScreen` primitive
([admin-dashboard.jsx](../../src/components/admin-dashboard.jsx) ~L168) — ONE framed `.card.adm-scr`
(`padding:0; overflow:hidden`) whose **`.adm-scr-head`** carries a `border-bottom` divider, a **bordered
`‹` back BOX** (`.icon-btn` 34×34, `border-radius:11px`, `border:1px solid var(--line-strong)`,
`background:var(--paper-2)`), and the centered title **once**, then an **`.adm-scr-body`** (`padding:18px`)
with **`.adm-scr-section`** inner dividers between sub-blocks. Documented in
[ADMIN-UI-REDESIGN.md](../design/ADMIN-UI-REDESIGN.md) §10–§11.

**Current user state (verified):** [Account.jsx](../../src/components/Account.jsx) is one screen with a
local `view` state. It uses a *floating* `.detail-head` (a **bare** back chevron + centered title) sitting
ABOVE plain `.card` blocks in `.pad` — the old "DHead" pattern the admin retired. On desktop the whole
screen sits in a **720px** `.app-shell` column (account is in neither `WIDE_SCREENS` nor `NARROW_SCREENS`).
`.ci-app .card` already carries a light border on all sizes — so the ask is the *framed DScreen structure
+ bounded size*, not merely "add a border to a card".

**Build approach (design-only — content, fields, handlers, state, view-routing all unchanged):**
1. **New user-scoped primitive** (mirror `DScreen`, do NOT reuse it): a small `SettingsScreen`/shell in
   `Account.jsx` rendering `.set-scr` (framed card) → `.set-scr-head` (divider + bordered `‹` back box via
   the existing `Ic.back` + title once + spacer) → `.set-scr-body`. Sub-blocks that today are separated by
   `.acct-divider` (e.g. Profile's Display-name vs Change-email) become `.set-scr-section` dividers.
2. **New user-scoped CSS** in [app.css](../../src/styles/app.css): `.ci-app .set-scr*` mirroring the
   `.adm-scr*` values, using the existing user tokens (`--line-2`/`--line-strong`/`--paper-2`). ⚠️ **Do
   NOT import the admin `.adm-scr*`** — CLAUDE.md keeps admin CSS out of the user bundle
   (`.ci-app.adm-root`-scoped, admin-only). Mirror the values in the user sheet instead.
3. **ONE responsive design — applied at ALL sizes (no `useIsDesktop` branch, no desktop/mobile fork).**
   Render the framed `SettingsScreen`/panel for the home AND each drill-in everywhere; the old floating
   `.detail-head` + plain-card layout is fully replaced. Same markup at every width — it reflows the way
   the rest of the app does (max-width + margin auto, no layout `@media`). This is actually SIMPLER than a
   desktop-only branch.
4. **Bounded size on desktop, full-width on mobile ("clear distinction"):** give the settings panel a
   settings-scoped max-width (~560px) that centres on desktop and **goes edge-to-edge on phones** (the
   app's existing max-width + margin-auto reflow, no `@media`). **NOT** by adding `account` to
   `NARROW_SCREENS` (that flips the `baseScreen` popup path → would render Portfolio behind + treat account
   as a popup, the opposite of the chosen inline-framed style).

**Consistency sweep / files:** `Account.jsx` (primitive + per-view shell), `app.css` (`.set-scr*` CSS +
responsive settings width), possibly `CryptoIdea.jsx` (settings-width wrapper if not pure CSS). Docs: add a
short "user settings framing = mirror of admin DScreen (responsive)" note to a design doc (e.g.
DESIGN-PASS.md) + the CLAUDE.md design list. Tests: `tests/unit/Account.test.jsx` — the framed `.set-scr`
structure is now the SINGLE design (renders at the jsdom default too), so update the existing assertions to
the new markup; no desktop/mobile branch to mock.

**Acceptance:**
- **Every width** (mobile + desktop): Account home + every drill-in render as a **bordered framed panel**
  with a divided header + bordered `‹` back box, title shown once — visually matching the admin settings.
- **Responsive verified:** full-width framed panel on phones (no horizontal overflow / clipping at ~320px)
  and bounded/centred on desktop; checked light + dark.
- Design-only: all handlers/state/routing identical; no rules/functions/data change; **admin panel
  untouched** (it's the template). `npm run test:unit` green; `npm run build` clean.

**Status: ✅ BUILT 2026-08-01.** New user-scoped **`SettingsScreen`** primitive in
[Account.jsx](../../src/components/Account.jsx) (framed `.set-scr` card → `.set-scr-head` divided
header with a bordered `‹` back BOX + title once → `.set-scr-body`) now wraps the Account **home AND
every drill-in** (Profile / Plan & billing / Portfolios / Security / Privacy & data). The old floating
`.detail-head` + `.pad`>`.card` layout is gone from Account; the home's two cards fold into
`.set-scr-section` dividers and Profile's `.acct-divider` became two sections. New `.ci-app .set-scr*`
CSS in [app.css](../../src/styles/app.css) **mirrors the admin `.adm-scr*` values using the app's own
tokens** (no admin `.adm-*` imported into the user bundle). **ONE responsive design, no `@media`,
no `useIsDesktop` branch:** bounded to `max-width:560px` + `margin:auto` (centred on desktop) and
full-width within the standard 18px gutters on phones. Dark-safe (all tokens flip). Verified: 9 new
`Account.test.jsx` tests (framed panel + Back box + title-once + `.detail-head`/`.acct-divider` gone) +
the 31 existing green (**870/870 unit**), `npm run build` clean (dist-name-guard passed), and a live
browser CSS/layout probe (HMR-applied): panel bounded 560/centred at 1280, full-width no-overflow at
320px, light + dark tokens correct. Admin panel untouched (it's the template).

---

## LOGO. Unify the app header + auth logo to the landing/admin green-tile "CryptoIdea" mark  (✅ BUILT 2026-08-01 · design-only)

Founder ask (2026-08-01): use the **index (landing) page logo** inside the app — replace the app's current
"Crypto Idea" logo — and put that same logo on the **login/register screen** instead of the current auth
logo. Goal: design consistency.

**Founder decision (AskUserQuestion 2026-08-01): adopt the index logo EXACTLY** — the green rounded "C"
tile + **"CryptoIdea"** (one word, sans), matching the landing page and admin panel. (Rejected the hybrid
"green tile + keep the serif 'Crypto Idea' wordmark".)

**Current state (verified):**
- **Landing logo** (`index.html` `.brand`, L402/L789): a 28×28 green rounded-square **`.mark`** tile (white
  "C", `background:var(--accent)`, `border-radius:8px`) + **"CryptoIdea"** wordmark (one word, 600, 18px).
- **Admin ALREADY uses it:** `.adm-logo` green "C" tile + `Crypto<b>Idea</b>` in
  [admin-dashboard.jsx](../../src/components/admin-dashboard.jsx) L349-350 (sticky bar) and
  [admin-main.jsx](../../src/admin-main.jsx) L73-75 (sign-in). So the **user app + auth screens are the
  only surfaces still on the old plain wordmark.**
- **App brand = the Portfolio header ONLY:** [Portfolio.jsx](../../src/components/Portfolio.jsx) L32
  `.apphead .title` = serif "Crypto Idea" + `BETA` + `<LivePill/>` + plan badge. The other tab headers show
  their **tab name** ("Journal"/"Learn"/"Search" — Journal.jsx L306, Learn.jsx L129, Search.jsx L52), which
  is correct UX (tells you where you are) and is **not** the logo → left as-is.
- **Auth logo:** `.auth-logo` "Crypto Idea" in [Login.jsx](../../src/components/Login.jsx) L183 (login +
  register, one component) and [ForgotPass.jsx](../../src/components/ForgotPass.jsx) L20.

**Build approach (design-only — no logic/handlers change):**
1. **New shared `<Logo>` component** (green "C" tile + "CryptoIdea" wordmark), mirroring the landing
   `.brand` / admin `.adm-logo` treatment using the existing **`--accent`** token — **no new hex, no image
   asset** (the tile is CSS-drawn, like the landing + admin). Small size for the header, larger for auth
   (mirror admin's `.adm-logo` vs `.adm-logo lg`). Put it in `ui.jsx` or a new `Logo.jsx`; add one CSS
   block to [app.css](../../src/styles/app.css). ⚠️ Can't import the landing markup/CSS (separate Vite
   entry) or the admin `.adm-*` (admin-only bundle) — replicate the small treatment with app tokens.
2. **App header** (`Portfolio.jsx`): swap the serif "Crypto Idea" text in `.apphead .title` for `<Logo/>`,
   **keeping** the `BETA` + `<LivePill/>` + plan badge beside it. Only the wordmark changes.
3. **Auth screens** (`Login.jsx` + `ForgotPass.jsx`): replace the `.auth-logo` text with `<Logo size="lg"/>`;
   keep the tagline ("Know why you own every coin.").

**Gaps / open sub-decisions (flagged, not silently done):**
- **Brand-text copy vs the logo lockup.** The visible logo becomes "CryptoIdea" (one word). Separately,
  `APP_NAME = "Crypto Idea"` ([CryptoIdea.jsx](../../src/CryptoIdea.jsx) L77) still drives the page
  `document.title`, the maintenance-screen copy, and code comments. This item changes the **logo lockup
  only**; normalizing every "Crypto Idea" **text** string → "CryptoIdea" is a separate optional cleanup —
  confirm before touching copy (some may be intentional prose).
- **Other tab headers.** Only the Portfolio header carries the brand; Journal/Learn/Search keep their
  tab-name titles. If you want the tile on every tab header too, that's a separate call.

**Consistency sweep / files:** `Portfolio.jsx` (header brand), `Login.jsx` + `ForgotPass.jsx` (auth logo),
`app.css` (new `.logo*` CSS + `.auth-logo` restyle), new/updated `Logo` component. Docs: note the unified
logo in a design doc + the CLAUDE.md design list. Tests: update any assertion on the "Crypto Idea"
header/auth text — give the `<Logo>` an accessible name (`aria-label="CryptoIdea"`, tile `aria-hidden`) so
`getByText`/`getByLabelText` still resolves cleanly across the tile + wordmark.

**Acceptance:** the Portfolio header shows the green "C" tile + "CryptoIdea" (badges intact); Login,
Register, and Forgot-password show the same logo (larger); it visually matches the landing + admin;
light + dark verified (the `--accent` tile is already dark-safe in admin); `npm run test:unit` green;
`npm run build` clean.

**Founder sub-decisions (AskUserQuestion 2026-08-01):** (1) **normalize everything** — the logo lockup
AND all visible "Crypto Idea" text AND code comments → "CryptoIdea"; (2) **Portfolio header + auth only**
— Journal/Learn/Search keep their tab-name titles (correct "where am I" UX).

**Status: ✅ BUILT 2026-08-01 (BUILD-LOOP item 4).** As built:
- New shared **`<Logo>`** primitive in [ui.jsx](../../src/components/ui.jsx) (green CSS-drawn "C" tile +
  "CryptoIdea" wordmark, `role="img"` + `aria-label` → one accessible name; tile `aria-hidden`; `size="lg"`
  for auth). New `.ci-logo*` CSS in [app.css](../../src/styles/app.css) mirrors the admin `.adm-scr`/landing
  `.mark` VALUES using the app's OWN `--accent` (dark-safe solid fill) — no admin `.adm-*` import, no image,
  no new hex. Wired into [Portfolio.jsx](../../src/components/Portfolio.jsx) header (badges intact) and
  [Login.jsx](../../src/components/Login.jsx) + [ForgotPass.jsx](../../src/components/ForgotPass.jsx) (`size="lg"`).
  The dead `.auth-logo` CSS was removed.
- **Text normalization sweep** (all shipped code + comments + HTML entry titles): `CryptoIdea.jsx`,
  `main.jsx`, `admin-main.jsx`, the 5 `api/*` headers, `pro-success.jsx`, `export-csv.js`, `education-page.jsx`,
  `admin-dashboard.jsx` footer, `useAsk.js` prompt, `useSharePulse.js` share text, `functions/index.js`
  (comment + PayPal `brand_name`), `functions/.env.example`, `functions/package.json`, `public/manifest.json`
  (`name`), `public/service-worker.js`, `firestore.rules`/`storage.rules`/`vite.config.js`/`deploy.sh` headers,
  and `admin.html`/`app.html`/`terms.html`/`privacy.html` titles + meta.
- **Correction to this spec:** `APP_NAME = "Crypto Idea"` did **NOT** drive `document.title` — it was **dead
  code** (only its own definition referenced it; the real title source is each HTML entry's `<title>`). It was
  **deleted** (KISS/Kaizen) rather than normalized.
- **Scope deferred (flagged, not silently done):** the **documentation prose** corpus (`docs/**`, `README.md`,
  `CLAUDE.md` bodies, `openapi.json` spec, diagrams/mockups) still says "Crypto Idea" as the project name — a
  separate optional docs-normalization pass, since it's neither shipped nor user-visible.

Verified: 6 new tests (`tests/unit/Logo.test.jsx` + Portfolio/Login header assertions) red→green; **876/876
unit**; `npm run build` clean (name-guard passed); `test:rules:solo` 43/43 (comment-only rules edit); live
browser probe of the auth screen — tile = `--accent` #0a6b4d 46×46, wordmark "CryptoIdea", light + dark.

---

## LOGO-2. True landing-match: the SAME logo (body-font wordmark) scaled across app + admin + all 4 loading screens  (✅ BUILT 2026-08-04 · c08661d)

Founder ask (2026-08-02): the **index (landing) logo must MATCH everywhere it appears** — login, loading,
admin panel, portfolio app. This is a **follow-up to LOGO** (2026-08-01): that item introduced the shared
`<Logo>` primitive but **rebuilt it from the app's own tokens rather than the landing's exact VALUES**, so
the marks still visibly diverge (bigger tile, a *different* wordmark font/size, and the loading screens were
never touched). LOGO-2 makes every surface a true match to the landing.

**✅ AS-BUILT (2026-08-04 · impl `c08661d`, red checkpoint `5b99f35`):** all pieces below shipped as planned.
`.ci-logo*` (app) + `.adm-logo*` (admin) were rewritten to the landing `.brand/.mark` VALUES — tile 28/r8/glyph
16, **body-font** wordmark 18px/600/−.01em (replacing LOGO's display-font 26px); `.lg` scales from the same
ratios (tile 44/r13/glyph 24). Five `Crypto<b|span>Idea` splits were de-split to one-word "CryptoIdea" (admin
bar + sign-in, `/edge` header, loaders); all loading subtext unified to "Loading…"; `Loading.jsx` renders the
real `<Logo>`, `main.jsx` inlines the `.ci-logo` markup (lean entry chunk), and `app.html`/`admin.html`
pre-bundle shells got the green-tile lockup via CSP-safe inline `<style>` (`index.html` unchanged — source of
truth). The last off-brand purple **`#6C5CE7`** was purged: the `main.jsx` Suspense spinner → `var(--accent)`,
and the `terms.html`/`privacy.html` link colours → brand green `#0b6b4f` (the two historical `#6C5CE7` comments
were reworded so the new source-scan guard stays a dumb substring scan). **Gap-map completeness correction:**
the original gap map (below) missed three surfaces — `src/components/education-page.jsx`, `terms.html`,
`privacy.html`; per **founder Option A** they were folded into this increment so the new brand guard is a clean
**repo-wide** rule rather than a src-only one. **Enforce-don't-document control:** `scripts/check-brand.js` +
`tests/unit/brand-guard.test.js` walk the repo and fail if a two-word "Crypto Idea" UI string or a `#6C5CE7`
reappears in a shipped surface (same pattern as the dist name-guard), plus `tests/unit/Logo.test.jsx` pins the
`<Logo>` structure/size. Verification: **unit 931/931 GREEN**; brand-guard repo walk clean; `design-consistency`
CONSISTENT (0 findings); `simplifier` NOTHING TO DO; `npm run build` clean.

**Canonical spec = the landing `index.html` `.brand` / `.mark` (source of truth, verified L63-67/L402):**
mark tile **28×28 / radius 8**, white "C" in the **display** font **16px** / `background:var(--accent)`;
wordmark in the **body font, 18px, weight 600, letter-spacing −.01em**; gap **10px**; text **"CryptoIdea"**
(one word); the mark **rotates on hover** (landing nav link only).

**Gap map (found 2026-08-02 — every surface vs the canonical spec) — ✅ all rows closed 2026-08-04 (+ the 3
missed surfaces folded in, see AS-BUILT above):**

| Surface | Mark tile | Wordmark | Divergence |
|---|---|---|---|
| **Landing** `.brand`/`.mark` | 28 / r8 / glyph 16 (display) | **body font**, 18px, 600, −.01em, gap 10 | — source of truth |
| **App `<Logo>`** `.ci-logo` (Portfolio header; Login/Forgot hero) | 30 / r9 / glyph 18 | **display font, 26px**, −.02em, gap 9, no hover | tile +2px & rounder; wrong font; +8px; tighter spacing |
| **Admin** `.adm-logo` / `.adm-brand-txt` (bar + sign-in) | 30 / r9 / glyph 18 | display, 17px, weight **500**, "Crypto**Idea**" | tile +2px; splits "Crypto"+bold"Idea"; wrong font/weight |
| **Loading — `app.html`** (pre-bundle, inline `<style>`) | none | `<h1>` weight 200 | **no tile**; thin; **"Crypto Idea" (two words)** |
| **Loading — `src/main.jsx`** (Suspense fallback) | none | 20px/700 + spinner | **off-brand `#6C5CE7` purple spinner still ships** |
| **Loading — `src/components/Loading.jsx`** (`screen==="loading"`) | none | weight 200 | **no tile**; thin; **"Crypto Idea" (two words)** |
| **Loading — `admin.html` / `admin-main.jsx`** (`phase==="loading"`) | none | grey text | no logo at all |

*(Note: LOGO's text-normalization sweep hit HTML `<title>`s + comments but **missed the visible loading
`<h1>`** in `app.html`/`Loading.jsx`, and the "off-brand purple removal" only touched `admin-main.jsx` —
`main.jsx`'s Suspense spinner is still `#6C5CE7`. LOGO-2 closes both.)*

**Founder decisions (AskUserQuestion 2026-08-02):**
1. **Same logo, scaled by surface** — ONE shared spec (identical mark geometry + wordmark), exposed as
   sizes: **sm** = the landing base (28px tile / 18px word) for nav/headers, **lg** for auth heroes (scaled
   *proportionally* from the same ratios). Unmistakably one logo; a hero may be larger than a header. **Not**
   pixel-identical on every screen.
2. **Match the landing — body-font wordmark** — "CryptoIdea" in the **body font (Hanken), 600, −.01em**,
   scaled from the 18px base. The app's current **display-font 26px** wordmark is **replaced** (this reverses
   LOGO's display-font choice); the admin's bold-only-"Idea" split is dropped for the uniform "CryptoIdea".
3. **Full lockup on ALL loading screens + fix the purple spinner** — every loading state renders the green
   tile + "CryptoIdea"; the leftover **`#6C5CE7`** spinner in `main.jsx` → **brand green**; kill every
   two-word "Crypto Idea" / thin-weight loading string.

**Pieces to build (design-only — no logic/handlers/backend/rules change):**
1. **Codify the canonical spec** as the single source. KISS: keep the `<Logo>` primitive; rewrite `.ci-logo*`
   to the landing VALUES (mark 28/r8/glyph 16 display; wordmark **body font** 18/600/−.01em; gap 10). `lg`
   scales the *same ratios* (≈ tile 44 / r13 / glyph 25 / word ~30, still body font, gap 12). Derive the size
   ratios from the 28px base so the two sizes can't drift.
2. **App `<Logo>`** ([ui.jsx](../../src/components/ui.jsx) + [app.css](../../src/styles/app.css) `.ci-logo*`):
   apply the rewrite above; keep `role="img"` + `aria-label="CryptoIdea"`, tile `aria-hidden`. Portfolio
   header uses default (sm), Login/Forgot use `lg` (badges/tagline intact).
3. **Admin** ([admin-settings.css](../../src/styles/admin-settings.css) `.adm-logo`/`.adm-brand-txt`; markup
   in [admin-main.jsx](../../src/admin-main.jsx) + [admin-dashboard.jsx](../../src/components/admin-dashboard.jsx)):
   tile → landing geometry (28/r8/glyph 16); brand text → uniform **"CryptoIdea"** in the body font
   18/600/−.01em (drop the `<b>Idea</b>` split), keep the "· Admin" suffix; `.lg` scales like the app. **Stays
   admin-only CSS** (never import `.adm-*` into the user bundle; never import `.ci-*` into admin); admin is
   **light-paper only**.
4. **All four loading screens → full green lockup:**
   - **`src/components/Loading.jsx`** + **`admin-main.jsx` `phase==="loading"`**: inside `.ci-app` with
     app.css/admin CSS loaded → render the real `<Logo>` / `.adm-logo` lockup (+ optional "Loading…" subtext),
     so they're automatically consistent.
   - **`src/main.jsx` Suspense fallback**: `app.css` is already imported here (L12), so wrap in `.ci-app` and
     reuse `.ci-logo`; **replace the `#6C5CE7` spinner with brand green** (`--accent`).
   - **`app.html` + `admin.html` pre-bundle shells**: these paint *before* the bundle, so replicate the tile +
     "CryptoIdea" with **self-contained inline `<style>`** mirroring the canonical values (CSP allows inline
     *style*, never inline *script* — keep it style-only). Fix the two-word "Crypto Idea".
5. **Consistency sweep + guard:** grep shipped `src/` + HTML for any remaining two-word "Crypto Idea" UI
   string and any `#6C5CE7`; add a small unit/repo guard test that **neither** appears in shipped client code
   (same "enforce, don't document" pattern as the dist name-guard), plus a `<Logo>` structure/size test.

**Acceptance:** a CSSOM/computed-style probe shows the app `<Logo>` mark = **28px / r8** and wordmark =
**body font, 18px, 600, −.01em** at default (matching the landing), with `lg` scaled proportionally; the admin
mark matches the same geometry and its text is the uniform "CryptoIdea · Admin"; **all four** loading screens
render the green tile + one-word "CryptoIdea"; **no `#6C5CE7`** and **no two-word "Crypto Idea"** remain in
shipped client code (guard test); `npm run test:unit` green; `npm run build` clean (name-guard); browser-
verified light + dark, desktop 1280 + mobile 375; admin light-paper only.

**DoD:** every logo instance — landing, Portfolio header, Login/Register/Forgot hero, admin bar + sign-in,
and all four loading screens — renders the **same** mark + **body-font** "CryptoIdea" wordmark scaled to its
context; the purple spinner is gone; no two-word wordmark anywhere; **no new hex, no image asset, no new
dependency**; tests green + build clean + browser-verified.

**⚠️ Notes / gotchas:** design-only, **GREEN** (decisions locked; no rules/backend) → the BUILD-LOOP can build
it without a checkpoint. The `.ci-logo` CSS is scoped under `.ci-app`, so the `main.jsx` Suspense fallback
must add that wrapper. Don't cross the bundle boundary (`.adm-*` ⟷ `.ci-*`). The pre-bundle HTML shells can't
use React/app.css — inline style only. Give the `<Logo>` one accessible name so `getByText`/`getByLabelText`
still resolve (as LOGO did).

**Status: ✅ BUILT 2026-08-04 (impl `c08661d`, red checkpoint `5b99f35`).** Decisions locked 2026-08-02
(same-logo-scaled · body-font wordmark · full loading-screen lockup + purple-spinner fix); shipped per the
AS-BUILT note above (guard is repo-wide via founder Option A). [BUILD-LOOP](BUILD-LOOP.md) #9 flipped to built.

**Kaizen / optional tiny future cleanup (logged 2026-08-04, NOT introduced by LOGO-2):** the app token
**`--accent` is `#0a6b4d`** while the landing/shell canonical brand green is **`#0b6b4f`** — a one-digit,
perceptually-identical divergence that **pre-dates LOGO-2** (LOGO-2 deliberately drove the app tile from
`--accent`, not a new hex). Optional future reconcile: settle the two greens to a single value so there's one
brand green of record. Low priority; on record here. *(Partly acted on by LOGO-parity below — the logo TILES
are now pinned to `#0b6b4f`; the `--accent` token itself is deliberately left as `#0a6b4d` for buttons/pills.)*

---

## LOGO-parity. The full index lockup present + identical on every logo surface ("logo everywhere")  (✅ BUILT 2026-08-05 · red `bbb5d17` → green `5334c79`)

Founder ask (2026-08-05): a follow-on to LOGO / LOGO-2 — the complete **index.html logo lockup** (green "C"
tile + one-word "CryptoIdea" wordmark, hover `rotate(-6deg) scale(1.06)`) must be **present and identical on
EVERY surface that shows the logo**, including the text-only pages that previously showed a bare wordmark and
the Pulse share image. Design-only, no logic/rules/tests-behaviour change.

**✅ AS-BUILT (2026-08-05 · impl `5334c79`, red checkpoint `bbb5d17`):**
- **Tile pinned to the index brand green `#0b6b4f`** on the in-app `<Logo>` (`.ci-logo-mark`, `app.css`) and
  the admin `.adm-logo` (`admin-settings.css`). The app's general **`--accent` (`#0a6b4d`) is left as-is** for
  buttons/pills/links — the founder scoped the green change to the **logo only** (partly acts on the LOGO-2
  Kaizen note above; the two greens are NOT globally reconciled).
- **Index hover interaction** `rotate(-6deg) scale(1.06)` added to `.ci-logo` (covers Portfolio, Login,
  ForgotPass, Loading, and the `main.jsx` Suspense fallback) and to `.adm-logo` (fired from the `.adm-brand`
  bar lockup + the `.adm-auth-logo` sign-in lockup). **NOT** on the transient `app.html`/`admin.html`
  pre-bundle loading splashes (already exact `#0b6b4f`, deliberately no hover).
- **Full tile+wordmark lockup added to the three text-only surfaces:** `/edge`
  ([education-page.jsx](../../src/components/education-page.jsx) renders the shared `<Logo>` wrapped in a
  clickable `<a href="/">`, scoped under `.ci-app`); `terms.html` + `privacy.html` (hand-authored tile
  mirroring the `app.html` loading shell + a Google-Fonts link loading **Fraunces + Hanken Grotesk**). **All
  three clickable → the landing "/".**
- **Pulse share image** ([useSharePulse.js](../../src/features/research/hooks/useSharePulse.js)) now
  canvas-draws the index lockup (green `#0b6b4f` tile + white Fraunces "C" + one-word "CryptoIdea" ink
  wordmark), replacing the old two-word uppercase "CRYPTO IDEA" text.
- **Brand guard extended from denylist → also enforce PRESENCE** ([scripts/check-brand.js](../../scripts/check-brand.js)
  + [tests/unit/brand-guard.test.js](../../tests/unit/brand-guard.test.js)): new allowlist helpers
  `REQUIRED_LOCKUPS`/`findMissingLockups` (terms/privacy must contain the "C" tile lockup),
  `REQUIRED_FONTS`/`findMissingFonts` (terms/privacy must load Fraunces + Hanken), and
  `REQUIRED_SOURCE`/`findMissingSource` (education-page uses `<Logo`; both stylesheets carry the hover +
  `#0b6b4f`). The two-word denylist rule is now **case-insensitive** so the UPPERCASE "CRYPTO IDEA" is caught.

**Deliberately unchanged:** `index.html` (source of truth), the `<Logo>` markup in `ui.jsx`, the pre-bundle
loading splashes (already exact `#0b6b4f`, no hover), the `/edge` footer copyright line, the `/edge` "The
Edge" label colour `#34C759` (a label, not the logo — out of scope), the app `--accent` token, and
`research-tab.css`'s separate `--accent` copy, plus all buttons/pills.

**Verification:** unit **936/936 GREEN** (two runs), **design-consistency CONSISTENT (0 findings)**, `npm run
build` clean, and a real-browser check confirmed `#0b6b4f` + the hover `matrix` transform + fonts-loaded + all
three logos link to "/". Commits: red `bbb5d17` → green `5334c79`.

**Kaizen:** the consistency-sweep surfaced logo-carrying files not yet on the Branding/logo map row — they were
added to [`docs/interview.md`](../interview.md) in this same change (Portfolio/Login/ForgotPass `<Logo>`
consumers, `useSharePulse.js`, `research-tab.css`, and the `education-page`/`Loading` tests) so future logo work
sweeps them automatically.

---

## LAUNCH-FREE. "Starter-only launch mode" switch + maxed Starter limits  (Part B ✅ BUILT 2026-08-08 · CRYP-101 · branch `claude/launch-free-mode`; Part A → #12 PLAN-LIMITS-MAX)

Founder ask (2026-08-02): a switch in **admin → Plans & Pricing** to launch the app **free (Starter-only)**
while billing is still being developed/secured — plus a **more generous Starter tier**. Interviewed via
AskUserQuestion; all decisions locked below. **Two parts.**

### Part A — Maxed Starter limits (permanent; more generous, still < Pro) — 🔶 touches `firestore.rules`
> ⚠️ **SUPERSEDED (2026-08-03) by PLAN-LIMITS-MAX (below) — Part A ✅ BUILT 2026-08-10 (branch
> `claude/plan-limits-max`).** That plan raises Starter to **3 portfolios /
> 30 / 300** (not 2), also bumps Pro to 6/100/1000 (+ lowers Premium to 15/200/2000), and adds a lazy-load read optimization. **Build
> coordination:** whichever of the two ships first does the shared work (rules `configuredLimit` free
> fallbacks, `DEFAULT_PLANS`, the stored `config/app.plans` doc, index exemptions, landing/app copy); the
> other becomes the delta and must not re-do it. **If LAUNCH-FREE builds first, use 3 portfolios, not 2.**
> LAUNCH-FREE **Part B** (the `paidPlansEnabled` billing switch) is NOT superseded — it stands as written.
- New Starter limits: **2 portfolios / 30 coins per portfolio (60 total) / 100 transactions per coin**
  (was 1/10/50). Even numbers, clearly below Pro (3/50/2000); max ~6,000 tx/user.
- **Storage (why these numbers):** transactions dominate (each is its own subcollection doc). At **~0.7 KB/tx
  with Firestore index exemptions** on the never-queried tx fields (`type`/`amount`/`priceAtBuy`; keep `date`
  indexed for newest-first ordering) + ~0.5 MB non-tx → **~4.7 MB/user worst case**, ~470 MB at 100 users.
  The exemptions are REQUIRED to hold the ~5 MB target (without them ~9 MB/user; storage cost is trivial
  either way, but the founder set 5 MB as the cap).
- **Consistency sweep — change the limit in EVERY place it lives (no drift):**
  1. `firestore.rules` — `configuredLimit` free fallbacks: `maxPortfolios` defFree 1→**2**, `maxCoins` defFree
     10→**30**, `maxTx` defFree 50→**100**. (Hard ceilings unchanged — 2/30/100 is well under them. These rule
     defaults are the **hardcoded safe floor** so a missing/bad config still enforces the intended Starter.)
  2. `functions/index.js` `DEFAULT_PLANS.free` (+ `mergePlans`) → 2/30/100.
  3. ⚠️ **GAP caught:** the **stored `config/app.plans.free` doc currently overrides the rules default** (rules
     read config first, fallback to defFree). So the stored doc must also be set to 2/30/100 — via the seed +
     a one-time admin save / migration — or the old 1/10/50 wins. Bumping only the default is not enough.
  4. Landing (`index.html` #pricing / `landing.js`) + app plan display (`PLAN_BENEFITS` / picker) → show the
     new Starter capacity.
  5. `firestore.indexes.json` — add single-field index **exemptions** for the `transactions` collection group
     (`type`/`amount`/`priceAtBuy`). ⚠️ **Deploy-time:** `firebase deploy --only firestore:indexes`
     (founder/go-live); the emulator doesn't bill storage, so the saving is deploy-side only.
  6. Tests: `test:rules:solo` ("configured limits override defaults" + new-limit assertions); update any unit
     test asserting the old 1/10/50.

### Part B — "Starter-only launch mode" switch (admin Plans & Pricing) — billing gate  ✅ BUILT 2026-08-08 (CRYP-101, branch `claude/launch-free-mode`)
- New server flag **`config/app.flags.paidPlansEnabled`** (default **true** = normal). When **false**
  (launch-free mode):
  - **New registrations → Starter automatically, NO plan choice.** The ONBOARD-GATE chooser is suppressed;
    onboarding auto-resolves to Starter **server-side** (`chooseFreePlan` sets `planChosen` + `tier:'free'` +
    `ensureDefaultPortfolio`). New users show the existing **Starter** tag (no new tag/design).
  - **No new subscriptions for anyone** (subsumes the `checkout` kill-switch): the billing/upgrade/pricing UI
    is **hidden AND server-gated** for every non-paid user — **`createSubscription` refuses server-side** when
    `paidPlansEnabled=false` (the real gate; UI-hiding is secondary). "Inaccessible even in code" = the
    callable refusal.
  - **Existing paid users (Pro/Premium) fully unaffected:** keep tier, active PayPal subscription (keeps
    running), and can still manage/cancel. Only *new* subs are blocked.
  - **Existing data is never touched** — no downgrade, no grey-lock (the switch never demotes anyone).
  - **Landing page** (`index.html`) hides its pricing section (reads the flag from `/api/config`).
- **Reversible:** flip back to `true` → paid plans + billing UI return; tiers config-driven again; the
  registration chooser reappears for new users. Nobody is auto-charged; users who registered as Starter stay
  Starter (their `planChosen` is set) and can upgrade normally once billing is back.
- **Publish:** `/api/config` exposes `paidPlansEnabled` (non-secret, CDN ~60s) so landing + app react ~60s.
- **Admin UI:** a toggle in the Plans & Pricing card (light-paper), with a clear "OFF = free launch ·
  Starter-only · no new subscriptions" explainer. **Audit correction (as built, CRYP-101):** the toggle
  rides the existing `saveConfig` path, whose audit `details` come from `config-diff.js` `diffConfig`,
  which **already recursively captures nested `flags.*`** — so the change is audited as a config diff
  (e.g. `flags.paidPlansEnabled: true→false`) with **NO new audit action or `ACTION_LABELS` entry**
  (this supersedes the earlier plan line that said "audited via `writeAudit` + `ACTION_LABELS`").
- **Flag precedence (GAP documented):** when `paidPlansEnabled=false`, `checkout` is effectively off
  regardless (the callable refuses); `signupsEnabled`/`maintenance` are orthogonal.

**Security model (non-negotiable):** the billing block is **server-enforced** (`createSubscription` refuses
when off) — hiding the UI is NOT the control. The flag is server-only in `config/app` (written by `saveConfig`
with a **per-key-KEEP merge** so a partial save can't silently flip it), published read-only via `/api/config`.
No client can create a subscription while off, even from devtools.

**Acceptance:** with `paidPlansEnabled=false` — a new registration lands on Starter with no chooser and no
billing anywhere; `createSubscription` returns an error (tested at the **callable** tier, the only one that
runs the body); app + landing show no pricing; an existing Pro/Premium user is unchanged (tier + sub intact);
flipping back on restores everything. Starter enforces **2/30/100** (`test:rules:solo`). `test:unit` green,
`build` clean, browser-verified (new-user registration + an existing paid user, light + dark).

**DoD:** the switch works end-to-end (server-gated, not just UI), existing users untouched, reversible,
audited; Starter is 2/30/100 with index exemptions planned; docs + tests updated; no new dependency.
Deploy-time (founder): `firebase deploy --only firestore:rules,firestore:indexes`.

**Status: Part B ✅ BUILT 2026-08-08 (CRYP-101, branch `claude/launch-free-mode`)** — the `paidPlansEnabled`
top-level flag: `createSubscription` server-refusal (fresh read, precedence over `checkout`), chooser
suppressed + auto-Starter for new users, billing/pricing UI hidden in-app + landing, existing paid users
untouched, reversible; published on `/api/config`; admin toggle in Plans & Pricing (audited via the
`saveConfig` diff, no new action/label). Contract in [`openapi.json`](../../openapi.json); canonical
billing gate in [`BILLING.md`](../decisions/BILLING.md) §3.6. **Part A** (Starter **2/30/100** limits +
index exemptions) is severed to **#12 PLAN-LIMITS-MAX** (3/30/300) — no tier-limit or `firestore.rules`
change shipped in Part B. Original decisions locked 2026-08-02 (pause ALL new subscriptions; existing
users untouched; Starter tag; reversible).

---

## ADMIN-6. Separate Settings password (owner-only 2nd lock) + emailed-link reset  (🔨 BUILDING — PR1 done 2026-08-12; 3-PR delivery)

> **Build status (2026-08-12, founder go "Do the admin-6" + "Do 3 PR"):** delivering as **3 PRs**:
> - **PR1 — core (MERGED, PR #68, squash `529c131`):** pieces #1–#5 + #7 + the lockout
>   script. `functions/settings-auth.js` (pure scrypt/strength/token core, 14 unit tests) · the two new
>   owner-gated callables `setSettingsPassword` + `unlockSettings` · `assertSettingsUnlocked` gate + the
>   `getAdminConfig`/`saveConfig` gate swap (`assertFreshOwner` → `assertOwner` + `assertSettingsUnlocked`,
>   with a **bootstrap fallback to step-up re-auth** while no password is set) · 2 server-only rules denies
>   (`settingsUnlock`, `settingsPwReset`) · client unlock repurposed to be factor-aware (settings vs login
>   bootstrap) + a "Settings password" set/change section in admin Settings · `functions/scripts/clear-settings-password.js`
>   (service-account lockout escape hatch). Security-review hardening folded in: the unlock is **bound to the
>   login session's `auth_time`**, the change-path shares the unlock rate-limit, the `hasPw` gate reads config
>   **fresh**, and successful unlocks are audited.
> - **PR2 — emailed reset (piece #6, BUILT, branch `claude/admin-6-email-reset`):** `functions/sendMail.js`
>   seam (pure `smtpConfigOf` + `sendMail` — dev/emulator logs the link, prod lazy-requires **nodemailer** and
>   sends via **DreamHost SMTP**) · `requestSettingsPwReset` (mails a single-use HASHED token to the owner's
>   OWN verified email — no body address, so no redirection) + `completeSettingsPwReset` (transactional
>   single-use redeem, uid-bound, expiry-checked → installs the new scrypt hash + grants a session-bound
>   unlock) · SMTP config fields on the admin Email settings screen (`smtpPass` via `keep()`, returned only as
>   `smtpPassSet`) · an "Email me a reset link" button on the Settings-password screen · owner-only reset page
>   `SettingsPwReset.jsx` at `?reset=<token>` on `admin.html` (~45-min link, owner signed-in) · openapi +
>   sendMail/gate-coverage/config-diff/audit-labels unit tests + reset-flow integration tests (CI tier).
> - **PR3 — admin login "Forgot password?" (founder addition 2026-08-12):** a login-page reset for BOTH
>   owner AND manager via Firebase-native `sendPasswordResetEmail` (recovers the LOGIN password, not the
>   Settings password; zero SMTP, email-matches, reveals nothing). This is the flow the founder described.
> TTLs confirmed safe by founder: **10-min** unlock, **45-min** reset link.

Founder ask (2026-08-01): add a **dedicated password for the admin Settings area** — a second lock,
separate from the admin login password. The "Confirm your password" popup that guards Settings should
ask for THIS settings password.

**Scope decisions (AskUserQuestion 2026-08-01):**
1. **Managers stay fully OUT of Settings** — the server wall is unchanged (owner-only). The new
   password is an **extra lock for owners**, NOT a way to let a manager in. *(So the "give the password
   to a manager" idea in the original message is intentionally dropped — the founder chose the safest
   option; managers never reach API keys / secrets / pricing / kill-switches / admin-grant controls.)*
   **Founder reconfirmed 2026-08-01:** managers must not even **SEE** a Settings tab — it is **hidden
   entirely** (as today, `isOwner ? ["settings"] : []`), NOT a locked/greyed tab, so a manager can't tell
   Settings exists; the settings-password prompt therefore never appears for a manager. Hard requirement,
   regression-tested (a manager session shows no Settings tab AND every Settings callable refuses them).
2. **Owners open Settings with the NEW settings password**, not their login password — the
   login-password step-up is replaced *for the Settings area* by this settings-password unlock.
3. **Emailed-link reset is IN v1** — owner-only "forgot settings password" → one-time emailed link.

**What exists today (so the change is clear):** Settings is owner-only at the server (`assertFreshOwner`
= owner claim + a fresh Firebase login-password re-auth; [`functions/index.js`](../../functions/index.js)
~L150-160). The current popup ([`admin-dashboard.jsx`](../../src/components/admin-dashboard.jsx) ~L1432-1446)
calls `reauthAdmin(loginPassword)`, refreshing the Firebase token's `auth_time`. Managers don't see the
Settings tab (L338) and the server refuses them ("owner-required").

**Security model (non-negotiable — this gates real secrets):**
- The **owner claim stays required** for every Settings callable — identity is still per-person (the 2
  owners are individually identified in the audit). The settings password is a **second factor, never the
  identity**; so even though the 2 owners share it, accountability is preserved.
- The password is **server-verified, hashed at rest** with `node:crypto` **scrypt** (built into Node 22 —
  no new dependency; never roll our own hashing). Store `{ salt, hash, algo, updatedAt, updatedBy }`;
  **never** store plaintext, **never** return the hash to any client.
- A correct password grants a **short-lived, server-tracked unlock** (~10 min) for that owner's uid;
  Settings callables check the unlock **server-side**. A client-only check would be a downgrade
  (bypassable) — this MUST be enforced on the server.
- **Rate-limit** unlock + reset attempts (reuse the per-uid/IP limiter in `functions/guards.js` from BL-1)
  to stop brute force; generic failure text.
- **Audit** every set/change, failed unlock, reset request and reset completion — **never** the password.

**Pieces to build (functions + rules + client + email + tests):**
1. **Storage:** `config/app.settingsAuth = { salt, hash, algo:'scrypt', updatedAt, updatedBy }`
   (`config/app` is already server-only, [`firestore.rules`](../../firestore.rules) L62). A partial
   `saveConfig` must **per-key-KEEP** this field (the keep-omitted-field discipline — the 4th field to
   learn it, after `features`/`requireAdminMfa`/`announcement`).
2. **`setSettingsPassword({ current?, next })`** callable — owner-only; if one already exists, require the
   current password (or a valid unlock); enforce the strength floor (**min 12 chars incl.
   upper+lower+number** — founder decision 2026-08-02); scrypt-hash `next`; write `settingsAuth`;
   audit (no secret).
3. **`unlockSettings({ password })`** callable — owner-only; scrypt-verify; on success write a server-only
   `settingsUnlock/{uid} = { until }` (~10 min); rate-limited; failure audited.
4. **Gate Settings callables on the unlock:** `saveConfig` (+ the Settings-only config reads) change from
   `assertFreshOwner` → **`assertOwner` + `assertSettingsUnlocked`**. This replaces the login-password
   step-up **for Settings only**; non-Settings owner ops (grant/revoke manager, permanent erasure) keep
   their existing gate.
5. **Client:** repurpose the existing unlock popup to call `unlockSettings(settingsPassword)` instead of
   `reauthAdmin(loginPassword)`; change copy "Owner password" → "Settings password" + sub-text; drive the
   same ~10-min `unlockedUntil` UX from `settingsUnlock`. Add a **"Settings password" section** inside
   Settings (owner-only) to set/change it.
6. **Emailed-link reset (owner-only):** ⚠️ **BLOCKING FINDING (2026-08-02): there is NO email-sending
   code in the backend yet** — only a `config/app.email.apiKey` placeholder field; no provider
   integration, no `sendMail`. The settings password is *our own* secret (not a Firebase Auth
   credential), so Firebase's built-in reset email cannot carry it — a custom send is genuinely
   required. So this piece needs EITHER a chosen mail provider (build a `sendMail()` seam that logs
   the link in dev + is a one-file go-live swap, like `ai-client.js`) OR it is deferred to a follow-up
   (build only pieces #1–#5 + #7 now). This is the fork the founder held the item on (see Status).
   The token flow itself: `requestSettingsPwReset()` → single-use, expiring token
   (`crypto.randomBytes`, stored **hashed** in server-only `settingsPwReset/{tokenHash} = { uid, expires,
   used }`), emailed as a special link to the owner's on-file email via the existing mail provider
   (Settings → Email & integrations). The link opens an admin reset page → `completeSettingsPwReset({
   token, next })` verifies (unused + unexpired), sets the new hash, marks the token used. ~30-60 min
   expiry; rate-limited; audited.
7. **Rules:** add server-only denies `match /settingsUnlock/{uid} { allow read,write: if false }` and
   `match /settingsPwReset/{doc} { allow read,write: if false }` (like `rateLimits`/`webhookEvents`).

**Bootstrap (chicken-and-egg) + lockout safety (secure-by-design):**
- **Not-yet-set:** when `config/app.settingsAuth` is absent, Settings falls back to **today's** gate
  (owner login-password step-up) so an owner can get in and set the first settings password. Once set, the
  settings-password unlock takes over.
- **Lockout fallback:** if both owners forget it AND email is down, an owner with the service-account key
  clears `config/app.settingsAuth` via a small script (like `set-admin.js`), reverting to the
  login-password bootstrap. Document it. (Never lock the last owner out — secure-by-design.)

**⚠️ Notes / gotchas:**
- **Larger, security-critical** item (functions + rules + client + email + tests) — NOT a small tweak.
  Build **TDD-first**: pure scrypt hash/verify + token helpers unit-tested; callable auth tests; a rules
  test for the two new server-only paths; a regression test that a **manager still cannot reach Settings**.
- Keep the `stepUpReauth` flag path working for the non-Settings owner ops that still use it.
- Emulator has no real email — test the reset via the mail provider's dev path / logged link.

**DoD:** an owner opening Settings is prompted for the **settings password** (not their login password) and
unlocked ~10 min **server-side**; a wrong password is rate-limited + audited; set/change is owner-only and
stored scrypt-hashed (never plaintext, never sent to client); **managers still cannot reach Settings** at
all (server + UI, regression-tested); the emailed-link reset works end-to-end (single-use, expiring) for
owners only; bootstrap + script fallback documented; `test:unit` + rules tests green · `build` clean ·
browser-verified owner desktop 1280 + mobile 375; light-paper only, no new dependency.

**Status: PLAN ONLY — HELD by founder 2026-08-02 (BUILD-LOOP #8 checkpoint).** Architecture + the
original 3 founder decisions are locked. At the checkpoint the founder chose to **hold the whole item**
rather than build it now, because the **emailed-link reset (#3) has no mail transport to build on** (the
blocking finding above). One more founder decision was captured for when it IS built: the settings-password
strength floor = **min 12 chars incl. upper+lower+number** (folded into piece #2).

**To unblock:** decide the emailed reset — either (a) **pick a mail provider** → build the full flow with a
`sendMail()` dev-log seam (real send = go-live swap), or (b) **defer the reset** → build only pieces
#1–#5 + #7 now (settings password + server-enforced unlock + rules denies; managers stay out; the
service-account script fallback covers lockout meanwhile), and ship #6 when a provider is chosen. Then give
the go-ahead and this becomes buildable again.

---

## ADMIN-SEP. Admin/user separation — admins out of the Users list, into an owner-only Admin-access roster  (✅ BUILT — PR1 CRYP-103a `claude/admin-sep` (2026-08-09) + PR2 CRYP-103b `claude/admin-sep-partc` (2026-08-10); Story CRYP-103 closes when PR2 merges)

Founder ask (2026-08-03): keep admins **out of the Users section** of the admin panel — an admin account
must never appear as a normal user. All admins (**managers AND owners**) belong in the **Admin access**
area inside Settings, which **only an owner** can open. Exactly **two admin types** exist — **manager** and
**owner** (there are **2 owners**); **no other admin type may exist**. Anyone granted admin power through
the Admin access UI is a **manager only**; **only an owner** can promote a manager and grant access.

Mapped read-only against the live code (multi-agent gap map, 2026-08-03) + interviewed via AskUserQuestion;
all decisions locked below.

**Build status — PR split (CRYP-103, factory G2):**
- **PR1 (CRYP-103a, ✅ BUILT 2026-08-09, branch `claude/admin-sep`) = Parts A + A1 + B.**
  - **Part A** — server-side exclusion: `listUsers` + `findDuplicateEmails` skip `customClaims.admin===true`
    (Users list/count/CSV/bulk); `gatherStats`/`getStats` (new `adminUidSet()` helper) + `countSignupsSince`
    exclude admins from the Overview **Total users** + tier counts + `signups24h` + the `statsDaily` snapshot
    (`totalCoins` deliberately unfiltered — a collection-group count). One-time dev-seed discontinuity noted;
    no production data exists.
  - **Part A1** — user-detail **client backstop**: Suspend + Delete→Trash are hidden for ANY admin target
    (`found.isAdmin`, owners AND managers) behind a "🔒 protected admin account" notice (generalized from the
    old owner-only guard). NOTE: trash/delete are already server-refused for admins; the **server refusal of
    suspend/tier/limits on an admin target was deferred to PR2** (now ✅ shipped — `assertTargetNotAdmin`).
  - **Part B** — owner-only `listAdmins()` (via `assertOwner`; a read → no step-up, no audit) returns
    `{uid,email,role,disabled,lastSignInTime}` per admin (keyed off the claim). The Admin-access drill-in now
    renders a read-only **roster** (owners + managers, role pill, suspended indicator) above the kept
    email-lookup grant flow. Registered in the `admin-gate-coverage` MATRIX as `assertOwner`; **no
    `ACTION_LABELS` entry** (a read).
- **PR2 (CRYP-103b, ✅ BUILT 2026-08-10, branch `claude/admin-sep-partc`) = Part C.**
  - **C-1** — `guards.requireManager` is **no longer an alias of `requireAdmin`**: the account-management
    WRITE surface now requires an explicit `role` of `'manager'`/`'owner'`; a legacy `{admin:true}` claim with
    no/unknown role is **refused** (reason `manager-required` → `permission-denied` in `denied()`), keeping only
    the shared READ surface (`requireAdmin`). Eliminates the silent third "no-role admin" state. The **seed
    dropped `legacy@test.com`** — every seeded admin has an explicit role.
  - **C-2** — `set-admin.js` hard-caps owners at 2 via the pure, unit-tested `functions/owner-cap.js`
    `ownerCapDecision` + a `countOwners()` helper (a fresh `--role=owner` mint past 2 is refused without `--force`).
  - **Server backing for Part A1 (the deferred MED):** new `assertTargetNotAdmin(uid, verb)` in `index.js`,
    called in `setUserTier`/`setPremiumLimits`/`suspendUser` — suspend/tier/limits on ANY admin target (owner
    OR manager) are now refused server-side (`failed-precondition`), mirroring the already-refused trash/delete.
    PR1 hid the buttons; this is the server enforcement.
  - Unit 1064/1064 · build clean · rules untouched. Story CRYP-103 closes when PR2 merges.

**Big picture — this is a SERVER + admin-UI change; `firestore.rules` is NOT touched.** The entire admin
roster lives in **Firebase custom claims** (`{admin:true, role:"owner"|"manager"}`), with **zero Firestore
backing** — there is no admins/roles collection ([`firestore.rules`](../../firestore.rules) L62-193 has none).
So identity/roster can only be read/written via Cloud Function callables + `set-admin.js`; rules already give
the backstop that a manager token can't write arbitrary user docs (`isAdminOwner()` on user update/delete,
L248/L266). ⇒ **no `test:rules` requirement**, but it IS security-critical (touches the auth choke point +
adds an owner-gated callable).

**Already MET today (3 of the 6 points — do NOT rebuild):**
- **✅ Point 2** — "Admin access" is an **owner-only** Settings drill-in: the Settings tab is added to `TABS`
  only when `isOwner` ([`admin-dashboard.jsx`](../../src/components/admin-dashboard.jsx) L412), `isOwner ===
  role==='owner'` ([`useAdminDashboard.js`](../../src/hooks/useAdminDashboard.js) L333); managers get an
  owner-only notice; the server enforces owner + step-up on `saveConfig`/`setManagerRole`.
- **✅ Point 5** — the only UI grant path `setManagerRole` **hardcodes `role:ROLE_MANAGER`** on grant
  ([`functions/index.js`](../../functions/index.js) L819), accepts only `{email,grant}` (no role param,
  L796), refuses owner + self targets (L808-811). Owners are minted **out-of-band only** via `set-admin.js`.
- **✅ Point 6** — grant is **owner-only + step-up re-auth** (`assertFreshOwner`, index.js L795 →
  `guards.requireOwner`, [`guards.js`](../../functions/guards.js) L123-128). The old `setAdminClaim` is a
  neutered throwing stub (index.js L830).

**The real gaps (what this item builds):**

### Part A — Hide admins from the Users section (Point 1) — ✅ BUILT (PR1, CRYP-103a)
Today `listUsers` returns **every** Auth account incl. admins, each tagged `isAdmin`/`role` (index.js
L1445-1448), and the client renders them as rows **badged "ADMIN"** (admin-dashboard.jsx L1035); the *same
unfiltered array* also feeds the row count, the CSV export (`buildUsersCsv`) and the page-scoped bulk
set-tier/suspend actions (L995-1019). No exclusion exists at any layer.
- **Fix (server-primary):** in `listUsers` (index.js ~L1436-1458) **skip any account with
  `customClaims.admin===true`** so admins are absent from the list, the count, the CSV and the bulk
  surfaces in one place. **Filter key = the `isAdmin` claim, NOT `role`** — a no-role admin has `role===""`
  (identical to a plain user) and a role-based filter would leak it back in.
- **Client backstop:** the render/partition pipeline (admin-dashboard.jsx L978-1005, `partitionUsers` in
  [`trash.js`](../../src/utils/trash.js)) also drops `u.isAdmin` rows, so a stale server can't surface one.
- **Count scope (LOCKED — "exclude admins everywhere"):** the Overview **Total users** / tier counts
  (`gatherStats`/`getStats`) **and** the duplicate-email detector (`findDuplicateEmails`, index.js ~L1475)
  also **exclude admin accounts**, so the visible rows and the headline numbers agree (no "12 users but only
  10 rows" mismatch).

### Part B — Admin access lists ALL admins (Point 3) — ✅ BUILT (PR1, CRYP-103a)
Today the Admin access area is a **search-by-email lookup** showing one account at a time (`grantLookup` →
`lookupUser`, admin-dashboard.jsx L1390-1433) plus a numeric owner count (`s.activeOwners`, L1437-1441).
There is **no roster** and **no `listAdmins` callable** — an owner can't see who the managers/owners are.
- **New callable `listAdmins()`** in index.js — **owner-only** (`assertOwner`; step-up not required for a
  read), enumerates Auth accounts with `customClaims.admin===true` (key off the **claim**, so a no-role
  admin still appears until migrated), returns `{ uid, email, role, disabled, lastSignInTime }` per admin.
  A **NEW callable trips two source-scan tests** — `admin-gate-coverage` (must be listed as gated) and
  `audit-labels` — so wire it into both (a read needs no `ACTION_LABELS` entry; confirm the scan's
  read-vs-write allowance).
- **Client:** wrapper in [`src/api/admin.js`](../../src/api/admin.js); load in `useAdminDashboard.js`;
  render a **roster at the top of the Admin access drill-in** (owners + managers, role pill, status) —
  **KEEP the email search below it** (LOCKED: "roster + keep lookup") as the way to grant a *not-yet-admin*
  account. Grant/revoke stays exactly as-is (`setManager` → `setManagerRole`, owner-only + step-up).
- **Out of scope (deliberate):** per-admin *support* actions (private notes / view-as / tier) are NOT added
  to the roster — admins aren't support subjects; the roster's only action is grant/revoke manager. (This is
  the answer to "once admins leave the Users tab, how do you act on them" — you don't manage an admin *as a
  user*; you grant/revoke via this roster or `set-admin.js`.)

### Part C — Exactly two admin types (Point 4) — ✅ BUILT (PR2, CRYP-103b, `claude/admin-sep-partc`)
**As built:** all three deviations are closed. C-1 hardened `guards.requireManager` (explicit `manager`/`owner`
role required; no-role/unknown claim refused with `manager-required`, keeps only the READ surface) and the seed
dropped `legacy@test.com`; C-2 hard-caps owners at 2 in `set-admin.js` (pure `owner-cap.js` `ownerCapDecision`,
`--force` to override); the unknown-role string (deviation 3) is refused by the same hardened `requireManager`.
The original plan is kept below as the record.

Three deviations from "only manager + owner, 2 owners, no other role":
1. **Eliminate the third "no-role admin" state (LOCKED — harden guards).** A legacy `{admin:true}` account
   with no/unknown role is code-supported and **silently gets full manager power** — `guards.requireManager`
   is a straight **alias of `requireAdmin`** (guards.js L106-119) — while being invisible to role filters
   (`roleOf()` → `""`, L99-102). The dev seed's `legacy@test.com` is one.
   - Harden `guards.requireManager`/`roleOf` so **manager surface requires `role` exactly `'manager'` or
     `'owner'`** — an admin claim with any other role (incl. none/unknown) is **refused**, not treated as a
     manager. (This is a change to the auth **choke point**: TDD-first, and verify managers `role==='manager'`
     still pass and owners still pass.)
   - **Migrate the seed same commit:** `seed-emulator.js` makes `legacy@test.com` an explicit **manager**
     (or drops it). No production accounts exist yet (`.firebaserc`=demo, go-live not started), so the only
     "migration" is the seed; note in the go-live runbook that any imported role-less admin must be given an
     explicit role via `set-admin.js` before deploy.
2. **Hard-cap owners at 2 (LOCKED).** Nothing stops a 3rd owner today ("keep exactly 2" is only a comment;
   `MIN_ADMINS` is a *floor*). In `set-admin.js`, **refuse `--role=owner` when `countActiveOwners() >= 2`
   unless `--force`** is passed. Owners are SA-key/script-only, so this is defence-in-depth, not a live
   escalation fix.
3. **Reject/alert unknown role strings** (folded into C-1): an out-of-band `role:'superadmin'` must not be
   silently normalized to a manager-floor — the hardened `requireManager` already refuses it; optionally
   surface it as a `getStats` health warning rather than a silent collapse. (Low.)

**Security model (non-negotiable):**
- Exclusion + roster are **server-enforced** (`listUsers` skips admins server-side; `listAdmins` is
  owner-gated) — hiding rows in the client is only a backstop, not the control.
- The auth choke point stays **fail-safe**: after C-1, an admin claim with no valid role gets **no** admin
  surface (refused), never a silent manager grant.
- Roster and any admin action stay **owner-only** (managers can't open Admin access at all — Point 2, unchanged).

**Acceptance (tests):**
- `listUsers` returns **no** account with `customClaims.admin===true` (unit/callable tier); the client Users
  list, count, CSV and bulk actions show none; Overview totals + `findDuplicateEmails` exclude admins.
- `listAdmins` returns every admin (owner **and** manager, keyed off the claim) for an owner caller, and
  **refuses a manager** (permission-denied) — the two source-scans (`admin-gate-coverage`, `audit-labels`)
  stay green with the new callable.
- A `{admin:true}` account with **no role** (or an unknown role) is **refused** the manager surface after
  C-1; an explicit `role==='manager'` still passes; owners still pass. The seed no longer creates a role-less
  admin.
- `set-admin.js --role=owner` **refuses a 3rd owner** without `--force`.
- `test:unit` green · `build` clean (no-names guard) · **no `test:rules` needed** (rules untouched) ·
  browser-verified: owner sees the Admin access roster + no admins in Users; a manager sees no Settings tab.

**DoD:** admins never appear in the Users section (or its count/CSV/bulk surfaces); the owner-only Admin
access area lists **all** admins (owners + managers) with the email-lookup grant flow kept below it; exactly
two admin types can exist (no-role state eliminated at the choke point + seed migrated); owners hard-capped
at 2 in the script; every change server-enforced + audited where it mutates; docs + tests updated; no new
dependency; light-paper admin only.

**Status: ✅ BUILT — PR1 (Parts A + A1 + B) + PR2 (Part C + the suspend/tier/limits admin-target server
refusal).** Decisions locked 2026-08-03 via AskUserQuestion: **(1)** eliminate the no-role admin state
(harden guards + migrate seed); **(2)** hard-cap owners at 2 in `set-admin.js`; **(3)** roster **+ keep**
the email lookup; **(4)** exclude admins from **every** user-count surface (Users list, Total users, tier
counts, dup-email). Decisions (3) + (4) shipped in **PR1 (CRYP-103a, 2026-08-09, branch `claude/admin-sep`)**
along with the Part A1 user-detail backstop; decisions (1) + (2) + the deferred admin-target server refusal
shipped in **PR2 (CRYP-103b, 2026-08-10, branch `claude/admin-sep-partc`; unit 1064/1064, build clean, rules
untouched)**. 🔶 **CHECKPOINT** (security-critical: auth choke point + a new owner-gated callable) — was a
locked-decision checkpoint. **Story CRYP-103 closes when PR2 merges.** Independent of ADMIN-6 and
LAUNCH-FREE (no shared files that conflict). Was queued in [BUILD-LOOP](BUILD-LOOP.md) as #11.

---

## ADMIN-JOBS. Human-readable scheduled-job labels  (✅ BUILT 2026-08-01)

Founder ask (2026-08-01): the admin **Overview → System status strip** lists each scheduled job by
its raw JavaScript name (`refreshPrices`, `purgeOldAudit`, …). Show clear 1–2-word English labels
instead. Display-only; the jobs themselves don't change.

**Key constraint (why this is add-a-label, not rename):** a job's `name` is *also* its heartbeat
storage key — `runJob("refreshPrices", …)` stamps `health/jobs`, and `SCHEDULED_JOBS`
([`functions/index.js`](../../functions/index.js) ~L1409) is keyed by it. Renaming the key would
orphan the existing heartbeat docs, break the `getSystemStatus` mapping, and touch every `runJob()`
call site. So we **add a friendly display label and keep `name` as the stable internal key.**

**Approach (KISS, recommended):** a single client-side source map in
[`src/components/admin-dashboard.jsx`](../../src/components/admin-dashboard.jsx) —
`JOB_META[name] = { label, description }` — rendered at the `j-name` span (~L454) as
`JOB_META[j.name]?.label || j.name`, with `description` driving the hover tooltip (below). Purely
presentational, lives only in the admin bundle, **zero backend change, no data migration.** (Alt
considered: add `label`/`description` to the server `SCHEDULED_JOBS` and return via `getSystemStatus`
— one server source of truth, but it changes the callable's response shape. Deferred — presentation
belongs client-side.)

**Confirmed labels + hover descriptions** (founder-approved 2026-08-01 — the "Suggested" set):

| Internal name (heartbeat key — unchanged) | Label | Hover description ("what it actually does") |
|---|---|---|
| `refreshPrices` | **Prices** | Refreshes market prices for the top ~1,300 coins. Runs every 5 minutes. |
| `refreshUniverseDaily` | **Coin list** | Refreshes the full ~3,000-coin catalog and removes delisted coins. Runs once a day. |
| `purgeOldAudit` | **Audit cleanup** | Deletes admin audit-log entries older than 365 days. Runs once a day. |
| `captureDailyStats` | **Daily stats** | Saves a daily snapshot of user and growth numbers. Runs once a day. |
| `purgeExpiredTrash` | **Trash cleanup** | Permanently deletes accounts left in trash past the 30-day window. Runs once a day. |
| `enforceSubscriptionPeriods` | **Billing sync** | Downgrades a user's tier when their paid subscription period ends. Runs once a day. |

**Hover tooltip behavior (founder spec 2026-08-01):**
- **Trigger:** hovering a job **name**. A `mouseenter` starts a **2-second** timer; the description
  box appears only after the pointer rests on the name for 2s.
- **Cancel:** if the pointer leaves before 2s, the timer is cleared and nothing shows.
- **Dismiss:** on `mouseleave` the box hides immediately. Only the hovered name's box shows (one at a time).
- **Why custom, not the native `title`:** the browser controls the native `title` delay (not reliably
  2s) and it can't be styled, so this needs a small **custom tooltip** (a JS timer + a positioned box).
  This increment therefore also **removes the existing native `title` on the job row** (~L452) so the two
  don't both pop; any failing/late/error detail folds into the same custom box, so no status info is lost.
- **Positioning:** the box sits just above/below the name and must not clip at the strip's edges.
- **Accessibility (production-ready):** also reveal on **keyboard focus** of the name (hide on blur /
  `Esc`); under `prefers-reduced-motion` show it without a fade. Admin is light-paper only — no dark-mode work.

**Acceptance:** both `label` and `description` are **enumerated from `SCHEDULED_JOBS`** in a unit test
(not a hand-kept list), so adding a 7th job with no label/description fails the build — the same
"enumerate from source" guard used elsewhere; the tooltip appears ~2s after hover and hides on leave;
keyboard-focus reveal works; no double-tooltip.

**Status: ✅ BUILT 2026-08-01 (BUILD-LOOP item 2).** Client-only, zero backend change. Added an
exported `JOB_META[name] = {label, description}` map + a `JobPill` component in
[`admin-dashboard.jsx`](../../src/components/admin-dashboard.jsx): the Overview status strip now
shows the friendly label (`refreshPrices` → **Prices**, etc.) and a **custom hover/focus tooltip**
(2-second `mouseenter` timer, hides on `mouseleave`, reveals on keyboard focus, `Esc` to dismiss,
`prefers-reduced-motion`-aware, admin light-paper only). The native `title` was removed so the two
can't double-pop; any failing-error / note / overdue detail folds into the same custom box, so no
status info is lost. Job `name` stays the stable heartbeat key (never renamed). Tooltip CSS added to
the admin-only `admin-settings.css` (verified out of the user bundle). **Acceptance met:** a new unit
test enumerates the job names from `SCHEDULED_JOBS` in `functions/index.js` and asserts `JOB_META`
covers each (a 7th unlabelled job fails the build) — plus render/label, no-native-title, keyboard-focus
reveal, and 2s-hover/early-cancel tests. Verified: **861/861 unit green** (5 new), `npm run build` clean
(dist-name-guard passed). Browser check deferred (admin UI needs the emulator stack; Java 21 unavailable
this session) — covered by the render-level tests instead.

---

## DEVEX. Persistent emulator seed accounts  (✅ BUILT 2026-07-25)

Dev-only quality-of-life: the seeded emulator accounts used to die on every restart (in-memory
emulator → `re-seed each start`). Now they **persist across restarts** via Firebase's emulator
import/export, scoped to a **git-ignored `./emulator-data`** (never committed, never deployed —
founder chose machine-local over a committed baseline).

- New **`npm run seed`** (stack stopped) brings up auth+firestore, runs `functions/scripts/seed-emulator.js`,
  and **exports** the snapshot to `./emulator-data`.
- **`start:all`** now runs **`scripts/dev-stack.js`** — a tiny cross-platform launcher that **imports**
  `./emulator-data` when it exists and **always `--export-on-exit`**. `--import` is added *only* when the
  folder exists, because `firebase --import=<missing dir>` hard-fails (first run / fresh clone starts
  empty and says so). The pure arg-builder is unit-tested (`tests/unit/dev-stack.test.js`).
- `.gitignore` excludes `emulator-data/`. Reset-to-baseline = re-run `npm run seed`; start-empty = delete
  the folder. The direct `node functions/scripts/seed-emulator.js` still seeds a *running* stack.
- Verified live: `npm run seed` exported all 6 accounts + firestore; a fresh `npm run start:all` logged
  `Importing accounts from …/emulator-data/auth_export/accounts.json` and came up with them present —
  persistence across restarts proven. 842/842 unit green (incl. the new test); docs swept (README,
  CLAUDE.md, `emulator-dev-stack.svg` + diagrams index). Commit `071b290`.

---

## ADMIN-UI. Admin panel mockup match — unified chrome (UI-1) + card/tab/sizing fidelity (UI-2)  (✅ BUILT — 2026-07-25)

Canonical: [`docs/design/ADMIN-UI-REDESIGN.md`](../design/ADMIN-UI-REDESIGN.md) (mockup→code spec + file
map + acceptance criteria). Reference mockup: [`docs/mockups/admin-panel/index.html`](../mockups/admin-panel/index.html).
**✅ BUILT 2026-07-25** (design-only) — founder interview 2026-07-25 locked: back button on **every
drill-in AND every popup/modal**; **reskin** the sign-in / denied / loading screens too; card/tab/sizing
fidelity across the **whole panel** while **keeping the current responsive breakpoints**. Shipped as one
CSS pass (UI-1 + UI-2 together). Distinct from §ADMIN (that is *capabilities* ADMIN-0…5, all built) —
this is the *visual chrome*.

**Root cause of the reported overlap:** two brand headers both `position:sticky; top:0` collide — the
outer grey/purple shell bar (`admin-main.jsx` `ok` `<header>`, z-index 10) and the inner paper
`.adm-head` (`admin-dashboard.jsx`, z-index 20). Fix = collapse to **one** sticky bar.

- [x] **ADMIN-UI-1 · Unified chrome** (🟡 design · founder 2026-07-25 · **✅ BUILT 2026-07-25**) — Merge the two
      headers into **one** sticky bar (green logo tile + `CryptoIdea · Admin` left; email + Log out
      right), styled paper with an opaque/blur bg so it's the **only** pinned element. Add a **persistent
      `Admin dashboard` `<h1>`** below the bar (same on every tab + drill-in) with the **Live Data pill
      moved beside it** (out of the deleted `.adm-head`). Because the H1 is normal-flow content under an
      opaque bar, it can never overlap the bar on scroll. Standardize the mockup's **white rounded `‹`
      back button** on every drill-in (already present via `<DHead>` — restyle) and add/relocate a
      consistent close on the two modals (unlock = Cancel-only today; view-as ‹ is on the wrong side).
      **Reskin** sign-in/denied/loading to paper + logo tile (drop the `#6C5CE7` purple). Files:
      `src/admin-main.jsx` · `src/components/admin-dashboard.jsx` · `src/styles/admin-settings.css` ·
      `admin.html` · `tests/unit/admin-dashboard.test.jsx`. **Design-only** (no callable/rule/logic
      change); admin stays light-paper-only (no dark mode). DoD: one sticky bar, no overlap, H1 on every
      view, back-nav everywhere, no purple; `test:unit` green + `build` clean + browser-verified owner &
      manager, mobile & desktop.

- [x] **ADMIN-UI-2 · Card / tab / sizing fidelity** (🟡 design · founder 2026-07-25 · **✅ BUILT 2026-07-25**) — Make
      the panel's **cards, category (tab) bar and sizing** match the mockup pixel-for-pixel. Interview
      (2026-07-25) locked **all** of it: match spacing/density **+** typography **+** content width;
      **pill-card look on ALL card surfaces** (stat tiles, content panels, Users/Audit rows, Settings
      panels, modals); **whole panel** (every tab/drill-in/modal); **keep the current responsive
      breakpoints** and stacking (mockup is desktop-only — restyle only). Measured targets: active tab
      **near-black `--ink` → green `--accent` (#0a6b4d, already a token — no new hex)**, 13→14px; cards →
      **22px** radius + faint 0.8px border + soft 2-layer shadow + 20–24px pad, from **one** shared
      `--adm-card-*` token set; card titles sentence-case 13/700; shell **1040 → 1140px** (≈680px columns);
      H1 34px. Files: `src/styles/admin-settings.css` (the bulk) · `src/components/admin-dashboard.jsx`
      (class normalising only, no logic) · `tests/unit/admin-dashboard.test.jsx`. **Design-only** (no
      callable/rule/logic change); light-paper only; **no new dependency**. Naturally the **same build as
      ADMIN-UI-1** (same two files, same mockup). Spec: [`ADMIN-UI-REDESIGN.md`](../design/ADMIN-UI-REDESIGN.md)
      §8. DoD: green active tab, one card-token set on every surface, 1140px shell, no overflow at 375/768,
      light-paper only; `test:unit` green + `build` clean + browser-verified owner & manager, mobile &
      desktop.

- [x] **ADMIN-UI-3 · Mockup-match refinements** (🟡 design · founder 2026-07-25 · **✅ BUILT 2026-07-25**) —
      A second founder pass over the shipped panel against [`docs/mockups/admin-panel/index.html`](../mockups/admin-panel/index.html),
      five items. Spec + as-built notes: [`ADMIN-UI-REDESIGN.md`](../design/ADMIN-UI-REDESIGN.md) §9.
      Items 1–3 were real gaps (fixed); 4–5 already structural (confirmed by a live owner+manager sweep).
      Verified: admin `test:unit` 66 (+2) green · `build` clean (no-names guard) · browser owner+manager,
      desktop 1280 + mobile — logo/Log-out at the bar edges over a 1140-centered body, Overview cards
      160/160/160 equal (stack on mobile), tier seg==legend per tier, bordered card + `‹` on every
      drill-in/second screen.
      **Design-only** (no callable/rule/handler/logic change); light-paper only; **no new dependency**;
      **no new hex** (reuses `--amber #b8841f`, `--accent-ink #07503a`, existing premium `#7d4bbf`); keep
      the current responsive breakpoints (mockup is desktop-only — restyle only). Files:
      `src/styles/admin-settings.css` (bulk) · `src/components/admin-dashboard.jsx` (one grid class + the
      tier legend colours) · `tests/unit/admin-dashboard.test.jsx`.
    - **1 · Full-bleed header bar.** The bar is capped at `max-width:1140px` centered (`admin-settings.css`
      `.adm-bar-inner`), so on desktop the logo + Log-out sit *inset*. Match the mockup's full-bleed header
      (`padding:13px 28px`, no max-width): drop the inner cap so the **logo hugs the left edge and Log out
      the right edge**, while the `.adm-shell` body (H1 · tabs · cards) stays 1140-centered. Mobile
      unchanged.
    - **2 · Overview cards equal size.** "Est. Monthly Revenue" / "Combined Usage" / "Tier Breakdown" are
      equal *width* (auto-fit `1fr`) but unequal *height* — the shared `.grid-auto` uses `align-items:start`
      and the revenue card is taller. Give this one row an **admin-only class** (leave shared `.grid-auto`
      untouched — the user app's Research grid uses it) with `align-items:stretch` so all three match the
      tallest. Founder wants them **equal** (not the mockup's `1.15fr 1fr 1fr`). Keep the mobile 1-column
      collapse.
    - **3 · Tier-breakdown colours connect.** Each tier's **bar segment fill and its legend label must be
      one colour**. Today the legend spans use separate literals from `TIERS[key].bar`, and **Pro** drifts:
      bar `#0a6b4d` (`--accent`) vs legend `#07503a` (`--accent-ink`). Drive the legend from the same
      per-tier colour as the bar and set Pro to `--accent-ink #07503a` (the mockup's legend green). Starter
      `#b8841f` + Premium `#7d4bbf` already match. Zero new hex.
    - **4 · Border + `‹` back on every settings sub-screen.** The API-keys screen's bordered card + `‹`
      back is the reference. **Verification sweep** — code review shows every settings drill-in already
      renders `<DHead>` (the `‹`) inside a `.card` (bordered since ADMIN-UI-2); the build browser-checks all
      7 sub-screens (apiKeys · email · plans · ai · analytics · announcement · access) and fixes any that
      render content outside a bordered card or lack the `‹`.
    - **5 · Border + `‹` back on the user detail + all second screens.** Same reference on the Users
      drill-in and every other "second" screen. Also already structural (`<DHead>` + `.card` on the user
      detail; the two modals got their close controls in ADMIN-UI-1). Build sweeps the user detail · Trash
      confirmations · unlock & view-as modals and corrects any outlier.
    - **DoD:** logo/Log-out at the desktop edges; the three Overview cards equal height; each tier's bar +
      legend one colour; a bordered card + `‹` on **every** drill-in/second screen; `test:unit` green +
      `build` clean + browser-verified owner & manager, mobile & desktop; light-paper only.
- [x] **ADMIN-UI-4 · Visible back button + bordered header on every second-screen** (🟡 design · founder
      2026-07-25 · **✅ BUILT 2026-07-25** — new `DScreen` primitive; retired `DHead`; verified owner desktop
      1280 + mobile 375, 67 admin tests green, build clean; as-built [`ADMIN-UI-REDESIGN.md`](../design/ADMIN-UI-REDESIGN.md) §10) — The real fix behind ADMIN-UI-3 items 4/5, which only
      confirmed the `‹` **existed in the DOM**, not that it was **visible**. On every admin second-screen the
      shared `.icon-btn` renders `background:none; border:0; padding:0` (`app.css`), so the back `‹` is a bare
      borderless chevron floating above the card — reads as *no back button* — and the title has **no bordered
      header** (it sits as a lone line above a card whose first line repeats it; API-keys shows "API keys"
      twice, no border, no visible back). **Founder chose (2026-07-25): header attached to the card** like
      [`docs/mockups/admin-panel`](../mockups/admin-panel/index.html) — the `‹` in a **34×34 bordered box** +
      the **centered title** in a **white header row at the top of the screen's card with a divider under
      it**, then the body; the duplicate in-card title dropped so the title shows once. Main tabs
      (Overview/Users/Trash/Settings/Audit) untouched — **second screens only**. Scope: the **7 Settings
      sub-screens** (apiKeys · email · plans · ai · analytics · announcement · access) + the **Users →
      user-detail** drill-in + the **view-as** popup. **How (KISS · admin-scoped · design-only · no new
      hex):** a tiny `DScreen({title,onBack,children})` primitive (beside `DHead`) = one `.card` with a
      bordered `.adm-scr-head` (the `‹` box + centered `.dh-title` + `border-bottom` divider) over an
      `.adm-scr-body`; admin-only CSS under `.ci-app.adm-root` (leave the shared `.icon-btn`/`.detail-head`
      untouched so the **user app's** chevrons don't change); convert the 6 single-card settings screens + the
      user-detail card to `DScreen` (drop the duplicate `.card-title`, keep `.card-sub`), remove the shared
      `<DHead>`; wrap multi-card **Admin access** in `DScreen` with its inner cards demoted to
      divider-separated sections (no card-in-card); give the view-as modal the same bordered `‹`. Spec:
      [`ADMIN-UI-REDESIGN.md`](../design/ADMIN-UI-REDESIGN.md) §10.
    - **DoD:** every second-screen shows a bordered `‹` box + a bordered/divided header with the title once;
      no bare chevron anywhere in the admin; main tabs unchanged; `test:unit` green (existing "Back" /
      "Save keys" / "CHANGE TIER" assertions still pass) + a new bordered-header case · `build` clean ·
      browser-verified owner & manager, desktop + mobile; light-paper only, no new hex, no new dependency.

- [x] **ADMIN-UI-5 · Match the mockup's card + text SIZE (Overview bigger, Settings smaller)** (🟡 design ·
      founder 2026-07-25 · **✅ BUILT 2026-07-25** — Overview 38/30/26px + 30px pad via a `.adm-ov-screen`
      scope, Settings 18px `DScreen` body; build-time fix: `.adm-mini` is shared with the user-detail so the
      bumps are Overview-scoped; as-built [`ADMIN-UI-REDESIGN.md`](../design/ADMIN-UI-REDESIGN.md) §11) — Founder: the mockup's cards
      and text are **bigger** than the live panel; apply the mockup's sizing to the admin panel, **except
      Settings, where the cards should be SMALLER**. **Verified — founder is right.** ADMIN-UI-2 matched the
      card *chrome* (22px radius, .8px border, shadow) but kept the pre-mockup **padding (22px)** and the
      smaller **type scale**. Measured from the mockups (values are inline styles in the bundled files):
      **Overview — grow to match [`admin-panel`](../mockups/admin-panel/index.html):**
      | Element (CSS) | Live now | Mockup | Δ |
      |---|---|---|---|
      | Card padding (`--adm-card-pad` / `.adm-root .card`) | 22px | **30px** | +8 |
      | Stat-tile number (`.adm-stat .n`) | 30px | **38px** | +8 |
      | Stat-tile label (`.adm-stat .l`) | 9.5px | **11px** | +1.5 |
      | Revenue value (`.adm-kv .v`) | 22px | **30px** | +8 |
      | Usage-mini number (`.adm-mini .n`) | 22px | **26px** | +4 |
      | Card radius | 22px | 22px | already match |
      **Settings — shrink to match [`admin-settings`](../mockups/admin-settings/index.html):** setting cards
      **padding ~18px** (vs Overview's new 30px), text already ~13/11.5px. The blocker: **all admin cards
      currently share one `.ci-app.adm-root .card { padding:var(--adm-card-pad) }`** — so the fix must *split*
      the sizing (Overview/data cards big, Settings drill-in cards small), not bump the one shared token. Also
      **overlaps [[ADMIN-UI-4]]** (both restyle the Settings drill-in cards) — sequence UI-4 → UI-5, or fold
      Settings sizing into UI-4's `DScreen`. **How (KISS · admin-scoped · design-only · no new hex/dep):** bump
      the Overview values above in `admin-settings.css` (or a per-surface pad token); give Settings cards a
      smaller pad variant. **Founder decided (2026-07-25):** (1) **Overview only** — Users/Trash/Audit list
      rows keep today's dense sizing (no stat cards there to enlarge); (2) **match the mockup exactly** —
      `.adm-stat .n` 30→**38px**, `.adm-stat .l` 9.5→**11px**, `.adm-kv .v` 22→**30px**, `.adm-mini .n`
      22→**26px**, Overview card padding 22→**30px**; (3) **Settings cards shrink to the settings mockup's
      ~18px padding** (text already ~13/11.5px). Because the pad token is shared, introduce a **per-surface pad**
      (Overview 30px / Settings 18px) rather than moving the one `--adm-card-pad`. Spec:
      [`ADMIN-UI-REDESIGN.md`](../design/ADMIN-UI-REDESIGN.md) §11.
    - **DoD:** Overview stat/value cards render at the mockup scale (38/30/26px, 30px pad); Settings drill-in
      cards visibly smaller (~18px pad); Users/Trash/Audit unchanged; `test:unit` green · `build` clean ·
      browser-verified owner & manager, desktop + mobile; light-paper only, no new hex, no new dependency.

- [ ] **ADMIN-UI-6 · Header typography fidelity** (🟡 design · founder 2026-07-26 · **📋 PLAN ONLY — not built**;
      spec [`ADMIN-UI-REDESIGN.md`](../design/ADMIN-UI-REDESIGN.md) §12) — Founder: in the top bar the
      **`CryptoIdea` wordmark** is smaller than the mockup **and in the wrong font**, the **`· Admin`** sub is
      too small, the **`Log out`** button is too small + too round, and the **email** is too small. Measured
      vs. [`docs/mockups/admin-panel/index.html`](../mockups/admin-panel/index.html) (founder is right on all):
      **key finding — the wordmark was built in Fraunces *serif* (`--display`) but the mockup uses Hanken
      *sans* (`--body`).** Targets (mockup, measured): wordmark **sans 18px/600** (was serif 17/500); `· Admin`
      **18px/500** (was 12/600); `Log out` **radius 12px, pad 9×16, 13px/700** (was pill 999px, 7×14, 12.5/600);
      email **13px `--ink-soft`** (was 12.5 `--ink-faint`). **One open decision:** the serif→sans wordmark swap
      is the most visible change — plan recommends sans (mockup); founder can keep serif + only resize. **How
      (KISS · one file · no new hex/dep):** restyle `.adm-brand-txt` / `.adm-sub` / `.adm-logout` / `.adm-email`
      in `src/styles/admin-settings.css` (every target maps to an existing token); no JSX/logic change; keep the
      responsive `clamp` on the bar padding. **DoD:** wordmark sans 18/600 (or confirmed choice), `· Admin`
      18/500, `Log out` 12px-radius 13/700, email 13px `--ink-soft`; `test:unit` green · `build` clean ·
      browser-verified owner, desktop 1280 + mobile 375 (no overflow); light-paper only, no new hex, no new
      dependency.
- [ ] **ADMIN-UI-7 · Overview card fidelity (padding + Tier-breakdown pill)** (🟡 design · founder 2026-07-26 ·
      **📋 PLAN ONLY — not built**; spec [`ADMIN-UI-REDESIGN.md`](../design/ADMIN-UI-REDESIGN.md) §13) — Founder,
      on the Overview screen: (1) the **cards have too much empty space** — content should "use more of the card,"
      and (2) the **Tier-breakdown bar** colours should **connect** like the mockup. Measured vs.
      [`docs/mockups/admin-panel/index.html`](../mockups/admin-panel/index.html) (founder is right on both).
      **Two key findings:** (a) the Overview cards are padded **`30px`** (ADMIN-UI-5) but the **mockup is `20px`**
      (Plan limits `20px 24px`) — tighten to 20px so content fills the card (the big 38/30/26px text is
      unaffected); (b) the tier bar's segment **colours already match the mockup exactly** — the only difference
      is the **shape**: current `border-radius:8px` (rectangle) vs the mockup's **`999px` pill**, so making the bar
      a full pill is the entire "connect" fix (**no colour change**). Also: usage mini-tiles → radius `14px`
      (`--radius-sm`), gap 10, label 10px — **scoped under `.adm-ov-screen`** because `.adm-mini` is **shared with
      the user-detail drill-in** (grep-before-bump, the ADMIN-UI-5 trap). **How (KISS · one file · no new hex/dep):**
      edit `.adm-ov-screen .card` / `.adm-tierbar` / `.seg` / `.adm-legend` + scoped `.adm-mini` in
      `src/styles/admin-settings.css`; no JSX change (unless a Plan-limits hook class is added). **One judgement
      call:** card padding 20px (exact mockup, recommended) vs a 24px middle ground. **DoD:** cards 20px (content
      closer to edge, big text unchanged), tier bar a 999px pill (tiers read as one connected band), drill-in tiles
      unchanged; `test:unit` green · `build` clean · browser-verified owner desktop 1280 + mobile 375
      (`getComputedStyle` padding/radius); light-paper only, no new hex, no new dependency.
- [ ] **ADMIN-UI-8 · Settings screens match the mockup (width + header size + cream headline)** (🟡 design ·
      founder 2026-08-01 · **📋 PLAN ONLY — not built**) — Founder, comparing the live Settings drill-ins to the
      mockup: Settings should be the **mockup's size**, and each drill-in **headline** (e.g. "API keys") should
      sit on the **mockup's cream/paper background**, not white. *(Note: the founder referenced
      [`docs/mockups/admin-panel`](../mockups/admin-panel/index.html), but the Settings **detail** screens with
      "API keys" live in [`docs/mockups/admin-settings/index.html`](../mockups/admin-settings/index.html) — the
      documented 1:1 source these were built from — so that is the fidelity target.)*
      **Founder decisions (AskUserQuestion 2026-08-01):** (1) **size = BOTH** — contain the width AND bump the
      header title; (2) **headline background = cream/paper** (`--paper` #f8f7f3); (3) **keep the current
      single-card `DScreen` structure** ([[ADMIN-UI-4]]) — restyle only, no revert to the mockup's
      floating-header layout.
      **Measured gaps (live vs mockup):** drill-in header title **16px → 19px/500** (mockup `.dh-title`); header
      band **white → cream `--paper`** (the mockup floats the headline on the paper frame); the drill-in
      **stretches to the 1140 shell** on desktop → **contain it** (the mockup is a tidy column). Body card padding
      already matches (both 18px).
      **How (KISS · admin-only · design-only · no new hex/dep):** in
      [`src/styles/admin-settings.css`](../../src/styles/admin-settings.css) — (a) add a **Settings-tab wrapper**
      `.adm-settings-screen { max-width:560px; margin:0 auto }` (560px = the app's existing form/detail shell
      width, so it's a mockup-tidy column, not a new magic number), applied to the Settings tab container in
      [`src/components/admin-dashboard.jsx`](../../src/components/admin-dashboard.jsx); (b)
      `.adm-settings-screen .adm-scr-head { background:var(--paper) }` (keep the `border-bottom` divider);
      (c) `.adm-settings-screen .adm-scr-head .dh-title { font-size:19px; font-weight:500 }`.
      **⚠️ Scope every rule under `.adm-settings-screen`, NOT the bare `.adm-scr-head` / `.dh-title`** — those are
      **shared with the user-detail drill-in** in the Users tab (the same grep-before-bump trap as
      [[ADMIN-UI-5]]'s `.adm-mini`); Overview/Users/Trash/Audit and the user-detail header must stay
      byte-for-byte.
      **One judgment call:** contained width **560px** (app form width, recommended) vs a roomier 600–640px.
      **DoD:** Settings drill-ins render contained (~560px, centered) with a **19px cream headline band**, body
      stays white; **other tabs + the user-detail drill-in unchanged** (`getComputedStyle` on `.dh-title` size +
      `.adm-scr-head` background in BOTH a Settings screen and the user-detail); `test:unit` green · `build` clean ·
      browser-verified owner desktop 1280 + mobile 375; light-paper only, no new hex, no new dependency.

- [ ] **ADMIN-UI-9 · Admin text sizing — headline descriptions to mockup 13.5px + soft-green Billing/Tier pills**
      (🟡 design · founder 2026-08-01 · **📋 PLAN ONLY — not built**) — Founder, on the Users tab: the muted
      headline-description line reads too small vs the mockup. Make **every tab's headline description** the
      mockup's size, make the **"N users" count** the same size, and give the **Billing / Tier** filter labels
      that same size **plus a soft-green pill** so they stand out. **Wording, text style and colours stay
      unchanged — size only, plus the pill background; the labels keep their uppercase/bold style.**
      **Measured (live vs mockup):** headline description **11.5px → 13.5px** (mockup
      [`admin-panel/index.html`](../mockups/admin-panel/index.html) ~L382: `font-size:13.5px`); `.adm-count`
      ("N users") **11px → 13.5px**; `.adm-filter-label` ("Billing"/"Tier") **10px → 13.5px** (keep
      `font-weight:700` + `letter-spacing:.06em` + `text-transform:uppercase`).
      **Founder decisions (AskUserQuestion 2026-08-01):** (1) **PLAN ONLY**; (2) **soft-green tint** pill for the
      Billing/Tier labels (not the solid accent) — reuse the **existing PRO-pill palette**:
      `background:var(--accent-soft)` (#e9f2ed) + `color:var(--accent-ink)` (#07503a). **No new hex.**
      **How (KISS · admin-only · design-only · no new hex/dep):**
      (a) The 3 headline descriptions are **identical inline styles** in
      [`src/components/admin-dashboard.jsx`](../../src/components/admin-dashboard.jsx) — **L815 (Users), L936
      (Trash), L1363 (Audit)** (`fontSize:11.5, color:var(--ink-faint), lineHeight:1.5, margin:"2px 2px 12px"`).
      Replace all three with **one shared class** `.ci-app .adm-tab-desc { font-size:13.5px; color:var(--ink-faint);
      line-height:1.5; margin:2px 2px 12px }` in
      [`src/styles/admin-settings.css`](../../src/styles/admin-settings.css) — so all headline descriptions share
      ONE source and can't drift (the "all of them" ask, done structurally). **Sweep Overview/Settings-home for any
      other tab-level description** and apply the same class if one exists.
      (b) `.ci-app .adm-count { font-size:13.5px }` (was 11px) — **note this class is shared by BOTH the Users and
      Audit count rows**, so both move together (desired consistency; called out so it's intentional).
      (c) `.ci-app .adm-filter-label` → **`font-size:13.5px`** + `background:var(--accent-soft);
      color:var(--accent-ink); padding:2px 10px; border-radius:999px;` while **keeping** `align-self:center;
      font-weight:700; letter-spacing:.06em; text-transform:uppercase;`. The pill affects only the two Users-tab
      labels; verify vertical alignment against the adjacent `.adm-chip` filter buttons.
      **⚠️ Keep-color / grep-before-bump:** keep the description **colour** as `var(--ink-faint)` (do NOT adopt the
      mockup's `#55534b` — founder said size only, and no new hex); `.adm-count` / `.adm-filter-label` are
      admin-only classes (safe to bump within `.ci-app` admin), but confirm no non-admin surface reuses them
      before changing (the ADMIN-UI-5 `.adm-mini` / `.grid-auto` trap).
      **One judgment call (deferred):** whether to also match the mockup's `line-height:1.55` + `max-width:78ch`
      on the description for fuller fidelity — the founder asked for **size only**, so not doing it unless asked.
      **DoD:** all headline descriptions render at 13.5px from one `.adm-tab-desc` class; "N users" + the Audit
      count at 13.5px; Billing/Tier labels at 13.5px on a soft-green pill (uppercase/bold kept); wording + other
      colours unchanged (`getComputedStyle` on `.adm-tab-desc`, `.adm-count`, `.adm-filter-label` font-size + the
      pill `background`); `test:unit` green · `build` clean · browser-verified owner desktop 1280 + mobile 375;
      light-paper only, no new hex, no new dependency.

- [ ] **ADMIN-UI-10 · Interactive logo (hover animation + click to Overview)** (🟡 design · founder 2026-08-01 ·
      **📋 PLAN ONLY — not built**) — Founder: the landing/mockup brand mark animates on hover, but the admin
      bar logo is a static, non-clickable tile. Make it match — the "C" tile animates on hover, **and** (founder
      decision) the logo is clickable, returning to the Overview (admin home) like a normal brand mark.
      **Reference (landing, [`index.html`](../../index.html) L63–67):** `.brand .mark { transition:transform .3s
      var(--ease) }` + `.brand:hover .mark { transform: rotate(-6deg) scale(1.06) }` — a slight rotate + scale-up.
      `--ease` is `cubic-bezier(.22,.61,.36,1)` ([`app.css`](../../src/styles/app.css) L21) and is in the admin's
      `.ci-app` token scope, so the motion is **byte-identical** to the landing.
      **Current admin (static):** [`admin-dashboard.jsx`](../../src/components/admin-dashboard.jsx) L348–350 —
      `<div className="adm-brand"><span className="adm-logo" aria-hidden="true">C</span><span
      className="adm-brand-txt">…</span></div>`; `.adm-logo` ([`admin-settings.css`](../../src/styles/admin-settings.css)
      L102) has no transition and no `:hover`.
      **Founder decision (AskUserQuestion 2026-08-01):** hover animation **AND** click → Overview (a real
      brand-mark home link), not hover-only.
      **How (KISS · admin-only · design-only · one small JS change):**
      - **Markup:** turn `.adm-brand` into a real `<button type="button" className="adm-brand" aria-label="Go to
      Overview">` (keep both inner spans; keep the "C" span `aria-hidden` — decorative, the button carries the
      label). `onClick` returns to a clean home: **`setTab("overview"); setSettingsView("home"); closeUser();`** —
      all three already exist ([admin-dashboard.jsx](../../src/components/admin-dashboard.jsx) L272/L304/L339); this
      mirrors the tab buttons (L380) **plus** clears an open user drill-in so "home" is truly clean.
      - **CSS ([`admin-settings.css`](../../src/styles/admin-settings.css)):** (a) reset button chrome on
      `.adm-brand` (`background:none; border:0; padding:0; font:inherit; color:inherit; text-align:left;
      cursor:pointer`) so it looks **identical** to today; (b) add `transition:transform .3s var(--ease)` to
      `.adm-logo`; (c) `.ci-app .adm-brand:hover .adm-logo, .ci-app .adm-brand:focus-visible .adm-logo { transform:
      rotate(-6deg) scale(1.06) }` (hover **and** keyboard focus); (d) a visible `:focus-visible` ring on
      `.adm-brand` (reuse the existing admin focus treatment) for keyboard a11y.
      - **Reduced motion (production-ready a11y):** `@media (prefers-reduced-motion: reduce)` → drop the
      `.adm-logo` transition and the hover/focus `transform` (no animation, click still works).
      **Scope / keep-same:** the hover rule keys off **`.adm-brand`**, and the sign-in screen's larger logo
      (`.adm-logo.lg`) is **not** inside `.adm-brand`, so it stays static — verify it's untouched. `.adm-logo` /
      `.adm-brand` are admin-only classes. Light-paper only; **no new hex, no new dependency.**
      **DoD:** hovering **or** keyboard-focusing the admin logo animates the "C" tile identically to the landing
      (rotate −6° + scale 1.06, .3s `--ease`); clicking it returns to a clean Overview (user drill-in + settings
      sub-view cleared); the brand is a focusable `<button>` with a visible ring + `aria-label`; reduced-motion
      disables the animation; the sign-in `.adm-logo.lg` is unchanged; visual chrome otherwise identical to today;
      `test:unit` green · `build` clean · browser-verified owner desktop 1280 + mobile 375.

- [ ] **ADMIN-UI-11 · User-detail drill-in matches the mockup (separate pill-cards + cream header + sizes)**
      (🟡 design · founder 2026-08-01 · **📋 PLAN ONLY — not built**) — Founder, on the Users → user-detail
      drill-in ("pro" screen): it's currently **one big card**; the mockup breaks it into **separate pill-cards**,
      the **header band (where the name sits) uses the mockup's cream colour**, and each card matches the mockup's
      size.
      **Current (one card):** the whole drill-in is a single `<DScreen>` (`.card.adm-scr`, header + one padded
      body) — [`admin-dashboard.jsx`](../../src/components/admin-dashboard.jsx) L669-813; every section
      (email+badges, `.adm-minis` stats, Billing, Change tier, Moderation, View-as, Note, Delete) is stacked
      inside that one body.
      **Mockup (measured, [`admin-panel/index.html`](../mockups/admin-panel/index.html) L382):** each section is
      its **own white card** — `background:#fff; border:1px solid rgba(21,20,15,.06); border-radius:22px; soft
      shadow; padding:20px` with a **14px gap** (i.e. the standard admin `.card`); the detail lives in the
      full-width Users screen (NOT a narrow column). Stat tiles = `#fcfbf8`, radius 14, padding 14×10, **24px**
      serif number; section labels = 11px/700/.08em/`#928f85`/mb 10.
      **Founder decisions (AskUserQuestion 2026-08-01):** (1) **EVERY section becomes its own pill** (consistent —
      identity+stats, Billing, Change tier, Moderation, View-as, Admin note, Delete), not only the 3 the mockup
      predates; (2) **header band = cream `--paper`** (#f8f7f3), the same tone [[ADMIN-UI-8]] gives the Settings
      drill-in header.
      **How (KISS · admin-only · design-only):**
      - Restructure the user-detail body into a **cream header band** (‹ back + centered name) **+ a stack of
      `.card` pills** (one per section, 14px gaps). The pills reuse the shared `.card` (already #fff / radius 22 /
      shadow), so little new CSS. Avoid **card-in-card double borders**: for the user-detail, drop the outer
      `.adm-scr` card border/padding (a user-detail modifier) so the header band + pills float on the paper.
      - Header band gets `background:var(--paper)` (cream), reusing the `.adm-scr-head` ‹+title markup.
      - Stat tiles: match the mockup **scoped to the user-detail** (`.adm-user-detail .adm-mini { … }`) — **⚠️
      `.adm-mini` is SHARED with the Overview** (grep-before-bump, the [[ADMIN-UI-5]] trap), so never bump the bare
      class.
      **⚠️ Shared-surface guards:** `DScreen` / `.adm-scr-head` / `.dh-title` are **shared with the Settings
      drill-in**, and this **overlaps [[ADMIN-UI-8]]** (which also creams the drill-in header) — **build UI-8 +
      UI-11 together**; since BOTH drill-in headers now want cream, apply cream to the shared header rather than
      two scoped copies. `.adm-mini` shared with Overview (above). Map the mockup's `#fcfbf8` / `rgba(21,20,15,.06)`
      / shadow to **existing tokens** (`--paper*` / `--line*` / the card shadow) — **no new hex**.
      **DoD:** the user-detail renders as a **cream header band + separate white `.card` pills** (14px gaps), every
      section its own pill, no double-border; stat tiles match the mockup (Overview unchanged); **Settings drill-in,
      Overview and the Users list are unchanged** (`getComputedStyle` on `.adm-mini` + `.adm-scr-head` in the
      user-detail vs Settings vs Overview); `test:unit` green · `build` clean · browser-verified owner desktop 1280
      + mobile 375; light-paper only, no new hex, no new dependency.

## ADMIN. Admin-panel research audit + build plan  (📋 PLAN — 2026-07-18; not scheduled)

Canonical: [`ADMIN-PANEL-AUDIT.md`](../decisions/ADMIN-PANEL-AUDIT.md) (scored gap-audit vs. external
best practice + cited sources + phased plan). A limited-but-grounded pass (4 read-only research agents
over React-Admin / Refine / AdminJS / Stripe / PayPal / PostHog / OWASP / Auth0 / WorkOS / LaunchDarkly
/ Unleash / Sentry docs + OSS repos, then a synthesis cross-referenced against the code). **Nothing
built** — this is the plan; each item runs the full §PROCESS interview+sweep when scheduled. Composes
with §BL (admin capabilities), §4 go-live (MFA/App Check), §C (config/kill-switches), §U (settings) —
does not duplicate them. Score of the gaps: **2 critical · 7 high · ~13 medium · ~12 low**. The panel
is already strong (isolated `/admin`, soft-delete/trash, real audit log, editable server config,
aggregate-only privacy views); gaps cluster in **billing-ops visibility, observability, audit depth,
growth metrics**. Recurring win: most valuable gaps are cheap because they extend existing patterns
(`config/app.flags` → kill-switches + announcement; `webhookEvents` → webhook health; `getStats` →
trend snapshots). Phases (KISS-first, most valuable first):

- [x] **ADMIN-SEC · Admin roles, owner protection & sensitive-area re-auth** (🟠 high · security ·
      founder 2026-07-18 · **✅ BUILT 2026-07-18** — `8c7ea66` server · `9e1b1d4` rules · `3aa3de0`
      client · `485bb5b` fix. Verified: 527 unit · 36 rules · **35/35 live role probes** on the
      emulator · build clean · browser-checked as owner and as manager. Two extra holes found and
      closed during the build, beyond the original spec: a manager could bypass every callable wall
      by writing Firestore straight from devtools (rules were role-blind), and could lock both owners
      out by **suspending** them while the admin count still read ≥2. Owner-target protection now
      covers tier/limits/suspend/sign-out/trash/delete. 📋 Follow-ups: **run
      `set-admin.js <email> --role=owner` for both real owner accounts before any deploy** — until
      then they are legacy role-less admins and Settings will refuse them; back up the
      service-account key (it is the only way to mint an owner); true MFA stays §ADMIN-0.) —
      closed the **owner-deletion bypass** (promote
      sock-puppets → delete the real owners while count stays ≥`MIN_ADMINS`). Split admin into two
      claim roles: **owner** (`role:"owner"`, set **only** by `set-admin.js`, un-deletable/un-demotable,
      2 accounts) and **manager** (`role:"manager"`, granted by an owner, **accounts-only, no
      settings**). **Remove grant-admin from the Users tab**; add an **owner-only "Admin access"** area
      to add a manager via **email search → type email twice → warning → owner password**. Password gate
      = a **~10-min unlock** (`reauthenticateWithCredential`); the real control is server-side
      (sensitive callables require `role:"owner"` **+ fresh `auth_time`**) on **Settings / API keys /
      Plans & pricing / grant-manager**. Managers can't see Settings, Admin access, permanent purge, or
      any grant control (UI-hidden **and** callable-denied). Absorbs the old RBAC + step-up-reauth audit
      rows; MFA stays §ADMIN-0/§4. Spec + role matrix + file map:
      [`ADMIN-PANEL-AUDIT.md`](../decisions/ADMIN-PANEL-AUDIT.md) § Admin roles. **Build before the
      design items** — it overrides three areas of the ADMIN-D2 mockup and adds the unlock gate to
      Settings, so reskinning first means drawing those screens twice. Local-first / emulator-
      verifiable; runs the §PROCESS interview+sweep (Admin map row) when built.
- [x] **ADMIN-0 · Launch gate** (🔴 critical · **✅ BUILT 2026-07-24** — everything that can be built
      before a real Firebase project exists) — admin **MFA/2FA** + **App Check** enforcement +
      `beforeCreate` **hard signups-off** + make the `audit` collection **append-only** in rules.
      **✅ BUILT 2026-07-24 (this session), item by item — two of the four turned out to be different
      jobs than the backlog line described:**
      1. **`beforeCreate` hard signups-off — BUILT and emulator-verified.** `exports.beforeCreateUser`
         (v1 `functions.auth.user().beforeCreate`) runs inside account creation, the only place the
         answer is authoritative: the toggle was a client gate, and
         `createUserWithEmailAndPassword` talks straight to Firebase Auth. The verdict is a pure,
         unit-tested `signupDecision()` (`functions/signup-gate.js`), reading `config/app` **FRESH**
         (not `getConfig()`'s 5-min cache — an enforcement point must not lag its own switch).
         **FAIL OPEN by founder decision:** an unreadable config ⇒ ALLOW, mirroring ADMIN-2's
         default-ON rule; a Firestore blip must never silently kill the signup funnel. ⚠️ **Deploying
         it needs Identity Platform on the project** — see §4 go-live.
      2. **`audit` append-only in rules — ALREADY SATISFIED; the backlog line was wrong.**
         `firestore.rules` already has `allow read, write: if false`, which is *strictly stronger*
         than append-only. Rules can never make it append-only against the only writer that matters
         (**the Admin SDK bypasses rules entirely**), and loosening to `allow create` would be a pure
         downgrade. Real tamper-evidence is the **single-writer choke point**: `audit` is touched in
         exactly three places (add/read/expire), now pinned by a source-scan test. A rules test was
         added for client WRITES (previously only reads were covered).
      3. **Admin MFA — the server-side gate is BUILT (default OFF); enrolment stays infra.**
         `guards.requireMfa` reads `firebase.sign_in_second_factor` off the verified token and hangs
         off the shared `assertRole`, so it covers **every** admin callable rather than being
         sprinkled per-endpoint. Flag `config/app.flags.requireAdminMfa`, surfaced as an **armed**
         (two-step) switch in Settings → Admin access. Go-live becomes a flag flip, not new auth code
         written under launch pressure. ⚠️ Turning it on with nobody enrolled locks every admin out of
         the panel *including this switch* — recovery is editing the flag in the Firebase console,
         stated in the UI warning itself.
      4. **App Check — NO CODE, by the standing GO-LIVE-AUDIT H1 decision** (console-only; wiring
         `appCheckOk` into callables duplicates a platform control and adds a second lockout surface).
         Re-confirmed with the founder this session rather than quietly re-litigated.
      **Structural change:** `assertAdmin`/`assertManager`/`assertOwner` are now **async** (the MFA
      flag is a Firestore read) and all 15 call sites `await` them. A missing `await` returns a truthy
      Promise and never throws — an open endpoint that still *looks* gated — so
      `tests/unit/admin-0-guards.test.js` fails the build on any un-awaited gate (negative-tested).
      Verified: **796/796 unit** (70 files, +36) · **42/42 rules** (+1) · **19/19 integration** · build clean ·
      admin-only code out of the user bundle. Probed live on the emulator: with signups paused a
      registration returned 400 and **no Auth account was created**, the Admin SDK (seed script) was
      **not** blocked, and signup still worked with `config/app` deleted entirely. Admin 2FA enforced
      live → every admin callable refused a password-only owner with an honest reason, and the console
      escape hatch restored the panel.
- [x] **ADMIN-1 · Billing-ops visibility** ⭐ (🟠 high · **✅ BUILT 2026-07-24**) — persist (if not already)
      + show the PayPal **subscription id + status** (`active`/`past_due`/`paused`/`canceled`) on the user
      card; a **past_due / canceled** filter; a **webhook-health** list (recent `webhookEvents` +
      last-processed + gaps). **Read-only** — cancels/refunds stay in the PayPal dashboard for now. Biggest
      new value.
      **✅ BUILT 2026-07-24 (this session):** **no new storage** — the sub id (`paypalSubscriptionId`) +
      the `subscription` marker were already server-persisted, so status is **derived** by a pure
      `billing.billingStatusOf(userData)` → `active` / `past_due` / `canceled` / `none` (precedence:
      paymentFailed > cancelled > paid-tier > free; **PayPal SUSPENDED folds into `past_due`** — there is
      no separate persisted "paused" state, noted so it isn't re-litigated). `lookupUser` + `listUsers`
      now return the derived `billingStatus` (lookupUser also returns `paypalSubscriptionId` / `subEndDate`
      / `subDowngradeTo` / `lastPayment`); a **new read-only callable `listWebhookEvents`** (`assertAdmin`,
      clamp 1–200) surfaces the `webhookEvents` ledger. UI: the user-detail card gained a **Billing**
      section (status pill + sub id + cycle + renews/ends date), the Users list gained a **past-due/canceled
      filter + a per-row status dot**, and the **Overview** gained a **"Billing & webhooks"** card (last
      processed + freshness dot + events by type + recent list; an empty list is the expected pre-launch
      state, never an error). **Read-only — no write/mutation path added; `webhookEvents` stays server-only
      (the callable reads via the Admin SDK).** Files: `functions/billing.js` (+ the pure
      `billingStatusOf`, unit-tested), `functions/index.js` (fields + the new callable), `src/api/admin.js`,
      `src/hooks/useAdminDashboard.js`, `src/components/admin-dashboard.jsx`, `src/styles/admin-settings.css`
      (admin-only `adm-billing`/`adm-wh-*` classes, verified out of the user bundle). Verified: **563/563
      unit** (11 new) · build clean · admin CSS out of the user bundle · **browser-checked live as owner**
      (patched a canceled-premium + past-due-pro user + 3 webhook events → the Overview card, list dots,
      Past-due filter, and detail Billing section all render correctly, 0 console errors).
- [x] **ADMIN-2 · Operational safety net** (🟠 high · **✅ BUILT 2026-07-24**) — **per-feature kill-switches**
      (extend `config/app.flags` with a `features:{}` map, read via the existing `/api/config` path) + wire
      **Sentry** + a cron monitor + a tiny status strip in Overview. Failure visibility via external tools,
      not a hand-built dashboard.
      **✅ BUILT 2026-07-24 (this session).** Founder decisions: switch set = **money/upstream only**
      (`marketData` · `checkout` · `aiResearch`, not per-tab); "off" for market data = **serve cache, stop
      upstream** (not a hard 503 — a switch you're afraid of is a switch you won't flip); Sentry
      **functions-side only** behind a DSN in Settings; the cron monitor = **heartbeat doc + derived signals**.
      - **Kill-switches** (`functions/features.js`, pure + unit-tested). **A switch is ON unless config says
        exactly `false`** — a missing key, a legacy config, or a failed Firestore read must degrade to a
        WORKING app; a kill-switch may only ever fire because a human flipped it. Declared in ONE map that the
        admin UI, `/api/config` and the sanitiser all enumerate from, so a switch can't be half-wired.
      - **Enforced at ONE choke point.** All five direct `` fetch(`${CG_BASE}…`) `` sites now route through
        `cgFetch()`; a test fails the build if a direct call reappears — sprinkling the check would let a
        sixth site added later bypass it silently. **Off = zero upstream calls**, caches still serving.
        `getUniverse`/`getTrending` also skip their lazy refresh, because `refreshUniverse` treats a failed
        first page as *partial* and would still write `updatedAt: now`, stamping the cache fresh having
        fetched nothing. `createSubscription` refuses server-side; the UI additionally disables the CTAs.
      - **The omitted-`features` trap, found while building:** the instant maintenance/signups toggles post
        `flags` WITHOUT `features`, which under a plain sanitise reads as "everything ON" — so flipping
        maintenance mid-incident would have silently restarted the spend you had just killed. Fixed with a
        per-key `mergeFeatures` (an unmentioned switch is KEPT), pinned by unit tests and proven live.
      - **Cron heartbeats** (`health/jobs`, server-only in rules — **integrity**, not confidentiality: a
        client that could stamp a heartbeat could keep a dead cron looking alive). Every scheduler runs
        through `runJob()`, which records the heartbeat **and still rethrows** so H3 (fail loudly) holds. A
        deliberate kill-switch skip stays GREEN with a stated reason — a switch you flipped must not page you.
      - **Overview status strip** (`src/utils/status.js`, pure + unit-tested): never / overdue / failing /
        ok per job + the named switched-off features + cache age + `sentryConfigured`. **A job with no record
        reads "never", never a reassuring blank**, and a failed status load shows the error instead of a false
        all-clear (the BL-1e error-vs-empty rule).
      - **Sentry: functions-only**, DSN in Settings (`keep()`-guarded, added to `SECRET_PATHS`). Zero user-bundle
        weight, no CSP change, and with no DSN it never even `require()`s the SDK. Events carry no uid, email,
        URL, headers, cookies or body. ⚠️ **Delivery is UNVERIFIED** — no Sentry account or deployed project
        exists; only the no-op path, DSN validation and scrubbing are proven locally.
      - **`getSystemStatus` reads config FRESH**, not through the 5-min `getConfig()` cache — caught live:
        the strip reported "All features on" while market data was actually off. A status view must not lag
        the thing it reports on.
      - **NOT built (deliberate):** the external half — a Sentry account/DSN, an uptime monitor, and the 2–3
        alert rules. All three need a deployed project and a paid-plan decision; they stay **go-live infra**.
      - Verified: **760/760 unit** (68 files, +76) · **41/41 rules** (+1) · **19/19 integration** · build clean ·
        admin-only code + CSS confirmed out of the user bundle and **no Sentry SDK in any client chunk** ·
        **server enforcement probed live** (marketData off → cache served with `cache/universe.updatedAt`
        UNCHANGED, i.e. no upstream refresh; `createSubscription` → 400 "Checkout is temporarily unavailable"
        for an authenticated caller) · browser-checked as owner (all four job states rendered at once,
        including a real `universe 429` failure and a `skipped — marketData off` note; flipping a switch in
        the UI preserved the other switches) and as a Pro user (`● PAUSED` on all five tab headers, upgrade
        CTA refused with an honest toast).
      - 📋 Follow-ups: **disclose the Sentry third-party transfer in the privacy policy before setting a DSN**;
        create the Sentry project + uptime monitor + alert rules at go-live.
- [x] **ADMIN-3 · Audit & data hygiene** (🟠 high / 🟡 med · **✅ BUILT 2026-07-24**) — audit tab **filter + pagination + CSV
      export** + a source-IP field; a **retention TTL** (ties to §C C15); **user-list CSV/JSON export**
      (quick win); **config change versioning / diff** (store prior values in the audit entry).
      **✅ BUILT 2026-07-24 (this session).** Founder decisions: filtering **client-side** over the existing
      fetch (no composite indexes / cursor API — the Users-tab pattern); source IP on **every** audited
      event, self-service included; config diff with **before→after values, secrets redacted**.
      **Scope correction:** the **retention TTL already shipped** — `purgeOldAudit` has swept a 365-day
      `AUDIT_RETENTION_MS` daily since BATCH-3 (C-R2c); this round only documents it in the UI.
      **JSON export was NOT built** — CSV only for both tabs; nothing in the panel needed the raw shape,
      and the users list is already available as JSON to a developer via the callable.
      - **Source IP** (`functions/net-utils.js` `auditIp`): reuses the rate limiter's **spoof-resistant**
        right-anchored X-Forwarded-For rule, because a *forgeable* origin in an audit log is worse than
        none — it would put an innocent address next to someone else's action. ⚠️ **Empty in the
        emulator** (verified live): the functions emulator passes a **synthetic `rawRequest` with headers
        only** — no `ip`, no `socket`, no XFF — so there is genuinely no origin to record locally. The
        render path was proven live by seeding an entry with an IP. **The real value can only be
        confirmed after deploy.**
      - **Pre-existing bug found + fixed while building:** `isValidIp` rejected **IPv4-mapped IPv6**
        (`::ffff:x.x.x.x`, what a dual-stack Node/Express server puts in `req.ip`), so `clientIp` fell
        through to `"unknown"` and **every such caller shared ONE rate-limit bucket**. Fixed, plus a new
        `normalizeIp` folding the mapped form to its IPv4 so one client is one bucket whichever form the
        platform reports. Regression-tested.
      - **Config diff** (new pure `functions/config-diff.js`, unit-tested): `saveConfig` now logs
        `flags.maintenance: false → true`-style changes instead of "updated app config". Secrets never
        leak — a `keep()`-guarded field records only `(changed)`, asserted for **every** entry in
        `SECRET_PATHS`. Walks the keys of the **written** doc only (`{merge:true}` means an omitted key is
        kept, so walking the union would log phantom removals). `DETAILS_MAX` = **500** = the
        `AuditEntry.details.maxLength` the API contract declares — a mismatch found and closed during
        the sweep.
      - **Audit tab**: search (actor/target/details/IP) · action filter listing only the actions actually
        present · 50/page pager · **Load more** deepening the fetch to `listAudit`'s 500 clamp.
      - **CSV export** on the Audit **and** Users tabs — exactly the filtered rows on screen, with a
        disclosure that a downloaded copy leaves the 365-day retention + erasure controls. New pure
        `src/utils/export-admin-csv.js`; CSV escaping extracted to a shared `src/utils/csv.js` (the user
        export now imports it, so there is one implementation).
      Files: `functions/net-utils.js` · new `functions/config-diff.js` · `functions/index.js` ·
      `src/hooks/useAdminDashboard.js` · `src/components/admin-dashboard.jsx` ·
      `src/styles/admin-settings.css` (`adm-count-row`/`adm-select`) · new `src/utils/csv.js` +
      `src/utils/export-admin-csv.js` · `src/CryptoIdea.jsx` (uses the shared BOM) · `openapi.json`
      (`AuditEntry.ip` + a `details` description) · `CLAUDE.md` · `API-SECURITY.md`.
      Verified: **unit suite green · build clean (name-guard) · admin CSS out of the user bundle ·
      browser-checked live as owner** (real tier-change + config-save entries; the diff rendered with
      `coingecko: (changed)` / `paypal.secret: (changed)` and truncation, the action filter and IP
      search each narrowed to 1 of 6, both Export buttons enable/disable correctly, 0 console errors).
      **Adversarial review (4 dimensions) folded in — 8 fixes, all with regression tests:**
      1. 🔴 **CSV injection (CWE-1236)** — a user naming themselves `=HYPERLINK("http://evil","x")`
         would execute a formula inside the admin's spreadsheet. `csv.esc` now prefixes a
         `= + - @ TAB CR` lead with `'`, **exempting plain numbers** so `-12.5` stays numeric. Fixes
         the **user portfolio export too** (shared escaper).
      2. 🔴 **Privilege leak the diff itself created** — `listAudit` is `assertAdmin`, but Settings is
         owner-only + step-up re-auth, so the new diff would have shown plan prices / legal IDs /
         PayPal client id to any **manager**. New pure `auditDetailsFor()` withholds a `saveConfig`
         entry's details from a non-owner (the trail stays, the content doesn't).
      3. **Secret rotations now sort FIRST** in the diff — on a first save the 500-char cap would
         otherwise truncate away exactly the "an API key was set" lines.
      4. **Silent 500 cap** → the tab now says older entries may exist and aren't in the export.
      5. **Stale pager index** — Prev/Next now step from the *clamped* page (a shrunken reload left
         Prev enabled but dead). Same one-line fix applied to the Users pager.
      6. **Failed load no longer also claims "No admin actions logged yet"** (same error+reassurance
         contradiction fixed for the ADMIN-1 webhook card).
      7. **Action filter keeps its selection** when a reload drops that action (was: blank `<select>`).
      8. `isValidIp` **shape-gate tightened** (`:::::`, `1::2::3`, `12345::1` rejected) so colon-junk
         can't be recorded as an origin; blob URL revoked on the next tick, not synchronously.
      ⚠️ **One finding NOT fixed — it cannot be settled locally.** `RL_TRUSTED_HOPS` (how many hops the
      platform appends to X-Forwarded-For) is **per ingress path**, and one constant is applied to both
      `/api/*` (via Hosting) and callables (direct on `cloudfunctions.net`). If the callable chain is
      shorter than the configured count, the recorded IP is the caller-supplied token — **forgeable**.
      The emulator sends no XFF at all, so this needs a prod log. **`audit.ip` is therefore advisory,
      not evidence, until go-live item 26** (sharpened to cover both paths). Not an authorization
      fail-open — nothing is authorized on the IP.
      **Accepted with reason (not fixed):** `diffConfig` logs nothing for an object→scalar change —
      `saveConfig` builds a fixed shape, so that transition cannot occur; fixing it would add branching
      for an unreachable case.
- [x] **ADMIN-4 · Growth metrics** (🟡 med · **✅ BUILT 2026-07-24**) — a daily scheduled snapshot
      (counts + per-tier revenue, reusing `getStats` math) → Overview renders **MRR/subs/signup trend +
      churn**. GA4/Plausible already cover engagement; this fills the revenue/churn gap they can't see.
      **Founder decisions (2026-07-24):** churn = **count drop + pending cancels**; snapshots kept
      **forever** (aggregate-only, no PII, so no erasure path); Overview shows **sparklines + deltas**
      (hand-rolled inline SVG — a charting dependency for three 120×28 lines fails KISS); an
      **owner-only "Capture now"** button for a missed run (and the only way to exercise it under the
      emulator, which never fires pubsub on a cron).
      **Spec correction:** the backlog said `stats/daily/{date}`, which is a 3-segment path = a
      *collection*, not a document. Shipped as **`statsDaily/{YYYY-MM-DD}`** — the date IS the doc id,
      so ids sort lexicographically in true chronological order (no index, no sort field).
      **What shipped:**
      - New pure `functions/stats-daily.js` (`snapshotId`/`buildSnapshot`) + pure `src/utils/growth.js`
        (`entryDaysAgo`/`deltaOver`/`netChurn`/`sparkPath`/`historyDays`). Split deliberately: the SERVER
        stores raw readings, the CLIENT derives every presented figure — so history stays a record of
        what was true, not of what we wanted to show.
      - `getStats`'s body extracted to a shared **`gatherStats()`**, used by both the live Overview and
        the snapshot. One implementation, because the series is permanent and drift would be baked in.
        It also now counts `canceledSubs`/`pastDueSubs` via the ADMIN-1 `billingStatusOf` derivation
        (no new storage, no extra read).
      - Nightly **`captureDailyStats`** (fails LOUDLY per H3 — a skipped run loses a day that cannot be
        reconstructed) + **`listDailyStats`** (`assertAdmin`, clamp 1–400/default 90, returns
        oldest-first) + **`captureStatsSnapshot`** (`assertOwner`, audited, idempotent per UTC day —
        `set()` replaces, so a re-run corrects the day instead of appending).
      - Signups counted from the **Auth record's `creationTime`**, not `users/{uid}.joined` — see the
        security fix below.
      **🔴 Pre-existing security gap found and fixed:** `users/{uid}.joined` — the signup date shown in
      the admin Users list and the users CSV — was in the create allowlist but its **value was never
      validated** (`validUserData` only checks `name`), and it is immutable after create. So a
      registering client had a one-shot chance to claim **any** signup date, permanently. Now pinned to
      `request.time` when present (exactly what `registerUser`'s `serverTimestamp()` resolves to).
      Checked only when present, so an unrelated future create path can't fail on a field it doesn't
      set — an omitted `joined` renders blank (honest-unknown) rather than forged.
      **🟡 Test-guard gap found and fixed:** `admin-gate-coverage.test.js` promises that "adding a new
      admin callable without a gate fails the suite instead of shipping", but its MATRIX was
      hand-maintained — ADMIN-1's `listWebhookEvents` was correctly gated yet never listed. Added a
      **completeness check**: every callable must appear in MATRIX (gated) or `UNGATED_BY_DESIGN`
      (justified), and the gated set must equal MATRIX exactly, so drift fails in either direction.
      **Honesty rules encoded (the point of the card):** every helper returns **null**, not 0, when the
      history is too short — so "collecting" and "0% churn" can never look alike; the churn figure is
      labelled **net** because a month that lost 3 and won 3 reads as 0% and gross churn is
      unrecoverable from counts alone; deltas match on **date not array index**, so a missed run can't
      silently make "30d" mean 34, and each delta's tooltip names its real baseline date; the foot
      reports "N snapshots — a scheduled run was missed" when the count and the span disagree; a failed
      load shows the error and **suppresses** the "no snapshots yet" reassurance.
      Files: new `functions/stats-daily.js` · `functions/index.js` · `firestore.rules` (server-only
      `statsDaily` + the `joined` pin) · new `src/utils/growth.js` · `src/api/admin.js` ·
      `src/hooks/useAdminDashboard.js` · `src/components/admin-dashboard.jsx` (`Spark`/`Delta` +
      the Growth card) · `src/styles/admin-settings.css` (`adm-growth*`/`adm-spark`) · `openapi.json`
      (35 paths) · new `tests/unit/{stats-daily,growth}.test.js` + `admin-dashboard.test.jsx` +
      `admin-gate-coverage.test.js` + `tests/firestore-rules.test.js`.
      **Verified:** 693/693 unit (65 files, +51 tests) · **40/40 rules** (+2) · build clean (name-guard) · growth code
      **and** CSS confirmed out of the user bundle · **browser-checked live as owner** (empty state →
      "Capture now" wrote a real snapshot: $9 MRR / 1 paid / 6 users / 6 signups, everything else
      "collecting"; then 35 seeded backdated days rendered 3 sparklines with tooltips proving the
      baselines are exactly 7 and 30 days back, churn `80.0% — 4 lost from 5`; deleting 3 days produced
      "36 days of history (33 snapshots — a scheduled run was missed)"; 3 labelled audit entries; 0
      console errors) · **server gates probed with real ID tokens**: manager→`captureStatsSnapshot`
      **403 "Owners only"**, plain user→`listDailyStats` **403 "Admins only"**, owner→200, manager→
      `listDailyStats` 200 (intended — `getStats` already returns revenue to any admin, so restricting
      the trend would be theatre).
- [x] **ADMIN-5 · Team-scale & support** (🟡 med / ⚪ low · **✅ BUILT 2026-07-25** — founder chose
      "everything now", KISS concern noted) — *(RBAC owner/manager roles were split out to **ADMIN-SEC**)*
      **Six pieces:**
      1. **Impersonation = READ-ONLY "view as"** (founder pick over token-based): the owner-only
         `viewUserAsAdmin({uid, reason})` returns a bounded snapshot (profile/billing + portfolios →
         coins → **journal theses** → capped transactions + learn counts) into a read-only viewer with a
         prominent **READ-ONLY** banner. It **never mints a token** and can't act as the user — no
         purchase/mutation/lockout surface. A **reason is REQUIRED** and stored in the audit entry (the
         founder chose accountability over time-boxing — there is no session to expire on a read). Reads
         are capped (20 portfolios / 150 coins / 50 tx-per-coin) and the response flags truncation.
      2. **Announcement banner** (`config/app.announcement = {text, level, active}`): app-only,
         dismissible (localStorage keyed to the message text → re-shows when the wording changes), three
         levels (info/warning/critical). `/api/config` publishes `{text, level}` **only when active** (a
         draft is never broadcast). Editor is a new Settings drill-in row; `<AnnouncementBanner/>` renders
         at the top of the logged-in app.
      3. **Bulk user actions** — non-destructive only (bulk set-tier + suspend/un-suspend); each selected
         uid runs through the SAME individually-gated + individually-audited callable in a client loop
         (no new bulk endpoint, no new surface), and an owner target is refused per-row.
      4. **Per-field tier filter + saved views** — a tier chip row alongside the ADMIN-1 billing filter;
         saved views store the `{search, tier, billing}` combo **per-operator in localStorage** (no new
         Firestore collection).
      5. **Private admin notes** — server-only `adminNotes/{uid}` (rules deny every client, incl. the
         subject), read by any admin / written by a manager+owner via `getUserNote`/`saveUserNote`; the
         note **content never enters the audit log** (only that it changed).
      6. **Before/after diff in audit** — extended the ADMIN-3 config diff to every user mutation
         (setUserTier/setPremiumLimits/suspend/restore/setManagerRole/adminTrashUser now log
         `field: old→new`, e.g. `tier: free→premium`), via the pure `functions/audit-diff.js`.
      **Gate matrix:** view-as = **`assertOwner`** (reads private data); getUserNote = `assertAdmin`;
      saveUserNote = `assertManager`. All three added to `admin-gate-coverage.test.js` MATRIX + the
      ACTION_LABELS/audit-labels coverage.
      Files: new `functions/announcement.js` · new `functions/audit-diff.js` · `functions/index.js`
      (3 callables + diffs + config wiring) · `firestore.rules` (`adminNotes` deny) · `src/api/admin.js` ·
      `src/hooks/useAdminDashboard.js` · `src/components/admin-dashboard.jsx` · `src/styles/admin-settings.css`
      (`adm-viewas*`/`adm-bulk*`/`adm-ann*`/`adm-usernote*`) · new `src/utils/admin-views.js` ·
      new `src/utils/announcement.js` · new `src/components/AnnouncementBanner.jsx` · `src/CryptoIdea.jsx` ·
      `src/styles/app.css` (`ann-banner` + dark) · `openapi.json` (39 paths) · new
      `tests/unit/{announcement,audit-diff,admin-views,announcement-dismiss,AnnouncementBanner}.test.js(x)`
      + `admin-dashboard.test.jsx` (+7) + `admin-gate-coverage.test.js` + `tests/firestore-rules.test.js`
      + `tests/functions-callable.test.js`.
      **Verified:** 839/839 unit (75 files, +43) · **43/43 rules** (+1 adminNotes deny) · **21/21
      integration** (+2 — the real view-as + notes callable bodies) · build clean (name-guard) · the
      admin-only `adm-*`/view-as/notes code confirmed **out of the user bundle** (only the user-facing
      `ann-banner` + `AnnouncementBanner` ship in it). **Browser-checked live as owner:** the tier
      filter + saved views + multi-select bulk bar render; **view-as opened a real read-only snapshot**
      of a user's two portfolios/10 coins (reason required); a private note saved; and end-to-end the
      **announcement banner** rendered at the top of the logged-in user app off `/api/config` and
      **dismissed** cleanly — 0 console errors on either app.
- [x] **ADMIN-D · Settings redesign — paper design system** (🎨 design-only; founder 2026-07-18 ·
      **✅ BUILT 2026-07-23** — with **ADMIN-D3** folded in) —
      reskin the admin **Settings** tab to match the app's user-settings (**Account**) screen: adopt
      the `.ci-app` paper design + the **drill-in list** pattern (home with the two global toggles
      inline + a category row per detail card), `saveConfig` logic untouched. Nothing dropped; adds an
      optional **Configuration** summary card — **confirmed in**, with a live amber/green Email dot.
      Mockups: [`admin-settings/index.html`](../mockups/admin-settings/index.html) (4 screens,
      light+dark) + the interactive [`admin-panel/index.html`](../mockups/admin-panel/index.html)
      (same drill-in, all 5 tabs). Spec: [`ADMIN-PANEL-AUDIT.md`](../decisions/ADMIN-PANEL-AUDIT.md)
      § Settings redesign. **Keep maintenance in its warning colour** (the mockup renders it green).
      **Sequence after ADMIN-SEC** — Settings gains the owner-only unlock gate, so building it first
      means drawing the screen twice. Local-first / emulator-verifiable; run the §PROCESS
      interview+sweep + a dark-mode pass when built.
      **✅ BUILT 2026-07-23 (this session):** Settings tab reskinned to the `.ci-app` paper drill-in —
      home = a **Configuration** status card + the Maintenance/Signups **switches inline** + a category
      **row per detail card** (API keys · Email · Plans · AI · Analytics & legal · **Admin access**); each
      row → a paper detail card with the app's `field-input`/`acct-btn`/`switch`. `saveConfig` /
      `saveControls` and every handler are unchanged (design-only). Files: `src/components/admin-dashboard.jsx`
      (new `settingsView` local state + `NavRow`/`CtrlRow`/`Switch`/`DHead` helpers, mirrors `Account.jsx`;
      Save buttons moved into the detail views; AI detail gained a "Save AI settings" button) ·
      `admin.html` (Fraunces/Hanken font links) · `src/admin-main.jsx` (imports `app.css` +
      `src/styles/admin-settings.css`) · new **`src/styles/admin-settings.css`** (the few Settings-only
      classes — status rows, plans grid, cookie ctrl-line, foot-note, maintenance-warn switch — imported
      ONLY by the admin bundle, verified out of the user bundle). **Maintenance stays its warning colour**
      (`.switch.warn` → amber). **Configuration card = IN** (status dots derived from saved config).
      **ADMIN-D3 folded in:** the owner-only Admin access grant/revoke flow is now the last Settings row
      (its own detail view) and the separate "Admin access" top-level tab is **gone** (owner tabs 6→5).
      **Dark mode is N/A** — the admin app never sets `html[data-theme]`, so Settings renders **light
      paper** (consistent with the still-grey rest of the panel until ADMIN-D2). Verified: **552/552 unit
      · build clean (name-guard) · browser-checked as owner** (paper renders, drill-in nav works, Admin
      access search wired, 0 console errors). Reskin covers the Settings tab **only**; the header, tab bar
      and other four tabs stay grey until **ADMIN-D2**.
- [x] **ADMIN-D2 · Paper reskin — the other four tabs** (🎨 design-only · 🟡 med · founder 2026-07-18 ·
      **✅ BUILT 2026-07-24**)
      — extend the ADMIN-D paper design to **Overview · Users · Trash · Audit** so the panel isn't
      half-paper/half-grey. Visual spec = the interactive
      [`docs/mockups/admin-panel/index.html`](../mockups/admin-panel/index.html) (tabs switch, Overview
      maths compute live). **It is a reskin: 35 of its capabilities already ship** — the only additions
      are **one shared toast** replacing the two inconsistent inline status fields (`savedMsg` /
      `actionMsg`) and **pre-empting a blocked delete** with a toast instead of opening the confirm.
      **Three areas are SUPERSEDED by ADMIN-SEC and must NOT be built as drawn** (the Users-tab ADMIN
      ROLE card, the flat single-admin model, ungated Settings/API-keys/Plans) — see
      [`ADMIN-PANEL-AUDIT.md`](../decisions/ADMIN-PANEL-AUDIT.md) § Full-panel mockup. Carry the build
      constraints from that section: strip the prototype artefacts (uncontrolled Settings inputs,
      `showSampleData`, unbound Refresh, hard-coded audit actor), port the fixed 1140px grids to the
      app's `auto-fit` responsive standard (§R), add the dark pass, and fix the a11y gaps (unlabelled
      tier bar, non-keyboard user rows, non-heading card titles). Leave room for ADMIN-1's billing
      block and ADMIN-3's audit controls so those screens aren't redesigned twice. **Sequence after
      ADMIN-SEC + ADMIN-D.** Local-first / emulator-verifiable; runs the §PROCESS interview+sweep.
      **✅ BUILT 2026-07-24 (this session):** the whole panel now renders inside ONE `.ci-app` wrapper —
      **Overview · Users · Trash · Audit** plus the header, tab bar, role notice, step-up unlock modal
      and footer are on the paper design (Overview = paper stat tiles + revenue/usage/tier cards +
      plan-limits grid; Users = paper list with the search/filter/pager, and a per-user **drill-in**
      via `DHead` back-chevron; Trash + Audit = paper `adm-list` rows). Added **one shared toast**
      (`adm-toast`, ok/err/warn/info) that mirrors the hook's `savedMsg`+`actionMsg` — the two inline
      status fields are gone — and **pre-empting an owner delete** with a warn toast instead of opening
      the dead-end typed-DELETE confirm (server gate unchanged). **a11y fixes:** user rows are now
      `<button>`s (keyboard-reachable), card titles use headings/`card-title`, the tier bar keeps a
      text legend (not colour-only), trash urgency is colour **+ a word**. **Responsive:** ported to the
      app's `auto-fit` grids (`grid-auto` / `adm-stats` / `adm-plans`) — desktop-first, collapses narrow.
      Files: `src/components/admin-dashboard.jsx` (rewritten presentation-only — every hook handler
      unchanged; the old `c` inline-style object + `Bdg` are gone, replaced by paper classes + a
      `TierPill`) · new **`adm-*` classes appended to `src/styles/admin-settings.css`** (admin-only,
      **verified out of the user bundle** — `dist/app.html` links only `app.css`; `.adm-*` appear only
      in the admin CSS chunk). **Dark mode is N/A** (admin renders light paper only — the admin app never
      sets `html[data-theme]`; the "add the dark pass" build-constraint line is moot here, noted so it
      isn't re-litigated). The three ADMIN-SEC-superseded areas were already handled in ADMIN-SEC/ADMIN-D
      and are **not** in the panel. Verified: **552/552 unit · build clean (name-guard) · admin CSS out
      of the user bundle · browser-checked as owner** (all four tabs paper, drill-in nav, shared toast
      ok+warn kinds, owner-delete pre-empt fires + confirm stays closed, 0 console errors). The whole
      admin panel is now **fully paper** — no grey left.
- [x] **ADMIN-D3 · Fold "Admin access" into Settings** (🎨 IA / design-only · founder 2026-07-23 ·
      **✅ BUILT 2026-07-23 with ADMIN-D** — Admin access is now the last Settings drill-in row; the
      separate top-level tab is gone (owner tabs 6→5); the grant flow + `setManagerRole` gate unchanged) —
      move the owner-only **Admin access** tab (grant/revoke a manager) *into* the **Settings** tab and
      drop the separate top-level tab. **No security change:** both areas are already owner-only AND
      both sit behind the same step-up re-auth gate — `setManagerRole`, `saveConfig` and `getAdminConfig`
      all use `assertFreshOwner`, so the callable walls + `firestore.rules` are untouched; this is purely
      UI / information-architecture. **Best built as part of ADMIN-D** — in the Settings drill-in list,
      "Admin access · grant a manager" becomes one more category row / detail card alongside App Controls
      / Plans & Pricing / Analytics & Legal / AI, which is exactly the drill-in pattern; if done
      standalone before ADMIN-D it is a small in-place merge. Consistency sweep when built:
      `src/components/admin-dashboard.jsx` — remove `"access"` from the tabs array (~L109) and the
      `tb === "access" ? "Admin access"` label special-case (~L112); move the whole
      `{tab === "access" && isOwner && …}` block (~L624) into the `{tab === "settings"}` block (~L464) as
      a card/section; reword the manager & no-role notice ("Settings, admin access and permanent deletion
      are owner-only", ~L124–125) now that Admin access lives *inside* Settings. `useAdminDashboard` grant
      state (`grantEmail`/`grantEmail2`/`grantFound`/`grantMsg`/`grantWarn`/`setManager`/`grantLookup`) is
      unchanged — it just renders under `settings`. Update tests (`tests/unit/admin-dashboard.test.jsx` —
      anything selecting the Admin-access tab or asserting the tab list) + every doc that names the
      "Admin access tab" (CLAUDE.md § Admin & privacy, [`ADMIN-PANEL-AUDIT.md`](../decisions/ADMIN-PANEL-AUDIT.md),
      the ADMIN-D / ADMIN-D2 mockups → Settings gains an Admin-access row, owner tab count drops 5→4).
      Interpretation to confirm at the build interview: "admin access" = the manager grant/revoke tab
      (the reading here); keep the manager-grant flow as one Settings detail card (recommended). Local-
      first / emulator-verifiable; runs the §PROCESS interview+sweep (Admin map row) when scheduled.
- **Deliberately deferred (⚪ low / out-of-scope):** content-moderation queue (theses are private →
      revisit only if shareable), in-panel refund/cancel actions (use PayPal), IP allowlisting, formal
      break-glass (min-2-admins covers it), cohort/NRR/LTV (external tools), status page, i18n,
      staged/percentage rollout. KYC/AML/custody = N/A (non-custodial).

## API. API spec + security review — 2026-07-08 founder interview  (✅ BUILT 2026-07-08)

Canonical: [`API-SECURITY.md`](../security/API-SECURITY.md) (surface map, key model, findings, rotation runbook)
+ [`openapi.json`](../../openapi.json) (OpenAPI 3.0.3, 32 operations). A local multi-agent adversarial
gap-hunt (44 agents, every finding double-verified) found **11 confirmed gaps → 8 fixes** (7 refuted).
Commits `76a3711` (spec+doc) · `5bf9f1a` (fixes) · `d82786f` (secrets hygiene).

- [x] **API-1 OpenAPI spec** — `openapi.json` from the codebase: public REST `/api/*`, user+billing
      callables, all 14 admin callables, the PayPal webhook; validated (refs resolve, unique opIds,
      no GET bodies); secrets modeled as set-flags; emulator + prod-placeholder servers.
- [x] **API-2 Counter-forge (HIGH)** — `firestore.rules` `counterNoForge` forbids any client counter
      DECREASE; client deletes no longer decrement (fail-safe-high, reconciled after delete); rules
      test proves the decrement is denied.
- [x] **API-3 Rate-limiter XFF spoof (HIGH)** — pure `functions/net-utils.js` `clientIp` right-anchored
      + IP-validated (unit-tested); overflow wipe prunes only expired buckets.
- [x] **API-4 Denial-of-wallet gates** — `/api/history` + `/api/prices` gate on shared-universe
      membership before any CoinGecko fetch; fold-back never creates off-list entries; 1h negative cache.
- [x] **API-5 Read-amplification budgets** — `exportMyData` cooldown + `reconcileMyCounters` daily budget
      (wires the built-but-unused `guards.consumeDailyBudget`).
- [x] **API-6 Webhook idempotency ordering** — roll back the event marker on a processing failure so a
      retry reprocesses (was permanently dropping a failed paid event).
- [x] **API-7 Secrets hygiene** — `.gitignore` `.env*` + `*.p12`/`*.p8`/`credentials*.json`/`.npmrc`;
      pre-commit content scan adds the app's real key formats (`sk-ant-`/`CG-`/PayPal). Bundle + full
      git history scanned clean.
- **Refuted (verified NOT exploitable, not fixed):** SSRF non-dotted IP (Node URL normalises),
  `getAdminConfig` webhookId echo (admin-gated), config cache stale-secret window, subscribe abuse
  (email unconfigured), tierBeforeFailure resurrection (signature-gated), full-collection scans
  (scale-only). See API-SECURITY.md §4.

**Log — 42Crunch audit remediation (2026-07-18):** ran the 42Crunch `42c-ast` static audit (v3.57.0,
Token/freemium mode) on `openapi.json`. Baseline **9.24/100** (Security 1.88 · Data 7.36). Applied the
"honest blocking fixes" (target 70, block HIGH+): (1) dropped the `http://localhost` emulator entry from
`servers` so the documented contract is HTTPS-only — killed the CRITICAL "bearer-over-cleartext" (24 ops)
+ the MEDIUM global-http-clear; (2) added `maxItems` to the 5 response arrays (bounds match real caps —
users 5000, audit 500, portfolios 100, coins 10000, history 20000); (3) documented the PayPal webhook's
signature auth as a `PayPalWebhookSignature` apiKey scheme (reconciled the "unauthenticated" wording in
`openapi.json` info + `API-SECURITY.md` §D to match). Re-audit **32.56/100** (Security **24.61**, +22.7).
- **Accepted-by-design:** 7 HIGH `security:[]` findings on the genuinely public `/api/*` endpoints —
  flipping them to bearer would misrepresent the API; left as-is.
- **Data-validation push → 65.06/100 (2026-07-18, commit `8d118c0` formatting-normalize + the constraints
  commit):** on founder "push toward 70", added server-GROUNDED honest constraints — a 4-agent analysis
  workflow (each agent read `functions/index.js` + `firestore.rules`) fed one reviewable transform, then a
  3-agent adversarial honesty pass returned **0 issues**. Added: `default` response on all 32 ops + honest
  `429`/`401` only where the server truly returns them; generous `maxLength` on every string; honest
  `minimum`/`maximum` on every number; `pattern` ONLY where every real value provably matches (id-family,
  status, action, ISO `exportedAt`); `additionalProperties:false` on every fixed response schema AND request
  wrapper. Score **9.24 → 32.56 → 48.35** (responses-only) **→ 65.06** (also closing request bodies).
  Security **24.61/30**, Data **40.45/70**.
- **⚠️ "70 is NOT honestly reachable" (the 2026-07-18 conclusion above) was WRONG — SUPERSEDED by the
  2026-08-01 re-audit → 92.95/100.** On the newer `42c-ast` (v3.58.4) Data climbed **40.45 → 67.37/70** and
  the total to **92.95** (Security **25.58/30**) with constraints that reject no REAL value: free text gets a
  control-char-exclusion `pattern` (`^[^<ctrl>]*$` — 42Crunch ACCEPTS this; only a bare `^\S*$` is flagged
  "too loose"), structured strings get real patterns (email / url / token / id / ISO-date), every response
  array gets a `maxItems` matched to the REAL code cap (viewUserAsAdmin 20/150/50, listDailyStats 400), and
  every closed-shape object gets `additionalProperties:false`. The heaviest gap was the ADMIN-5
  `UserSnapshot`, which had shipped almost unenriched. Commits `bd57ed0`, `bc7fd47`, `ba8377b`.
- **⚠️ OAS-3.1-nullable trap (the newer binary is STRICTER):** v3.58.4 first rejected the spec as
  `structureInvalid` (score 0) because nullable was expressed the 3.1 way in a `"3.0.3"` doc —
  `"type":["integer","null"]` (6 fields, `bd57ed0`) and a `oneOf` with a `{"type":"null"}` branch
  (`bc7fd47`). The 3.0 form is `"type":"integer","nullable":true`. The audit itself is the authoritative
  structural check — a green local JSON parse is not.
- **Still accepted-by-design (won't-fix, per the `ba8377b` commit body):** the 7 public `security:[]`
  `/api/*` endpoints (unauthenticated on purpose — cached market data + landing email capture), the
  webhook's honest `apiKey`-in-header scheme, and the raw passthrough objects left OPEN (`PricesResponse`
  map, `ExportMyData` `profile`/`portfolios`, the `UserSnapshot` raw Firestore-doc snapshot,
  `PayPalEvent`/`.resource`, `CallableError.error.details`). The **SQG** ("default" gate) therefore still
  reports FAILED — the auth-severity threshold, not a score problem (92.95 ≫ 70): the public endpoints
  can't pass it without misrepresenting the contract.
- **✅ Follow-up BUILT (2026-08-01) — strict request input:** every callable now rejects unknown **top-level
  `data` keys** via `assertNoUnknownKeys(data, [...])` (pure, unit-tested `guards.unknownKeys`), run right
  after the auth/role gate — so the request-body `additionalProperties:false` contract is enforced, not just
  documented (`invalid-argument`; the message never echoes the offending key). Allow-lists = each handler's
  real `data.*` reads, cross-checked against the client sends; no-arg callables reject any key. The PayPal
  webhook (arbitrary signed payload) and **nested** config shapes (saveConfig's merge/`keep()`) are out of
  scope by design. Unit-tested + a callable integration test (emulator tier needs JDK 21). `guards.js` +
  `functions/index.js` (31 of 32 callables; `setAdminClaim` already throws).
- Next 42Crunch step available: `42crunch-scan` (live conformance / BOLA / BFLA) against the running stack.

## SKILL. `tdd-testing` audit — top-up + research conformance  (✅ APPLIED 2026-07-20)

Two phases, both landed. **(1) Content audit 2026-07-18:** multi-agent audit, 19 verified gaps /
26 refuted — healthy in principle, stale in specifics. **(2) Research conformance 2026-07-20:** the
"Build Agent Skills" research doc compared against skill + plan (13 confirmed gaps / 1 refuted + 3
completeness-critic finds), reconciled in an 11-decision founder interview, then **applied the same
session**. Full record incl. what changed vs the written plan:
[`TDD-SKILL-UPDATE.md`](../planning/TDD-SKILL-UPDATE.md) **§10**.

**Applied to `tdd-testing` (185→254 lines):** four tiers (+**Callables** — the
[`ERRORS.md`](../testing/ERRORS.md) C6 class) + the mocks-never-run-the-server-body gotcha ·
deny-checklist rules bullet · claim-truthiness near-misses · counter-decrease deny · error
classification · idempotency redelivery+rollback tests · injected-`db` fake · source-matrix
**merged** into the parallel-session bullet (not duplicated) · retrying-assertion replaces the
fixed-sleep advice · matchMedia/CSS-selector bullet split · flat+pruned maintenance note **with the
emulator-mechanics routing clause** · **directive description rewrite** (ALWAYS-invoke +
BEFORE-marking-done + Do-NOT clause, 1002/1024 chars) · all new content **repo-filename-free**
(citation rule: file+symbol in repo docs, pattern-only in reusable skills).
**Fleet:** `firebase-saas-starter` got the fleet's first `references/` split (emulator run mechanics
→ `references/emulator-testing.md`, 585→566 lines, two duplicate gotchas retired) + emulator-test
triggers in its description; `api-security` got its **missing frontmatter** (it had none — it could
never auto-trigger); `~/.claude/skills` is now a **git repo** (baseline `6d6ec99`, apply `39044bc`);
`.githooks/pre-push` now runs `test:unit` (measured 168s — founder chose push over per-commit).

**Update 2026-07-21 — skills-playbook monorepo session (✅ APPLIED):** the whole fleet was
reorganized per the founder's "skills playbook" research + a 7-decision interview. `~/.claude/skills`
stays THE repo in place (the playbook's symlink migration is a Windows trap — MSYS `ln -s` silently
copies) and is now the **private GitHub monorepo `nrenre62/claude-skills`** (catalog README, MIT
LICENSE © nrenre62, CONTRIBUTING, .gitignore; `license`+`metadata{author,version:"1.0"}` frontmatter
on all 12; CHANGELOG deferred to the first tagged release). **Full readability pass on all 12 skills**
(12 editors + adversarial verifiers + a fleet-consistency pass): every description is now directive
(third-person verb + ALWAYS-invoke + quoted triggers + Do-NOT routing, all ≤1024 chars — this
RETIRES the queued fleet-description pass), every body ≤500 lines (`firebase-saas-starter` 639→~495
via three new `references/` splits: frontend-refactor, design-integration, admin-roles-gdpr), and all
repo-specific citations scrubbed to pattern-only. Side fixes: stale `.claude/commands` project dupes
deleted (global canonical), `/XD .git` added to the WD backup change-detector, the bundled backup
script re-synced with the live one, orphaned worktree purged.

**Still queued:**
- **Eval pass (1 session):** skill-creator evals for `tdd-testing` — 3 scenarios (loop compliance ·
  gotcha retrieval · fourth-tier placement, which doubles as live H1 verification) + the description
  optimizer (held-out scoring decides any further description changes). Run after real use.
- **Pruning pass (quality/token-only):** `tdd-testing` (~270 lines after the readability pass) is
  still above the ~5k-token soft guidance. Method = plan §7 (keep-biased); **no line target** — the
  ~200 budget is superseded by the official 500-line ceiling.
- **You-run check:** `/doctor` + `/context` in a fresh session to verify the skill LISTING isn't
  overflowing (12 personal + ~33 plugin skills compete; overflow silently drops descriptions).
- **At §OSS time:** run the playbook's gated go-public checklist on `claude-skills` (see §OSS).

**Also queued — one-time coverage sweep (deliberately NOT a standing DoD line):** find exported logic
with no test, matching on the **export name**, not the filename (tests are flat and grouped by topic —
`research-adapters.test.js` covers `priceAdapter` + `sparkline` — so a filename diff false-positives
~30%). Known misses: `nextBackoff` (`src/features/research/utils/backoff.js`); `riskColor.js`
(`riskSpectrum`/`levelColor`/`levelTint`); hooks `useAsk`, `usePulse`, `useSharePulse`, `useHoldings`,
`usePrices`, `useRelativeTime`. Test or consciously waive each. Don't add a coverage tool for this.

## OSS. Open-source skills to build the GitHub account  (📋 PLAN — pick & scrub in a session)

The product code stays **private** (this repo). The skills now live in ONE private monorepo —
**github.com/nrenre62/claude-skills** (= `~/.claude/skills` in place; MIT, catalog README, all 12
readability-passed and citation-scrubbed 2026-07-21) — so going public is a **flip, not a build**:
run the playbook's gated go-public checklist in a focused session — `gitleaks git .` over full
history · generalize `auto-backup-loop`'s personal defaults (D:\ paths, task name — the only skill
carrying machine-specific content) · decide fresh-start history vs keep · re-scan · flip visibility ·
add topics (`claude`, `claude-code`, `agent-skills`) · tag `v0.1.0` · pin on the profile. If a
subset-only release is preferred instead, the least product-revealing candidates remain:
`secure-by-design`, `api-security`, `tdd-testing`, `responsive-app`, `drawing-diagram`. Do NOT
publish product docs (PRODUCT-DECISIONS, DESIGN-PASS, etc.).

## DOCS. Reorganize root .md files into categorized docs/ subfolders  (✅ BUILT 2026-07-17)

**Done 2026-07-17** — this doc now lives at `docs/product/NEXT-STEPS.md`. All ~25 root `.md` files
moved into `docs/{decisions,design,security,testing,product}/` via `git mv` (history preserved);
only `README.md` + `CLAUDE.md` remain in root. 333 relative cross-links rewritten across 25 files
(a script mapped every old→new path; anchors/URLs untouched) and verified to resolve. The two
diverged duplicates were resolved: the fuller `docs/` **TEST-REPORT** was kept and the stale root
copy deleted; **SECURITY-AUDIT** turned out to be *two distinct audits* (root = 2026-06-16
`secure-by-design`; docs = 2026-06-27 `vibe-security`), so the earlier one was **preserved** as
`docs/security/SECURITY-AUDIT-2026-06-16.md` rather than deleted. One pre-existing broken link
(`docs/planning/PRICING-RESEARCH.md`, referenced by PRICING.md — the target never existed) was
rebased but left flagged. Original plan below.

**Decided** (founder interview 2026-07-17): move the ~25 root-level `.md` files into
**categorized subfolders** under `docs/`. Keep only `README.md` + `CLAUDE.md` in root (tool/GitHub
convention). Proposed buckets: `docs/decisions/` (PRODUCT-DECISIONS, BACKEND-ADMIN-DECISIONS,
PRICING, BILLING, CACHE-POLICY), `docs/design/` (DESIGN-PASS, DESIGN-REVAMP, RESPONSIVE-DESIGN),
`docs/security/` (API-SECURITY, SECURITY-AUDIT, ISOLATION), `docs/testing/` (TEST-REPORT, ERRORS,
REVIEW-FINDINGS, ARCHITECTURE-AUDIT), `docs/product/` (USER-BENEFITS, USER-CREATION, USER-SETTINGS,
USER-SETTINGS-README, CALCULATOR, DATA-FLOW, DATA-INTEGRITY, CODEBASE-MAP, AGILE, BACKUP, NEXT-STEPS)
— refine when doing it. Keep the existing `docs/planning/` + `docs/diagrams/`.
**Must-do carefully:** (1) `git mv` to preserve history; (2) **rewrite every relative cross-link**
(docs reference each other AND code paths like `firestore.rules`, `functions/index.js` — these gain
a `../` or lose a `docs/` depending on direction); (3) **resolve the 2 diverged duplicates** —
`SECURITY-AUDIT.md` (root 126L vs `docs/` 315L) and `TEST-REPORT.md` (root 66L vs `docs/` 158L):
keep the fuller `docs/` copies, delete the stale root ones (confirm no unique content first); (4)
verify no broken links after (grep for `](` targets). Do as its own commit so a link break is isolated.

## PROCESS. Interview & consistency SOP  (✅ BUILT 2026-07-17)

Standing operating procedure so **code + rules + README + every MD doc stay in agreement** — one
topic change (pricing, tier limits, settings, admin, API, security…) is reflected *everywhere* it
lives, no silent drift. Canonical: [`docs/interview.md`](../interview.md); bound via a MANDATORY rule
in [`CLAUDE.md`](../../CLAUDE.md) → Conventions (loaded every session). Flow for substantive work:
**plain-chat interview (numbered questions, no boxes, no time limit — founder rule 2026-08-03) →
find gaps across all related files → plan + get a yes → consistency sweep (every
file in the topic's map row) → verify → log here → commit.** Trivial single-file fixes skip it with a
one-line heads-up. On an error: surface it, then ask in plain chat for the fix. The `interview.md`
**topic→files consistency map** is the concrete checklist (Pricing / Tier limits / AI budget /
Billing / User settings / Admin / API / Security / Caching). Keep the map current when files move.

**Log — README ↔ code/docs reconciliation (2026-07-17):** ran a read-only 16-section multi-agent
audit of `README.md` against the code + canonical docs; **19 drift points found, all adversarially
re-verified (0 false positives).** Fixed all 19 in README (README-only — the canonical docs already
agreed): stale Setup Guide (no `firebase.config.js` paste / no `window.storage`), the Database Schema
block rewritten as an exact field-by-field mirror of `firestore.rules` (3-tier `tier`, 7-key
`settings`, `consent`, counters, `journal`/`funnel`, `learn/progress`, server-managed billing/soft-
delete fields), Round 11 "planned"→BUILT (+12–32), responsive track table, ships-list, admin
dashboard path + Audit tab, `NEXT-STEPS.md` root path, `$25 Blaze`→pay-as-you-go, `cache/universe`
~330 KB→~700 KB, Storage-emulator + `--project` notes. Clean on prior-fixed sections (Tier Limits,
Cloud Functions table, CoinGecko constants, links).

## JIRA. Jira-backed bug tracking + regression-test loop  (✅ BUILT 2026-07-21 — CRYP-1)

Bugs are tracked in Jira project **CRYP** (`cryptoidea.atlassian.net`) through the user-level Rovo MCP
connection — **no Jira API token exists in this repo**, and none should be added. Canonical:
[`JIRA-WORKFLOW.md`](../testing/JIRA-WORKFLOW.md); bound from [`CLAUDE.md`](../../CLAUDE.md) → Conventions
and [`AGILE.md`](AGILE.md) → Testing conventions; consistency-map row added to
[`interview.md`](../interview.md). The point of the whole thing: **every fixed bug leaves a permanent
regression test behind**, and the red test is committed *before* the fix so the diff proves the code
changed rather than the test being weakened.

**Shipped:** four project-local commands — `/jira-bug` (file a well-formed ticket), `/jira-fix <KEY>`
(read → branch `fix/CRYP-nn-slug` → **failing test first** → commit red → fix → green → push → comment →
transition), `/jira-test-sync` (run the suite, map results onto tickets, **propose before writing**),
and `/jira-bug-hunt` (2026-07-21, CRYP-2 — autonomous **emulator-only** hunt: suites baseline → 50-user
scale/plan-limit probe (20–100% fill per tier, counter-seeded boundaries) → cross-user isolation probe →
per-tab data-flow & privacy audit → flake-filtered verification → a dated report under
`docs/testing/bug-hunts/`. **Reports only, never fixes**: confirmed findings are proposed as Jira Bugs
and filed after an explicit yes; each fix the user approves then runs per-ticket through `/jira-fix` and
lands in `ERRORS.md` + the consistency-map docs).
Plus `scripts/jira-test-map.js` — a pure vitest-JSON → `CRYP-key → pass/fail` mapper (TDD'd via
`tests/unit/jira-test-map.test.js`), which exists because a full run's artifact is ~190 KB on one line.

**Traceability marker:** the ticket key goes in the **`it()` title** (`it("CRYP-42: …")`), extending the
repo's existing `it("R26: …")` style. Verified collision-free before adoption (no unrelated token used
the `CRYP-` prefix). `describe()` titles and filenames are explicitly rejected as markers — a `-t`
pattern matching a suite runs its siblings, so an unrelated failure would be attributed to the wrong
ticket. Selection needs the trailing colon (`-t "CRYP-42:"`) — `-t` is a substring match.

**Verified live against CRYP-1:** create → labels → read → `getTransitions` → transition all round-trip;
mapper GREEN/RED/INCONCLUSIVE paths each confirmed at the CLI with real artifacts.

**Traps recorded (each cost a design change):** CRYP is *team-managed* so there is **no `priority`
field** (use labels); transition ids are per-project and were undiscoverable until an issue existed —
resolve at runtime, never hardcode; `searchJiraIssuesUsingJql` returns **empty for invalid JQL** instead
of erroring (proven with a control query), so an empty board is not a clean board; a run that executed
**zero tests is INCONCLUSIVE, never a pass** (a port clash exits non-zero having run nothing, and there
is no `npm test` script); the red checkpoint must be **commit-only** because `.githooks/pre-push` runs
the full suite; raw test stdout carries seeded emails + verification links so Jira comments are bounded
to the first failure line; and the documented suite flake (**§FLAKE** below, run log in
[`GO-LIVE-AUDIT.md`](GO-LIVE-AUDIT.md) §3b) means a red must repeat twice before it is reported onto a ticket.

- [ ] **JIRA-1 · Exercise the loop on a real bug.** `/jira-fix` is built and its Jira calls are proven,
      but it hasn't yet driven a genuine bug red→green end-to-end. Next real bug goes through it.
- [ ] **JIRA-2 · Decide whether `In Review` earns its column.** The board has four states; a solo dev
      likely wants three. Leave unused or remove.
- [ ] **JIRA-3 · Run the first `/jira-bug-hunt` end-to-end.** The command is built (CRYP-2) but no hunt
      has produced a report yet — first run proves the probe specs against the live emulator and seeds
      `docs/testing/bug-hunts/`.

## DI. Data integrity & honest errors — 2026-07-07 founder bug + audit  (✅ BUILT 2026-07-07)

Canonical spec + locked decisions D1–D7: [`DATA-INTEGRITY.md`](DATA-INTEGRITY.md) · diagnosis:
[`ERRORS.md`](../testing/ERRORS.md) §A4 · full inventory:
[`docs/planning/data-integrity-findings.json`](../planning/data-integrity-findings.json).
Trigger: the false **"You've reached this portfolio's coin limit"** toast on a 2-coin Starter
account (a >2000-char Buy-Journal thesis denied by `validJournal`, mislabeled as a limit).
A 27-agent adversarial audit confirmed **36 gaps + 5 critic adds** (2 refuted) in the class.
Everything below is local-first (emulator-verifiable now; no Blaze needed).

- [x] **DI-1 Honest errors (verify-then-toast + input caps)** — data-layer failure classification
      (`reason: limit | missing-target | invalid-or-denied`); the limit/upgrade toast ONLY on a
      server-confirmed real limit; strip `limitMsg` from the tx-EDIT site; honest defaults on the
      7 generic sites; client caps mirroring rules bounds (thesis/changeMyMind/funnel ≤2000 +
      live counter on ALL writers incl. both R24 X-save paths; portfolio name ≤50 on create;
      tx amount/price upper bounds; defense clamps for coin name/symbol/thumb);
      `console.error` raw errors everywhere.
- [x] **DI-2 Active-portfolio self-heal** — reconciliation effect (`activePortId` ∉ portfolios →
      first real id); zero-portfolio auto-recreate ("My Portfolio", registration parity);
      `getPortfolios` retry + visible error state (never the silent phantom "default");
      write guards on a dangling id; forced-sign-out resets state + actually clears
      `ci-active-port` (fix the persistence-effect resurrection).
- [x] **DI-3 Counter integrity** — `runTransaction` guards: add returns `already-exists` (no
      journal/addedAt clobber, no counter inflation), deletes return `not-found` without
      decrementing; new `reconcileMyCounters` callable (Admin SDK, own tree) invoked when
      classification detects drift; rules tests pin the behaviors (rules themselves unchanged).
- [x] **DI-4 Keep-data downgrade + grey-lock** — retire `trimToTier` everywhere (nothing deleted,
      locally or server-side); pure lock-derivation util (portfolios beyond cap by order; newest
      coins beyond the coin cap); dimmed + "Over plan limit" tag + tap-explainer Modal
      (Upgrade / OK; deletes always allowed); re-worded downgrade dialogs (`overLimitImpact`);
      **`resolveRecheckout` + `reactivateSubscription` callables** so the R29 decisions persist
      (moved UP from §BL-4, emulator-testable now).
- [x] **DI-5 Watcher robustness** — watchCoins failed-pass full re-sync (no permanent snapshot
      drop); watchPortfolios onError → toast; de-dup optimistic appends by id; re-fetch coins on
      switch when the meta came in empty.
- [x] **DI-6 Session & config hardening** — live `users/{uid}` watcher (tier/premiumLimits/trash
      reach open sessions — completes C-A3); offline detection banner + write blocking;
      `suspendUser` revokes tokens; admin Plans blank-field = default (0 rejected);
      App Check failure handling noted in §4 go-live checklist.

## R31. Onboarding choice · downgrade select-flow · admin trash-delete · suspension freeze  (✅ BUILT 2026-07-07 — live PayPal calls verify at go-live)

Canonical spec + decisions R31-D1…D4: [`DESIGN-PASS.md`](../design/DESIGN-PASS.md) "Round 31" · bug diagnosis:
[`ERRORS.md`](../testing/ERRORS.md) §A5 (admin tab kills non-admin sessions — explains the empty "Welcome,", the
popup→full-screen flip, and the post-un-suspend logout loop; **local-testing gotcha: keep the admin tab
closed while testing user logins until R31-1 lands**). Pairs with §DI; build R31-1 first.

- [x] **R31-1 Isolate admin auth** — own Firebase app instance/persistence for `admin-main.jsx`; "not an
      admin" denied screen instead of auto-signout; user app clears the plan-flow overlay on session death
      + `showPlan && user` render guard. **Also fixes R31-7** (logout ~1 min after upgrade = the same §A5
      admin-tab kill; DoD adds: upgrade to Pro AND Premium, wait 2+ min with /admin CLOSED, session
      persists — escalate to a dedicated diagnosis only if it survives with the admin tab closed).
- [x] **R31-2 Forced new-user plan choice (R31-D1)** — no pre-chosen plan / no CURRENT badge until an
      explicit choice; three actionable cards (Choose Starter/Pro/Premium), no X or skip link for the
      fresh registration; `settings.planChosen` persisted (validSettings + rules test); Starter card+CTA
      border **gray in light (`--line-strong`), white in dark (`--ink` #ece9e1)** across every plan-picker
      surface (R31-D5); drop the duplicated "Select a plan" subtitle from the upgrade popup (keep it on the
      welcome picker).
- [x] **R31-3 Downgrade select-then-confirm + approve-now (R31-D2)** — chooser cards become a selection
      (highlight + Continue); "what you'll lose" warning for BOTH targets before any billing step;
      Premium→Pro: cycle picker (defaults monthly) → approve PayPal NOW with a future start at Premium's
      end (retires the R29-3 `recheckoutDue` popup); pending notice shows "payment approved ✓";
      keep-my-plan/change-choice also cancel the scheduled subscription.
- [x] **R31-4 No-refund line on every billing surface** — add to the buy/cycle step, the chooser footer,
      and the new warning step (confirm modal + Account already have it).
- [x] **R31-5 Admin delete-via-trash** — remove Move-to-trash; Delete → type-DELETE popup (reuse the BL-2a
      typed-confirm pattern) → `adminTrashUser`; hard delete ONLY from the Trash tab, also behind typed
      DELETE.
- [x] **R31-6 Suspension freeze + honest message + trash billing (R31-D3/D4)** — `auth/user-disabled` →
      honest "account suspended" login message; suspend = revoke tokens + `suspendedAt` + PayPal
      subscription suspend (go-live) + sweep skips suspended; un-suspend reactivates + extends `endDate`
      by the suspension duration (pure billing.js helper + tests); trash (admin AND self-delete) cancels
      the PayPal subscription immediately — also fixes hard-delete never cancelling a payer's billing.

## ISO. User-data & admin isolation — audit + harden + prove  (✅ ISO-1/2/3/5 BUILT 2026-07-07 · ISO-4 = go-live infra)

Canonical: [`ISOLATION.md`](../security/ISOLATION.md) (guarantee + threat model + decisions ISO-D1…D4) ·
findings: [`docs/planning/isolation-audit-findings.json`](../planning/isolation-audit-findings.json).
**Audit result: core isolation VERIFIED SOUND live** (23 cross-tenant probes all denied; guard-first
callables; admin data walled off; no admin code in the user bundle). Below = defense-in-depth
hardening (no current breach) + the regression tests that PROVE it. Decision ISO-D1: keep logical
per-uid isolation (physical per-user DB is an anti-pattern here), harden + prove.

- [x] **ISO-1 Harden the rules** — closed-shape `users/{uid}` (`hasOnly` allowlist on create+update so
      `admin`/`isAdmin`/`role`/unknown keys are rejected — pre-empts the "server starts trusting a
      field" trap; add `joined` to the create blocklist); explicit `if false` for `rateLimits/**`,
      `webhookEvents/**`, `cache/**`; null-safe `isAdmin()` (`token.get('admin',false)`); rules tests
      per change.
- [x] **ISO-2 Prove isolation (regression suite)** — extend `tests/firestore-rules.test.js`: user A
      can't get/list/write B's subtree; no client reads config/audit/cache/rateLimits/webhookEvents;
      no user doc self-grants admin; every admin callable rejects a non-admin; `exportMyData` returns
      only the caller's data. The living proof of the §1 guarantee.
- [x] **ISO-3 Shared-device erasure hygiene** — self-delete + sign-out-everywhere clear
      `ci-profile-<uid>`/`ci-active-port` before signout (**fold into DI-2**).
- [ ] **ISO-4 Infra least-privilege + revocation + backup policy (go-live)** — least-privilege
      functions SA; token revocation on suspend/admin-revoke + `checkRevoked` on sensitive callables
      (**extends R31-6**); document PITR/backup retention + privacy-policy disclosure (ISO-D3).
- [x] **ISO-5 Deny-by-default `storage.rules`** — commit `users/{uid}/…` scoped storage rules (Storage
      unused today) so the tenancy boundary exists before any upload feature.

## R32. Research → Coins: custom drag-and-drop order  (✅ BUILT 2026-07-07)

Canonical spec + decisions R32-D1…D4: [`DESIGN-PASS.md`](../design/DESIGN-PASS.md) "Round 32". The Coins
view's Sort link is a dead anchor today; cards render value-desc.

- [x] **R32-1 Sort mode + pointer drag** — Sort toggles sorting mode; drag handle (≡) per card,
      pointer-based drag (mouse + touch, no deps), ArrowUp/Down keyboard moves; Done + Reset-to-auto.
- [x] **R32-2 Order model** — pure `applyCoinOrder(holdings, coinOrder)` (listed ids first, rest
      value-desc → default + new-coins-at-end for free); applied ONLY in the Coins view.
- [x] **R32-3 Persist + sync** — `coinOrder` array on the portfolio doc, saved per drop
      (`updateCoinOrder`, revert+toast on failure); `validPortfolioData` optional list ≤1000 + rules
      tests; carry `coinOrder` through the useAuthSession load AND the C-A3 metas merge (it rebuilds
      `{id,name,coins}` today and would drop the field).

## 0. Product direction — 2026-06-22 build roadmap  (NEXT — top priority)

Canonical decisions: [`PRODUCT-DECISIONS.md`](../decisions/PRODUCT-DECISIONS.md) (28 decisions; §8 settled
2026-06-22). Planning docs reconciled in [`docs/planning/`](../planning/). **This section is the
authoritative build order**, grounded in a full codebase audit (the audit notes are inline so the
order can't silently drift back to the stale spec).

§0 splits along ONE hard external boundary — the **Blaze plan + live API keys**:
- **Wave A — local-first:** fully buildable AND verifiable on the existing emulator stack now.
- **Wave B — Blaze + keys:** build the code + the offline-degrade path now; the live LLM path is
  only verifiable at go-live. Each Wave-B increment's DoD includes *"verified the offline fallback
  still works with keys unset"* so a green local suite is never mistaken for a verified live path.

**Locked numbers (2026-06-22 interview follow-up):** Premium ceiling **1,000 coins/portfolio** (the
*identical literal* in `DEFAULT_PLANS` + the `firestore.rules` hard clamp) · keep tx caps (Pro 2,000 /
Premium 5,000) · add-coin anti-abuse = **`addCoinGuarded` callable** · live-AI budget **per-uid
monthly $-ceiling** (`aiMonthlyCents`: Starter offline · Pro $4/mo ≈ ~13/day · Premium $25/mo ≈ ~80/day,
token-cost-metered — see PRICING.md §4) · news allowlist
**deferred** (Founders/Community show ⬛ until domains are supplied) · regen cap **N = 2** · App Check
**v1 manual `context.app`**, prod-flag gated · Claude/Gemini model ids resolved via the `claude-api`
skill at code time (never hardcoded from memory).

**Two separate caches (do NOT conflate):**
- **Prices — untiered, live for all.** The existing shared CoinGecko proxy (`cache/universe`: top
  ~1,250 @ 5 min, ~3,000 daily, history CDN-cached) serves the SAME fresh prices to every tier,
  Starter included. Prices are **never a tier lever** (flat-cost shared cache + this is a long-term
  conviction tool, not a trading app). Tier value = AI layer + capacity (coins/portfolios), not price speed.
- **AI conviction — shared per-coin, on-demand only, read-time TTL by tier.** One shared
  `convictionCache/{coinId}` doc, generated ONCE per coin and amortized across all users (**never
  per-user generation**). **On-demand only — no scheduled refresh job.** Pro/Premium can trigger a
  (re)generation for **any coin (held or searched), at any rank** when the cached entry exceeds their
  tier TTL — **Premium 24h · Pro 48h**; **Starter is read-only** (never triggers → reads the shared
  cache or ⬛). **No rank gate** — the monthly $-budget (`aiMonthlyCents`) + TTL are the only limiters,
  and a held coin always gets a lookup. Cache hits are free. Every user's PWA keeps a **local offline
  copy** of viewed coins (stamped "as of DATE"). **⬛ = insufficient-data is a *finding*, not a gap** —
  shown with a per-axis reason chip (`no public repo` / `no coverage` / `anonymous team`) and taught in
  Learn as a caution flag; **rank does not cause ⬛, thin sources do** (CoinGecko dev/community data +
  GitHub reach most of the ~3,000-coin universe; the realistic ⬛ frontier is the universe edge, not
  rank 500/1,250). **Accepted consequence:** Starter sees ⬛ for any coin no paid user has warmed (→
  "upgrade to check this coin" hook). NB: with the news allowlist deferred, Founders + Community are ⬛
  for *all* coins (incl. BTC) until domains are supplied — that's the allowlist, not rank.
- **Pulse / tutor** are per-user (not per-coin): cached per (uid + portfolio-hash + tf) with a TTL,
  live only for Pro/Premium within the monthly $-budget; Starter gets the data-driven offline summary.

### The one critical re-sequence
`0d` (the output validator) is **NOT** a later epic. [`ai-client.js`](../../src/features/research/api/ai-client.js)
is a single throwing stub — the instant the `0b` proxy swaps its body, raw LLM prose reaches the UI
with no filter. So: **build `validateOutput()` first (A9), wire it INSIDE the `0b` proxy (B2), and it
must be green BEFORE the client body-swap (B4).** No un-validated LLM output may ever reach the screen.

### Four "looks-done-but-isn't" traps (audited — must be honored)
1. **#20 hard ceiling is unenforced today.** `firestore.rules` `configuredLimit()` returns the
   configured number with **no clamp**, and the existing "configured limits override defaults" test
   *proves* config beats defaults. Add a literal `min(config, 1000)` clamp in the rule (mirrored in
   `mergePlans`); the new test must set config *above* 1,000 and still reject. A finite *default* is
   not a ceiling. ✅ **Resolved in A1** — `configuredLimit` clamps to a per-key `hardMax` (coins 1,000),
   mirrored by `mergePlans`; the rules test sets premium coins config to 5,000 and is still rejected at
   the 1,001st coin.
2. **App Check is decoration.** Zero server-side `context.app` checks exist (uniformly v1 `onCall`).
   Build the gate ONCE (B2) and reuse it for the add-coin callable (B3) — don't build it twice.
3. **#17 + a free Gemini key = a privacy violation that compiles.** Gemini's free tier trains on
   inputs; #17 sends journal text raw. The no-train **paid** key + the privacy disclosure must ship
   in the SAME commit as any journal-raw code; assert the no-train requirement at the call site.
4. **Stale `dist/` still ships the named investors.** `0g`'s DoD = `npm run build` then grep `dist/`
   for the names → expect zero hits (a build-time guard test). ✅ **Resolved in A2** —
   `scripts/check-dist-names.js` (case-sensitive whole-word) runs inside `build` and fails it on any hit.

Plus the highest-consequence line in the build: the validator must **fail CLOSED** (judge
error/timeout or regen-cap-reached → safe fallback, never the violating text) — the opposite of the
usual "degrade to showing something" instinct, and easy to get subtly wrong.

### Wave A — local-first (ship + fully test on the emulator now)
- [x] **A1 · 0a-core (#19/#20):** ✅ DONE 2026-06-23 — `DEFAULT_PLANS`+`mergePlans` (functions) → Pro
  3/50 · Premium 15/**1000** (Starter 1/10 unchanged); `firestore.rules` defaults updated **+ the hard
  clamp** (`configuredLimit` per-key `hardMax`; coins clamped to 1,000, mirrored by `mergePlans`
  `Math.min(coins,1000)`); Free→**Starter** LABEL only (internal key stays `free`) across
  admin-dashboard / Login / CryptoIdea / index.html + all limit mirrors (useUpgrade, useAdminDashboard);
  removed a dead stale `MAX_COINS=200` const. New `test:rules` cases prove pro-50 and the clamp (config
  5,000 → still rejected at the 1,001st coin); diagram updated. An adversarial audit confirmed the clamp
  airtight server-side (per-user `premiumLimits` is client-display-only — no rule reads it).
  **Verified:** rules 14 · unit 134 · integration 6 · build clean.
- [x] **A2 · 0g-copy (#4/#24):** ✅ DONE 2026-06-23 — de-named `Learn.jsx` (module sub + disclaimer),
  replaced the Graham landing pull-quote with a first-party anti-FOMO line ("The coins that hurt most
  are the ones you couldn't explain."), and polished the Login tagline → "Know why you own every coin."
  Build-time `dist/` name-guard (`scripts/check-dist-names.js`, case-sensitive whole-word, pure matcher
  unit-tested) wired into `npm run build` so a leaked name FAILS the build (trap 4).
- [x] **A3 · enabler:** ✅ DONE 2026-06-23 — verified the forwarded coins carry `journal` end-to-end
  (`getCoins` returns it; `Research.jsx` passes the full `portfolio` to `ResearchTab`). The only loss
  was `holdingsFromCoins` (research `utils/coins.js`) dropping it in the holdings transform — now
  preserved (present-only); `computePortfolio`'s `...h` already carries it through to
  `portfolio.holdings`, so it reaches `ResearchTab`'s consumers (the future #17 AI context + 0d
  allowlist). Tests: `research-adapters` adds journal-preservation + a `computePortfolio`
  pass-through guard. **Verified:** unit 136 · build clean.
- [x] **A4 · 0f-persist (#23):** ✅ DONE 2026-06-23 — `users/{uid}/learn/progress` doc +
  `validLearnProgress()` rule (owner-only; bounded+typed `{xp, streak, lastActivity, completedLessons[],
  updatedAt}`, `hasOnly` blocks junk keys) + `getLearnProgress`/`saveLearnProgress` (mirror the journal;
  zeroed default for a fresh learner). Persistence only — UI wiring is A5; level/badges/module-state are
  *derived*, not stored. Tests: `test:rules` (owner write/read; stranger + malformed rejected) +
  `test:integration` (default → save → read-back). **Verified:** rules 15 · integration 7 · unit 136 ·
  build clean.
- [x] **A5 · 0f-logic (#25):** ✅ DONE 2026-06-23 — pure `utils/learn.js` (levelFromXp / streakOn /
  completeLesson / moduleStates / nextLesson, all unit-tested) + `useLearn` hook (loads A4 progress,
  persists **quiz-gated** completions, degrades gracefully when signed out) + `Learn.jsx` fully wired
  (real level/XP/streak/badges/module-state, sequential module unlock, quiz-gated lesson overlay). Seed
  content in `src/data/learn-content.js` (2 modules / 4 real lessons, no-names voice) — **A7 expands** to
  ~9 modules / ~50 lessons. Tests: unit pure (16) + hook (4) + component (3); walkthrough/smoke updated.
  **Verified:** unit 159 · build clean.
- [x] **A6 · 0f-journal-widen (#27):** ✅ DONE 2026-06-24 — `validJournal` now allows an OPTIONAL
  bounded `funnel{dilution,volume,yield}` (new `validFunnel`: each field optional string ≤2000,
  `hasOnly` blocks junk keys, whole funnel optional → backward-compatible). The three manual-research
  findings are captured as inputs on BOTH surfaces (Search Buy-Journal + Journal detail overlay,
  editable since the checks happen over time); single source of truth for the fields/copy in
  `src/data/journal-funnel.js`, pure `cleanFunnel` (`utils/journal.js`) drops empties so an all-empty
  funnel persists no key. New `saveFunnel` handler mirrors `reviewThesis`. Tests: rules (valid/partial
  accepted, **no-funnel still valid**, oversized/unknown-key/non-string rejected), integration
  (write→read→clear round-trip + no-funnel back-compat), unit (cleanFunnel + Search capture + Journal
  edit). **Verified:** unit 168 · rules 16 · integration 8 · build clean.
- [x] **A7 · 0f-content (#23/#24):** ✅ DONE 2026-06-24 — authored the full **9-module / 50-lesson**
  Learn library, **no-names** voice, hand-authored quizzes. Split one file per module under
  `src/data/learn/` (markets · fundamentals · tokenomics · demand · yield · risk · psychology ·
  security · thesis); `learn-content.js` is now the composing index. The A5 seed lessons
  (markets-1/2, fundamentals-1/2) are preserved verbatim (test-locked). Curriculum maps to the app:
  the #27 manual checks (dilution/volume/yield) + the #26 funnel↔signals bridge are taught explicitly
  (`thesis-1`). Test `tests/unit/learn-content.test.js`: 9 modules/50 lessons, every lesson has 4
  options + an in-range `correctIdx`, unique ids, **no author names** (reuses the build's
  `findForbiddenNames` guard so the list can't drift), and varied answer positions. **Verified:**
  unit 176 · build clean (name-guard passing).
- [x] **A8 · 0c-pure (#8/#9/#11):** ✅ DONE 2026-06-24 — pure rubric reducer
  `src/features/research/utils/conviction.js` (`reduceAxis` / `activeCatalysts` / `computeConviction`):
  the **≥2-source accuracy gate** (#8 — fewer corroborating sources → ⬛, never a single-source guess),
  the **4-state rubric** (#9 — all-good→🟢, conflict/any-mixed→🟡, corroborated-bad/dead→🔴, thin→⬛
  with a per-axis **reason chip**, never a silent blank), and **catalyst auto-expiry + as-of date**
  (#11). The 4-state pills in `CoinCard.jsx` are lit from it, driven by a deterministic **mock seam**
  (`data/mock-conviction.js`) that swaps for the live per-coin cache in one place at Wave B; the #26
  funnel↔signals bridge note renders with the pills. Tests: `tests/unit/conviction.test.js`
  (single-source→⬛, thin→⬛, conflict→🟡, any-mixed→🟡, corroborated-bad→🔴, catalyst expiry, all-⬛
  degrade, mock determinism) + `CoinCard.test.jsx` (pills + ⬛ reason chip + catalyst). **Verified:**
  unit 194 · build clean.
- [x] **A9 · 0d-pure (#14/#15/#16):** ✅ DONE 2026-06-24 — `functions/validate-output.js` (server-side,
  CommonJS, **not** in the client bundle): `validateOutput(text, {allowedNames})` blocks unmentioned
  project names/tickers/cashtags (BTC/ETH/SOL excepted), price targets/valuations/multiples,
  buy/sell/hold advice + rating labels, %-/word-fraction allocation, and any aggregate score/grade —
  with a **de-obfuscation pass** (`b*u*y`, `B U Y`, `` `buy` ``). **Fails closed** (empty/garbage →
  invalid); `selectValidated()` encodes the **N=2** regen cap → safe fallback, never the violating
  text. Tests `tests/unit/validate-output.test.js` (23): per-category block/allow + fail-closed + the
  N=2 cap (incl. a clean candidate *beyond* the cap is NOT reached) + a **red-team regression set**
  (a 6-agent / 63-probe adversarial sweep; the prefilter blocks 58/63 with **zero false positives**,
  the 5 it defers — English-word names like Avalanche/Near/Maker, a bare "solid 8", a slang adverb —
  are by design the B2 LLM judge's job, per #15). **Verified:** unit 217 · build clean. Consumed in B2.

**✅ Wave A (local-first) COMPLETE — A1–A9 all done.** Everything buildable + verifiable on the
emulator stack is shipped: the tier reconfig + hard clamp, the no-names voice + dist guard, the
journal/funnel + Learn library, the conviction rubric, and the fail-closed output validator. What
remains (Wave B below) needs the **Blaze plan + live API keys** — the secure AI proxy that wires the
validator (A9) in and body-swaps `ai-client.js`. Build order for Wave B is unchanged: B1 → B2 (keystone,
validator wired + App Check + rate limit) → B3 → B4 (the gated body-swap) → B5/B6/B7/B8.

### Wave B — Blaze + keys (code + offline-degrade now; verify live at go-live)
- [ ] **B1 · 0b-secret-store:** Anthropic + Gemini keys in the locked `config/app` doc + admin
  Settings fields (set-flags only, `keep()` idiom). The Gemini key **must be a paid no-train key**
  (trap 3) — document it in `functions/.env.example` + README.
- [ ] **B2 · 0b-proxy (KEYSTONE, extends N-3):** `researchAsk` callable — Claude (prose) / Gemini
  (structured) **+ `validateOutput` (A9) wired in, fail-closed** + per-uid **Firestore** monthly
  $-budget (`aiMonthlyCents`, token-cost-metered — see PRICING.md §4) + **`context.app` App Check gate**
  (v1, prod-flag) + server-side tier-gate. Extract guard/budget/validator logic as pure helpers and unit-test them.
- [ ] **B3 · 0a-antiabuse (#20):** `addCoinGuarded` callable — **reuses B2's per-uid limiter + App
  Check gate**; the client write path routes through it. Closes #20's rate-limit + the write-path App
  Check. Integration throttle test (rapid adds → `resource-exhausted`).
- [ ] **B4 · 0b-swap:** swap the `ai-client.js` body to call `researchAsk` (keep the *resolve-string /
  reject* contract so the hooks' offline fallback survives). **LAST step, gated on A9 + B2 green.**
  Lights up Pulse AND Ask at once. Decide the validator's return contract first (throw → offline note,
  vs a distinct "we held this back" payload — currently undefined).
- [ ] **B5 · 0c-live (#6/#7/#10/#17):** GitHub / news-allowlist / CoinGecko-fundamentals fetchers (the
  LLM never web-searches) + `getConviction(coinId)` callable backed by the shared per-coin
  `convictionCache/{cgId}` (server-write-only). **On-demand only — no scheduler;** the callable
  (re)generates only when a Pro/Premium caller's tier TTL is exceeded (**Premium 24h · Pro 48h**),
  else serves the cached doc; **Starter is read-only** (never triggers → cached doc or ⬛). **No rank
  gate** — any coin (held or searched), any rank; budget + TTL are the only limiters. Cold runs charge
  the daily budget; cache hits are free. Emit **per-axis ⬛ with a reason** (`no public repo` / `no
  coverage` / `anonymous team`) — ⬛ is a finding, not a blank. **#17 privacy disclosure in the same
  commit.** Extend `safeProviderOrigin()` to the allowlist (empty → Founders/Community stay ⬛). Rules
  test: clients can't read the cache doc.
- [ ] **B6 · 0e-live (#11/#12):** Pulse as its OWN AI surface — **per-user cache** (uid +
  portfolio-hash + tf) with a TTL, tier-gate (live for Pro/Premium; Starter = data-driven offline
  summary), validator + "as of DATE". (Pulse & Ask share the seam but keep separate caches/gates.)
- [ ] **B8 · offline copy (PWA):** persist each user's *viewed* conviction + Pulse results to the PWA
  local store, shown stamped "as of DATE" when offline or during a backend outage. Mirrors the
  existing price offline-fallback; per-user local mirror only (no extra generation).
- [ ] **B7 · 0f-tutor (#21):** Premium templated tutor — **template-first** ({coin}-substitution, zero
  LLM cost); any live elaboration is optional, gated to Premium, and routed through the validator.

### Gaps to track (not yet owned by an increment)
- ~~**#1 (the moat)**~~ ✅ DONE 2026-07-03 (`c02e4db`): the MOAT walkthrough test — buy-time thesis → Journal →
  a real holding → Research conviction pills + the #26 bridge note → Learn's "Building Your Thesis" module.
- **#2 responsive:** add *"verify mobile + desktop layout"* to the DoD of every UI increment (A8 pills,
  A5 Learn, B6 Pulse) — manual narrow-viewport check, no automated visual test exists.
- **#26 bridge copy** ("these signals cover steps 1–2; you apply 3–5") — make it a tested deliverable
  wherever signals/funnel fields render (easy to omit on one surface).
- ~~**Diagrams**~~ ✅ DONE 2026-07-03 (`ecedf4a`): `conviction-engine.svg` (Wave-B lane labeled TARGET),
  `learn-surface.svg`, `subscription-lifecycle.svg` (supersedes the old paypal-flow tier semantics).

### Still genuinely open (does NOT block Wave A)
- ~~CoinGecko plan tier under on-demand engine load~~ **DECIDED 2026-06-27: CoinGecko Lite (~100k/mo), keep `HOT_PAGES=5`** (see [`BACKEND-ADMIN-DECISIONS.md`](../decisions/BACKEND-ADMIN-DECISIONS.md) D16).
- ~~Which model runs the `0d` judge~~ **DECIDED 2026-06-27: Claude only (Opus 4.8)** for both prose and structured — there is no Gemini, which **voids trap #3** (the Gemini no-train key requirement). See D17.

---

## BL. Backend & admin go-live — 2026-06-27 deep-dive + decisions

Canonical: [`BACKEND-ADMIN-DECISIONS.md`](../decisions/BACKEND-ADMIN-DECISIONS.md) (full workflow map, 27-gap inventory,
18 locked decisions D1–D18, founder provisioning checklist). A 14-agent codebase audit found the gaps; the
founder interview locked scope. **Founder chose the full secure path:** live AI in v1, server-enforced
signups, admin 2FA. This section is the **build order** for those decisions; it composes with §0 Wave B and
§U Wave B (shared App Check / Identity Platform). Each item = a small increment to the AGILE.md Definition of Done.

### BL-1 · Security foundation (✅ BUILT 2026-07-03 — commits `5f0ad13` guards + `e497f82` billing)
- [x] **Shared per-uid rate limiter (Firestore) + `context.app` App Check gate** — ✅ `functions/guards.js`
  (`consumeDailyBudget` w/ UTC `dayKey` per **C16** · `checkCooldown` · `appCheckOk` prod-flag gated),
  pure + dependency-injected, 8 unit tests (in-memory Firestore fake); `rateLimits` pinned server-only by a
  rules test. Wave B's B2/B3 + C-B2 **reuse these** — don't rebuild.
- [x] **PayPal webhook idempotency** — ✅ transactional `webhookEvents/{event.id}` create-if-absent (dupes
  ack'd + skipped); `serverTimestamp()`→`Date.now()`; `billingCycle` persisted at `createSubscription`
  and `getStats` now prices annual payers at `priceYear/12` w/ amortized fees (`billing.computeRevenue`).
- [x] **`createSubscription` already-paid guard + per-uid 60s cooldown** — ✅ (guard skips a *cancelled*
  sub so the R29 re-checkout can re-buy); live-verified: rapid 2nd call → `resource-exhausted`.
- [x] **Audit expansion** — ✅ `selfDeleteAccount`/`selfRestoreAccount`/`signOutEverywhere`/`exportMyData`/
  `createSubscription`/`cancelSubscription` all `writeAudit` (D11).
- [x] **Quick admin fixes** — ✅ `lookupUser` returns `tierBeforeFailure`+`premiumLimits`+`emailVerified`
  (+`billingCycle`); premium custom-limit-`0` respected (`!=null`, mirrors the rules' `.get(key, default)`);
  admin Overview shows an explicit "Couldn't load stats" error instead of a $0 dashboard.
- [x] **R29 billing follow-ups (ERRORS.md B8)** — ✅ `functions/billing.js` (pure, 22 tests):
  `plan_id`→tier on ACTIVATED (Premium lands as premium); SALE.COMPLETED never sets tier blindly (only
  restores `tierBeforeFailure` on recovery); CANCELLED/SUSPENDED mark the sub (endDate =
  `next_billing_time`) with **no immediate tier drop**; `cancelSubscription` marks
  `{cancelled, downgradeTo, endDate}` honoring access-until-period-end; NEW daily
  **`enforceSubscriptionPeriods`** sweep does the server-side flip (a "pro" target keeps its marker for the
  R29 re-checkout; payment failures drop after the 7-day grace). *Live PayPal e2e stays a go-live check.*

### BL-2 · Admin panel capabilities (✅ BUILT 2026-07-03 — commit `561d22d`)
- [x] **Grant/revoke admin UI** — ✅ type-the-email-to-confirm wrapper over `setAdminClaim` in the user detail
  panel (MIN_ADMINS enforced server-side). *The admin-MFA gate (D7) layers on at go-live with U15.*
- [x] **Admin soft-delete + Empty-trash bulk action** (D8) — ✅ `adminTrashUser` callable (refuses admins —
  demote first) + "Move to trash" two-tap; "Empty trash" bulk purge w/ confirm (also closes §4b N-2).
- [x] **Admin "sign out of all devices"** for a target user — ✅ `adminSignOutUser` (audited) + button (D9).
- [x] **Reserve the AI Settings section** — ✅ "AI (reserved)" card: Anthropic key set-flag via `keep()`
  (never echoed) + visibly disabled conviction-cache controls that activate with B5 (D10).

### BL-3 · AI proxy (Claude-only) — extends §0 Wave B; validator-first
- [ ] **B1** Anthropic (Claude) key in `config/app` + AI Settings (set-flag). **No Gemini** (D17 voids trap #3).
- [ ] **B2 (keystone)** `researchAsk` callable — Claude prose + structured + **`validateOutput` (A9) wired in,
  fail-closed** + per-uid daily budget (BL-1 limiter) + **`context.app` gate** (D4) + server tier-gate.
- [ ] **B3** `addCoinGuarded` — reuses the BL-1 limiter + App Check gate.
- [ ] **B4** swap `ai-client.js` body → `researchAsk` (gated on A9 + B2 green); lights up Pulse + Ask and
  **flips the AI "coming soon" label → the real metered number** (D13).
- [ ] **B5–B7/B8** per-coin `convictionCache` + `getConviction` (on-demand, TTL by tier), Pulse per-user
  cache, PWA offline copy, templated tutor (as §0 Wave B, Claude-only).

### BL-4 · Identity Platform hardening (needs Blaze + console)
- [ ] **U14** `beforeCreate` blocking function enforcing `signupsEnabled` server-side + IP rate-limit; enable
  App Check enforcement in console (D2/D4).
- [ ] **U13** server password policy (Identity Platform require-mode).
- [ ] **U15** admin MFA (TOTP enrollment + challenge in the admin app) (D3) — **gates BL-2's grant UI**.
- [ ] **Subscription-decision callables (from the BL-1 adversarial review, 2026-07-03):** the server-side
  `subscription` marker is now **owner-immutable** (rules) and the sweep trusts it — so at go-live the
  client's pending-downgrade decisions need server counterparts: **`reactivateSubscription`** ("Keep my
  plan" → PayPal reactivate + clear the marker) and **`resolveRecheckout`** (decline → clear the marker
  server-side; approve is just the normal Pro checkout). Locally the client model (localStorage) covers
  both, so nothing is blocked — but WITHOUT these, a server-written marker outlives the client's decision
  and the R29 re-checkout popup would re-appear on every load after a real PayPal cancellation lapses.

### BL-5 · Transactional email + legal/analytics + CSP
- [ ] **GetResponse transactional path** (welcome / verification / receipts) — makes `email.fromEmail` real
  (D14/D15/D18). Confirm the GetResponse plan supports transactional/SMTP.
- [ ] **Termly (3 IDs) + cookie banner + Plausible** into Settings; verify privacy/terms pages (D18).
- [x] **Drop `unsafe-inline`** — ✅ BUILT 2026-07-03 (`c483d60`): script-src no longer allows inline; landing/SW/Termly
  scripts externalized to `public/` (dist ships ZERO inline scripts; style-src keeps 'unsafe-inline' for style attrs).

### BL-6 · Display honesty + docs cleanup (quick; can run early)
- [x] AI allowance line — ✅ superseded by **C-A4** (meter removed entirely; users read "Live").
- [x] `email.fromEmail` labeled **"reserved — not sent from yet"** in admin Settings (D14). ✅
- [x] Stale `functions:config:set` docs fixed (§4); `.env*` + `*service-account*.json`/`*serviceAccount*.json`
  confirmed git-ignored. ✅

### BL — minor/optional hardening (low, undecided)
- Lock `/api/subscribe` CORS to own-origin (read proxy can stay open).
- Optional periodic `/api/config` re-poll so maintenance mode evacuates already-open sessions.
- In-app "estimated price" signal when CoinGecko degrades (moot once Lite is bought; keeps resilience honest).

---

## C. Caching policy — 2026-06-29 cache deep-dive + decisions

Canonical: [`CACHE-POLICY.md`](../decisions/CACHE-POLICY.md) (6-agent cache audit, the 4-tier model mapped to code,
12 locked decisions C1–C12). **The market-data layer is already built and cost-effective — it *is* the
4-tier model in code.** The open work is the **AI tier** (planned, unbuilt) plus small UX/correctness
cleanups. North star (C6): **caching is an internal cost lever, invisible to users — everything reads
"live"; store the freshness metadata so it *can* be surfaced later.** This section is the build order;
it **refines** (does not duplicate) §0 Wave B + §BL — the convictionCache/TTL/allowlist items below
extend B5/B6/BL-2, they don't replace them.

### C-A · Now — ✅ ALL BUILT 2026-07-03 (`55f5ad0` + `14f1516`)
- [x] **C-A1 · kill the stale mock date** — ✅ derived (yesterday) — — `mock-conviction.js` is stamped a fixed `2026-06-22` (reads
  stale today). Drive the mock "as-of" off a relative/today value (or drop the visible date) so the
  demo seam never shows a misleading date pre-live. (C6 hygiene.) *Tiny.*
- [x] **C-A2 · history-cache eviction** — ✅ LRU 50 + unit tests — — `src/hooks/useCoinHistory.js` `_cache` Map has no eviction
  (unbounded session growth). Add a small LRU cap (~50 coins). Unit-test the eviction. *Tiny.*
- [x] **C-A3 · multi-device listeners (C12)** — ✅ watchPortfolios + active-portfolio watchCoins (changed-coins-only tx re-reads) + watchLearnProgress; integration + live browser-verified (a bypass write moved the UI with no reload) — — replace fetch-once-on-auth with `onSnapshot` on
  owner-only data (portfolios / coins / journal / Learn) so a second device's edits appear live. Bounded
  to owner docs (no fan-out). DoD: emulator integration test (write on ctx A → ctx B sees it); confirm
  no extra reads on the hot path beyond the active portfolio.
- [x] **C-A4 · hide the user-facing AI meter (C7)** — ✅ row reads "AI research · Live", no numbers — — remove the U9 AI-allowance meter from the user
  Account UI (usage/cost becomes admin-only, see C-B7). Users see "AI: live". **Supersedes BL-6/D13**
  ("coming soon until metered" → never user-facing). Update U9's note + USER-SETTINGS. *Small.*

### C-B · Wave B — needs Blaze + keys (refines §0 Wave B / §BL)
- [ ] **C-B1 · validator wired fail-closed (P0)** — restated keystone: `validateOutput` (A9) runs INSIDE
  the B2 proxy, fail-closed, **before** the B4 body-swap. Error contract: throw → offline fallback,
  never the held-back text. (Same as §0 "the one critical re-sequence" — listed here as a P0 gate.)
- [ ] **C-B2 · per-uid AI budget = monthly $-ceiling (`aiMonthlyCents`) (C3)** — build BL-1's
  limiter to decrement a per-uid **monthly** counter by the **actual token cost** of each call, capped
  at the plan's `aiMonthlyCents` (Starter $0 / Pro $4 / Premium $25). **Reconciles the 3 conflicting
  specs** (daily count vs. token-decrement vs. `aiMonthlyCents`) → the **$-ceiling** is the ceiling
  (a call-count isn't margin-safe). Server-enforced, never user-visible (C6/C7); shown as
  "~N analyses/day". Canonical: PRICING.md §4.
- [ ] **C-B3 · App Check + `addCoinGuarded` alongside the proxy (C11)** — every *novel* coin = one paid
  cold run, so the per-uid add-limiter + `context.app` gate ship in the **same** Wave B push (B2/B3),
  before exposure. (Already mandated #20/D4/D5 — C11 confirms the sequencing.)
- [ ] **C-B4 · convictionCache TTL: admin-editable + hard-capped (C4/C5) + lazy invalidation (C9)** —
  extends **B5**. Read-time TTL Premium 24h / Pro 48h / Starter read-only; the TTLs are `config/app`
  knobs **clamped to safe min/max** (price ≥5min, conviction ≥12h — mirror the #20 `min(config,hardMax)`
  clamp). Editing the news allowlist marks conviction **stale → regenerate on next view** (no eager
  burst). Stamp hidden `cachedAt`/`asOf` on every cache doc (C6).
- [ ] **C-B5 · news allowlist = admin CRUD + seed + frontend wiring (C8)** — extends **B5 + BL-2 (D10)**.
  Admin panel add/delete domains, seeded with founder-approved defaults, wired to the **Founders &
  Community** axes (and Ask sources, C10). Replaces the "deferred / no owner" status — without it those
  two axes ship permanently ⬛. `safeProviderOrigin()` reads the live allowlist.
- [ ] **C-B6 · Ask reuses shared caches + sources allowlist (C10)** — extends **B6**. Ask reads cached
  conviction/price/news data and cites only allowlisted domains; no fresh per-question fetch.
- [ ] **C-B7 · admin AI usage/cost dashboard (C7)** — the hidden meter's home: per-uid + aggregate AI
  usage and $-cost in the admin app (with the C-B2 counter). Reserve under BL-2's AI Settings section.

### C-R2 · Second-pass gaps (2026-06-29 — C13–C16 + fixes; mostly local)
A deeper adversarial sweep found gaps outside C1–C12 (full detail + evidence in `CACHE-POLICY.md` §3
round-2 + §4 🔵). Decisions locked; build order:
- [x] **C-R2a · own local persistence (C13) — ✅ BUILT 2026-06-30 (`48ed974`)** — `window.storage` was
  referenced but defined nowhere, so "remember active portfolio" + the profile cache silently no-op'd AND
  `logout()` couldn't clear them (latent shared-device leak). Fixed: `src/utils/storage.js` now backs `db` with
  real `localStorage` (same async interface + error-swallowing degrade — no call sites changed); `logout()`
  clears `ci-active-port` + `ci-profile-<uid>`. Tests: new `storage.test.js` (round-trip/del/missing/corrupt/
  quota-degrade) + smoke asserts logout clears the keys. Verified end-to-end in-browser. 319 unit green.
- [x] **C-R2b · `cache/universe` size guard (C14)** — ✅ `universe-utils.trimUniverse` (worst-rank-first, never throws, unit-tested) — — one doc is ~67% of the 1 MiB hard limit at ~3,000
  coins; a >1 MiB write throws and breaks BOTH front-ends. Wrap the write (`functions/index.js:827`): log/
  alert above ~850 KiB, **trim the lowest-rank tail instead of throwing**; hold `UNIVERSE_PAGES` ≤ 12. No
  sharding yet (KISS). Test: a synthetic oversized universe trims + logs, never throws.
- [x] **C-R2c · audit retention (C15)** — ✅ daily `purgeOldAudit` (12 months) + privacy.html disclosure — — keep audit logs (legitimate-interest); add a scheduled
  **audit-TTL purge** (fixed N months) so entries age out regardless of account deletion, + a retention
  line in `privacy.html`. No per-account scrub. *Purge job local; disclosure copy now.*
- [x] **C-R2d · budget reset = UTC midnight (C16)** — ✅ already baked into `guards.js` `utcDayKey` (BL-1a); C-B2 reuses it — — bake a UTC `dayKey` (`YYYY-MM-DD`) into the C-B2
  per-uid counter schema. **Lock before building the counter.** *(Wave B, with C-B2.)*
- [x] **C-R2e · fix fire-and-forget writes** — ✅ toggleSetting + saveLearnProgress await + revert + toast — — `toggleSetting` (`CryptoIdea.jsx:280`) + `saveLearnProgress`
  (`useLearn.js:52`) don't await/catch → a flake silently drops a settings toggle / earned XP. Await +
  revert + toast on failure (match `addCoin`/`addEntry`). *Local. Obvious fix, no fork.*
- [x] **C-R2f · universe write-contention + stampede + history prune** — ✅ transactional freshness-guarded fold-back + `coalescedSimplePrice` + daily historyCache prune — — guard the on-demand fold-back
  (`:951`) with a per-coin `at` freshness check; coalesce duplicate in-flight long-tail fetches (`:937`)
  via a module-level `{coinId→Promise}` map; prune `historyCache` docs older than `HISTORY_TTL` on the
  daily job. *Local; obvious fixes, batch when convenient.*

### Refinements applied to existing items (so they don't drift)
- **§0 Wave B price bullets:** unchanged — C1 confirms 5-min shared prices stay, presented as "live."
- **B5 (conviction):** now carries C4/C5/C9 (admin-capped TTL knobs + lazy allowlist invalidation) and
  the C8 admin-CRUD allowlist; B5's "news allowlist deferred" note is now **owned** by C-B5.
- **B6 (Pulse/Ask):** Ask gains the C10 sources-allowlist contract.
- **U9 (AI meter):** flipped from user-facing to admin-only by C-A4/C7.

### DoD (every C-increment)
KISS + secure; `test:unit` / `test:rules` / `test:integration` green; **no user-facing freshness date or
budget number** (C6); TTL knobs proven clamped by a rules/unit test (a config below the floor is rejected
or clamped); verify mobile + desktop; committed; [`CACHE-POLICY.md`](../decisions/CACHE-POLICY.md) updated if a
decision changed.

---

## U. User accounts & settings — 2026-06-24 build roadmap  (parallel track)

Canonical specs: [`USER-CREATION.md`](USER-CREATION.md) + [`USER-SETTINGS.md`](USER-SETTINGS.md)
(26-gap audit, 12 founder-locked decisions, 2026-06-24 interview). Reusable frameworks: the
`user-creation` + `user-settings` skills. **Runs parallel to §0** — it touches the auth /
account / settings surface, not the conviction engine; the only overlap is the go-live App
Check / MFA items (shared with §4). Same split as §0: **Wave A** = buildable + emulator-verifiable
now; **Wave B** = Blaze / Identity Platform (code now, verify at go-live).

> Build the foundation first: **U1 rules → U2 registration → the rest.** TDD per the AGILE.md
> DoD — write the `test:rules` / `test:unit` case first, never finish red. Two decisions went
> *beyond* the KISS default: **U6** builds the sign-out-everywhere revoke callable now, and
> **U11** implements `premiumLimits` end-to-end (not a stub).

> **Progress (2026-06-25): ALL of Wave A (U1–U12) is DONE** — committed; unit 238 /
> integration 10 / rules 20 all green. Includes full light/dark/system theming (U8,
> verified in-app) and `premiumLimits` end-to-end (U11, rules-enforced + clamped).
> **Remaining: only Wave B (U13–U15)** — go-live items needing Blaze + Identity Platform
> / App Check console config (not locally buildable; code sketches in USER-CREATION §6) —
> plus the deferred `currency` Intl.NumberFormat wiring. Two server callables added this
> pass — **U6 `signOutEverywhere`** and **U11 `setPremiumLimits`** — are wired +
> rules/UI/wrapper-tested; exercising the Admin-SDK writes needs a functions-emulator
> restart (new triggers register on restart), and the **U12 `tierBeforeFailure`** webhook
> path is syntax-checked but verifies live with the PayPal webhook (all go-live).

### Wave A — local-first (build + verify on the emulator now)

- [x] **U1 · rules + data model (FOUNDATION — do first):** add `validUserData()` (name 2–50),
  `validConsent()`, `validSettings()` (closed / typed / size-capped) to `firestore.rules`; add
  `premiumLimits` to the owner-update blocklist; shape-check `name` / `settings` / `consent` when
  present on create AND update. `test:rules` FIRST: happy path + every reject branch (oversized
  name, junk settings key, owner writing `premiumLimits` / `tier` / `deleted`). No data migration.
  Refs: USER-SETTINGS §4–5, USER-CREATION §4.
- [x] **U2 · atomic registration + server validation + consent:** `registerUser(email,pw,name,consent)`
  → ONE `writeBatch` (user doc + default portfolio + `portfolioCount:1`); server-side trim/bounds the
  name + email; write the `consent` record + `settings` defaults; fix the pw error `6`→`8`; add a
  `verifyEmail()` resend. Integration test: register → doc shape + consent + atomicity. USER-CREATION §2–5.
- [x] **U3 · register form (consent + skip):** Terms-required + Privacy-required checkboxes (links) +
  marketing opt-in (default off); submit gated until both required are checked; pass `consent` through.
  Add a "Skip for now / Explore Starter" button to the plan picker. Component tests (gating, default-off,
  skip nav).
- [x] **U4 · email-verify nudge:** `useAuthSession` reads `fbUser.emailVerified` → a non-blocking,
  dismissible banner + Resend on Portfolio. Hook/component tests (verified → none; unverified → banner).
- [x] **U5 · re-auth core + delete hardening (S5/S6):** one shared `confirmPassword()` helper
  (`reauthenticateWithCredential`, catch `auth/requires-recent-login`) + a reusable modal; gate
  account-delete behind **type `DELETE` + confirmPassword** in an isolated red Danger Zone. Tests:
  modal flow, wrong-pw error, delete needs both gates.
- [x] **U6 · Security tab (S7):** change-password form behind re-auth → `updatePassword` (same
  8+/Aa1+special rule); **`signOutEverywhere` callable** (`admin.auth().revokeRefreshTokens(uid)`) +
  button. Tests: unit (form) + integration (callable auth-gated + revokes).
- [x] **U7 · Profile tab (S10):** editable display name (`updateProfile` + `saveProfile`, 2–30,
  explicit Save + inline "Saved"); change-email behind re-auth via `verifyBeforeUpdateEmail` (mirror to
  Firestore only after the link is clicked, on next login — never optimistically). Component tests.
- [x] **U8 · Notifications + Appearance + Privacy tabs (S3/S4):** a `settings` save handler; **auto-save**
  toggles with inline confirm — `emailDigest` / `emailMarketing` (notifications) + marketing /
  `consentAnalytics` (privacy, withdrawable); wire `settings.theme` light/dark/system via a root class +
  CSS vars + localStorage; store `currency` (formatting deferred). Tests: toggle persists, theme applies,
  shape valid.
- [x] **U9 · tier display:** surface `aiMonthlyCents` **server-authoritatively** (add it to
  `getUserProfile`) → an AI-allowance meter in Account; usage bars read the **configured** caps
  (`site.plans`), not hardcoded numbers. Tests: meter from the server value, bars from config.
  (The enforcement counter itself is §0 B2.)
- [x] **U10 · downgrade-trim fix:** pass `site.plans` into `useUpgrade` / `trimToTier` so a downgrade
  trims to the **configured** ceiling, not the hardcoded `TIER_LIMITS` (silent data-loss bug if an admin
  raised a cap). Unit + a rules-backed test with an overridden cap.
- [x] **U11 · premiumLimits end-to-end (S8):** `setPremiumLimits` admin callable + admin UI →
  `users/{uid}.premiumLimits`; `configuredLimit()` reads per-user `premiumLimits` first for premium
  (clamped to `hardMax`, coins ≤ 1,000 — #20); Account shows "custom vs default". Replaces the dead
  `CryptoIdea.jsx:277` override. Tests: rules (override enforced + clamped; owner can't write it).
- [x] **U12 · billing resilience (S9):** an "Update payment method" link (Pro+) → the PayPal-hosted
  flow; record `tierBeforeFailure` on a PayPal failure event so the paid tier survives an auto-downgrade;
  admin "last paid tier". Tests: link visibility, webhook handler.

### Wave B — Blaze / Identity Platform (code now, verify at go-live; shared with §4)

- [ ] **U13 · server password policy:** Identity Platform require-mode (`minLength ≥ 8` + char classes,
  `forceUpgradeOnSignin`); mirror client with `validatePassword()` for inline feedback.
- [ ] **U14 · abuse prevention:** App Check enforcement (set `VITE_RECAPTCHA_SITE_KEY`, enable in the
  console) + a `beforeCreate` blocking function that enforces `signupsEnabled` **server-side** + an IP
  rate-limit. (The App Check gate is shared with §0 B2/B3 — build it once.)
- [ ] **U15 · MFA/2FA:** Identity Platform TOTP enrollment in Account; required for admins (already on
  §4). Document as roadmap until then.

### Deferred (no increment yet)
- `defaultPortfolioId` server-side default-portfolio preference (Pro+).
- Restore cooldown (`restoreLockedUntil`, 24h) against delete/restore harassment.
- In-app PayPal vault card display (last-4 / expiry) — needs the vault API + an SSRF-safe proxy.
- Full channel × category notification matrix (push / in-app + frequency + quiet hours).
- `currency` formatting wired across all price/P&L displays (`Intl.NumberFormat`).

**DoD (every U-increment):** KISS + secure; `test:unit` / `test:rules` / `test:integration` green;
re-auth on every sensitive op; verify mobile + desktop layout; no secret shipped; rules verified in
the emulator; committed with a clear message; USER-CREATION / USER-SETTINGS updated if behavior changed.

---

## 1. Frontend refactor — finish extracting `CryptoIdea.jsx`  (IN PROGRESS)

We are moving the monolithic `CryptoIdea.jsx` (~1,000 lines, was 1,559) into the
layered structure `api / hooks / components / utils`. The mechanism is proven and
test-guarded; the rest is repeatable application.

**Done:** `api/` (firebase + coingecko + config), `utils/` (format, coins, theme),
`hooks/` (useCoinSearch, useLivePrices, app-context), shared UI primitives
(`ui.jsx`, `StatusDot`), screens `Loading` + `ForgotPass`, and a Vitest test net
(`npm run test:unit`, 8 tests).

### 1a. Extract the remaining screens (one commit each, via AppContext)
Pattern per screen: add its deps to the `ctx` object in `CryptoIdea.jsx` → move its
JSX to `src/components/<Screen>.jsx` reading them via `useApp()` → render `<Screen/>`
(not `Screen()`) → add/extend a navigation test → `npm run test:unit`.

Remaining (rough size order):
- [x] `Contact` (~17 lines) — extracted to `components/Contact.jsx` (reads context); 4 isolated tests
- [x] `Search` (~35) — extracted to `components/Search.jsx`; real nav test (login → Search tab → Add-Coin)
- [x] `AddEntry` (~42) — extracted to `components/AddEntry.jsx`; 4 isolated tests (new/edit/disabled/submit)
- [x] `CoinInfo` (~95) — extracted to `components/CoinInfo.jsx`; 4 isolated tests (held/not-held branches). Dropped dead `milestones` var.
- [x] `Detail` — extracted to `components/Detail.jsx`; 3 isolated tests (P/L summary, tx list, empty). Dropped dead `inv`/`pnl`/`pp` + orphaned format/coins imports.
- [x] `Account` (~148) — extracted to `components/Account.jsx`; 5 isolated tests (sub states, delete-confirm, logout) + a real nav smoke test (badge → Account). Dropped dead `totalCoinsAllPorts`.
- [x] `PortfolioBar` (~10, helper) + `Portfolio` (~55) — extracted to `components/`; 6 isolated tests (asset list, upgrade nudge, switcher branches) + smoke test. Cleaned 6 now-orphaned shell imports (fmtP/fmtPct/sb/CI/hdr/StatusDot).
- [x] `Login` (~110, incl. the upgrade/plan overlay reused as a shell overlay) — extracted to `components/Login.jsx`; 5 isolated tests (form, signups-paused, billing, plan picker) + smoke. **Fixed a real bug:** auth error used `c.rd` (undefined) → now `c.red`, so errors actually render red.

**✅ Section 1a complete — all user-app screens are now extracted components.** `CryptoIdea.jsx`
is now just the auth/data effects, handlers, the `ctx` object, and the router shell. Next: §1b (hooks).

### 1b. Extract business logic into hooks (closes audit rules 1 & 2)
Most state + logic still lives in the `CryptoIdea.jsx` component. Pull into hooks:
- [x] `useAuthSession` — extracted to `hooks/useAuthSession.js`: owns `user`/`dataLoaded` + the
  `onAuthChange` watch (incl. `loadPortfolios`) and profile auto-save effects; collaborators
  (`setScreen`/portfolio setters/`checkSubscriptionStatus`/`saveProfile`) injected via a ref so the
  listener subscribes once. Also moved the `db` storage helper to `utils/storage.js`. 4 hook tests
  (`renderHook`) + the existing login/logout smoke tests guard it.
- [~] `usePortfolios` — **state container extracted** to `hooks/usePortfolios.js` (owns `portfolios`/
  `activePortId`, derives `portfolio`/`setPortfolio`; 4 hook tests). The **CRUD handlers stay in
  `CryptoIdea.jsx` by design** — they're coupled to `user`/tier-limits (derived after `user`, which
  comes from `useAuthSession`) and UI/form state; hook-ifying them would need ~15 injected deps or a
  risky reorder of the auth↔load sequence (anti-KISS). Revisit only if a redesign makes it cleaner.
- [x] `useUpgrade` — **tier-limit business logic extracted** to `hooks/useUpgrade.js`
  (`calcEndDate`, `getTrimImpact`, `trimToTier`, bound to `portfolios`/`setPortfolios`). Also
  consolidated the **duplicated limits table** into one `TIER_LIMITS` constant. 6 hook tests
  (`renderHook`). The **UI-flow orchestrators stay in `CryptoIdea.jsx` by design** (`startUpgrade`/
  `startDowngrade`/`confirmDowngrade`): they drive overlay state shared with the auth/Login flow
  (`showPlan`/`upgradeStep`/`upgradeFlow`…), so hook-ifying them would only relocate ~7 setters
  without cutting coupling (anti-KISS) — same call as `usePortfolios`' CRUD.

**✅ Section 1b complete** — auth session, portfolios state, and tier-limit logic are now in
hooks. What stays in `CryptoIdea.jsx` (portfolio CRUD + upgrade-overlay orchestrators) is coupled
to UI/form/auth state by design; pulling it into hooks would relocate dependencies, not reduce
them. Next: §1c (move remaining backend calls / shared theme out of components).

### 1c. Move backend calls out of components (closes audit rule 1)
- [x] `CryptoIdea.jsx` calls `httpsCallable(functions, "exportMyData"/"deleteMyAccount")` directly. → Moved into `src/api/account.js` (`exportMyData()`, `deleteMyAccount()`); component imports them, no longer touches `httpsCallable`/`functions`. 2 tests.
- [x] `components/admin-dashboard.jsx` called Cloud Functions via `httpsCallable` directly. → Moved all 9 callables into `src/api/admin.js` (`getStats`/`listUsers`/`listAudit`/`lookupUser`/`setUserTier`/`suspendUser`/`deleteUser`/`getAdminConfig`/`saveConfig`); each wrapper unwraps the payload the dashboard needs. Component no longer imports `httpsCallable`/`functions`. 7 tests. **Kept as plain `api/` functions, not a hook** (KISS, same call as `account.js`): the dashboard already owns all its own state, so a hook would add a layer without cutting coupling.
- [x] `components/pro-success.jsx` defined a local `c` theme — now imports the shared `utils/theme.js` (`c.bg`/`c.txt`/`c.dim`/`c.ac`), dropped the unused `border` token.

**✅ Section 1c complete** — no user/admin component calls a Cloud Function or
defines its own theme anymore; all backend access lives in `src/api/*`.
**✅ Section 1 (frontend refactor) complete** — all of 1a/1b/1c are done.

---

## 2. Backend layering — OPTIONAL (audit rules 4–6: controllers/services/models)

`functions/index.js` (~870 lines) currently colocates HTTP routing (controller),
external CoinGecko/PayPal/email calls (services), and Firestore access (models).
This is a defensible choice for a single serverless function. **Only do this if you
want explicit MVC separation:**
- [ ] `functions/controllers/` — the `api` HTTP handler routing `/api/*`
- [ ] `functions/services/` — `coingecko.js`, `paypal.js`, `email.js` (external calls only)
- [ ] `functions/models/` — Firestore read/write helpers (cache, config, audit, users)

---

## 3. Known bug — FIXED (seed/schema mismatch, not an app bug)

- [x] **Seeded portfolios don't load / adding a coin silently fails.** Root cause: a
  **seed/schema mismatch**, confirmed not an app bug. `getPortfolios()` queries
  `orderBy("order")`, and Firestore **excludes any document missing the ordered field**.
  Real registration (`firebase-auth.js`) creates portfolios *with* `order` + `created`, but
  `seed-emulator.js` wrote `{ name, coinCount, createdAt }` with **no `order`** — so the
  seeded portfolios were dropped from the query, the app fell back to its in-memory
  `"default"` portfolio (which has no Firestore doc for that uid), and adding a coin then
  `update()`d a non-existent doc → "Couldn't add coin." Fix: `seed-emulator.js` now writes
  `order` + `created` (matching the app schema) and seeds real coins (BTC/ETH/SOL/…) so
  `pro@test.com` loads 2 portfolios with 6 + 4 coins. Verified by running the identical
  `orderBy("order")` query against the emulator (returned 2 portfolios, was 0).
  - Latent (out of scope, pre-existing): if `getPortfolios` ever returns empty for a
    logged-in user, the phantom local `"default"` would still fail on coin-add. Real users
    never hit this (registration always creates the default with `order`).

---

## GOLIVE. Production-readiness audit  (✅ Phase 0 BUILT 2026-07-20 · blockers remain)

Canonical: **[`GO-LIVE-AUDIT.md`](GO-LIVE-AUDIT.md)** — 74-agent audit, 60 adversarially-verified
findings, ordered runbook. Verdict at audit time: **not production ready, 6 blockers.**

- [x] **Phase 0 (code)** — commit `2cedafb`: spend caps (`maxInstances` on every public + scheduled
      export), the subcollection admin-write hole closed (`isAdminOwner()` + 2 regression tests),
      hosting cache headers scoped correctly, service-worker no longer caches authenticated
      cross-origin traffic, schedulers rethrow so failures are visible, and a deploy guard that
      blocks shipping the demo Firebase config. Itself adversarially reviewed (2 regressions caught
      and fixed pre-commit).
- [ ] **Remaining blockers** (all need a Firebase project or a founder decision): PITR + backups
      *before* first signup · real checkout (Path A free-only vs Path B paid) · published Privacy
      Policy + Terms · Blaze + billing budget · real project + `prod` alias · admin bootstrap.
- [ ] **First week:** App Check enforcement (in the right order), the Cloud Logging error alert,
      React error boundary, PayPal webhook test event.

### FLAKE. The test suites are flaky — "green" is not currently trustworthy  (📋 OPEN, found 2026-07-20)

**Integration (`test:integration:solo`): proven pre-existing.** Six runs gave 19/19, 18/19, 19/19,
17/19, and — with `functions/index.js` + `firestore.rules` reverted to HEAD — 18/19, 19/19. The
baseline flakes on the same test, so it is not caused by the Phase 0 diff. A *different* test fails
each run (`watchCoins` listener, the `suspendUser` pair), which is the signature of test pollution,
not a defect. Full table in `GO-LIVE-AUDIT.md` §3b.

**Unit (`test:unit`): also observed flaky 2026-07-20** — `tests/unit/CryptoIdea.walkthrough.test.jsx`
failed 2 of 26 on one run (~31s for that file alone) after passing 539/539 twice on **identical**
code with no source change in between. This matters more than the integration flakiness because the
new `.githooks/pre-push` gate runs the unit suite: a flaky gate either blocks good pushes or trains
you to bypass it.

**Suspected cause (both tiers):** shared state + timing. The integration suite runs two files in one
process against one emulator with a known shared-SDK ordering hazard; the walkthrough test is a long
multi-step render that clears uid-keyed `localStorage` per test. **Fix direction:** isolate state per
test file (separate emulator run / `clearFirestore` between files), and replace fixed-tick waits with
condition-based waits (`findBy*` / `waitFor`) in the walkthrough. Until then: **re-run before
believing a single red run**, and never bypass the hook — fix the flake instead.

**UNIT TIER RE-DIAGNOSED 2026-07-22 — it is machine load, not test pollution.** While verifying the
PR #5 dependency merge, an A/B on one machine under one load isolated the variable:

| Tree | vitest | Run shape | Result |
|---|---|---|---|
| PR branch (new deps) | 4.1.10 | `admin-dashboard.test.jsx` alone | **14/14 pass** |
| master (old deps) | 4.1.8 | `admin-dashboard.test.jsx` alone | **14/14 pass** |
| PR branch (new deps) | 4.1.10 | full suite (59 files) | 2 failed / 550 |
| master (old deps) | 4.1.8 | full suite (59 files) | **4 failed / 548** |

The same file passes **14/14 in isolation on both dependency trees**, and the *older* tree fails
*more* in the full run — so neither the code nor the dependency bump is the cause. Every failure is
a `waitFor` hitting the **5000ms default `testTimeout`**, and `environment` setup time was **417–461s
across 59 parallel files** while `start:all` held six emulator ports on the same machine. The tests
are starved of CPU, not racing on shared state.

**Revised fix direction (unit tier):** raise `testTimeout` in `vite.config.js` (5000ms is too tight
for a 59-file parallel jsdom run on this box) and/or cap `poolOptions.threads.maxThreads`; and
**do not run `test:unit` while `start:all` is up** — that alone roughly doubles the failure count.
The integration-tier diagnosis above (shared emulator state) is unchanged and still stands.
Practical rule: a red unit run on a loaded machine is **inconclusive, not a failure** — re-run it
idle before believing it.

---

## 4. Go-live checklist

> **⚠️ Rewritten 2026-07-20** after the multi-agent go-live audit. The previous version had
> **four defects**: it set secrets via the admin panel *before* creating the admin who can open it
> (impossible), told you to paste Termly snippets into the HTML (wrong mechanism — the pages read
> doc IDs from `config/app`), and had no Firestore-region or backup step at all.
> **The ordered runbook with commands, verification steps and gotchas lives in
> [`GO-LIVE-AUDIT.md`](GO-LIVE-AUDIT.md) §5. This is the summary.**

**Phase 0 — code (✅ DONE 2026-07-20, see GO-LIVE-AUDIT.md §"Phase 0 shipped")**
- [x] `maxInstances` + `timeoutSeconds` on `api`, `paypalWebhook` and all five schedulers.
- [x] Subcollection write/delete narrowed to `isAdminOwner()` (+ rules regression tests).
- [x] Hosting cache headers: `immutable` scoped to `/assets/**`; per-endpoint `/api/**` TTLs.
- [x] Service worker no longer caches non-GET or cross-origin (auth/Firestore) traffic.
- [x] Schedulers rethrow so a failed run reports FAILED instead of silent success.
- [x] `npm run deploy` blocks on a missing/placeholder `.env` and targets the `prod` alias.

**Phase 1 — create the project**
- [ ] Create the real Firebase project; enable Email/Password Auth + Firestore.
      **Location DECIDED 2026-07-22: `nam5` (US multi-region)** — matches the default `us-central1`
      functions region; permanent, so it is settled, not a console-time choice. Create the database
      in **production mode, not test mode** (test mode = allow-all rules until Phase 3 deploys the
      real ones). Click-by-click: GO-LIVE-AUDIT.md §5 Phase 1.
- [ ] Upgrade to **Blaze**, then immediately set a **billing budget + alerts** (~$25/mo, 50/90/100%).
      A budget only *alerts*; the `maxInstances` caps from Phase 0 are what actually bound spend.
- [ ] **Enable PITR + a daily backup schedule BEFORE any real signup** — PITR cannot be enabled
      retroactively. Commands in GO-LIVE-AUDIT.md §5 Phase 1.
- [ ] `firebase use --add` → select the real project → alias it **`prod`** (`npm run deploy` needs it).

**Phase 2 — secrets & build**
- [ ] Fill `.env` with the six `VITE_FIREBASE_*` values (the deploy guard now enforces this).
- [ ] Fill `functions/.env`: `APP_URL`, `COINGECKO_DEMO_KEY` (**env var, not admin Settings** — only
      the env var unlocks `days=max` history), and PayPal plan IDs if launching paid tiers.

**Phase 3 — deploy**
- [ ] Rules + storage first, then `functions:api,paypalWebhook`, then everything.
- [ ] Confirm 5 Cloud Scheduler jobs exist; force-run `refreshUniverseDaily` to warm `cache/universe`.

**Phase 4 — admin bootstrap (⚠️ MUST precede any admin-Settings step)**
- [ ] Register both owner accounts **through the live app UI** (creates their profile + default portfolio).
- [ ] Generate a service-account key, store it **outside the repo** + in a password manager.
- [ ] `node functions/scripts/set-admin.js <email> --role=owner` for **both** owners (script-only; the
      panel can never mint an owner). Sign in again afterwards — tokens are revoked.
- [ ] *Then* fill admin Settings (Termly IDs, PayPal creds) — it needs a fresh owner session.

**Phase 5 — legal (blocker for a public launch)**
- [ ] Create the Privacy Policy + Terms in Termly; set the **doc IDs in admin Settings**
      (do **not** paste snippets into `privacy.html` / `terms.html`). Load both pages and confirm
      the embed renders (`/api/config` is CDN-cached ~60s).
- [ ] Bump `CONSENT_VERSION` to the publication date; delete pre-launch test accounts whose consent
      records point at documents that never existed.

**Phase 6 — App Check (strict order, or you lock out every user)**
- [ ] Register the app + create the reCAPTCHA v3 key → set `VITE_RECAPTCHA_SITE_KEY` → build → deploy
      → watch "unverified requests" fall to ~0 → **only then** enable enforcement, one service at a time.

**Phase 7 — verify + observe**
- [ ] `curl -sI` the cache headers (`/api/coinlist` must not be `no-cache`; `/landing.js` must be).
- [ ] Create the Cloud Logging error alert for the schedulers + webhook (GO-LIVE-AUDIT.md §3 H3).
- [ ] Test the **CSP** on the deployed site; loosen a directive only if it blocks something legit.
- [ ] Register a throwaway account end-to-end: verification email, password reset, portfolio save.

**Later (not launch blockers)**
- [ ] Enable **Identity Platform MFA (2FA)** for admins + the enrollment/challenge flow in the admin app.
- [ ] Confirm the email provider (ActiveCampaign/GetResponse) end-to-end.

---

## 4b. Follow-ups from the QA test pass (see `docs/TEST-REPORT.md`)

- [x] **F-1 (HIGH):** user tier was read from local cache, never Firestore → paid users showed as
  free on a fresh device / after an admin change. Fixed: `getUserProfile` reader + `useAuthSession`
  adopts server tier; retries past the login-time `lastLogin` pending-write view. (commit `8ecd222`)
- [x] **F-2 (MED):** Account screen crashed rendering a Firestore Timestamp `joined`. Fixed — session
  takes only authoritative fields from the server; regression test added. (commit `b9bf9b6`)
- [x] **F-3 (UX):** limit/error messages rendered off-screen → now a fixed floating toast. (`b9bf9b6`)
- [x] **F-4 (FEATURE):** portfolio CSV export (holdings + transactions). (commits `262e562`, `3b4db27`)
- [x] **F-5 (HIGH):** "Delete my account" reworked into a soft-delete with a 30-day trash, user
  self-restore, admin Trash tab (restore / delete-now), and a daily `purgeExpiredTrash`. Server-only
  `deleted`/`deletedAt` (rules-enforced). Self-restore auto-syncs to the admin Users/Trash split
  (`partitionUsers`). (commits `9661cbe`, this one)
- [x] **N-1 (DONE 2026-06-25, `a3693c9`): hardened the landing DCA fetch.** The history fetch
  (`getHist` in `index.html`) had no timeout, so a hung `/api/history` left the calculator stuck
  mid-calculation with no feedback. Added a **12s `AbortController` timeout**; on timeout or network
  error it falls back to the built-in offline estimate (`fbHist`) and shows a clear "showing an
  offline estimate" note. The fallback is no longer cached, so a later attempt can still reach a
  recovered API. (NB: the minimal-API rewrite had already dropped the literal "Calculate" button —
  the calc auto-runs — so the real symptom was a never-completing calc, not a stuck button.)
  **Verified in-browser:** real-data path unchanged; an immediate failure and a true 12s hang both
  degrade to the estimate + note instead of hanging.
- [x] **N-2 (LOW): admin trash niceties.** ✅ "Empty trash" bulk purge built with BL-2 (the "and/or" satisfied;
  a live admin list stays optional).
- [ ] **N-3 (MED): live AI for the Research tab.** The Research tab ships with AI in graceful
  offline-fallback mode (`src/features/research/api/ai-client.js` throws → built-in data-driven
  summaries). To make "Pulse"/"Ask" use real Claude: add a secure callable Cloud Function
  (e.g. `researchAsk`) that holds the Anthropic key server-side, forwards to Claude (Anthropic SDK,
  model per `claude-api` skill), and add per-user rate limiting + App Check. Then replace the one
  `ai-client.js` body with a call to that function. Needs an Anthropic API key + the Blaze plan
  (outbound network). NEVER call Anthropic directly from the browser.

## R. Responsive app — desktop layout  (DONE 2026-06-25 — R-0…R-4 shipped)

The user app is now ONE responsive layout (centered shell + auto-fit card grids, same markup
mobile↔desktop, no `@media`, no new deps), **design unchanged**. As-built detail:
[`RESPONSIVE-DESIGN.md`](../design/RESPONSIVE-DESIGN.md); reusable method: the `responsive-app` skill.

- [x] **R-0 Shell** — `.app-shell` centered column (720 default / 560 narrow / 1040 wide track) +
  `.grid-auto` utility; bottom bar kept (centers as a pill). (`9fed965`)
- [x] **R-1 Learn** — modules reflow to a 2-up grid on desktop, 1-up mobile. (`28a74f6`)
- [x] **R-2 Journal** — thesis entries reflow to a 2-up grid. (`0653d6b`)
- [x] **R-3 Research** — coin cards reflow to a 2-up grid (scoped `research-tab.css`). (`bd14965`)
- [x] **R-4 Forms/detail** — Detail/AddEntry/CoinInfo on the 560 narrow track; Contact capped 560. (`da32f03`)
- Honored "keep the design the same": no colors/fonts/components changed; Portfolio & Search **rows kept**
  (not tiled); only homogeneous card lists gridded. Each phase: build + 217/217 unit green + browser-probed
  (grids reflow 1→2→3 cols by width, collapse to 1 on mobile).

## D. Design revamp — match the canonical Portfolio mockup  (BUILT 2026-06-26)

Founder-approved mockup (desktop + mobile) is the canonical visual target. Full plan, current→target
deltas, and phases live in [`DESIGN-REVAMP.md`](../design/DESIGN-REVAMP.md). Headline change: Portfolio value →
white summary card, and Portfolio assets **ROW → CARD GRID on the 1040 wide track** (this supersedes
§R's "Portfolio rows kept"); plus a floating bottom-nav pill and a token/pill/card consistency pass.
Dark mode preserved; KISS, no new deps.

- [x] **Mobile mockups for all screens** — produced 2026-06-25 in the approved language
  (Portfolio/Research/Journal/Learn/Search + CoinInfo/Detail/AddEntry/Account/Login) to validate before building.
- [x] **Desktop mockups for all screens** — produced 2026-06-26: every screen at its desktop width
  (Portfolio on the **1040 wide track with the 3-up asset grid**, Research/Journal/Learn 2-up,
  drill-ins/forms on 560/720) in the approved cream-paper language. Saved as a durable, self-contained
  gallery with a light/dark toggle: [`docs/mockups/desktop/index.html`](../mockups/desktop/index.html)
  (open in a real browser for true widths). Verified: 12 frames, Fraunces+Hanken load, 3-up/2-up grids,
  Login `#FF3B30` error preserved, dark mode flips, clean console.
**Founder review locked 2026-06-26** (full per-screen decisions in [`DESIGN-REVAMP.md`](../design/DESIGN-REVAMP.md) §7).
Locked wording: drop "held" → just the amount (`0.52 BTC`); Journal labels **Intact/Review/Challenged**;
Journal note → "Only you can see your journal. Your thesis helps the AI give you better Research & Ask
answers."; **remove the "Prices updating live" line** (both widths). Guardrail: design-only — keep all
settings/words/functions unless §7 says otherwise.

- [x] **D-1** Portfolio value summary card (gain line + INVESTED/24H/ASSETS cluster) **+ removed live line**
  (commit `455f17c`). New `portfolio24hPct` helper; `.value-card` flex (desktop-right / mobile-row); 240/240
  unit green, build clean, browser-verified (incl. dark mode).
- [x] **D-2** assets → 3-up card grid + wide (1040) track + tinted % pills + dropped "held" word
  (commit `335a1b9`). Card tap → CoinInfo; Edit/Delete on Detail; swipe machinery removed. Reflow
  3/2/1 @1040/720/375 verified; 242/242 unit green.
- [x] **D-3** desktop bottom-nav → **solid-white floating pill** (commit `cba5b2b`); mobile bar unchanged;
  min-width:760px override, token-driven (dark OK). Verified @1280/@375.
- [x] **D-4** token-circle consistency (commit `c4b36f0`): pure `coinColor()`, 6-digit guard (TAO bug fixed),
  case-insensitive, deterministic curated fallback + more coins. 245/245 unit green; browser-verified.
- [x] **D-5** consistency pass (design-only; settings/words/functions kept). **Search** — tinted % pill +
  muted "Added" (`72bc52c`). **Detail + CoinInfo** — consolidated tinted `chg-pill`, price-history
  `kv-chg` now a tinted pill, dedup CSS (`4b4b1d1`). **AddEntry / Account / Login** — already matched the
  new design (no change): AddEntry keeps datetime-local (date+time); Account keeps every function; Login
  keeps the inline `#FF3B30` error (browser-verified). 245/245 unit green; build clean.
- [x] **D-6** dark-mode sweep (commit `7842975`): fixed token-circle contrast (color-mix via `--ci`),
  the mobile nav bar (now `--bar-bg` theme var), and `pnl-row.dn`/`limit-banner.warn` hardcoded light
  tints → tokens. Verified in browser.
- [x] **D-7** Journal new design (commit `8cc0223`): short labels Intact/Review/Challenged; corrected note
  (thesis feeds the AI); **"Needs a thesis" section + add-thesis-later** via a new `addThesis` handler →
  `updateCoinJournal` (no schema change). 248/248 unit green; browser-verified (write a thesis → coin moves
  needs→theses).
- [x] **D-8** Research/Coins **desktop-only richer card** (commit `bd034b5`): cost·now·P&L·**30d** + full
  conviction always visible + bigger sparkline, shown by default on desktop (no tap); mobile stays
  compact. Verified Portfolio→Research auto-sync (a new holding surfaced the coin) and view-only (no
  delete). 248/248 unit green.

**§D Design revamp — COMPLETE (2026-06-26).** D-1…D-8 shipped; all founder-review items (§7) addressed.

(See [`DESIGN-REVAMP.md`](../design/DESIGN-REVAMP.md) §3 for per-phase scope + DoD, §4 for the interaction decision, §7 for the founder review.)

## DP. Design Pass 2 — founder mockup alignment  (2026-06-27, PLANNED)

Canonical: [`DESIGN-PASS.md`](../design/DESIGN-PASS.md) (4 design changes + decisions). Design-only except the new
cached `/api/trending`. Same design mobile + desktop; holds in dark mode. Built as ONE batch in order:

- [ ] **DP-1 Foundations** — add the icon set (Account: lock/bell/palette/shield/chevron/user/card/folder;
  Learn: 9 module icons + check/target) + shared CSS (pill `.switch`, `.set-row*`, `.port-pill*`,
  `.tx-coin-head`, `.app-avatar`, Learn hero-card/module-footer/icon sizing, trending label, dark-mode
  tokenizations). Enables the rest.
- [x] **DP-2 Quick wins** — ✅ DONE 2026-06-27. Portfolio switcher moved **above** the value card +
  restyled to design-system pills (`.port-pill*`, dark-safe, active = soft-green); Add-transaction
  **coin-name header** (`.tx-coin-head`, `Bitcoin · BTC` + token circle) above Buy/Sell, title
  "Add transaction". Verified: unit 251 green, build clean, browser-verified mobile + desktop.
- [x] **DP-3 Persistent avatar** — ✅ DONE 2026-06-27. One shell-level avatar (`.app-avatar` in a
  relative `.screen-wrap`, below the verify banner) on all 5 tab screens → opens Account; Portfolio's
  duplicate removed; hidden on drill-in screens. Browser-verified on every tab.
- [x] **DP-4 Learn** — ✅ DONE 2026-06-27. Hero band → white card (`.learn-hero`) with XP bar + chips
  (`🔥 N-day streak` hidden at 0 · `N of M lessons`); per-module SVG line icons (new
  `src/components/learn-icons.jsx`, `stroke=currentColor`, lock for locked) replacing the near-invisible
  emoji; icon color `--accent-ink` (adapts light/dark, ~8:1 / ~7.5:1). Module footer collapsed to ONE row
  (`.m-foot`: `X/Y lessons · Z%` + Start/Continue/Review), progress bar kept above. Dark-mode fix: tokenized
  the 3 hardcoded values (today-lesson + module.active gradients → accent-soft/paper-2; m-icon.done →
  `--sg-s`/`--sg`). Sequential unlock untouched. 257 unit green (+3), build clean, browser light+dark +
  mobile/desktop. NB: badges-row left as-is (out of scope).
- [x] **DP-5 Account** — ✅ DONE 2026-06-27. Drill-in settings list via a local `view` sub-state (no router
  change; Account had no local state — all from `useApp` — so nothing was lifted). HOME = identity avatar +
  "Plan usage" summary (Portfolios + Coins bars) + a settings-list card: NavRows (Profile / Plan & billing /
  Portfolios / Security / Privacy & data → chevron) + inline Email-digest pill `.switch` + Appearance
  segmented (reused `.theme-seg`) + Logout. DETAIL views relocate each existing card verbatim (Plan & billing
  = full usage + subscription + upgrade/PayPal). "Product updates & offers" marketing toggle moved into
  Privacy & data; Notifications card dissolved. New token-based/dark-safe primitives: 8 `Ic` row icons
  (chevR/user/card/folder/shield/bell/palette/lock, `currentColor`), `.switch`, `.settings-row*`. Tests
  rewritten for the drill-in (21 cases) + 2 e2e nav tests updated. 259 unit green, build clean, verified
  light+dark + mobile/desktop.
- [x] **Round 2 — founder follow-ups — ✅ ALL BUILT 2026-06-28** — full spec in
  [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 2". R2-3 (Pulse) + R2-4 (Risk) were already implemented; R2-1/2/5/6/7/8 built + verified (TDD, 272 unit green, light+dark, mobile+desktop).
  - [ ] **R2-1** Account avatar consistent on Learn + all tabs (currently overlaps the Learn hero card) — ⚠ confirm placement.
  - [ ] **R2-2** Learn: remove the `.badges-row` "graph icon" (not needed) — trivial.
  - [ ] **R2-3** Research › Portfolio Pulse: new design (Share/Regenerate pills + period headline pill); KEEP 24H/7D/30D where they are + KEEP the offline note.
  - [ ] **R2-4** Research › Portfolio Risk: new design (segmented gradient meter Low/Moderate/High + status badge + lock footer); keep the computation.
  - [ ] **R2-5** Add transaction: restyle ONLY the Buy/Sell tab style + fonts + "AUTO" on the right side of the price input + the "Total cost" row (large display amount).
  - [ ] **R2-6** Journal: new design — serif "Journal" header + avatar + "Write before you buy." + entry cards with coin circle + status pill (Intact/Review/Challenged) + thesis excerpt. Keep logic.
  - [ ] **R2-7** Research › Allocation: color each bar segment + legend dot by the coin's original brand color (`coinColor`) so none repeat.
  - [ ] **R2-8** Research dark-mode bug: "A note on diversification" card is light-on-light (unreadable) — tokenize + audit sibling cards.
  - [ ] **R2-9** Learn dark-mode bug: lesson overlay "THE KEY INSIGHT" box (`.lesson-insight`) light gradient unreadable in dark — tokenize.
- [x] **Round 3 — dark-mode visibility bugs — ✅ ALL BUILT 2026-06-28** — full spec in
  [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 3". All dark-block-only (light byte-for-byte unchanged); R3-1…R3-8 built + browser-verified dark + light.
  - [ ] **R3-1** Add-portfolio "+ Add" button invisible in dark — `.add-name` (`app.css:463`) `background:var(--ink)` (flips light) + hardcoded `color:#fff` → dark-block override text `var(--paper)`.
  - [ ] **R3-2** Back chevron `<` invisible on every drill-in (CoinInfo/Detail/AddEntry/Account) — `Ic.back` (`ui.jsx:9`) `stroke={c.txt}` (#1A1A1A) + `.icon-btn` has no color → set `stroke="currentColor"` + add `color:var(--ink)` to `.ci-app .icon-btn` (flips correctly both modes).
  - [ ] **R3-3** Accent green dull on black — `--accent` doesn't flip; in the dark block, override **foreground** accent rules (`.nt-btn` + ~11 others + Portfolio.jsx:84 inline) to `var(--accent-ink)` (bright #5cd6a6). Keep `--accent` on solid-bg+white-text buttons & borders.
  - [ ] **R3-4** Account avatar black-on-black — `.avatar`/`.acct-avatar` hardcode a near-black gradient; dark-only override (`--accent-soft` bg + `--accent-ink` initial + accent ring). Build with R2-1.
  - [ ] **R3-5** Header tags + colored numbers/pills not shiny (systematic) — `--sg/--sr/--sa/--ai-2/--amber` + `.badge-live` (#1a7a3c) don't flip → dull on black. Dark-block: brighten the semantic tokens (e.g. `--sg:#2ecc71; --sr:#ff6b6b; --sa:#f4c54a; --ai-2:#5b9bff;`) + override `.badge-live`. Makes all tags/%-pills/numbers bright app-wide.
  - [ ] **R3-6** Account fields + buttons white/dull in dark — `.priv-btn.solid` (`app.css:466`, `var(--ink)` bg + `#fff` = invisible), `.priv-btn.danger`/`.logout-btn` hardcoded `#fdecea`. Dark-block overrides (solid→accent; danger/logout→`--sr-s`/`--warn`).
  - [ ] **R3-7** Upgrade/Downgrade modal white + invisible title in dark — inline-styled in `CryptoIdea.jsx:597-634`, outside `.ci-app`, `background:"#fff"` + title has no color. Add classNames (no logic) + dark-block CSS (`!important`): sheet→`--paper-2`, title→`--ink`, boxes→tinted, "Keep My Plan"→dark.
  - [ ] **R3-8** Research "Ask" panel black-on-black — `.ask` (`research-tab.css:180`) dark hero blends into dark page + `h3` inherits `var(--paper)` (flips dark). Dark-block in `.research-root`: add border + `color:var(--ink)`. Cross-ref R2-8.
- [x] **B-PORT — ✅ FIXED 2026-06-29 (backend, not design). "Couldn't create portfolio. Check your connection."**
  Was: the create is correctly denied because the user is **at their plan's portfolio cap** (free 1/pro 3/
  premium 15), and the app **mislabelled** the `permission-denied` as a connection error (surfaces when the
  **client tier > DB tier** — a local/demo upgrade the server never persists; users can't write their own
  `tier`). **Fix (part 1 — the message):** new pure mapper `src/utils/errors.js` `apiErrorMessage`; data layer
  returns `code: error.code`; the ~10 CRUD toasts now show an honest plan-limit/auth/connection message
  (§A1+§A2 fixed together). Verified end-to-end on the emulator (free@ at cap → plan-limit message); 277 unit
  green, build clean. **Part 2** (client tier ↔ DB tier sync) stays operational (admin/seed locally; PayPal
  webhook at go-live). Full write-up in [ERRORS.md](../testing/ERRORS.md) §A1 + §A2.
- [x] **Round 4 — founder follow-up — ✅ ALL BUILT 2026-06-29** — full spec + as-built notes in
  [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 4". Decisions honored (header tags = all 5 tabs · delete warning =
  only when the coin has transactions · simple Cancel/Delete-anyway popup · warn about transactions + thesis,
  hard delete). TDD'd + browser-verified (light+dark, mobile+desktop); 293 unit green; build clean.
  - [x] **R4-1** Research › Coins stat-row consistent (commit `8323fc7`) — `.ps-l` nowrap + smaller
    font/letter-spacing + ellipsis; `.pos-stat` `min-width:0`/center. Layout-only (both modes). Structural
    test added; verified equal-width single-line labels @375 (light+dark) + @1280.
  - [x] **R4-2** Portfolio card split click-zones (commit `373b66d`) — image→CoinInfo (`.ac-img` + hover
    ring + stopPropagation); card background→Add-transaction (Buy). New ctx `startAddTx(coin,type,from)`
    (reused by Detail Buy/Sell, replacing local `openNewTx`) + `txReturn` so back **and** post-save return
    to origin. Tests updated.
  - [x] **R4-3** Delete-coin warning when it has transactions (commit `f420e5e`) — `coin.entries.length>0`
    → Cancel/"Delete anyway" modal (reuses dark-safe `.dg-*`), names tx + thesis lost, hard delete; no-tx
    coins keep the quick 2-tap. No change to `remCoin`. Verified dark-safe + the quick path.
  - [x] **R4-4** LIVE + plan tags on all 5 main-tab headers (commit `b9dc369`) — shared `<HeaderTags/>` for
    Journal/Learn/Search; Portfolio kept inline; Research scoped copy + dark `--sg` `● LIVE` override.
    Per-tab wiring tests + HeaderTags logic tests. Verified all 5 tabs, light+dark.
  - [x] **R4-2-fix** (founder correction 2026-06-29) — Portfolio card **background → Detail** (the position +
    transactions screen), not Add-transaction; image still → CoinInfo. Removed the now-vestigial `txReturn`
    machinery (AddEntry is only ever reached from Detail). Tests updated.
  - [x] **R4-5** (2026-06-29) — AddEntry **AUTO** is now an always-visible, clickable button: shown whenever a
    market price exists, taps to apply it, `.on` when the price matches. Fixes AUTO vanishing after a manual
    edit / after switching coins. Dark-safe. 294 unit green; build clean; browser-verified.
- [x] **DP-6 Search trending + tab redesign — ✅ BUILT 2026-06-29** (founder mockup) — align the Search tab to the
  approved mockup: header title **"Search"** (keep BETA + R4-4 HeaderTags so the add affordance stays clear) +
  "Search any coin…" box; when the box is **empty**, show a **TRENDING** section — a list of trending coins,
  each row = token circle (`CI`/`coinColor`) + name + "SYMBOL · #rank" + a green **Add** button (reuses
  `.trend-item`/`.trend-info`/`.add-pill`; Add → existing `setJournalFor(coin)` Buy-Journal flow). The tab must
  read clearly as "this is where you add coins". Data: **cached `/api/trending`** (CoinGecko `/search/trending`
  → new `cache/trending` Firestore doc, lazy refresh + `Cache-Control` max-age+s-maxage; mirror
  `refreshUniverse`/`getUniverse`/`/api/search` in `functions/index.js`; extract `coins[].item`; add to the 404
  list) + client `fetchTrending()` (mirror `searchCoins`) + `useTrending()` hook (load-once module cache →
  `{trending,loading,error}`). **Offline-degrade:** when trending is empty/loading, fall back to a curated
  `TOP_COINS` slice so the section is never blank (same offline philosophy as prices). TDD: fetchTrending +
  useTrending + Search (empty→TRENDING renders w/ rank + Add; Add opens Buy-Journal). Verify mobile+desktop,
  light+dark.
- [x] **DP-8 Login** — ✅ DONE 2026-06-27. Password show/hide eye toggle (`.pw-eye`, `Ic.eye/eyeOff`);
  "Login" → "Log in" (tab + button); email placeholder `you@email.com`. `#FF3B30` auth-error preserved.
  Browser-verified (toggle password↔text).
- [x] **DP-9 Coin info** — ✅ DONE 2026-06-27 (two commits). **DP-9a (client, design-only):** MARKET DATA =
  Rank/Market cap/24h volume/Circulating; YOUR POSITION = Held/Avg cost/**Unrealised P/L** (reuses `coinPnl`,
  excludes realised sells; colored `pnl-row`, dark-safe); chg pill "(24h)" → "today"; dropped "First tracked" +
  the redundant Value/Transactions rows & in-card button (header Transactions pill kept); Price-history card
  kept. 24h vol + circulating read `prices[id].usd_24h_vol`/`.circulating` with an em-dash fallback (never
  NaN). No new CSS. **DP-9b (backend):** `refreshUniverse` now persists `v` (total_volume) + `cs`
  (circulating_supply) — already returned by `coins/markets`, so **zero extra upstream cost** — and the
  `/api/prices` handler emits `usd_24h_vol` + `circulating`. Verified: 254 unit green, build clean, live API
  probe + browser (light+dark) → "$25.81B" / "20,048,900 BTC".
- [x] **DP-10 Transactions (Detail)** — ✅ DONE 2026-06-27. Tx list wrapped in a card (`.tx-list`) +
  two-column rows (`.tx-left` badge+amount+date · `.tx-right` price + Cost/Recv, right-aligned). Summary
  card + green TOTAL P/L already matched. Browser-verified (added a tx → renders in the card).
- [x] **DP-11 White mobile nav** — ✅ DONE 2026-06-27. Hoisted the desktop white floating pill to ALL
  sizes (`.tabbar` → `--paper-2` white bg, `border-radius:999px`, shadow, floating `bottom:14px`,
  `max-width:calc(100% - 24px)`); active tab gets the soft-green highlight on mobile too; dark-safe
  (token-driven). Added `app-shell` `padding-bottom:96px` to clear the floating pill. Browser-verified
  mobile (white pill + active highlight) + desktop.
- [x] **DP-12 Consistent tab widths** — ✅ DONE 2026-06-27. All 5 tab screens now use the 1040 wide track
  (added research/journal/learn/search to `WIDE_SCREENS`) so they're the same size as Portfolio on
  desktop (also aligns the persistent avatar's right edge across tabs). Verified all tabs = 1040 @1280.
  NB: Research Overview's single-column cards stretch wide at 1040 — cap inner width later if desired.
- [x] **DP-7 Polish — ✅ BUILT 2026-06-29.** Systematic dark-mode contrast sweep (computed-style probes) across
  all 5 tabs + every drill-in → clean except two Research daily-brief icons (`.ic-up` non-flipping `--accent`;
  `.ic-watch` hardcoded light-pink bg), fixed dark-block-only in `research-tab.css`. Re-swept clean; 304 unit
  green; build clean; light + dark, mobile + desktop verified.

**✅ §DP DESIGN PASS 2 — COMPLETE (2026-06-29).** Every phase shipped (DP-1…DP-12 · Round 2 · Round 3 ·
§J · Round 4 + follow-up · DP-6 · DP-7). Whole app aligned to the founder mockups, verified light + dark,
mobile + desktop. (Backend B-PORT also fixed — ERRORS.md §A1/§A2.)

- [x] **Round 7 — card consistency aligned to the Research _Portfolio Pulse_ card — ✅ BUILT 2026-06-30 (`3e9d1f1`)**
  (founder follow-up; full spec in [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 7"; **supersedes Round 5**). Grounded
  via a 6-agent read-only mapping. Decisions locked (AskUserQuestion): frame scope = **match base chrome
  everywhere, gradient frame on hero cards only**; Pulse buttons = **soft green pill**; diversification icon =
  **accent-tinted glyph**. **R7-1** Journal `.j-entry`/`.nt-row` radius `--radius-sm`→`--radius` (= old R5-2);
  **R7-2** card-ify Search **trending only** (`.trend-card` base chrome + `.grid-auto`, typed results stay
  `.trend-item`; = old R5-1); **R7-3** Portfolio `.value-card` → Pulse green→blue gradient frame via the
  single-element `padding-box/border-box` technique (no wrapper, no handler change) + lift shadow to `--sh`;
  **R7-4** Pulse `.regen` Share/Regenerate → `.tx-btn.buy` soft-green pill (also fixes its dark invisibility);
  **R7-5** populate the empty `.dic` "diversification" icon (`OverviewView.jsx:74` is `<div className="dic" />`)
  with a glyph tinted `--accent` (visible light + dark); **R7-6** add the Portfolio `.asset-card:hover`
  shadow-lift (`transition` + `:hover{box-shadow:var(--sh)}`) to `.j-entry` + `.trend-card` so selectable cards
  share the affordance. **Zero new dark rules** (frame is theme-invariant; pill/icon tokens already flip); light
  mode unchanged. Build R7-1 → R7-6 → R7-4 → R7-5 → R7-3 → R7-2 on "go".
- [x] **Round 8 — Journal thesis readability (previews · white-card popups · Read/Breakdown · X-close) — ✅ BUILT
  2026-06-30 (`c2e2079`)** (founder Journal screenshots; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 8").
  Grounded via a 3-agent read-only mapping. **Gap checked:** thesis text already capped 2000 chars/field server-
  side (`firestore.rules` validJournal/validFunnel) → display bug only, no rule change. Decisions locked
  (AskUserQuestion): Read popup = **full breakdown** (Why + change-my-mind + dilution/volume/yield); **Read shown
  always** next to Edit; **X replaces the back-arrow** on the Journal thesis popups; list cards = **2-line preview,
  equal height**. **R8-1** `.j-excerpt` add `overflow-wrap:anywhere` + 2-line `min-height` (consistent cards);
  **R8-2** detail popup → wrap `.j-read` (`overflow-wrap`), wrap read blocks in white `.card` chrome, replace
  back-arrow with an **X** top-right (new `Ic.close`, scoped `.ov-close` — don't mutate shared `.overlay-head`),
  add an always-on **Read** pill next to Edit; **R8-3** new read-only **Breakdown** overlay (reuse `.ci-app.overlay`,
  X-close, white cards, all fields `pre-wrap`+`overflow-wrap`). No data/handler change; zero new dark rules. Build
  R8-1 → R8-2 → R8-3 on "go".
- [x] **Round 9 — login polish · Research card heights · in-tab portfolio popup — ✅ BUILT 2026-06-30 (`1389418`)**
  (founder follow-ups; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 9"). Grounded via a 3-agent read-only
  mapping. Decisions locked (AskUserQuestion): login = all three (white toggle pill + align Forgot-password +
  dark-safe error); portfolio popup = **centered card dialog** with X. **R9-1** login: (a) `.auth-toggle button.on`
  near-black → **white pill** like `.seg` (`app.css:407`; matches screenshot, both modes, dark-safe); (b) restyle
  `ForgotPass.jsx` (one-off inline) onto the auth design; (c) dark-block `html[data-theme="dark"] .auth-err
  {background:var(--sr-s)}` (keep test-locked `#FF3B30`). **R9-2** Research Coins equal-height: `.coins-grid`
  `align-items:start`→`stretch` + `.coin-card{height:100%;display:flex;flex-direction:column}` (root cause: cards
  size to content; `.research-root`, dark-safe). **R9-3** Portfolio "+" (`PortfolioBar.jsx:15`, today
  `setScreen("account")`) → opens a centered white dialog (`.cm-scrim`/`.cm-card`, X via new shared `Ic.close`)
  with a name field → existing `addPortfolio` (plan-limit toast already wired); only shows when below the cap
  (free1/pro3/premium15); Account Portfolios mgmt unchanged. One new dark rule (R9-1c); light otherwise unchanged.
  Build R9-2 → R9-1a → R9-1c → R9-1b → R9-3 on "go".
- [ ] **Round 5 — card design consistency — ⤴️ SUPERSEDED by Round 7 (2026-06-29).** Earlier, plainer version
  (unify on `.asset-card`); Round 7 keeps its two moves but upgrades the canonical chrome to the Pulse card and
  adds the button + icon fixes. See [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 5" (marked superseded). Build Round 7.
- [x] **Round 6 — dark-mode visibility follow-up — ✅ BUILT 2026-06-30 (`9cb0759`)** (founder screenshots; full spec
  in [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 6"). Three **dark-block-only** fixes (light untouched): **R6-1**
  tab footer `.disclaimer` (+ `.research-root .disclaimer`) `--ink-faint`→`--ink-soft` (readable on dark);
  **R6-2** `.field-input` dark border (`--line-strong`→`--ink-soft`) + placeholder (`--ink-faint`→`--ink-soft`)
  so Account/form fields are visible (typed text already light); **R6-3** the R4-3 delete-coin modal title
  (`Detail.jsx`, hardcoded `c.txt` #1A1A1A → dark-on-dark) → `var(--ink)` so the "Delete {coin}?" header shows
  in dark. Build R6-3 → R6-1 → R6-2 on "go".
- [x] **Round 10 — full-window paper background · positive-only Buy/Sell amounts — ✅ BUILT 2026-06-30 (`9246fda` R10-2 · `cd1922b` R10-1)**
  (founder Add-transaction screenshot; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 10"). Decisions locked
  (AskUserQuestion): (A) extend the **paper** bg to the whole window, both modes; (B) **both** block-typing +
  clear submit error, for Amount & Price. **R10-1** redefine the `--app-bg` token to the paper tone (`app.css`
  `:root` `#ffffff`→`#f8f7f3`; dark `#0f0e0c`→`#14130f`) so the body + the 1040 wrapper (`CryptoIdea.jsx:623`,
  outside `.ci-app` so `var(--paper)` can't be used directly) + maintenance screen are seamless paper edge-to-edge
  (intentionally changes light too). **R10-2** positive-only Buy/Sell (functional): `AddEntry` Amount/Price are
  `type=number` with no `min`/validation → `-1` passes → rules reject (`amount>0`) → `permission-denied` →
  `apiErrorMessage` mislabels it "transaction limit — upgrade" (B-PORT class). Fix: R10-2a strip `-` on input +
  `min=0`/`inputMode=decimal`; R10-2b validate `amt>0`/`prc>0` in `addEntry` **before** the tx-limit check with a
  clear "… must be a positive number" message. TDD `AddEntry.test.jsx`. Build R10-2 → R10-1 on "go".
- [x] **Round 11 — dark-mode account/transaction text visibility · Learn quiz Submit rework — 📋 PLAN ONLY
  (2026-06-30)** (founder screenshots; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 11"). Decisions locked
  (AskUserQuestion): (1) lift dim text, keep hierarchy; (2) quiz = pick → Submit → correct=green+complete,
  wrong=red+hint+retry (gated). **R11-1** `.sr-value` (tier + `1/1`) `--ink-faint`→`--ink` (white dark / black
  light, both modes). **R11-2** dark-block: `.tx-rprice`→`--ink` (white $), `.tx-rcost`→`--ink-soft`. **R11-3**
  dark-block lift `--ink-faint`→`--ink-soft` for `.usage-note`/`.acct-label`/`.acct-current`/`.priv-text`/
  `.priv-confirm`/`.priv-msg`/`.toggle-hint`/`.pr-sub` + inactive `.seg-btn`. **R11-Q (functional)** rework
  `LessonOverlay` (`Learn.jsx:47`): select-only `.quiz-opt.selected` (no auto-reveal), always-on **Submit**
  (disabled until picked) → correct=green banner+`onComplete`, wrong=red banner+constructive hint+retry (gated);
  **X-close** (reuse Round 8 `Ic.close`/`.ov-close`); new `.quiz-result.ok/.bad` token banners. TDD Learn.test.jsx.
  Build R11-1 → R11-2 → R11-3 → R11-Q on "go".
- [x] **Round 12 — delete-coin confirm leaks across navigation · auto-disarm the "Remove" pill — 📋 PLAN ONLY
  (2026-07-01)** (founder screenshot + repro; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 12"; bug in
  [ERRORS.md](../testing/ERRORS.md) §A3). **Behavioural/error fix.** Repro: arm delete on a **no-transaction** coin (shows
  the "Remove" pill) → leave it → tap **+ Buy** and add a transaction → return to the coin → the "Delete {coin}?
  This coin has 1 buy/sell transaction…" **warning modal pops unbidden**. Root cause: `confirmDel` is **app-level**
  state (`CryptoIdea.jsx:129`, via ctx `:616`) so the armed flag survives navigation — `startAddTx` (`:497`), the
  tx-row edit tap (`Detail.jsx:69`), and tab switches never reset it; on return with `entries.length>0` the modal
  guard (`Detail.jsx:88`) fires on the stale flag. **R12-1** move `confirmDel` into **Detail-local `useState`** so
  it clears on unmount (closes every leak path; drop from ctx + `:129`). **R12-2** auto-disarm the inline "Remove"
  pill after **~3s** (`useEffect` timer keyed on the flag + `entries.length`, `clearTimeout` on cleanup) → reverts
  to the idle trash ("first step"); modal (entries>0) does NOT auto-dismiss. Assumed defaults (veto on "go"): 3s ·
  inline-pill-only · local-state fix. TDD: rework `Detail.test.jsx` (currently injects `confirmDel` via provider →
  drive via the trash button) + add leak/auto-disarm/modal-still-works cases. Build R12-1 → R12-2 on "go".
- [x] **Round 13 — header uniformity · sub-title cleanup · disclaimer visibility · Research Risk simplification ·
  Learn header frame — 📋 PLAN ONLY (2026-07-01)** (founder screenshots + notes; full spec
  [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 13"). Decisions locked (AskUserQuestion): disclaimer → **readable muted**
  (`--ink-soft`) light mode; remove **3** sub-lines (Research/Journal/Search), keep Learn eyebrow; unify headings to
  **28px**; **Learn header only** (not Account). **R13-1** `.disclaimer` `--ink-faint`→`--ink-soft` (both `app.css`
  + `research-tab.css`; drop now-redundant dark rules). **R13-2** delete Research `.sub`, Journal "Write before you
  buy.", Search "Find any coin…". **R13-3** remove the Research Risk `.sources` block (chips + "Updated just now") +
  prune dead `freshness`/`failed`/`asOf`/`status`. **R13-4** trending pill "Add"→"+ Add" (`Search.jsx:99`). **R13-5**
  Research 29→28px; Journal/Search drop inline `fontSize:24`; Learn via R13-6. **R13-6** restructure Learn to the
  `apphead → card` pattern (title "Your Investing Edge" 28px + BETA + HeaderTags → avatar floats over a plain header
  like other tabs) + give the XP card (`.learn-hero`) the value-card gradient frame (theme-invariant, zero new dark
  rules). **R13-7** Journal "No theses yet"→"No thesis yet". TDD: fix walkthrough:89 ("Write before you buy." removed),
  keep "Your Investing Edge"; Search trending tests → `getAllByText("+ Add")`; add sub-title-absent / risk-chips-absent
  / "No thesis yet" / 28px-probe cases. Build R13-1→…→R13-7 on "go".
- [x] **Round 14 — Portfolio Risk = market-cap tiers (allocation-weighted) — FUNCTIONAL, 📋 PLAN ONLY
  (2026-07-01)** (founder; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 14"). The Research Risk meter switches
  from concentration to **market cap**: High `<$100M` · Medium `$100M–$1B` · Low `$1B–$100B` · Super-low `≥$100B`
  (BTC/ETH). Decisions locked (AskUserQuestion): **allocation-weighted** aggregate · market-cap **replaces**
  concentration on the meter (concentration stays as the Allocation "High concentration" tag) · unknown mcap →
  **High** · **keep 3-band** meter (Low/Moderate/High). **R14-1** thread `usd_market_cap` through
  `buildResearchPrices` (`priceAdapter.js:55`) + `computePortfolio` (`portfolio.js:15`) + demo caps in
  `FALLBACK_PRICES`. **R14-2** pure `marketCapTier()` + score (`.95/.65/.30/.05`). **R14-3** rewrite `deriveRisk`
  → `score = Σ(alloc%×tierScore)/Σalloc%`, return `{level, score, breakdown}`, drop `top`/`top2`. **R14-4**
  `RiskMeter` fill = `round(score×20)` + market-cap `riskNote(breakdown,level)`; scale stays Low/Moderate/High.
  **R14-5** `riskColor.js` level pill Low→green/Moderate→amber/High→red. Scores + band cuts are tunable knobs. TDD:
  new `research-risk.test.js` (tier boundaries, weighted aggregate, unknown→High, note copy) + update
  `research-adapters.test.js` for the `marketCap` field; AllocationBar concentration tag unchanged. Independent of
  Round 13 (both touch the Research Overview card). Build R14-1→…→R14-5 on "go".
- [x] **Round 15 — one popup design: white rounded card for EVERY popup — 📋 PLAN ONLY (2026-07-01)** (founder
  Journal-Breakdown screenshot; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 15"). Unify all popups to the
  Round 9 `.cm-card` look (centered white rounded card on a dimmed scrim, X-close). **3 patterns today → 1:**
  `.ci-app.overlay` (5 popups: Journal AddThesis/Detail/Breakdown, Learn lesson, Search Buy-Journal) + `.dg-sheet`
  bottom-sheets (Detail delete, upgrade/downgrade) + `.cm-card` (PortfolioBar, the target). Assumed defaults (veto on
  "go"): "white"=`--paper-2` (theme-aware); centered card + `max-height:90vh` + internal scroll (mobile+desktop);
  sheets→centered cards; X-close everywhere; excludes the error toast + loading/maintenance. **R15-1** shared
  `<Modal>` component + `.cm-*` size variants (sm confirm / md form) + scrollable `.cm-body` + sticky `.cm-head`
  (drop `ci-slide-up`). **R15-2** migrate the 5 overlays (reconcile white-on-white inner cards in Breakdown/Detail;
  back-arrow→X in Learn/Search). **R15-3** migrate the 2 bottom-sheets (delete inline styles + `.dg-sheet`).
  **R15-4** PortfolioBar adopts `<Modal>`. Cleanup retired `.overlay`/`.dg-sheet`/`.back-btn`/`ci-slide-up`. TDD:
  content/behaviour tests stay green (keep text + close semantics + `role="dialog"`); add a Modal test; probe card =
  `--paper-2`/`--radius`/`--sh-lg` centered, light+dark. Coordinates with Round 12 (state) — either order. Build
  R15-1→…→R15-4 on "go". **Decisions LOCKED (AskUserQuestion 2026-07-01):** full-screen sheet on phones / centered
  card on desktop (one `@media`) · scrim tap closes read/confirm popups but NOT text-entry forms (`dismissOnScrim`
  prop) · confirms → centered cards · X-close everywhere · white=`--paper-2`.
- [x] **Round 16 — Research "Coins" cards: align numbers + buttons to the bottom — 📋 PLAN ONLY (2026-07-01)**
  (founder screenshot; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 16"). Cards are already equal-height
  (`.coins-grid align-items:stretch` + `.coin-card` flex-col, `research-tab.css:154-156`) and desktop shows the
  detail always-expanded (`:181`), but `.cc-detail` (stats + "Ask AI" button) isn't bottom-pinned → the number row +
  button float at different heights across a row (Synapse's extra "no coverage" chips push it down). **R16-1** add
  `margin-top:auto` to `.research-root .cc-detail` → slack collapses above it, pinning `.pos-stats` + `.cc-ask` to
  the bottom (fixed-height → numbers align, buttons align). CSS-only, one line. Probe: `.cc-ask` share `bottom`,
  `.pos-stats` share `top` across the row. *(The same message's Account "Starter/Pro/Premium" + "1/1" darker-in-light
  ask is already **Round 11 R11-1** — not duplicated.)*
- [x] **Round 17 — FIX Pro/Premium can't add a portfolio (tier never reaches the DB) — FUNCTIONAL, ✅ BUILT
  2026-07-01** (founder; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 17"; bug [ERRORS.md](../testing/ERRORS.md) §A1
  part 2). Root cause: demo upgrade sets `user.tier` + `saveProfile`→**localStorage** (`CryptoIdea.jsx:183`), never
  Firestore; the rule reads the DB `users/{uid}.tier` (still `free`, cap 1) → `permission-denied` → plan-limit
  message, even though Pro 3 / Premium 15 caps already exist. Decision locked (AskUserQuestion): **dev-only
  tier-persist path**. **R17-1** emulator/dev-gated write of the caller's Firestore `tier` (wire into the demo
  upgrade-success `checkSubscriptionStatus`, `:572`) so the in-app upgrade works end-to-end locally; **never**
  client-writable `tier` in prod (keep the rules block). **R17-2** prod stays PayPal/admin (doc it). **R17-3**
  (optional) "+ Add" reads the enforced DB cap so it doesn't invite a denied action. TDD: rules/integration — a
  DB-`pro` user creates 2nd+3rd, blocked at 4th; dev path inert without the flag; the client-`tier`-write rejection
  test stays green. Build R17-1→R17-3 on "go".
- [x] **Round 18 — dark-mode border visibility: soft-white edges on cards · pills · popups + Search separator — 📋
  PLAN ONLY (2026-07-01)** (founder dark-mode screenshots; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 18").
  Dark-block-only (light untouched). Decisions locked (AskUserQuestion): **soft ~16% off-white** border
  `rgba(236,233,225,.16)` · **outer card/popup borders + Search line only** (internal row-dividers stay subtle) ·
  **neutral pills only** (colored status pills untouched). Constraint: cards + dividers + the search line all share
  `--line-2`, so a token bump would over-brighten dividers → use **targeted dark overrides**. **R18-1** add dark
  `--edge:rgba(236,233,225,.16)` + `border-color:var(--edge)` on card surfaces (`.card`/`.j-entry`/`.nt-row`/
  `.module`/`.asset-card`/`.trend-card`/`.tx-list`/`.learn-hero`/`.today-lesson` + research `.card`/`.coin-card`/
  `.trend-card`; `.value-card` keeps its gradient frame). **R18-2** border on popups (`.cm-card` + the Round-15
  `<Modal>` — composes). **R18-3** neutral pills (`.learn-chip`/`.port-pill`/`.pill-ghost`/`.btn-ghost`/`.src-chip`/
  `.tf-pills`/`.seg`…); colored pills left alone. **R18-4** `.trend-item` border-bottom → `--edge`. Internal dividers
  (`.kv-row`/`.tx-row`/journal-Q) stay `--line-2`. Probe: dark card border ≈16% white, `.cm-card` has a border,
  `.trend-item` brighter, `.chg-pill`/`.kv-row` unchanged, light byte-for-byte unchanged. Build R18-1→R18-4 on "go".
- [x] **Round 19 — portfolio delete-confirm · portfolio rename · 2-step transaction delete · transaction
  pagination · transaction ordering · mobile small-dialog centering · Learn header · Learn XP bar · desktop coin
  popups — ✅ BUILT 2026-07-01** (commits c2b7b29/53649f6/d8e6095/9ff3865 + modal-scrim fix b1d1a5e; 359 unit + 22
  rules green; browser-verified desktop+mobile)** (founder; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 19"). Nine
  Portfolio/Learn safety+polish gaps. Decisions locked (AskUserQuestion): portfolio delete **mirrors the coin**
  (empty → two-tap trash w/ ~3s auto-disarm; has-coins → blocking warning `<Modal>`) · rename from **Settings +
  the switcher bar** (edit ✎ on the active pill) · transaction delete = **inline two-tap on the row** (arm →
  confirm, ~3s auto-disarm; no per-row modal) · pager = **windowed numbers** (Prev · 1 … 4 5 6 … 100 · Next).
  **R19-1** portfolio delete confirm — `<PortRow>` w/ component-local armed/warn state (R12 lesson; the delete is
  currently unguarded at `Account.jsx:234` → cascades all coins+tx); keep the last-portfolio guard. **R19-2**
  rename — new **wired** `updatePortfolioName(uid,pid,name)` data fn + `renamePortfolio`/`startRename` handler +
  one shared `<Modal title="Rename portfolio">` reached from the Settings row AND the switcher pill; **no rules
  change** (portfolio `update` already bounds `name` 1–50 + leaves `coinCount` — add a rules *test*). **R19-3**
  tx two-tap — row-local `confirmTxId` in Detail.jsx (currently one-click `remEntry` at `Detail.jsx:98`); keep the
  sell-dependency guard + `stopPropagation`. **R19-4** pagination — local `txPage`, `PAGE_SIZE=50`, `slice` + a
  windowed `.tx-pager` (tokenized: `--paper-2`/`--line`/`--accent-soft` active/`--edge` in dark); pure client
  slicing (caps: free 50 / pro 2,000 / premium 5,000). **R19-5** tx ordering — newest on top: sort by `date` desc
  then `createdAt` desc (a *backdated* tx sorts to its real date). The `createdAt` field is **already written**
  (`serverTimestamp()`, firebase-database.js:284) & **already read** (line 145) → **no rules/schema/index change**;
  fix = a pure `sortTx` helper + a tolerant `createdAt` normalizer (Timestamp/`{seconds}`/number/ISO/0), Detail
  uses it, optimistic add stamps `en.createdAt=Date.now()`, and the **CSV export flips to newest-first**
  (export-csv.js:76 — decision: match the app). All confirm/page state **component-local**; no new dep, no new
  attack surface. **R19-6** small dialogs centered on mobile — `@media(max-width:560px)` (app.css:666) currently
  full-screens `.cm-sm` too (the white-screen add-portfolio popup); split so `size="sm"` stays a centered card
  (gutters + radius) and only `size="md"` keeps the full-screen sheet (`<Modal>` adds a `cm-scrim-{size}` class).
  **R19-7** rename the Learn header string "Your Investing Edge" → **"Learn"** (Learn.jsx:106; BETA/tags stay; matches
  every other tab + the nav label; fixes too-long-on-mobile) + update the 2 tests asserting the old copy. Both
  design-only. **R19-8** Learn XP bar — the fill = `level.pct` resets to 0% each level-up (empty/grey right after a
  module); make ONE cumulative bar: pure `overallPct(xp)=min(100,round(xp/MAX_XP*100))` (`MAX_XP=50×totalLessons=2,500`)
  + `LEVEL_MARKERS` (L2 12%/L3 28%/L4 48%/L5 80%), `.xp-fill` width=overallPct + tick-markers along `.xp-bar`, green→blue
  frame gradient; keep the per-level "X/Y XP to Level N" label; 100% = all 50 lessons. No data/rules change. Build order
  R19-2 → R19-1 → R19-5 → R19-3 → R19-4 → R19-6 → R19-7 → R19-8 on "go". **R19-9** desktop-only popups —
  CoinInfo/Detail/AddEntry are full-screen `screen`-machine entries (CryptoIdea.jsx:719-721; launch: Portfolio
  image→CoinInfo, card-bg→Detail, Detail Buy/Sell→AddEntry). On desktop wrap them in `<Modal size="lg" ~560>` over
  the Portfolio base (new `useIsDesktop()` matchMedia hook @561px; screens render body-only + hide their back-arrow
  when `isDesktop`; **X-close + title**; **AddEntry stacks over Detail**; X targets = current back targets; AddEntry
  `dismissOnScrim=false`); **mobile unchanged** (full-screen). Presentation/routing only — no data/rules/handler
  change; a deliberate desktop affordance divergence (responsive-app skill). Build LAST:
  …→ R19-8 → R19-9 on "go".
- [x] **Round 20 — Learn lesson player: remove the L1–L5 markers · module-scoped Next/Previous nav · compact
  2-button row · Review-from-start — 📋 PLAN ONLY (2026-07-01)** (founder Learn screenshot; full spec
  [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 20"). Reworks the lesson flow. Decisions locked (AskUserQuestion):
  progress bar — remove **only** the L1–L5 tick-marks/labels, **keep** the gradient fill + level title + the
  "300 / 700 XP to Level N" line · "Next →" advances **within the module**, the module's **last** lesson → "Done →"
  (closes) then pick the next module from the grid (**module-scoped**, not seamless-across-50) · the oversized
  primary becomes a **compact 2-button row in the same place** — **"Previous" + "Submit"** (Submit → "Next →" after
  a correct answer, → "Done →" on the last lesson), **identical on mobile & desktop**; "Previous" steps back a
  lesson (disabled on the first); a card's **"Review →"** opens the module from **lesson 1** · review = **start
  fresh** (re-pick + Submit, no pre-reveal). **R20-1** trim Learn.jsx:116-124 (drop the `.xp-tick` + `.xp-marks`
  render) + dead CSS app.css:276-280; fill stays `overallPct`. **R20-2** `LessonOverlay` holds a **module + index**
  (`{module,startIdx}`); a useEffect on idx resets picked/result; right button = Submit → "Next →" (`idx<last`) /
  "Done →" (last); `openModule` startIdx = first-incomplete, or **0** for a done module (Review-from-start). **R20-3**
  `.lesson-nav` flex row: "Previous" (`.btn-ghost`, `disabled={idx===0}`, `setIdx(idx-1)`) + the right button —
  compact, one row, **no media divergence** (CSS-only responsive). **R20-4** re-opened/Previous'd lessons start
  fresh (re-pick + Submit); `complete` stays idempotent (no double XP). **Presentation only** — no data/rules/schema
  change; all overlay state component-local; net removes the R19-8 marker CSS. Build R20-1 → (R20-2+R20-3+R20-4) on "go".
- [x] **Round 21 — error toast visible above every popup (raise above the scrim) + ~6s auto-dismiss — 📋 PLAN ONLY
  (2026-07-02)** (founder Sell-BTC screenshot: on desktop the validation error renders behind/outside the popup,
  invisible; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 21"). Root cause: the global `showErr` toast
  (CryptoIdea.jsx:676) is `z-index:9500` — the **same** as the `.cm-scrim` (app.css:671) — and the scrim paints
  later → its 50%-black dims/hides the toast under every popup. Every popup error funnels through this one toast
  (AddEntry Buy/Sell, add/rename/delete portfolio, add/remove coin, tx delete), so one fix covers all; the Journal
  thesis popups already use an inline `.j-err` inside the card (left as-is). Decisions (AskUserQuestion): **one
  raised top banner** (render above every scrim, fully bright — no per-popup docking) · **~6s auto-dismiss** (double
  the 3s). **R21-1** bump the toast to `z-index:10000` (> scrim 9500 + the stacked AddEntry modal) + move its inline
  styles into a `.ci-toast` class (same look, both themes, `role="alert"`). **R21-2** `showErr` timeout 3000→6000
  (CryptoIdea.jsx:183). Presentation only — one z-index + one timeout; no data/rules/handler change; verify
  in-browser (a z-index bug jsdom can't see). Build R21-1 → R21-2 on "go".
- [x] **Round 22 — coin-holding tx rows: total as the bold number, coin price below ("/ SYMBOL"), drop "Recv/Cost" —
  📋 PLAN ONLY (2026-07-02)** (founder coin-holding tx list; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 22").
  Today the right column (Detail.jsx:116-119) shows the **coin price** bold on top (`.tx-rprice`) and **"Recv"/"Cost"
  + total** muted below (`.tx-rcost`) — "Recv" is unclear + redundant with the SELL/BUY tag. Decisions
  (AskUserQuestion): per-coin line = **"$84,000.00 / BTC"** (price + " / {symbol}") · total = **plain bold** (no
  sign/color). **R22-1** swap the two lines + drop the `{isSell?"Recv":"Cost"}` word: top (bold) = total
  `${(amount×priceAtBuy).toLocaleString(2dp)}`, below (muted) = `fmtP(priceAtBuy)+" / "+coin.symbol` (keeps adaptive
  precision for cheap coins). **R22-2** app.css — rename `.tx-rprice`→`.tx-rtotal` (bold ~14px `--ink`) + reuse
  `.tx-rprice` for the muted price line (11.5px `--ink-faint`; dark brightens to `--ink-soft`); update the 2 base +
  2 dark rules. Same Detail component → lands in both the mobile full-screen view and the desktop R19-9 popup;
  "Recv"/"Cost" is the only occurrence (Detail.jsx:118). Display-only — no data/rules/handler change (total still
  `amount×priceAtBuy`). Build R22-1 + R22-2 (one commit) on "go".
- [x] **Round 23 — Portfolio Risk uses real coin RANK: graduated (log-scale) risk + mega-cap ($100B+) safety floor —
  📋 PLAN ONLY (FUNCTIONAL) (2026-07-02)** (founder Research→Portfolio Risk; full spec
  [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 23"). Refines the R14 market-cap-tier model. Decisions (AskUserQuestion):
  **real live CoinGecko rank** per coin · **mega-cap safety floor** (≥40% in $100B+ caps → meter can't read High) ·
  **graduated by size** (smooth log-scale, no tier cliffs). **Key find:** rank is **already fetched + cached** in
  the universe doc (functions/index.js:846, `market_cap_rank`, hot 5-min / daily) but `/api/prices` omits it → **no
  new endpoint**, just surface it. **R23-1** add `usd_market_cap_rank: m.rank` to `/api/prices` (index.js:952/954;
  on-demand refresh already merges-preserves rank). **R23-2** plumb through — `buildResearchPrices` reads
  `usd_market_cap_rank`, `computePortfolio` carries `rank` onto holdings (+ demo rank in FALLBACK_PRICES/TOP_COINS);
  `useLivePrices` passes the field through untouched. **R23-3** rewrite `deriveRisk`: continuous `coinRisk` on
  `log10(rank)` (rank 1 → ~0.02 … no rank → 0.95; cap-log fallback), allocation-weighted mean, + **mega floor**
  (megaAlloc ≥ 40% caps the score below the High cut). **R23-4** `riskNote` → rank/size wording + names the anchor
  when the floor applies. Pure functions, heavily unit-tested; backend field verified in the emulator. No new
  endpoint/upstream/dep, no rules change (rank is read-only server data). Build R23-1+R23-2 → R23-3+R23-4 on "go".
- [x] **Round 24 — Journal: auto-save the thesis on close (X) + keep the Save button + flag incomplete theses —
  📋 PLAN ONLY (FUNCTIONAL) (2026-07-02)** (founder "Add your thesis" popup; full spec
  [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 24"). Today the X **discards** everything typed and a thesis needs BOTH
  questions to save. Decisions (AskUserQuestion): partial on close → **save + flag incomplete** (never lose work) ·
  buttons → **keep "Save thesis" + X (both save), remove Cancel** · scope → **whole journal** (Add + Edit + findings).
  **No rules change** — `validJournal` already allows partial (empty strings pass); `addThesis` already saves partial
  (no-op only if fully empty); `editThesis` requires both (partial edit = safe no-op). **R24-1** AddThesis: `persist()`
  with no `thesisError` gate; wire both the Modal X and "Save thesis" to `closeWithSave` (fire-and-close, optimistic);
  drop Cancel + `.j-err`. **R24-2** derived `isThesisIncomplete(j)` → a yellow "Incomplete" pill (reuse `j-review`)
  in the list + detail, auto-clears when both filled; **stored `status` unchanged** (derived, not "review" — avoids a
  rules/enum change + status conflation; deviation from the literal preview, noted). **R24-3** detail X = `closeDetail`
  that persists the in-progress thesis edit (editThesis no-ops on partial) + funnel (saveFunnel if changed) before
  closing; keep the edit-form Cancel + "Save findings" as explicit affordances. Component-level; no new dep/attack
  surface. Build R24-1+R24-2 → R24-3 on "go".
- [x] **Round 25 — coin icon clickable + hover/press shadow everywhere (opens Coin info) + Transactions button
  restyle — 📋 PLAN ONLY (FUNCTIONAL) (2026-07-02)** (founder; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md)
  "Round 25"). Today only the Portfolio icon is clickable (`.ac-img` + accent-ring hover → CoinInfo); elsewhere `<CI>`
  is plain. Decisions (AskUserQuestion): Transactions button = **accent-filled** (thesis `.j-edit-btn` look) · scope
  = **browse/list icons** (Portfolio · Search · trending · thesis cards · holdings header; decorative in-popup
  headers stay plain). Surfaces 2 gaps: **return-to-origin** (CoinInfo close is hardcoded `setScreen("portfolio")`)
  + **empty data** for non-held Search/trending coins (prices only polled for held). **R25-1** shared `<CoinIcon coin
  size>` wrapper + `.coin-ic` class (accent ring `:hover` **+ press `:active`**, keyboard-accessible), folds in
  `.ac-img`. **R25-2** swap plain `<CI>`→`<CoinIcon>` at Search:67/94, Journal:311/331, Detail:72 (stopPropagation
  keeps row actions). **R25-3** CoinInfo → an **`infoCoin`-driven overlay** (`{infoCoin && <Modal
  size=lg/md><CoinInfo/></Modal>}` over the current screen; close = `setInfoCoin(null)`, tab untouched) — remove
  coinInfo from the screen machine (+ NARROW_SCREENS / `at` / R19-9 over-Portfolio special case); body-only always.
  **R25-4** on-demand `fetchPrices([id])` for a non-held coin so Market Data isn't "—" (cached proxy, flat cost).
  **R25-5** Transactions → accent pill, shown **only for held coins** (portCoin). Overlay refactor NET removes
  concepts + a latent close-to-Portfolio bug; no new endpoint/dep, no rules change (read-only). Update R19-9 tests.
  Build R25-1+R25-2 → R25-3+R25-4 → R25-5 on "go".
- [x] **Round 26 — copy fix: delete-portfolio warning "theses" → count-aware "its transactions and thesis" —
  📋 PLAN ONLY (2026-07-02)** (founder; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 26"). The has-coins
  delete warning (Account.jsx:84) pluralizes coin/coins but leaves "their … theses" for 1 coin (each coin has one
  thesis). Decision (AskUserQuestion): **count-aware, delete message only** — `const many = p.coins.length>1` →
  "1 coin and all its transactions and thesis" vs "N coins and all their transactions and theses"; **leave** the
  Journal "Your theses (N)" header (a correct plural). Copy-only, no logic change. Update the R19-1 Account
  warning test. Build R26-1 on "go".
- [x] **Round 27 — Billing: dark-mode readability + selected-card fix + desktop popups (X) + refund policy —
  📋 PLAN ONLY, part FUNCTIONAL/copy (2026-07-02)** (founder; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 27").
  The `showPlan` billing flow (Login.jsx pick-plan/billing-cycle/welcome/processing) mounts as a hand-rolled
  full-screen overlay (CryptoIdea.jsx:677-683), has **zero** dark overrides for `.plan-*`/`.cycle-*` (faint
  `--ink-faint` sub-text), and the **selected** Premium cycle card uses a hardcoded light `#f3ecfb` (app.css:552)
  → light-on-light **invisible in dark**. Cancel/refund is already the standard "keep access to period end, no
  refund" model (dueDowngrade + downgrade-Modal copy), with no refund code. Decisions (AskUserQuestion):
  **(1) no prorated refund — keep access till period end** (SaaS standard) + one clear policy line;
  **(2) BOTH plan-picker + billing-cycle become desktop `<Modal>` popups with X** (mobile stays full-screen);
  **(3) dark mode keeps hierarchy but brightens** (sub-text `--ink-faint`→`--ink-soft`). **R27-1** dark billing
  sub-text (dark-block-only) · **R27-2** fix selected `.cycle-card.on.prem`/`.on` in dark (dark-tinted purple bg +
  `--accent-ink` ring) · **R27-3** wrap the flow in shared `<Modal>` when `isDesktop` (body-only Login, `closePlanFlow`
  return-to-origin, X suppressed during `processing`) · **R27-4** no-refund policy line in the downgrade Modal +
  Account cancel caption. Update Login/upgrade tests for the desktop-Modal branch. Build R27-1+R27-2 → R27-3 → R27-4
  on "go".
- [x] **Round 28 — Billing: current-plan awareness + re-buy guard + honest benefit copy + light-mode readability —
  📋 PLAN ONLY, part FUNCTIONAL/copy (2026-07-02)** (founder; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 28";
  grounded via a 3-agent read-only map). **Real bug found:** the plan-picker (Login.jsx:91-113) never reads
  `user?.tier`, so a Pro user can click "Choose Pro" again and be **charged twice** (no guard/badge/disabled state);
  `user.tier` is available but unchecked. **Copy issues:** Premium claims "Priority support · Custom limits" —
  **neither is built** (no support system; premiumLimits is admin-only); all tiers get the same features (tiers
  differ only by capacity). Decisions (AskUserQuestion): **(1) current tier LOCKED** (CURRENT badge + disabled
  "Your current plan"; only upgrades clickable; lower tiers "Included", downgrades stay in Account); **(2) honest
  "all features included + more capacity"** copy, single `PLAN_BENEFITS` source feeding cards + success screen
  (no drift); **(3) Premium = "Priority email support"** (drop "Custom limits"). **R28-1** current-plan guard +
  `startUpgrade` same-tier no-op + free-user "Continue with Starter" link · **R28-2** shared honest benefit copy
  (cards ↔ success) · **R28-3** darken light-mode `.plan-feats`/`.plan-price-sm`/`.cycle-sub`/`.proc-sub`
  `--ink-faint`→`--ink-soft` in the BASE rule (**supersedes R27-1**; drop that dark-only override when building).
  Update Login/upgrade/welcome tests. Build R28-1 → R28-2 → R28-3 on "go".
- [x] **Round 29 — Billing: Premium downgrade chooser (Pro OR Starter) + pending flexibility + Premium→Pro
  re-checkout — ✅ BUILT 2026-07-03 (commit 8c4a01e), FUNCTIONAL** (founder; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md)
  "Round 29"; grounded via a 5-agent read-only billing map). Today Premium can ONLY downgrade to Pro
  (Account.jsx:262 hard-wired) and the at-endDate flip (CryptoIdea.jsx:610-615) grants the target tier with
  `subscription:null` — **a Premium→Pro downgrade lands as Pro with NO monthly payment attached (free Pro
  forever — real revenue bug)**. Decisions (AskUserQuestion): **(1)** Premium gets ONE "Downgrade" button →
  a Pro/Starter **chooser popup** (PLAN_BENEFITS + configured prices) → the existing confirm; **(2)
  Premium→Pro = re-checkout at period end** — approve a NEW Pro payment or land on Starter; trim is
  **deferred until that decision** (never Starter-trim data a Pro re-checkout would keep); **(3) full
  pending flexibility** — "Keep my plan" (un-cancel) + Premium can switch the pending target; **(4)** the
  R28 picker stays locked (downgrades only in Plan & billing). **R29-1** chooser · **R29-2** pending
  actions · **R29-3** re-checkout flip (dueDowngrade stays pure) · **R29-4** drop dead `downgradeFree`.
  Adjacent go-live gaps logged (ERRORS.md B8 + §BL-1): webhook hardcodes `tier:"pro"` for the PREMIUM plan
  id; `cancelSubscription` sets free immediately. Build R29-1 → R29-2 → R29-3 → R29-4 on "go".

**DoD per phase:** adjust the screen's tests first · `npm run test:unit` green · `npm run build` clean ·
browser-verify mobile (~390) + desktop (~1040), light + dark · commit · update docs.

---

## J. Journal thesis — edit / delete / required-two-questions  (✅ BUILT 2026-06-28)

Founder request from the Journal thesis detail. **Functional** (not design-pass). **All built + TDD'd
2026-06-28** (`thesisError` helper + Journal add/edit/delete/validation + Search updated; new `editThesis`/
`deleteThesis` handlers + `clearCoinJournal` deleteField path; 272 unit green; add→edit→delete round-trip
verified live on the emulator). Original spec below.

- [ ] **J1 — Edit an existing thesis (per coin).** JournalDetail currently shows "Why you bought it" +
  "What would change your mind" **read-only** (`Journal.jsx:68-75`, `.j-read`); only the funnel findings +
  the review decision are editable. Add an edit mode (toggle the two `.j-read` blocks → textareas + Save),
  reusing the AddThesis pattern. Persist via `updateCoinJournal` preserving `status`/`createdAt`/`priceAtAdd`
  and updating `thesis`/`changeMyMind` (funnel already editable). No rule change.
- [ ] **J2 — Delete a thesis (per coin).** No delete exists. Add a "Delete thesis" action in JournalDetail
  **with a confirm**; clears `coin.journal` so the coin returns to "Needs a thesis" (the holding itself
  stays). Data layer: `updateCoinJournal` only SETS (`updateDoc(ref,{journal})`, `firebase-database.js:183`)
  — add a clear path via `deleteField()` (`updateDoc(ref,{journal:deleteField()})`) or a `clearCoinJournal`.
  Rules already allow a coin with no journal (`validCoinData` → journal optional), so **no rule change**;
  client drops `journal` from the coin in `setPortfolio`.
- [ ] **J3 — Require BOTH questions to save + friendly errors.** Minimum to save = **"Why you bought it"**
  (`thesis`) AND **"What would change your mind"** (`changeMyMind`); the manual-research funnel stays
  **optional**. Today the AddThesis Save button is only *disabled* when BOTH are empty (`Journal.jsx:155`) —
  it silently allows saving with only ONE and shows no message; the Search Buy-Journal "Save" (`Search.jsx:119`)
  has NO validation. Change to a click-through + **inline error** so the user learns *why*:
  - **both empty** → "You haven't written your thesis yet. Fill in 'Why you bought it' and 'What would change
    your mind' to save."
  - **exactly one filled** → name the missing one: "You still need '&lt;missing question&gt;'. Both questions
    are required to save." (missing = "Why you bought it" if `thesis` empty, else "What would change your mind").
  - **both filled** → save.
  Apply in: Journal AddThesis, the J1 edit form, AND the Search Buy-Journal prompt (the **Save** path only;
  "Skip for now" still adds the coin with no journal). Update `addThesis` (`CryptoIdea.jsx:442`,
  `if(!t&&!m&&!f)` → require `t && m`, returning a typed result so the form shows the right message) +
  Search `confirmAdd`. This is a **client UX rule** — `firestore.rules validJournal` already allows empty
  strings, so no rule change. Error styling: reuse the app's error treatment, dark-safe.

**DoD:** TDD (add the 3 validation cases + edit/delete tests first) · `npm run test:unit` green · build clean
· browser-verify add/edit/delete + each error message, light + dark, mobile + desktop · commit. PLAN ONLY.

---

## 5. Housekeeping

- [x] Ran `npm audit fix` (no `--force`): patched the `protobufjs` prod advisory → **production
  audit (`--omit=dev`) is now 0**. ~11 dev-only advisories remain (Vitest/jsdom tooling) and would
  need `--force`/breaking bumps — left per policy. Build + 72 unit tests green after the fix.
- [x] Debug logs (`firebase-debug.log`, etc.) are already gitignored.
- [x] **Dependabot sweep — PR #5 merged 2026-07-22** (`2deb348`, squashed). Cleared the bulk of the
  alert backlog *without* a breaking major: the key move was an `overrides: { uuid: "^11.1.1" }` in
  **both** `package.json` and `functions/package.json`, which resolves the whole
  `firebase-admin → gaxios / google-gax / teeny-request / @google-cloud/*` chain **without** the
  firebase-admin 12→14 major. Also bumped tar, js-yaml, undici, body-parser, protobufjs, form-data,
  firebase 12.16.0, vite 5.4.21, firebase-tools 15.24.0, vitest 4.1.10.
  Verified on the *merge result* (not the PR branch): `npm ci` clean in root + functions, build clean
  incl. the no-names `dist/` guard, and **runtime audit 0 vulnerabilities in BOTH trees**
  (`npm audit --omit=dev` → root 0, functions 0).

- [x] **DEPS-1. Vite 5→6 major — DONE 2026-07-22.** Bumped the app's `vite` `^5.4.0 → ^6.4.3`.
  The floor is pinned to `6.4.3`, **not** `^6.0.0`, deliberately: the advisory range is `<= 6.4.2`,
  so a bare `^6` could resolve a still-vulnerable 6.0–6.4.2 on a fresh install. Cleared **four**
  dev-scope alerts in one move — `esbuild` #4 (the app path now bundles `esbuild@0.25.12` via vite),
  `vite` #5 (fix 6.4.2), `vite` #7/#8 (fix 6.4.3). `@vitejs/plugin-react@4.7.0` already supports
  vite 6 (peer `^4.2 || ^5 || ^6 || ^7`) → no plugin bump needed. Verified: `npm run build` clean
  under **vite 6.4.3** (all 5 multi-page entries, `manualChunks` firebase/vendor split intact,
  no-names `dist/` guard clean); **552/552** unit tests, 59/59 files; runtime audit `--omit=dev`
  still **0 in both trees**; browser sweep of the vite-6 dev server → React app mounts + renders the
  login screen with **zero console errors** (the `/api` proxy ECONNREFUSED is the expected
  no-emulator case, handled by the app's offline fallbacks). Note: vitest bundled its
  **own** `vite@8.1.5` (Rolldown/oxc), which used to flag plugin-react 4.7's esbuild options with a
  harmless *deprecated-`esbuild`-option* warning — **now RESOLVED (2026-07-23)**, see DEPS-1b.

- [x] **DEPS-1b. Vitest oxc/esbuild warning — RESOLVED 2026-07-23 (pinned vitest to vite 6).** Root
  cause was **two vite majors in the tree**: the app on vite 6 and vitest bundling its own
  `vite@8.1.5` (Rolldown/oxc), whose oxc pipeline flagged plugin-react 4.7's esbuild options. Fix =
  one line — `overrides: { "vite": "$vite" }` in `package.json` — which pins every nested vite (incl.
  vitest's) to the app's `^6.4.3`. Result: a single `vite@6.4.3` + single `esbuild@0.25.12` across the
  app **and** the test runner, and vite 8's whole Rolldown/Oxc/lightningcss native-binary toolchain
  drops out (**65** lockfile entries removed → leaner install). The earlier "the clean fix is
  plugin-react v5" note is **retracted as wrong**: v5's peer caps at `vite ^7` (doesn't cover vitest's
  vite 8) and the oxc-native plugin is v6, which needs vite 8 — no single plugin-react supports both
  vite 6 and 8, which is why pinning vite (not the plugin) is the fix. **npm gotcha worth
  remembering:** the override will **not** apply on an incremental `npm install` — npm skips
  `overrides` for a peer-resolved/nested dep and leaves the old version marked "invalid"; you must
  delete `package-lock.json` (not just `node_modules`) and reinstall so the tree re-resolves from
  scratch. Verify with `npm ls vite` → one version. Verified: warning gone, **552/552** unit tests,
  build clean, runtime audit `--omit=dev` still 0 in both trees, and no runtime-dep changes
  (firebase/react/react-dom byte-identical in the lockfile).

- [ ] **DEPS-2. Three dev-scope alerts remain — none reach a user** (runtime audit `--omit=dev` = 0
  in both trees). Do NOT chase the count to zero with more dependency PRs — PR #5's own
  `firebase-tools` bump *introduced* two of these, so the backlog partly regenerates itself. Honest
  status per alert: `sharp` #21 (high; fix = `sharp@0.35.3`, a **breaking major**; build-time image
  tooling only, never shipped) · `@hono/node-server` #20 (moderate; non-breaking `npm audit fix`
  available; a `firebase-tools` transitive) · `@opentelemetry/core` #9 (moderate; **no honest fix** —
  npm's only suggestion is a *downgrade* to firebase-tools v14, which this project can't use).

---

## AI-CHAT-SWITCH. Owner switch to hide + disable the Research "Ask" chat (client-side)  (✅ BUILT 2026-08-08 · `bfdbdf0` · via the Agent Factory · BUILD-LOOP #13 · CRYP-93 · PR 4a of 3)

> **✅ BUILT 2026-08-08 (PR 4a of 3 · CRYP-93 · commit `bfdbdf0`).** The `aiResearch` kill-switch now has its
> first client effect: OFF hides the Research → **Ask** chat tab **and** the per-coin "Ask AI about …" button,
> and falls a stale `'ask'` selection back to Overview (`chatEnabled = !(site.features.aiResearch === false)`,
> default-ON, threaded `Research.jsx` → `ResearchTab.jsx`). The admin toggle **moved from App Controls to the
> AI settings screen** ("AI research chat", same owner-only + step-up `saveFeature → saveConfig` path), and the
> `functions/features.js` description string was updated to match. Founder sliced BUILD-LOOP #13 into **three
> PRs (Option A):** 4a = this Ask-chat switch **+ the RESEARCH-NO-AI framing/honesty pass** (below); **4b**
> (richer multi-signal Pulse + Daily Brief · `9e2bbb3`/CRYP-95) and **4c** (RESEARCH-METRICS · CRYP-97) have now
> both shipped — the whole BUILD-LOOP #13 item is ✅ COMPLETE (see the RESEARCH-NO-AI section below).
>
> **Queued as [BUILD-LOOP](BUILD-LOOP.md) #13** (2026-08-03) — approved 2026-08-01 interview, decisions
> locked. Built in **ONE increment together with RESEARCH-NO-AI** (same `aiResearch` flag, same `chatEnabled`
> derivation; see that section below for the shared gate + the "what the switch governs" matrix). This section
> owns the **Ask-chat hide/disable**; RESEARCH-NO-AI owns the **Pulse framing**.
> Gate: 🟩 GREEN (all decisions locked). Blast radius: moderate — Research feature components + admin
> bundle + one `functions/features.js` string. **No `firestore.rules` change, no new callable, no
> data-model change** (the switch already exists in `config/app.flags.features.aiResearch` and is
> already published on `/api/config`).

### Why
`functions/features.js` already declares an **`aiResearch`** kill-switch and there's already an owner
toggle for it in admin App Controls — but **nothing on the client reads it**, so flipping it does
nothing a user can see (the admin sub-text even admits "nothing to gate today"). The Research **"Ask"
chat** (`AskView` + `useAsk`) is a fully client-side feature (offline canned answers about the caller's
already-loaded holdings — no server call, no key, no cost). This increment gives the existing switch
its first real effect: **OFF ⇒ the Ask chat is hidden and unreachable on the client; ON ⇒ it's visible
and working.** Default ON (a kill-switch only fires when deliberately flipped).

### Decisions (locked — 2026-08-01 interview)
1. **What OFF hides:** ONLY the Ask chat. The Overview daily-brief/Pulse and the Coins list stay.
2. **Which switch:** reuse the existing `aiResearch` flag (no new flag — KISS).
3. **Off-state UX:** the "Ask" tab simply disappears (2 tabs remain: Overview, Coins). No message.
4. **Toggle location:** MOVE the toggle out of App Controls onto the admin **AI settings screen** (with
   the Anthropic key). Still owner-only behind step-up re-auth (same `saveFeature`/`saveConfig` path).

### Honesty / security note ("cannot be accessed any way")
- **Today** the chat is 100% client-side, so hiding the two entry buttons + forcing the tab away removes
  *every* way to reach it — there is no server surface to bypass, and no URL route to the chat (it's
  internal tab state), so client hiding IS the whole boundary today.
- **Forward requirement (recorded, NOT built now):** when the Wave-B `researchAsk` server proxy ships,
  client hiding stops being sufficient. That proxy MUST call `featureEnabled(cfg,'aiResearch')` and
  refuse (deny-by-default) when OFF, so the switch becomes a real server boundary. Same flag — no new
  switch. (Noted here so it can't be forgotten when the proxy is built.)

### Scope / consistency sweep (change in EVERY file below — no drift)
- **[`src/features/research/Research.jsx`](../../src/features/research/Research.jsx)** — derive
  `chatEnabled = !(site?.features?.aiResearch === false)` (mirror the existing `pricesPaused` line for
  `marketData`) and pass `chatEnabled` to `ResearchTab`.
- **[`src/features/research/components/ResearchTab.jsx`](../../src/features/research/components/ResearchTab.jsx)** — accept `chatEnabled = true`:
  - Build `TABS` without the `{id:'ask'}` entry when `!chatEnabled`.
  - Keep `const ask = useAsk(...)` called **unconditionally** (rules-of-hooks) — only gate rendering.
  - Never render `<AskView>` when `!chatEnabled`; if `tab === 'ask'` while `!chatEnabled` (flag flips
    live), fall back to `'overview'` so a stale tab can't show a hidden view.
  - Pass `onAsk={chatEnabled ? askAboutCoin : undefined}` to `CoinsView`.
- **[`src/features/research/components/CoinsView.jsx`](../../src/features/research/components/CoinsView.jsx)** — forward `onAsk` (already a prop) unchanged; it's `undefined` when the chat is off.
- **[`src/features/research/components/CoinCard.jsx`](../../src/features/research/components/CoinCard.jsx)** — render the `.cc-ask` "Ask AI about {name}" button only when `onAsk` is a function (`{onAsk && <button …>}`).
- **[`src/components/admin-dashboard.jsx`](../../src/components/admin-dashboard.jsx)** —
  - REMOVE the `aiResearch` `<CtrlRow>` from the App Controls list (currently ~L1162–1165).
  - ADD the toggle to the **AI** settings screen block (`settingsView === "ai"`, ~L1264–1276): a
    `<CtrlRow icon={SI.ai} label="AI research chat" sub="…">` with a `<Switch checked={controls.features.aiResearch !== false}
    onChange={… saveFeature("aiResearch", …)} />`. Sub-text states the real effect: "Off = hides the
    Research → Ask chat for all users now; when live AI ships it also stops the server AI proxy."
  - Fix the AI screen `card-sub` so it no longer implies the switch does nothing.
- **[`functions/features.js`](../../functions/features.js)** — update the `aiResearch` description string
  (L18) to reflect it now also gates the client Ask chat (single source of truth stays honest). Logic
  unchanged.
- **[`src/CryptoIdea.jsx`](../../src/CryptoIdea.jsx)** — NO change (already reads `site.features.aiResearch`
  and exposes `site` via context).
- **`/api/config` / [`openapi.json`](../../openapi.json) / [`API-SECURITY.md`](../security/API-SECURITY.md)** —
  NO schema change (`aiResearch` already in the published `features` map). Add the forward
  server-enforcement note to API-SECURITY when the proxy ships (not now).

### Acceptance (write RED first, then make green — never weaken a test)
- **`tests/unit/` ResearchTab (new or extend the existing research test):**
  - ON (flag unset or `aiResearch !== false`): the **"Ask" tab** button renders; a coin card renders its
    **"Ask AI about …"** button.
  - OFF (`site.features.aiResearch === false`): **no** "Ask" tab button; `AskView` never in the tree;
    **no** "Ask AI about …" button on cards; forcing `tab='ask'` renders Overview (fallback), not chat.
- **`tests/unit/admin-dashboard.test.jsx`:** the `aiResearch` toggle now renders on the **AI** screen (and
  is absent from App Controls) and still calls `saveFeature("aiResearch", …)`.
- **`functions/features.js`** unit tests already green (string-only change; assert the key still exists).

### Definition of Done
- `npm run test:unit` (standalone) + `npm run build` (no-names guard) green/clean.
- Browser-verify (emulator stack runs on Java 21): as owner, flip the AI-chat switch OFF on the AI screen
  → reload a user session → Research tab shows only Overview + Coins, no Ask tab, no "Ask AI about"
  button; flip ON → the Ask tab + button return and the chat answers. (~60s cache.)
- No `firestore.rules` change ⇒ no `test:rules` requirement. No new dependency, no new hex.
- Docs: CLAUDE.md Research-tab + ADMIN-2 notes updated; this Status line flipped to ✅ BUILT; commit.
- Forward requirement (proxy server-enforcement) recorded, explicitly deferred to Wave-B.

---

## RESEARCH-NOTES. Research Overview "notes" area — 10 allocation/risk general guide notes (no links, relevance-picked) + link The Edge from the landing footer as a Resource  (✅ BUILT 2026-08-08 · CRYP-99 · client-only)

> **✅ BUILT 2026-08-08 · CRYP-99 · client-only.** PLANNED provenance (locked plan below) → G1 interview skipped;
> the locked spec was the plan-of-record. Shipped: a new pure **`src/features/research/utils/notes.js`**
> (`noteFacts` + `RULES` + `pickNote` + `DEFAULT_NOTE`/`EMPTY_NOTE`) — the relevance-scored engine picks the single
> highest-relevance matching note from the portfolio's allocation + risk (argmax, order-independent).
> **`OverviewView.jsx`** renders `pickNote(portfolio).text` in the (retained) `.diversify` card, the heading is now
> the static **"A note on your portfolio"**, and the old **`<a href="/edge">` link was removed**; the two dead
> `.research-root .diversify a` CSS rules (light + dark) were removed. **The Edge** was added to the **landing
> footer** (`index.html` `.foot-links → /edge`, landing only). **Tests:** new `tests/unit/research-notes.test.js`
> (15 cases — every rule, the relevance precedence, the `<5-coins` under-diversified example, the `mega ≥ 90`
> boundary, no-names/no-link compliance, never-blank) committed RED first; `ResearchTab.test.jsx` heading
> assertion updated; `OverviewView.test.jsx` (R7-5 glyph + CRYP-92 "about 65%") still green unchanged. Build +
> dist-name guard + brand guard clean. **No `firestore.rules` / backend / callable / `/api` / openapi / new-dep /
> new-hex change.** The plan of record (rules, ladder, copy) is preserved below.

> **🟨 PLAN (as locked 2026-08-08, now built).** Scope + thresholds + copy voice + selection model + the relevance
> ladder + the two overlap resolutions were all LOCKED by the founder before build.

**What & why (founder, 2026-08-08).** Today the Research Overview ends with ONE hard-coded card, **"A note on
diversification"** ([`OverviewView.jsx:68-81`](../../src/features/research/components/OverviewView.jsx)), that
always says the same thing and carries a **`<a href="/edge">Read the principle →</a>`** link. The founder wants
**two separate changes**:

- **(A) The notes area.** Replace the single fixed card with a **rotating "notes" area** that shows **exactly one
  general guide note** chosen from the portfolio's current **allocation and risk**. The note changes as the
  portfolio changes, always surfacing the **single most-relevant** insight. **These notes carry NO link** — not to
  `/edge`, not to any in-app screen. Plain educational text only. Diversification becomes **one of ten** notes.
- **(B) The Edge as an additional resource.** `/edge` (the in-app **education-page.jsx** guide, "The Edge") is
  meant for the **landing page** but **isn't linked there yet**. Surface it on the landing (`index.html`) as a
  **footer "Resources" link — landing page only**. Since (A) strips the `/edge` link out of the note, The Edge
  needs a real home; the landing footer is it. *(The in-app `/edge` route itself stays as-is — it just loses its
  Research-note entry point; the founder can retire the route separately later.)*

### Locked decisions (founder, 2026-08-08)
1. **"Location" = allocation.** The note is chosen from the portfolio's **allocation** (how weight is spread across
   coins + cap tiers) and its **risk**. Not geographic, not anything else.
2. **Keep all thresholds** — 60% concentration · −15% drawdown · +30% winner · 20% mega-anchor · the ≤3 / ≥5
   holding-count boundaries. *(One new threshold introduced for the rule engine: an "all-large-cap" book = mega ≥
   90% — locked by the founder 2026-08-08.)*
3. **One note at a time** — never a stack. The selector returns the single most-relevant note.
4. **Selection = "most relevant each time," not a fixed 1→10 order.** Each note is a rule; every rule has a
   **relevance weight**; the note shown is the **highest-relevance rule that currently matches**. As the portfolio
   changes, a different rule wins. (Founder's example: *"fewer than 5 coins ⇒ the diversification note"* — the
   `under-diversified` rule below.)
5. **The Edge → landing footer "Resources" link, landing only.**
6. **Copy approved in the no-names / no-advice voice** (the drafts below are the approved lines).

### The rule engine — "most relevant wins" (the better plan the founder asked for)
**Model.** A pure `pickNote(portfolio)` computes a small `facts` object once, evaluates every rule's predicate,
and returns the **matching rule with the highest `relevance`** (deterministic — weights are all distinct; ties, if
ever introduced, break by table order). Exactly one note renders. An **empty book** short-circuits to the
empty-state line before scoring; if (impossibly) nothing matches, the **default** note shows so the area is never
blank. Every rule is a subset of the S1–S4 Pulse-compliance rules: **neutral education, no advice, no prediction,
no coin named that isn't held, no link.**

**Facts (all already on `portfolio` — no new data, no new call):** `n` = holdings count · `top1` / `top2` =
largest / top-two allocation % · `mega` = `risk.megaAlloc` (% in mega-cap/top-rank coins) · `level` =
`risk.level` ∈ {Low, Moderate, High} · `pnl` = unrealized P&L % (only when cost basis > 0; `hasCost`) ·
`noThesis` = at least one held coin has no `journal.thesis`.

**Rules (higher `relevance` = more pressing → shown first when several match):**

| relevance | key | predicate (fires when…) | note (approved copy) |
|---|---|---|---|
| 100 | `one-coin` | `n === 1` | Everything you hold is in a single coin, so your whole result rides on one asset. Adding a second position you understand is the simplest way to lower that. |
| 92 | `drawdown` | `hasCost && pnl ≤ −15` | Your portfolio is below what you put in. Down stretches are when a plan gets tested — the useful question is usually whether the reasons you bought still hold, not just where the price is. |
| 88 | `concentration` | `n ≥ 2 && top2 ≥ 60` | Your top two coins make up about {top2}% of your portfolio. Spreading across more assets is one of the simplest ways to reduce single-coin risk. |
| 80 | `high-risk` | `level === 'High'` | Your mix leans toward higher-risk, smaller-cap coins. Those tend to move harder in both directions — how much you put in each one matters as much as which ones you pick. |
| 72 | `under-diversified` | `2 ≤ n ≤ 4` *(the founder's "<5 coins" example; folds in the old `early` note)* | You're holding just {n} coins, so each one has a big say in how your portfolio does. Adding a few more you understand spreads that influence out. |
| 64 | `winner` | `hasCost && pnl ≥ +30` | One position has run up and now takes a bigger share of your portfolio than you may have started with. It's worth knowing how concentrated a winner has quietly made you. |
| 56 | `thin-anchor` | `n ≥ 5 && mega < 20` | Only a small slice sits in large, established coins. Higher-ranked assets have historically swung less than the long tail — some weight there can steady a portfolio. |
| 48 | `all-large-cap` | `n ≥ 5 && mega ≥ 90 && level !== 'High'` | You're concentrated in large-cap coins. That's lower-volatility than the long tail, but "big" and "safe" aren't the same thing — every coin still carries market risk. |
| 40 | `no-thesis` | `noThesis` | Some of your coins don't have a written reason for holding them yet. Noting why you bought each one gives you something concrete to review later, instead of just the price. |
| 24 | `balanced` | `n ≥ 5 && top2 < 40` | Your holdings look well spread out — no single coin dominates. Diversification is upkeep, not a one-time setting: it's worth re-checking as prices move your weights around. |
| 0 | `default` | always | Keeping your holdings varied and knowing why you own each one are two of the simplest habits for a steadier portfolio. |

- **Empty book (before scoring):** "Notes about your portfolio appear once you hold a few coins." *(reworded from
  today's "Diversification tips appear once you hold a few coins.")*
- **Why relevance beats a static list:** a 3-coin book that's **down 18%** shows `drawdown` (92), not
  `under-diversified` (72) — the timely insight wins; the same book flat shows `under-diversified`. That's the
  "most relevant each time" behaviour, made deterministic.

### All nods resolved — fully locked (founder, 2026-08-08)
- **Relevance ladder** above (100 → 0) — **confirmed as-is.**
- **Two overlap resolutions confirmed:** (a) the old `early` (2–3 coins) note is **merged into
  `under-diversified`** (2 ≤ n ≤ 4); (b) `thin-anchor` / `all-large-cap` are **gated to n ≥ 5** so a small book
  always shows the more-pressing `under-diversified` first.
- **`all-large-cap` threshold = mega ≥ 90%** (raised from the proposed 70%). Locked.

**→ Rules fully specified. Ready for the interview → G2 → build loop on the founder's "go" (a fresh PR).**

### Implementation sketch (KISS, client-only — for G2, not now)
- New pure `src/features/research/utils/notes.js`: a `RULES` array (`{key, relevance, test(facts), text(facts)}`),
  a `noteFacts(portfolio)` deriver, and `pickNote(portfolio)` = argmax-relevance over matching rules (empty-state +
  `default` handled). Unit-tested per rule (fires/omits on its condition, correct winner when several match, never
  blank, `{top2}`/`{n}` interpolation, no coin named that isn't held).
- `OverviewView.jsx`: the `.diversify` card renders `pickNote(...)` and **drops the `<a href="/edge">`** + the
  "a core idea in The Edge" clause. Rename `.diversify`/`.dic`/`h3` copy to a generic "note" (CSS in
  `research-tab.css`; keep the ▦ glyph or swap per design).
- `index.html` (landing): add The Edge to the **footer "Resources"** list (landing-only link).
- **No** `firestore.rules` / backend / callable / `/api` / openapi / new-dep / new-hex change — pure client + one
  landing footer link. Blast radius: LOW (one Research card + one landing footer link + one new pure util + test).
- **Consistency sweep (topic = Research Overview note + landing resources):** `OverviewView.jsx` ·
  new `utils/notes.js` · `styles/research-tab.css` · `tests/unit/OverviewView.test.jsx` +
  new `tests/unit/research-notes.test.js` · `index.html` · CLAUDE.md (Research-tab section — replace the
  "diversification note" mention + record The Edge→landing footer link) · README.md (if it names the note) ·
  `docs/design/DESIGN-PASS.md` (R7-5 references the `.diversify` note/icon).

---

## RESEARCH-NO-AI. Make the Research Overview honest with no AI: deterministic Pulse, drop the "offline" apology, gate AI chrome on the flag  (✅ COMPLETE 2026-08-08 — all 3 PRs shipped: 4a framing/honesty `bfdbdf0` (CRYP-93) · 4b Pulse content + Daily Brief `9e2bbb3` (CRYP-95) · 4c RESEARCH-METRICS (CRYP-97) · BUILD-LOOP #13)

> **✅ COMPLETE — all three PRs shipped: 4a (framing/honesty) + 4b (Pulse content + Daily Brief) + 4c (RESEARCH-METRICS). The whole item (RESEARCH-NO-AI + AI-CHAT-SWITCH) is done.**
>
> **PR 4a of 3 — framing/honesty · 2026-08-08 · CRYP-93 · `bfdbdf0`.** The "AI is offline — showing a basic
> summary" apology is **removed** and replaced by a neutral **"AI off"/"AI on" status pill**
> (`.research-root .ai-status`, token-driven, dark-safe); the new build constant **`AI_PROXY_LIVE = false`** in
> `src/features/research/api/ai-status.js` is the single go-live seam, and `aiChrome = chatEnabled && AI_PROXY_LIVE`
> gates the AI ornaments (gradient label, Regenerate, the "AI-generated" disclaimer) — all hidden today.
> De-apologized copy landed in `OverviewView.jsx`, `EmptyState.jsx`, `AskView.jsx` + `hooks/useAsk.js` (dead
> `offline` field dropped), and the dead `.ai-note`/`.a-off` CSS was removed.
>
> **PR 4b of 3 — Pulse content + Daily Brief · ✅ 2026-08-08 · CRYP-95 · `9e2bbb3`.** A new pure
> **`src/features/research/utils/pulse.js`** is now the single source of truth for the Overview's two cards,
> replacing the old single-line Pulse and the buggy Brief. **`pulseFacts(portfolio, tf)` + `pulseLines(facts)`**
> produce the **multi-signal deterministic Portfolio Pulse** — R-A value + selected-tf performance (always) ·
> R-B unrealized P&L vs cost basis (only when there's a cost basis; honest sign; skipped, never "∞%", on a
> zero-cost book) · R-C top-two concentration naming the two largest HELD coins (only ≥2 holdings) · R-E a
> one-sentence risk-level pointer · R-F a neutral diversification nudge (only when top-2 > 60%); empty book →
> the locked "Once you add coins…" line. **`briefFacts(portfolio)`** drives the **honest Daily Brief rewrite** —
> B-1 portfolio 24h ($ + %, sign-matched, "≈0%" near-zero rule) · B-2 biggest gainer · B-3 biggest decliner
> (B-2/B-3 always different coins), and the old **"{coin} volatility" mislabel is removed**. `usePulse` now
> renders `pulseLines(pulseFacts(...)).join('\n')` on the deterministic path and the **orphaned `offline` state
> field is dropped** (the known 4a follow-up — now done). Every line obeys the locked S1–S4 rules (no verb on a
> named coin, no advice/target, held-only naming, no roll-up score, neutral labels, never NaN/Infinity).
> **Client-only — no `firestore.rules`, no callable, no `/api`/openapi change, no new dep, no new CSS.**
> `pulseFacts` is structured flat so 4c extends it cleanly.
>
> **PR 4c of 3 — RESEARCH-METRICS · ✅ 2026-08-08 · CRYP-97 · `4845923` (metrics) + `8d51b25` (P-1 net-direction
> fix) + `4fe910f` (bold tidy-up).** The pure `utils/pulse.js` layer gained four deterministic insight metrics
> and a line-set reshape (§"Pulse metrics" below): **P-1** return attribution — `contribᵢ` on **past-value
> weights** so `Σ contrib === portfolio.perf[tf]` exactly, naming the top contributor **in the direction of the
> net move** and showing "drove about **N%**" only when the share rounds to 1–100% (else "was the main driver",
> no number; ≥2 holdings) · **P-2** effective-N `Neff = 1/Σwᵢ²` **merged into the R-C concentration line** as an
> equivalence · **P-3** 7-day drawdown from a reconstructed daily value series `Vₜ = Σ(amount×spark)` ("…now sits
> **D%** below its 7-day high", or "…is at a 7-day high" at 0%) · **P-4** 7-day sample-stddev volatility,
> **never annualized** ("typical daily swing of about ±v%"). **Line-set reshape:** R-A · R-B · **P-1** · **R-C+P-2
> merged** · **"This week" (P-4+P-3)** · R-F — the "This week" line **supersedes R-E's one-clause risk pointer in
> the Pulse** (R-E remains the fallback only with no usable 7-day data); the dedicated RiskMeter card
> (market-cap-rank structural risk) is unchanged. All under the locked **S1–S4** rules. **Client-only — no
> `firestore.rules`, no callable, no `/api`/openapi, no new dep.**
>
> **P-1 spec refinement (correctness — founder decision A, 2026-08-08):** the locked spec said P-1 "rank by
> `|contribᵢ|`" with `wᵢ = valueᵢ/total`. The implementation instead uses **past-value weights** (`pᵢ =
> valueᵢ/(1+rᵢ/100)`, `contribᵢ = pᵢ·rᵢ/Σpᵢ`) — the only form that honors the locked "contributions sum exactly"
> identity against `computePortfolio.perf` — and selects the **net-direction** top contributor. The literal
> max-|contrib| rule rendered a sign-inverted "drove about **−500%**" on offsetting (≥3-coin) books where the
> biggest position moves *opposite* the net (a drag), so it names the real driver and keeps the share positive
> (F1/F2, caught in review — never shipped, so no ERRORS.md entry).
>
> **Accepted low-priority caveats (documented from the adversarial review, NOT fixed in 4c):** (1) the 7-day value
> reconstruction **tail-aligns sparklines by index**, so independently-refreshed per-coin histories can be ~1 day
> out of phase — the real fix is the **persisted daily portfolio-value series** already on the Wave-B DATA roadmap
> below; (2) the "This week" line can fire on as few as **~3 daily points** for a brand-new holding; (3) **"±0.0%"**
> renders on a dead-flat week. All three are honest-but-imprecise, never wrong or NaN.
>
> **Queued as [BUILD-LOOP](BUILD-LOOP.md) #13** (2026-08-03) — finished + approved (2026-08-03 interview),
> decisions locked. Built in **ONE increment together with AI-CHAT-SWITCH** (same `aiResearch` flag, same
> `chatEnabled` derivation), sliced into **3 PRs (founder Option A):** 4a framing/honesty (this), 4b Pulse
> content, 4c metrics. Gate: 🟩 GREEN (design/copy + one build constant + a derived boolean; **no
> `firestore.rules`, no backend, no new callable, no new dep**). Blast radius: LOW-MODERATE — 5 Research
> files + copy + a couple of unit tests. **No pricing change.**

### The founder's question, answered (feasibility)
> "Can Portfolio Pulse / the Research Overview realistically work with NO AI / no AI API connection?"

**Yes — it already does today, and always has. The AI path is dead code.**
- `askClaude()` ([`ai-client.js:12`](../../src/features/research/api/ai-client.js)) **throws
  unconditionally** — no Anthropic, no relay (by design: the key can't ship to the browser).
- So `usePulse` ([`usePulse.js:39`](../../src/features/research/hooks/usePulse.js)) **always** falls to
  `catch` → `fallbackText()`, a pure deterministic sentence from the user's OWN numbers (`total`, top
  holding, `alloc %`, `perf[tf]`). That fallback *is* the live behaviour.
- The rest of Overview is pure math on holdings + prices — **zero AI**: Daily Brief (24h Δ / top mover /
  most-volatile), Allocation bar (`alloc %`), Risk meter (`deriveRisk`, rank log-scale), Stress test
  (`stressScenario`, beta), diversification note.
- Only inputs: (1) the user's holdings (already in Firestore) + (2) prices/24h/7d/30d/sparkline from the
  app's **existing** `/api` proxy (flat-cost shared cache). **No new external call, no per-user cost, no AI.**

**Capability isn't the gap — honesty of framing is.** The Overview was built "AI-first with an offline
fallback," but AI never got wired, so every user permanently sees a product that (a) **apologizes for a
working feature** ("AI is offline right now — showing a basic summary") and (b) **advertises AI it doesn't
have** (gradient "Portfolio Pulse" label, "AI insights" copy, an "AI-generated" disclaimer, a "Regenerate"
button that reproduces byte-identical text).

### Decisions (locked — 2026-08-03 interview)
1. **AI is Wave-B "later," not "never."** Keep the `askClaude` seam; gate the AI *chrome* on the existing
   `aiResearch` flag (the same switch AI-CHAT-SWITCH uses). One switch governs the whole Research AI surface.
2. **Replace the "AI is offline" apology with a neutral AI-status pill (REVISED 2026-08-03).** Kill the old
   apology copy ("showing a basic summary…" — it made a working feature look broken); in its place a small
   status pill by the "Portfolio Pulse" label shows **"AI on"** when AI is genuinely live and **"AI off"**
   otherwise, driven by `aiChrome` (= switch ON **and** `AI_PROXY_LIVE`) so it reflects REAL availability and
   never lies (flip the switch on before Wave B ships → still "AI off," because AI can't actually answer yet).
   **Both states are always visible** — the user can always see the AI on/off state. It is a *status*, not an
   *apology*: no "basic summary"/"degraded" wording in either state.
3. **Keep the name "Portfolio Pulse"** (a product name, not an AI claim); drop the AI-gradient styling + the
   "AI insights" copy when AI is off.
4. **Hide "Regenerate" when AI is off** (a deterministic summary regenerates to identical text — a no-op).
   Keep "Share." It returns when AI is live.

### Pulse content rules — WITHOUT AI (this increment · locked 2026-08-03 interview)
**Design (single source of truth):** one pure `pulseFacts(portfolio)` layer computes the facts; the no-AI
Pulse renders them via hand-authored templates, and Wave-B AI (below) rephrases the SAME facts — it never
invents new ones. Facts (all already produced by `computePortfolio`/`deriveRisk` + each coin's `entries` — no
new data, no new call): value, invested (cost basis), unrealized P&L $/%, perf 24h/7d/30d, per-coin change,
alloc %, top holding, top-2/3 concentration, best/worst performer, top 24h mover, most-volatile,
risk {level,breakdown,megaAlloc}, holding count.

**What the no-AI Pulse MAY say** — structured multi-signal, **~4-6 short scannable lines max**:
- **R-A Value + performance** (always): "Your portfolio is **$X**, **up/down Y%** over the {24h/7d/30d}."
- **R-B Unrealized P&L vs cost** (when invested > 0): "That's **up/down $P (Q%)** on the **$Z** you've put in."
  P&L = total − Σ(amount × avgCost) of current holdings; **honest sign** (a loss reads as a loss).
- **R-C Concentration** (holdings ≥ 2): "Your top {1-2} — **{held coin name(s)}** — make up **N%** of the book."
- **R-D Best/worst mover** — **RELOCATED to the Daily Brief** (below). The split-jobs decision (2026-08-03) puts
  today's movers in the Brief, so the Pulse no longer repeats them — no duplicated lines across the two cards.
- **R-E Risk pointer** (ONE clause, not the full card): "…and your mix leans **{Low/Moderate/High}** risk." —
  **superseded in the Pulse by the "This week" volatility+drawdown line** (RESEARCH-METRICS §5 below); the
  market-cap-rank *structural* risk stays in the RiskMeter card.
- **R-F Diversification nudge** (ONLY if top-2 > 60%): "With ~N% in your top two, spreading across more assets is
  one way to lower single-coin risk." — neutral education (locked: descriptive + neutral), **NEVER "buy/sell X".**
- **Empty:** "Once you add coins, your portfolio summary appears here." (no AI mention.)

**Hard rules the deterministic templates MUST obey:**
1. **Held-only naming** — name a coin only if the user actually holds it; never one they don't.
2. **No advice** — describe + light neutral education only; never buy/sell/hold/"time to".
3. **No predictions / price targets / valuations** — past + present facts only.
4. **Never NaN/Infinity** — guard divide-by-zero (missing history → 0%, per the existing adapter convention);
   **skip R-B** when invested is 0/unknown rather than printing "∞%".
5. **Don't duplicate the cards below** — the RiskMeter + diversification-note cards already sit under the Pulse
   in `OverviewView`; R-E is a one-clause pointer and R-F only fires past 60%, so the Pulse **complements**, not
   repeats (this is the guard against the "wall of text / duplication" risk).
6. Format via the existing `money`/`fmtPct`/`abbreviate`; bold figures with `**…**` (Pulse `Rich` renders it).

**Implementation (adds to the sweep):** a pure `pulseFacts` + template builder (in `utils/portfolio.js`, or a
new `utils/pulse.js`) imported by `usePulse`'s `fallbackText`; `usePulse` returns the multi-line text, Pulse's
`Rich` already renders `**bold**` + newlines. **Tests:** each rule fires/omits on its condition; P&L sign
correct; no NaN on zero-history/zero-cost; empty-state text; held-only naming.

### Pulse metrics — added calculations (RESEARCH-METRICS · ✅ BUILT 2026-08-08 · PR 4c · CRYP-97 · locked 2026-08-03 interview)
Four deterministic calculations added to the no-AI Pulse, vetted by a 5-family metric research sweep + an
**adversarial compliance audit** (the audit reframed 3 of them + produced the S1–S4 rules below). **All
descriptive, no new data, no AI.** The base Pulse (R-A…R-F) ships fine without these — this is an insight
expansion. The Pulse stays ~5-6 short lines by **merging, not stacking** (see "Integrated line set").

**The four (formula → compliance-safe line):**
- **P-1 Return attribution** — `contribᵢ = wᵢ × returnᵢ` (`wᵢ = valueᵢ/total`; `returnᵢ` = that coin's tf %
  change). Contributions **sum exactly** to the portfolio's tf return (self-checking identity); rank by
  `|contribᵢ|`. → "Over the {tf}, **{coin}** drove about **{share}%** of that move." *(no verb on the coin — S1.)*
  **↳ As built (4c refinement — founder decision A, 2026-08-08):** weights are the **past-value** form
  `pᵢ = valueᵢ/(1+rᵢ/100)`, `contribᵢ = pᵢ·rᵢ/Σpᵢ` — the only form that keeps `Σ contrib === perf[tf]` exact
  against `computePortfolio.perf` — and the named coin is the **largest contributor in the net-move direction**,
  not the biggest `|contribᵢ|` (which on a ≥3-coin offsetting book names the drag and sign-inverts the share to
  "−500%"). The share prints only when it rounds to **1–100%**; otherwise "was the main driver" (no number).
- **P-2 Effective number of holdings** — `Neff = 1 / Σwᵢ²`; report beside the raw count N. → **merged into the
  concentration line:** "Your top two are **{N}%** of the book — by size, your {M} coins act like about
  **{Neff}** equal-weight positions." *(an equivalence, never a "but/you-should" nudge — S2.)*
- **P-3 Current drawdown (7-day)** — reconstruct portfolio value per sparkline day `Vₜ = Σ(amountᵢ × priceᵢ,ₜ)`;
  `drawdown = (V_now − max Vₜ)/max Vₜ` (≤0). → "…now sits **{D}%** below its 7-day high" (or, at 0: "at a 7-day
  high"). *(never "buy the dip"/"recover" — S2.)*
- **P-4 7-day daily volatility** — 6 daily returns `rₜ = Vₜ/Vₜ₋₁ − 1`; `σ = stddev(rₜ)`, sample n=6. **Never
  annualized.** → "This week your value had a **typical daily swing of about ±{v}%**." *(labelled 7-day; never
  ×√365; "typical swing", not "average move" — S4.)*

**Integrated line set (KISS — ~5-6 lines, ordered; merges, doesn't stack):**
1. **Value + performance** (R-A) · 2. **Unrealized P&L vs cost** (R-B) · 3. **What drove it** (P-1 attribution) ·
4. **Concentration** (R-C **+ P-2** effective-N merged; R-F nudge appended only if top-2 > 60%) · 5. **This week**
(P-4 volatility + P-3 drawdown, one line). **§5 supersedes R-E's rank-risk pointer IN THE PULSE**; the
market-cap-**rank** *structural* risk stays in the dedicated **RiskMeter card** (no triple-risk, no duplication).

**Hard compliance rules — from the adversarial audit (bind ALL Pulse + Brief lines):**
- **S1 · No verb on a named coin.** "{coin} drove the move" ✅ — never "cut/trim/add to {coin}", never render one
  coin as the visual headline (a single-coin callout reads to a beginner as a call to act).
- **S2 · No recovery/target/bounce/"should" language** near drawdown, break-even or concentration ("below its
  high" must never gain "buy the dip / hold till it recovers"; effective-N states an equivalence, not "diversify").
- **S3 · No roll-up.** Never fuse these into one badge, colour, emoji, or "portfolio-health" headline — an
  aggregate = a prohibited score/grade. Keep separate factual sentences.
- **S4 · Neutral labels + honest stats.** Section labels stay "Snapshot"/"This week" — never
  "Signal/Alert/Opportunity" or red/green good-bad. Never annualize the 7-day vol.

**Deferred to the Coins tab (interview):** per-position **"biggest gain/loss vs cost"** + **break-even distance**
— computable + compliance-safe (reframed), but they're single-coin callouts (S1 risk); founder chose to keep
per-coin P&L in the **Coins** list, not the Pulse.

**Implementation:** all four are pure — extend the `pulseFacts` layer (`contrib[]`, `Neff`, `drawdown7d`,
`vol7d`) from holdings + the 7-day sparkline (`priceAdapter` already derives each coin's 7d series; reconstruct
portfolio value per day). Templates in the same builder. **Tests:** contributions sum to the portfolio tf return
(identity); `Neff ∈ [1, N]`; drawdown ≤ 0 and = 0 at a 7-day high; vol never annualized; each line omits cleanly
on <2 holdings / missing sparkline (no NaN); copy contains no S1–S4 violation (no coin+verb, no "buy the dip", no
aggregate label).

**Wave-B DATA roadmap (deterministic, needs data — recorded, NOT built):** surfacing more of the data the app
already stores unlocks higher-value metrics:
- **IRR / money-weighted return** + **realized-vs-unrealized split** — **near-term**: need only the **dated
  transaction ledger** (already stored) surfaced to the Pulse layer + a small bisection solver. The true "what I
  earned on my dollars, given *when* I added them" number DCA users want (unrealized P&L can't give it).
- **True max drawdown (90d/all-time) + historical VaR** · **Sharpe / Sortino** · **beta vs BTC** · **pairwise
  correlation** (false-diversification check) — need a **persisted daily portfolio-value series** (+ a stored BTC /
  per-coin daily series). Meaningless on 6 sparkline points; strictly wait for real history; show as plain stats,
  never grades (S3). **This same persisted series also retires 4c's accepted P-3/P-4 caveat** — the by-index
  sparkline tail-alignment (up to ~1 day out of phase) and the "fires on ~3 points" edge both disappear once a
  real dated daily value series replaces the reconstructed one.

### Daily Brief rules — the "since you were away" card (this increment · locked 2026-08-03 interview)
The **Daily Brief** is the greeting card at the top of the Overview ("Good day / here's what moved"), separate
from the Pulse. **Role (split-jobs decision):** the Brief is a glanceable **"what moved since you were away"**
digest — it owns **today's movers**; the Pulse owns the **analysis** (value, P&L, concentration, risk,
diversification). **No duplicated lines:** the Brief leads with the 24h *change*, Pulse R-A leads with the
portfolio *value* over the selected timeframe, and movers live ONLY in the Brief (R-D relocated).

**The three rows (all 24h, deterministic — from holdings' `c24`):**
- **B-1 Portfolio 24h** (always): "Portfolio is **{up/down} $X ({+/−}Y%)** over the last 24 hours." Show **both**
  the $ change and the % with a **matching sign**. **Near-zero rule:** when the % rounds to 0.0% but the $ change
  ≠ 0, show **"≈0%"** (not a misleading exact "+0.0%") — the "up $6 (+0.0%)" artifact.
- **B-2 Biggest gainer** ("Today's top mover" — only if a holding is **up**): "Today's top mover: **{coin} +X%**"
  = the held coin with the **most positive** 24h change. Omit the row when nothing is up.
- **B-3 Biggest decliner** ("Worth watching" — only if a holding is **down**): "Worth watching: **{coin} −X%**" =
  the held coin with the **most negative** 24h change. **Replaces the old "{coin} volatility" line** — a single
  day's move is not volatility, and the old `|c24|` rule kept surfacing the SAME coin as the top mover. Omit the
  row when nothing is down.

**Hard rules the Brief MUST obey:**
1. **B-2 and B-3 are always different coins** — most-positive vs most-negative mover, so they can't collide (the
   bug you spotted). With only **one** holding, show B-1 + at most one mover line — never the same coin twice.
2. **No "volatility" claim** from a one-day move — the word is dropped; honest labels only (gainer / decliner).
3. **Held-only naming**; **no advice/prediction**; **never NaN** (guard zero-history → 0%).
4. **Don't duplicate the Pulse** — value / P&L / concentration / risk stay in the Pulse; the Brief is the 24h
   change + movers only.
5. **Empty state:** the Brief's "Add your first coin to start seeing AI insights" → neutral copy (already in
   sweep item #4: "start seeing your insights").

**Implementation (adds to the sweep):** move the inline `mover`/`watch` sort out of `OverviewView.jsx`'s `Brief`
into the pure facts layer (`pulseFacts` / a `briefFacts` helper) — biggest gainer/decliner + the sign guards +
the omit conditions + the near-zero-% display — so it is unit-tested; `Brief` renders from facts. **Tests:**
gainer ≠ decliner; each mover row omits on an all-up / all-down / single-holding book; "≈0%" shows when $≠0 but
%→0.0; the string "volatility" never renders; held-only naming.

### Pulse content rules — WITH AI (Wave B / "Plan B" ONLY — NOT built in this increment)
> Recorded here so all Pulse rules live in one place. Built in **Wave B** (the `researchAsk` proxy + Blaze),
> NOT now. Founder chose the **"fuller research assistant"** scope → the guardrails below are REQUIRED, not
> optional (the wider the scope, the harder the validator + judge must work).

**What AI ADDS (scope = fuller assistant):** rephrases the deterministic facts into fluent, varied prose (so
Regenerate genuinely varies), synthesizes/compares across timeframes, explains concepts (concentration,
volatility, risk tiers), and powers richer free-form **Ask** threads about the user's OWN holdings. **AI adds
language + synthesis — never new facts, numbers, names, or verdicts.**

**Hard output rules — enforced SERVER-SIDE by [`functions/validate-output.js`](../../functions/validate-output.js),
fail-closed (the control, NOT the system prompt):** every response is validated before any text reaches the
client; a violation regenerates (**N=2 cap**) then falls back to **the deterministic no-AI Pulse text above**
(the fallback is already built). Blocked: **names** (any coin/token/exchange not in `allowedNames` = the user's
holdings + BTC/ETH/SOL) · **prices/valuations/targets/multiples** · **advice** (buy/sell/hold, "time to",
ratings) · **allocation** ("N% of your portfolio") · **aggregate scores/grades**. Because the scope is "fuller
assistant," the **B2 LLM judge is REQUIRED** — the regex prefilter alone is insufficient for synthesis-heavy prose.

**Grounding + tone rules (system prompt + design — belt to the validator's braces):** reason ONLY from the
provided portfolio context + computed facts; assert **no external fact** (news/price/event) it wasn't given;
neutral + educational; 2-4 sentences for Pulse, richer for Ask; never financial advice.

**Server-enforcement rules (the real boundary):** the `researchAsk` Cloud Function holds the Anthropic key
(never the client) · runs `selectValidated` on every response · checks `featureEnabled(cfg,'aiResearch')` and
denies when OFF (deny-by-default — the forward requirement AI-CHAT-SWITCH recorded) · meters per-uid cost
against `aiMonthlyCents` (free 0 / pro 400 / premium 2500) · rate-limit + App Check · sends only the caller's
OWN portfolio context (no cross-user data).

**Expanded Wave-B Pulse roadmap (build order, gated on Blaze):**
1. Ship the `researchAsk` proxy holding the key; wire `validate-output.js` (regex prefilter **+ B2 LLM judge**).
2. Flip `AI_PROXY_LIVE=true`; replace the `askClaude` body with the callable (the seam is already there).
3. **Pulse-with-AI:** feed `pulseFacts` + context → AI rephrases → validator → fallback = the deterministic Pulse.
4. **Ask chat** re-enabled (AI-CHAT-SWITCH flips `aiResearch` ON) with the fuller-assistant threads.
5. **Per-tier budgets** (`aiMonthlyCents`) + **graceful degradation**: at the ceiling, fall back to the
   deterministic Pulse behind a quiet banner — never a mid-thought paywall (saas-pricing principle 7).
6. **Cache the Pulse per portfolio-state** so AI cost stays flat + invisible (CACHE-POLICY §C Wave B; C7 keeps
   the AI meter admin-only).
7. Later: per-coin AI evidence (swap the `mock-conviction` seam for the live per-coin cache).

Cross-refs: [`CACHE-POLICY.md`](../decisions/CACHE-POLICY.md) (AI tier) · [`PRICING.md`](../decisions/PRICING.md)
(`aiMonthlyCents`) · [`BILLING.md`](../decisions/BILLING.md) (Blaze) · [`validate-output.js`](../../functions/validate-output.js) (#13–#16).

### The gate — reconciled with AI-CHAT-SWITCH (no drift), and honestly "off today" with zero config
- **Reuse AI-CHAT-SWITCH's `chatEnabled = !(site?.features?.aiResearch === false)`** (derived once in
  `Research.jsx`). That governs Ask-tab **visibility** — flag-only is right there, because the Ask chat
  "works" client-side (canned answers) so it's purely the owner's show/hide choice.
- **Pulse AI-chrome** (gradient label · Regenerate · any live-text attempt · the word "AI-generated" in the
  disclaimer) is gated on **`chatEnabled && AI_PROXY_LIVE`**, a strict subset — where **`AI_PROXY_LIVE`** is a
  build constant exported from `ai-client.js`, **`false` today** (askClaude throws), flipped `true` by the
  Wave-B increment that ships the real proxy.
  - **Why the extra `&& AI_PROXY_LIVE`, not the flag alone:** `aiResearch` DEFAULTS ON, and no proxy exists.
    A flag-only gate would paint AI chrome on a deterministic Pulse today and force the founder to remember to
    flip a default-ON switch. Tying the chrome to "AI actually exists" makes the no-AI state correct with
    **zero config** — this is what makes the founder's "today it's effectively OFF" literally true — and it
    can't drift. The flag stays a real kill-switch on top (owner can force everything off before Wave B).
  - **The two agree exactly in the launch state** (`aiResearch = false` ⇒ Ask hidden AND Pulse chrome off).
    They only differ in the default-on-no-proxy state, where Ask shows its canned answers (AI-CHAT-SWITCH's
    deliberate choice) while Pulse stays deterministic-honest — intentional, and more honest than today.

### What the switch governs (matrix)
The admin **`aiResearch`** toggle drives two derived gates: **`chatEnabled`** = `!(aiResearch === false)` (flag
only) and **`aiChrome`** = `chatEnabled && AI_PROXY_LIVE` (flag **and** a live proxy). Three real states:
**A** = switch OFF · **B** = switch ON but no live proxy (today's default) · **C** = switch ON + proxy live (Wave B).

| Research element | Gate | A · switch OFF | B · switch ON, no proxy (today) | C · switch ON + proxy live (Wave B) |
|---|---|---|---|---|
| **Ask chat tab** | `chatEnabled` | hidden | **visible** (canned answers) | visible (live AI) |
| **Pulse "Regenerate" button** | `aiChrome` | hidden | hidden | **visible** |
| **Pulse AI-gradient label** | `aiChrome` | plain label | plain label | **gradient** |
| **Pulse AI-status pill** | `aiChrome` | **"AI off"** | **"AI off"** | **"AI on"** |
| **Pulse summary text** | `aiChrome` | deterministic | deterministic | **live AI** (validated → falls back to deterministic) |
| **"AI is offline" apology** | — | gone (replaced by the pill) | gone | gone |
| **Empty-state "AI insights" copy** | none | neutral | neutral | neutral |
| **Disclaimer "AI-generated" word** | `aiChrome` | omitted | omitted | shown |
| **Portfolio · Coins · allocation · risk · stress · the deterministic Pulse facts** | never gated | always on | always on | always on |

**How to read it:**
- **State A is the no-AI launch posture** — set `aiResearch = false`: Ask hidden, pill "AI off", clean
  deterministic Pulse, no gradient/Regenerate, disclaimer neutral. Fully consistent.
- **The one asymmetry (state B):** the Ask tab is *visible* while the Pulse AI chrome is *off* — Ask is
  flag-only (AI-CHAT-SWITCH: its canned answers "work" offline) but the Pulse chrome needs a real proxy. B is a
  transitional/dev posture you wouldn't ship; to make B fully consistent, gate Ask on `aiChrome` too (reconcile
  via sweep item #8 — not currently chosen).
- **The pill never lies:** "AI off" whenever AI can't actually answer (A and B), "AI on" only when a live proxy
  is serving (C) — the switch alone can't turn it "on".
- **Nothing outside the AI surface is ever gated** — the deterministic Overview, Portfolio, Coins, allocation,
  risk meter and stress test are always on in every state.

### Consistency sweep — change in EVERY file (no silent drift)
Prop path: `useApp().site.features.aiResearch` → `Research.jsx` → `ResearchTab.jsx` → `OverviewView` → `Pulse`.
1. **[`ai-client.js`](../../src/features/research/api/ai-client.js)** — export `export const AI_PROXY_LIVE =
   false;` (Wave B flips it to `true` in the same increment that replaces the `askClaude` body). Keep the
   throwing body.
2. **[`Research.jsx`](../../src/features/research/Research.jsx)** — reuse `chatEnabled` (AI-CHAT-SWITCH);
   derive `const aiChrome = chatEnabled && AI_PROXY_LIVE;` and pass `aiChrome` to `ResearchTab`.
3. **[`ResearchTab.jsx`](../../src/features/research/components/ResearchTab.jsx)** — accept `aiChrome = false`:
   - **line 45** `usePulse(portfolio, tf, !empty)` → `usePulse(portfolio, tf, !empty && aiChrome)` — when AI
     off, usePulse short-circuits to `fallbackText` (`offline:false`) and makes **no** `askClaude` call
     (reuses the existing `enabled=false` path — no new branch);
   - **line 79 disclaimer** "AI-generated insights and the Stress test…" → gate the word "AI-generated" on
     `aiChrome` (or drop it: insights/Stress test are deterministic either way);
   - pass `aiChrome` to `<OverviewView>`.
4. **[`OverviewView.jsx`](../../src/features/research/components/OverviewView.jsx)** — accept + forward
   `aiChrome` to `<Pulse>`; **line 13** empty-brief "start seeing **AI insights**" → "start seeing your
   insights" (neutral, unconditional, cosmetic).
5. **[`Pulse.jsx`](../../src/features/research/components/Pulse.jsx)** —
   - **replace the offline-note block** (lines 44-46) with an **AI-status pill** in the Pulse header next to the
     "Portfolio Pulse" label (decision 2): `aiChrome ? "AI on" : "AI off"` + a status dot (accent/gradient dot
     when on, muted grey when off) — mirror the existing `LivePill` markup pattern (`HeaderTags.jsx`) but as a
     SEPARATE element (LivePill = price-feed freshness; this = AI availability). The `offline` prop is no longer
     used for an apology → drop it from Pulse's signature + the OverviewView pass-through; the pill reads
     `aiChrome` (already passed). Give the pill an `aria-label` ("AI on"/"AI off");
   - gate the `ai-gradient-text` class on `aiChrome` (plain label otherwise);
   - gate the **Regenerate** button on `aiChrome` (keep **Share** always, decision 4).
6. **[`EmptyState.jsx`](../../src/features/research/components/EmptyState.jsx)** — line 4 "your **AI insights**,
   allocation and risk" → "your insights, allocation and risk" (neutral, unconditional, cosmetic).
7. **[`research-tab.css`](../../src/features/research/styles/research-tab.css)** — keep `.ai-gradient-text`
   (line 39, used when `aiChrome`); **replace** the old amber "AI is offline" note-box rule (~line 286) with a
   small **`.ai-status`** pill style (on = accent/gradient dot + `--accent` text; off = muted `--ink-soft` dot +
   text), scoped under `.research-root`, dark-safe via tokens.
8. **[`useAsk.js`](../../src/features/research/hooks/useAsk.js) / [`AskView.jsx`](../../src/features/research/components/AskView.jsx)** —
   Ask visibility stays **AI-CHAT-SWITCH's** job. For consistency with the new status pill, `AskView.jsx:29`'s
   "AI is offline — showing a basic answer" apology should be reconciled to the same neutral *status* language
   (an "AI off" indicator, no "basic answer" wording) when that plan is built — cross-ref, keep the two in sync.

### Acceptance (RED first; never weaken a test)
- **Unit** (`tests/unit/`, Pulse/Research render test):
  - Pulse renders **no** "AI is offline"/"basic summary" apology text in any state; instead the header shows an
    **AI-status pill** = "AI off" when `aiChrome=false` and "AI on" when `aiChrome=true` (both states visible,
    neutral, no "basic summary" copy, correct `aria-label`).
  - `aiChrome=false`: **no** `ai-gradient-text` class, **no** Regenerate button, Share present; Pulse text ==
    the deterministic `fallbackText` for the portfolio+tf; disclaimer omits "AI-generated".
  - `aiChrome=true`: gradient + Regenerate present.
  - `usePulse` with `enabled=false` makes **zero** `askClaude` calls (spy) and returns `offline:false`.
- **`npm run build`** — clean (no-names guard unaffected). **No `test:rules`** (no rules/backend change).

### Definition of Done
- test:unit + build green; verified in the emulator (Research → Overview) as a Starter user: clean
  deterministic summary, a neutral **"AI off"** status pill (no "offline/basic summary" apology), **no**
  gradient, **no** Regenerate, disclaimer neutral, Ask tab hidden (via AI-CHAT-SWITCH). (Flip
  `AI_PROXY_LIVE=true` + `aiResearch` ON in Wave B → the pill reads **"AI on"** + gradient + Regenerate return.)
- **Docs synced in the same commit:** the CLAUDE.md "Research tab" line "Pulse shows an 'AI is offline' note"
  becomes stale → update it; note the launch behaviour.
- **Go-live note:** AI chrome is off automatically (`AI_PROXY_LIVE=false`, belt) and the owner can force
  `aiResearch=false` (braces). Chrome must not return until the Wave-B proxy **and** the output validator
  ([`functions/validate-output.js`](../../functions/validate-output.js)) are wired. Cross-ref LAUNCH-FREE.
- **Build together with AI-CHAT-SWITCH** (one ledger row) — same `chatEnabled` derivation, same increment.
- Staged, not queued: no BUILD-LOOP ledger row until founder says go.

---

## PLAN-LIMITS-MAX. Maximize plan benefits (Starter 3/30/300 · Pro 6/100/1000 · Premium 15/200/2000) + lazy-load reads  (Part A ✅ BUILT 2026-08-10 · branch `claude/plan-limits-max` · Part B ✅ BUILT 2026-08-10 · branch `claude/plan-limits-partb` · CRYP-104 · BUILD-LOOP #12; both parts built — whole item done pending the two PRs merging)

> **rev.2 (2026-08-03):** Starter tx 100→**300**; Pro tx 2000→**1000**; Premium lowered **1000→200 coins /
> 5000→2000 tx**; **Part B (lazy-load) promoted from "companion" to a HARD prerequisite** of the raised
> Pro/Premium limits (see Gating). These changes pull the *theoretical maximum* into the 75–90% margin band.
>
> Finished + approved (2026-08-03 founder interview; all decisions locked). Gate: 🔶 CHECKPOINT (touches
> `firestore.rules` → `npm run test:rules:solo` before commit). **Prices UNCHANGED. No new dependency.**
> Coordinates with **LAUNCH-FREE #10** (see its §A supersede note): the two overlap on the Starter limits +
> stored `config/app.plans` + index exemptions — whichever builds first does that shared work, the other is
> the delta.

### Why (founder goal: maximize user benefit while holding healthy 75–90% margins)
Grounded cost analysis (2026-08-03, 4-agent research + verified in source). CoinGecko cost is FLAT (one
shared `cache/universe` doc serves everyone), so a user's coins/transactions add **zero** upstream API cost.
The only per-user cost is Firestore: **storage + writes are pennies; READS on app-open are the sole real
driver.** Today `loadPortfolios` (useAuthSession.js:42) loops EVERY portfolio and `getCoins`
(firebase-database.js:204-216) reads every coin + every transaction, so read cost tracks **total transactions
across all portfolios** — **Part B fixes this** to the *active portfolio only*. **Verdict:** every tier clears
**>99% margin on realistic usage**, and with Part B even the *theoretical maximum* stays in-band (~80% Pro,
~83% Premium). The residual risk is abuse (a script, not a human), closed by the Wave-B App Check + per-uid
rate limiter + `addCoinGuarded`. So: raise limits, hard-gate them on Part B **and** those abuse controls.

### The limits (locked)
| Tier | Now → New | Max total tx | Max tx/portfolio | Price (unchanged) |
|---|---|---|---|---|
| Starter (free) | 1/10/50 → **3 / 30 / 300** | 27,000 | 9,000 | $0 |
| Pro | 3/50/2000 → **6 / 100 / 1000** | 600,000 | 100,000 | $9.99/mo · $99.99/yr |
| Premium | 15/1000/5000 → **15 / 200 / 2000** | 6,000,000 | 400,000 | $49.99/mo · $499.99/yr |

Semantics (verified in rules): **portfolios = total/account**, **coins = per-portfolio**, **tx = per-coin**.
Starter 3/30/300 **supersedes LAUNCH-FREE §A's 2/30/100**. **The binding cost lever is tx *per portfolio* =
coins/portfolio × tx/coin** (because Part B loads one portfolio at a time): Pro 100×1000 = 100k/portfolio sits
at ~80% margin at max — the safe edge of the band; don't push a single portfolio's product much past ~100k
(Pro) without re-checking margin.

### Cost analysis recorded — WITH Part B lazy-load (Firestore Blaze est.: reads $0.06/100k, storage ~$0.18/GiB/mo; ~0.7 KB/tx w/ index exemptions; user opens app ~30×/mo)
| Scenario | Max total tx | Realistic $/user/mo | Realistic /100 | Theoretical-MAX $/user/mo | MAX /100 | Margin @ MAX |
|---|---|---|---|---|---|---|
| Starter 3/30/300 | 27,000 | ~$0.003 | ~$0.30 | ~$0.16 | ~$16 | n/a (free) |
| Pro 6/100/1000 | 600,000 | ~$0.02 | ~$2.3 | ~$1.88 | ~$188 | **~80%** ✅ |
| Premium 15/200/2000 | 6,000,000 | ~$0.06 | ~$5.8 | ~$7.97 | ~$797 | **~83%** ✅ |

**Why Part B is load-bearing (MAX cost WITHOUT lazy-load = today's eager-load):** Pro ~$10.81/user/mo (⚠️
−15% margin, a loss), Premium ~$108/user/mo (⚠️ catastrophic). So the raised Pro/Premium limits are ONLY safe
with Part B — hence the hard gate. Realistic-use margins are >99% at every tier regardless.

### Part A — Limit bumps. Consistency sweep (change in EVERY file — no drift)
1. **`functions/index.js`** `DEFAULT_PLANS` (~L348-350): free → `{portfolios:3, coins:30, transactions:300}`;
   pro → `{portfolios:6, coins:100, transactions:1000}`; premium → `{portfolios:15, coins:200, transactions:2000}`.
   Prices + `aiMonthlyCents` unchanged.
2. **`firestore.rules`** `configuredLimit` fallbacks (L173-175): portfolios `free 1→3, pro 3→6, premium 15`;
   coins `free 10→30, pro 50→100, premium 1000→200`; tx `free 50→300, pro 2000→1000, premium 5000→2000`. Hard
   ceilings unchanged (coins hardMax stays 1000 as the "unlimited" clamp; config 200 is the enforced Premium value).
3. **STORED `config/app.plans` doc** — CRITICAL (same gap LAUNCH-FREE caught): rules read config FIRST, defaults
   only as fallback, so a stored plans doc OVERRIDES the rule defaults. Update it too (seed baseline + admin
   save / one-time migration) in dev AND at prod deploy, or the old limits silently win.
4. **`src/hooks/useAdminDashboard.js`** `DEFAULT_PLANS` mirror (~L141) — same new values (admin editor fallback).
5. **`src/components/Login.jsx`** `PLAN_BENEFITS` (L10-23): free → "3 portfolios · 30 coins per portfolio · 300
   transactions per coin"; pro → "100 coins per portfolio" + "1,000 transactions per coin"; premium → "200 coins
   per portfolio" + "2,000 transactions per coin". **Also fix** the free copy that omits "per portfolio" now that
   Starter has >1 portfolio.
6. **`index.html` #pricing + `public/landing.js`** — update per-tier LIMIT copy on the cards (prices unchanged).
7. **`firestore.indexes.json`** — single-field index **exemptions** for the `transactions` collection group
   (exempt `type`/`amount`/`priceAtBuy`; keep `date` indexed) so storage stays ~0.7 KB/tx (deploy-time).
8. **`docs/decisions/PRICING.md`** — update plan-at-a-glance + margin math; add this storage/read cost model +
   the denial-of-wallet note + the Part-B + Wave-B gating dependency.
9. **`docs/decisions/USER-BENEFITS.md`** — update user-facing limits (plain language). Note Premium's advertised
   coins drops 1,000→200 (still 3,000 total across 15 portfolios; no real users affected — pre-launch).
10. **`docs/decisions/PRODUCT-DECISIONS.md`** — update if it records the limit values (#20/#21).
11. **LAUNCH-FREE §A** (above) — already carries the superseded note (3/30/300); keep the two in sync.

**Status — Part A ✅ BUILT (2026-08-10 · branch `claude/plan-limits-max` · BUILD-LOOP #12):** limits raised in
`firestore.rules` `configuredLimit` fallbacks + `functions/index.js` `DEFAULT_PLANS` (Starter **3/30/300** · Pro
**6/100/1,000** · Premium **15/200/2,000**; coins hardMax stays 1,000 — 200 is the enforced Premium default), the
admin `useAdminDashboard.js` `DEFAULT_PLANS` mirror, `Login.jsx` `PLAN_BENEFITS` + `index.html` #pricing copy, and
`firestore.indexes.json` tx-collection-group index **exemptions** (`type`/`amount`/`priceAtBuy`; `date` kept).
Docs swept: PRICING · USER-BENEFITS · PRODUCT-DECISIONS (#19/#20/§8) · README · CLAUDE · DESIGN-PASS R28-2 ·
ai-tool-policy · GO-LIVE-AUDIT deploy gate · the `authorization-and-tier-limits` diagram (already updated in the
code commit) · the LAUNCH-FREE §A note. **Prices UNCHANGED.** Green: `test:rules` **51/51** · `test:unit`
**1,064/1,064** · build clean. ⚠️ **NOT deployed** — the raised **Pro/Premium** limits are gated on Part B +
Wave-B abuse controls (see Gating), and a stored `config/app.plans` doc must be re-saved at deploy or the old
defaults silently win. **Part B (lazy-load reads) is now ✅ BUILT too (branch `claude/plan-limits-partb` · CRYP-104
— see Part B below); the whole item is done pending both PRs merging (PR1 = Part A, PR2 = Part B).**

### Part B — Lazy-load read optimization (✅ BUILT 2026-08-10 · branch `claude/plan-limits-partb` · CRYP-104 — hard prerequisite for the raised Pro/Premium limits)
12. **`src/hooks/useAuthSession.js`** `loadPortfolios` (L36-61): eager-load coins for all portfolios but
    **transactions ONLY for the active portfolio**; lazy-load a portfolio's transactions on first activation
    (switch), cached for the session. This is what bounds the theoretical max to ONE portfolio's tx and keeps
    Pro/Premium in the margin band (without it Pro-max is a loss — see cost table).
    - **Design detail to resolve at build:** the Portfolio-list value/P&L summary needs transactions. Options:
      (a) load-on-switch + a light "tap to load"/cached summary for unopened portfolios, or (b) persist a small
      per-portfolio summary (invested/current). Pick the KISS option; **never show a wrong/zero P&L** for an
      unloaded portfolio. Aligns the initial load with the existing active-only `watchCoins` live-sync model.

**Status — Part B ✅ BUILT (2026-08-10 · branch `claude/plan-limits-partb` · CRYP-104 · BUILD-LOOP #12):** chose
option (a), the KISS load-on-switch path. New **`getCoinsMeta(uid, portfolioId)`** in `src/api/firebase-database.js`
reads a portfolio's coins + their persisted `txCount` with **ZERO transaction queries** (one `getDocs`, `entries:[]`
placeholder). **`loadPortfolios`** now reads `ci-active-port` first: the ACTIVE portfolio loads FULL (`getCoins` —
reads transactions, `txLoaded:true`), every OTHER portfolio loads META-ONLY (`getCoinsMeta`, `txLoaded:false`). A
`txLoaded` flag rides each portfolio and is carried through the `watchPortfolios` metas-merge; `watchCoins`
(`CryptoIdea.jsx`) flips it `true` when a switched-to portfolio's transactions arrive. **`Portfolio.jsx`** shows a
"Loading…" placeholder + "—" for gain/invested/24h while a switched-to portfolio's tx load — **never a wrong/zero
P&L** for an unopened portfolio (`txLoaded===false` gates it; `undefined` reads as loaded so nothing regresses). The
three cross-portfolio tx-count surfaces (`src/utils/usage.js`, `Account.jsx` `totalTxAllPorts`, `useUpgrade.js`
`overLimitImpact`) now count via `txCount ?? entries.length`, so counts stay correct for lazy-loaded portfolios. This
bounds a multi-portfolio account's app-open Firestore read cost to the ACTIVE portfolio's transactions — the cost
lever the raised Pro/Premium margin math depends on. Green: `test:unit` **1,066/1,066** · build clean. **DOCS-ONLY
still open:** none for Part B beyond this sweep. **Both parts now BUILT — the whole item is done pending both PRs
merging (PR1 = Part A `claude/plan-limits-max`, PR2 = Part B `claude/plan-limits-partb`).**

### Gating (locked: raised limits are HARD-gated on Part B + Wave-B abuse controls)
Raised limits are safe to build + test locally now (emulator). **Do NOT deploy the raised Pro/Premium limits to
prod until BOTH are live: (1) Part B lazy-load, and (2) the Wave-B denial-of-wallet controls** — App Check
enforcement + per-uid rate limiter + `addCoinGuarded`. Part B keeps a single maxed portfolio's daily-open cost
in-band; the abuse controls make the ceiling unreachable by a script and stop write/storage flooding. Record
this as an explicit deploy-gate in PRICING.md Open items + the go-live checklist. (Starter's raise is safe to
deploy independently — a free maxed account is ~$0.16/mo — but its abuse surface is account-farming, gated by
the same App Check.)

**Gate update (2026-08-10): Part B (1) is now ✅ BUILT** (branch `claude/plan-limits-partb` · CRYP-104), so the
remaining deploy condition for the raised Pro/Premium limits is **(2) the Wave-B denial-of-wallet controls** (App
Check enforcement + per-uid rate limiter + `addCoinGuarded`) — plus re-saving the stored `config/app.plans` doc at
deploy. Both PRs (Part A + Part B) must merge before the limits ship.

### Acceptance (RED first; never weaken a test)
- **`npm run test:rules:solo`** — new ceilings enforced: Starter 3/30/300 (4th portfolio / 31st coin / 301st tx
  denied), Pro 6/100/1000 (7th portfolio / 101st coin / 1001st tx denied), Premium 15/200/2000 (16th portfolio /
  201st coin / 2001st tx denied); the "configured limits override defaults" test updated to the new fallbacks.
- **`npm run test:unit`** — any test asserting old limits (1/10/50, 3/50/2000, 15/1000/5000) updated to the
  config/new values; PLAN_BENEFITS copy test if present.
- **Part B** — a data-layer test: `loadPortfolios` does NOT read a non-active portfolio's transactions on open,
  and switching to a portfolio loads its transactions once.
- **`npm run build`** — clean (no-names guard).

### Definition of Done
- test:rules:solo + test:unit + build green; rules verified before commit (CHECKPOINT).
- PRICING.md + USER-BENEFITS.md updated **in the same commit** as the config/rules change (docs are the contract).
- LAUNCH-FREE §A supersede note kept in sync; PRODUCT-DECISIONS updated if it carries the numbers.
- Prod-deploy gate (raised Pro/Premium limits ship only with Part B + Wave-B abuse controls) recorded in
  PRICING.md Open items + go-live.
- Browser-verify (emulator on Java 21): Starter create 2nd + 3rd portfolio (4th denied), 30 coins ok (31st
  denied), 300 tx ok (301st denied); Pro 100 coins ok (101st denied), 1,000 tx ok (1,001st denied); Premium
  200 coins ok (201st denied), 2,000 tx ok (2,001st denied). Confirm no wrong P&L on an unopened portfolio (Part B).

---

## TX-SAFE-C. Edit-buy sell-invariant guard — editing a buy (or its date) can't leave a later sell over-sold  (✅ BUILT 2026-08-08 — CRYP-94, folded into §GROUP-B findings 9+10)

> **✅ BUILT 2026-08-08 as part of §GROUP-B (CRYP-94).** The `firstOverSoldSell` replay guard now
> runs on add, edit, AND delete (`remEntry` routes through the same helper). See §GROUP-B below for
> the full Group B build (findings 7–12). The original staging notes are kept below for the record.
>
> **Staged, not queued.** Finished + approved (2026-08-04 interview). NOT in the BUILD-LOOP ledger.
> Gate: 🔶 **bug-class** → failing-test-first (a red `it("CRYP-XX: …")` committed as a checkpoint,
> then the fix), per [`JIRA-WORKFLOW.md`](../testing/JIRA-WORKFLOW.md). Blast radius: LOW (one pure
> helper + one guard in `CryptoIdea.jsx` + tests). **No `firestore.rules`, no backend, no new dep, no
> `test:rules`.** Same family as **TX-SAFE** (Parts A/B) → this is effectively **TX-SAFE Part C**.

### Founder report (2026-08-04, client-side user app, coin **BTC**; screenshot)
The app enforces "you can't sell more than you hold" when you **add a sell** — good, and helpful. But
there's a bypass: **add a buy → add a sell smaller than the buy → then edit the buy DOWN** (repeat) until
total-sold exceeds total-bought. The screenshot shows a BTC position with **bought 0.3, sold 6** (holding
displays 0, P/L "+1900%"). Founder: when you edit a coin and a sell transaction exists, the edit should be
refused with a clear message — "there is a sell transaction; you can't edit this below what you've sold.
Delete the sell first, then reduce the buy."

### Root cause (verified in code)
- The sell-vs-holdings check in `addEntry` ([`src/CryptoIdea.jsx`](../../src/CryptoIdea.jsx) ~L783-798)
  is **gated on `eTxType==="sell"`**. It's even date-aware — it computes `holdingsAtDate` (cumulative
  buys−sells up to the sell's date, excluding the edited entry) and rejects a sell that exceeds it.
- **The edit path reuses `addEntry`** (`if(editEntry)` ~L804 → `dbUpdateTransaction`). So when you edit a
  **buy** (`eTxType==="buy"`), that whole sell-check block is **skipped** — nothing re-validates that the
  edit keeps every existing sell covered. Editing a buy's **amount down**, moving its **date later**, or
  flipping **buy→sell** can all retroactively break a later sell, unchecked.
- The **delete path already guards this correctly**: `remEntry` (~L830-831) replays the remaining entries
  in date order and refuses with *"Can't delete — a sell on `<date>` depends on it"* if the running balance
  goes negative (epsilon `-0.00000001`). So the invariant is understood — it's just **not applied on edit**.
  Asymmetry today: **add-sell ✅ guarded · delete-buy ✅ guarded · edit-buy ❌ unguarded.**
- Why the corrupt state *looks* clean: `holdings()` ([`src/utils/pnl.js`](../../src/utils/pnl.js) L6-7)
  clamps to `Math.max(0,…)`, so an over-sold coin shows **0 held** (never negative) while P/L still counts
  the phantom sell proceeds — the "+1900%" / "profited more than your total investment" note.

### The invariant is inherently client-side (honest scope)
`validTransactionData()` in [`firestore.rules`](../../firestore.rules) (L456-465) validates a **single**
transaction doc's shape (`type∈{buy,sell}`, `amount>0`, `priceAtBuy`, `date`). Firestore rules **cannot
aggregate sibling transaction docs** during a write, so "cumulative sold ≤ bought at each sell's date"
can't be a rule. This guard is therefore a **client-side data-integrity / UX guard, not a security
boundary** — acceptable here: it's the user's **own** cost-basis tracker, no money moves, no cross-tenant
exposure. Record it as such (defense-in-depth: the existing per-doc rule bounds stay).

### Decisions (locked — 2026-08-04 interview)
1. **Fix shape = replay-guard (mirror `remEntry`).** On Save, replay the coin's timeline **with the edit
   applied**; if any sell would exceed holdings at its date, block with a **date-specific** message. More
   robust than a plain "buy vs total-sold" check: it's date-correct and covers amount-down, date-moved, and
   buy→sell edits. One reusable **pure** helper — and the existing add-sell check + `remEntry` can route
   through the same function (single source of truth for the invariant).
2. **Existing corrupt data = prevent-new only (KISS).** No migration. Already-over-sold coins stay until the
   user edits/deletes to fix them; the misleading P/L note self-corrects once the transactions are valid.
3. **Track as a CRYP Jira bug + failing-test-first.** ⚠️ The Rovo/Jira MCP was **disconnected** when this
   was staged (2026-08-04, non-interactive session) — file via `/jira-bug` in an interactive session (or
   once the MCP reconnects); until then **this section is the spec**. The build starts with the red
   reproduction test committed as a checkpoint (`it("CRYP-XX: editing a buy below the sold amount is
   rejected")`), never weakened to pass.

### The fix (smallest thing that works · consistency sweep — change in EVERY file)
1. **`src/utils/tx.js`** (already holds tx ordering helpers) — add a **pure** `firstOverSoldSell(entries)`:
   sort by date asc (createdAt tie-break, same order `remEntry` uses), replay `bal = buy?+amt:−amt`, and
   return the **first sell** whose running `bal < -1e-8` (the offending sell), else `null`. Unit-tested.
2. **`src/CryptoIdea.jsx`** — in `addEntry`, **before the write on the edit path** (and harmlessly on add),
   build the **projected** entries = the coin's entries with `editEntry.id` replaced by the new
   `{type,amount,date}` (for a plain add, the appended entry), run `firstOverSoldSell`, and if it returns a
   sell: `showErr("Can't save — a sell on "+date+" would exceed your holdings. Delete or reduce that sell
   first.")` and `return` (no `dbUpdateTransaction`/`dbAddTransaction` call). Optionally fold the existing
   `eTxType==="sell"` point-in-time check into the same helper so there is ONE invariant function.
3. **Tests** — `tests/unit/tx.test.js` (helper) + `tests/unit/AddEntry.test.jsx` (edit path).
4. **Docs** — a one-line note in [`DATA-INTEGRITY.md`](DATA-INTEGRITY.md) that the sell-invariant is now
   enforced on **edit** too (closes the hole adjacent to **DI/G3**, which audited the edit path's *toast*
   wording but not this invariant).

### Acceptance (RED first; never weaken a test)
- **Unit — `firstOverSoldSell` (pure):** buy 0.3 then sell 0.2 → `null`; buy 2 + sell 2, then the projected
  "buy→0.2" → returns the sell; **date-aware:** a buy dated *after* a sell does not cover it; a buy→sell
  flip that over-sells → returns; the `-1e-8` epsilon boundary.
- **Interaction — edit path:** editing a buy below what a later sell needs is **rejected** with the
  date-specific message and **no db write fires** (spy asserts `dbUpdateTransaction` **not** called); a valid
  edit still saves; the `CRYP-XX`-keyed reproduction of the founder's exploit (buy 2 → sell 2 → edit buy→0.2)
  is blocked.
- **`npm run build`** — clean (no-names guard). **No `test:rules`** (no rules/backend change).

---

## GROUP-B. Oversell & P&L integrity — 6 findings on the Portfolio/Detail/CoinInfo books  (✅ BUILT 2026-08-08 · CRYP-94 · client-only)

> From the 2026-08-06 Portfolio-tab gap sweep (the umbrella that also contains §TX-SAFE-C = findings 9+10).
> **🟩 client-only** — pure helpers + P/L math + display; **no `firestore.rules`, no backend, no new dep, no `test:rules`.**
> Filed as **Jira CRYP-94**; failing-test-first, commits/tests kept per-finding.

**North star (shared with PORTFOLIO-NUM-FIX):** never show a *wrong/misleading* number — a missing datum reads "—", never a loss or a fake gain; and a user's own cost-basis book can't be driven into an impossible state.

**Founder decisions (2026-08-08 interview):** keep the sell-invariant **client-side only** (finding 11's cross-device race self-corrects on reload — no money/cross-tenant risk, and Firestore rules can't aggregate sibling tx docs); **prevent-new only, NO migration** of already-corrupt books; **hard-block future dates**; **defer** the parallel Research copies of 7/8; finding 7 clamp = **proportional (bought/sold)**; finding 8 = **Invested stays complete, P/L aggregates only priced coins**.

| # | Finding | Fix | Loci |
|---|---------|-----|------|
| 7 | over-sold coin books phantom realized gains (holdings clamps to 0, sellsGain doesn't) | `realizedProceeds` scales proceeds by `bought/sold`; `coinPnl`/`portfolioPnl` use it for P/L; raw `sellsGain` still shown | `src/utils/pnl.js` |
| 8 | missing price ≡ worthless (−$100/−100%) | `coinPnl` returns null value/pnl for a held coin with unknown price (a genuine 0 stays worthless); `portfolioPnl` excludes it from value & P/L, keeps cost in Invested; muted "—" | `pnl.js` · `Detail.jsx` · `CoinInfo.jsx` · `app.css` (`.kv-v.muted`/`.pnl-val.muted`) |
| 9 | oversell not re-checked on a backdated insert | replay the PROJECTED timeline through `firstOverSoldSell` | `src/utils/tx.js` · `CryptoIdea.jsx` (`addEntry`) |
| 10 | edit path unguarded (editing a buy down below sold — the founder exploit) | same replay guard on the edit path; `remEntry` routes through the same helper | `tx.js` · `CryptoIdea.jsx` |
| 11 | cross-device stale-state oversell | **accepted** as client-side only (self-corrects on reload); the guard + findings 7/8 neutralize the visible symptom | — (decision) |
| 12 | future-dated tx accepted | `isFutureTx` rejects a date after today in `addEntry`; date input carries `max` | `tx.js` · `CryptoIdea.jsx` · `AddEntry.jsx` |

**Tests:** `tests/unit/tx.test.js` (firstOverSoldSell + isFutureTx) · `tests/unit/pnl.test.js` (realizedProceeds clamp + unknown-vs-worthless) · `tests/unit/AddEntry.test.jsx` (date `max`) · `tests/unit/Detail.test.jsx` + `tests/unit/CoinInfo.test.jsx` (muted "—") · `tests/unit/CryptoIdea.walkthrough.test.jsx` (edit-buy exploit blocked end-to-end, no db write). Unit 982/982; build clean. Logged in [`ERRORS.md`](../testing/ERRORS.md) §A11.

### Definition of Done
- test:unit + build green. Emulator browser-verify (if the stack runs): reproduce the exploit → blocked with
  the date message; delete the sell → the buy then edits fine.
- CRYP ticket filed (or intent recorded here if the MCP is down); the failing test is committed **red first**
  per [`JIRA-WORKFLOW.md`](../testing/JIRA-WORKFLOW.md).
- Staged, not queued: no BUILD-LOOP row until founder says go.

### Cross-links
- **TX-SAFE** (Parts A/B, ✅ built) — same "transaction-write safety" family; this is Part C.
- **DI / G3** (§DI) — audited the edit path's *limit-toast* wording; missed this sell-invariant. This closes it.
- `remEntry`'s delete-guard (`CryptoIdea.jsx` ~L830-831) — the exact replay pattern reused here.

---

## COININFO-RANK. Remove the duplicate market-cap rank next to the coin symbol in the Coin-info overlay  (📋 STAGED 2026-08-04 interview; NOT built)

> **Staged, not queued.** Finished + approved (2026-08-04 interview). NOT in the BUILD-LOOP ledger.
> Gate: 🟩 **GREEN** — display-only, single file, **one line**, computation-safe. Blast radius: MINIMAL.
> **No rules, no backend, no new dep.** Qualifies for the CLAUDE.md "trivial single-file display fix,
> one-line heads-up" exception; staged here for the record.

### The founder's question, answered (trace)
> "In the Coin-info popup a rank shows twice — `BTC · Rank #1` next to the symbol AND `Rank #1` in Market
> Data. Is the one next to the symbol wired to any computation? If not, remove it."

**No — the sub-header text drives zero computation; removing it is safe** (verified 2026-08-04, read-only
4-agent trace). Two separate things are named "rank," and only one is wired to logic:
- **The rank DATA FIELD (`usd_market_cap_rank`)** *does* feed a real computation — the Research tab's
  **Portfolio Risk / RiskMeter** — but via a completely separate path: `/api/prices` → `useLivePrices` map →
  `priceAdapter.js` reads `live.usd_market_cap_rank` → `computePortfolio` puts `rank` on each holding →
  `coinRisk`/`isMega`/`rankBucket` grade it. That chain reads the **field off the prices map**, never any
  rendered CoinInfo string.
- **The sub-header TEXT** ([`src/components/CoinInfo.jsx`](../../src/components/CoinInfo.jsx) L54) is pure
  display. CoinInfo's local `rank` const (L37) is used at exactly two leaf JSX sites — the price-hero
  sub-line (L54) and the Market Data row (L64) — and is never exported, returned, or pushed to state. It's a
  terminal presentational value.

Deleting the `· Rank #N` suffix at L54 therefore affects **zero computation**: the `usd_market_cap_rank`
field stays (still read at L37, still rendered in the Market Data row at L64), so the risk model is
untouched and the rank is still shown once — in its labeled row.

### Decision (locked — 2026-08-04 interview)
- **Remove the hero rank only; keep the Market Data "Rank" row.** After the edit the CoinInfo header matches
  [`Detail.jsx`](../../src/components/Detail.jsx) (`.ph-sub` ~L76 is already symbol-only) — a consistency win.
- **`Search.jsx` left as-is** (its `{symbol} · #N` ~L72/L100 is the **only** rank on the Search screen — a
  feature, not a duplicate; dropping it would be a feature removal, not a de-dup).

### The change (one line)
`CoinInfo.jsx` L54:
`<div className="ph-sub">{coin.symbol}{rank?" · Rank #"+rank:""}</div>` → `<div className="ph-sub">{coin.symbol}</div>`
Keep the `rank` const (L37, still used by the Market Data row L64) and the field. Display-only.

### Consistency
- **Leave (data-field docs/tests — the field + Market Data row stay):** CLAUDE.md `/api/prices` shape,
  [`DESIGN-PASS.md`](../design/DESIGN-PASS.md) DP-9b / R23, `openapi.json` `PriceEntry.usd_market_cap_rank`,
  the research-risk unit tests — all describe the backend field, unaffected.
- **Optional cosmetic tidy (nothing breaks if skipped):** `tests/unit/CoinInfo.test.jsx` stays green (its
  `getAllByText(/Rank #1|^#1$/)` still matches the kept Market Data value via the `^#1$` branch); the
  `Rank #1` alternative + "Rank rows" (plural) comment go stale → optionally singularize. CLAUDE.md ~"CoinInfo
  Rank rows" → "Rank row". `docs/mockups/desktop/index.html` hero still shows "BTC · Rank #1" (historical
  artifact; optional).

### Acceptance & DoD
- `tests/unit/CoinInfo.test.jsx` stays green (kept row matches); optionally tidy the stale regex alternative
  + comment. **`npm run build`** clean. No rules/backend/dep. Emulator browser-verify: open a coin's info →
  header shows just the symbol, Market Data still shows Rank. GREEN; staged, not queued.

### Cross-link
- The trace found **Detail.jsx** already renders the symbol-only header — this aligns the two coin headers.

---

## RESEARCH-RISK. Split Allocation + Portfolio Risk into two card pills, and re-tier the risk formula to market-cap/rank tiers  (📋 STAGED 2026-08-04 interview + adversarial validation; NOT built)

> **Staged, not queued.** Finished + approved (2026-08-04 interview; calibration adversarially
> validated). NOT in the BUILD-LOOP ledger. Gate: **Part 1** design 🟩 GREEN; **Part 2** is a pure
> client-side formula change (unit-tested). Blast radius: `research/utils/portfolio.js` + 2 components +
> the note copy + tests. **No `firestore.rules`, no backend, no new dep, no `test:rules`. No pricing change.**

### The founder's ask (2026-08-04, screenshot of the Overview Allocation + Portfolio Risk card)
1. **Design:** Allocation and Portfolio Risk each become **their own card pill** (same design, just
   separated — today they share one container).
2. **Accuracy:** make Portfolio Risk *reflect the real portfolio* — driven by **allocation × per-coin
   risk**, where per-coin risk comes from **market-cap tiers + rank**. 50% Bitcoin → risk down massively;
   30% in a rank-~300 / sub-$100M coin → adds a lot; <$100M = very risky; <$50M = near-certain eventual zero.

### What already exists (so this is a refinement, not a rebuild)
`deriveRisk`/`coinRisk` ([`portfolio.js`](../../src/features/research/utils/portfolio.js) L67-109) **already**:
rank-first log curve + a *different* log-cap fallback, **allocation-weighted mean**, a **≥40% $100B mega-cap
floor**, 3 bands (0.34/0.67), and a rank-bucket note. **Two of the founder's requirements are already met**
(allocation-weighting → a small junk % barely moves it; 50% BTC already pulls the mean down). **Gaps:**
(a) the explicit **market-cap tiers aren't the driver** (rank is); (b) the **$1B–$10B band is undefined**;
(c) super-safe is anchored at **$100B not $10B**; (d) the note speaks **rank buckets**, not the founder's $ tiers.

### Decisions (locked — 2026-08-04 interview)
1. **Per-coin risk = the RISKIER (`max`) of {cap-tier, rank-tier}** over the signals present; **neither → 0.98.**
2. **5 cap tiers:** >$10B · $1B–$10B · $100M–$1B · $50M–$100M · <$50M.
3. **Concentration stays OUT of the risk score** — risk = allocation-weighted mean only; the Allocation card
   keeps the "High concentration" pill. (More Bitcoin → lower risk, per the founder's example.)
4. **Discrete named tiers** (not a smooth curve).
5. **Retire the ≥40% mega-cap floor** — under the accuracy goal it would *mask* a junk-heavy book (50% BTC +
   50% sub-$50M must read High, not be capped at Moderate). The honest weighted mean supersedes it. **(New —
   a design consequence, not asked; flagged for veto.)**

### Part 1 — Two card pills (design-only)
[`OverviewView.jsx`](../../src/features/research/components/OverviewView.jsx) L45-52 wraps `AllocationBar` +
`RiskMeter` in one `.pulse`/`.pulse-inner` container. Give **each** its own card pill (same visual as the
current combined card, reusing the existing card styling in
[`research-tab.css`](../../src/features/research/styles/research-tab.css)). No logic change.

### Part 2 — The re-tiered risk formula (LOCKED calibration, adversarially validated 12/12)
**Structure:** `perCoinRisk = max(capTier, rankTier)` over the **present** signals; `score = Σ (allocᵢ/100)·riskᵢ`
(weights sum to 1). **No concentration penalty. No mega floor.** Pure → unit-tested.

**CAP tiers** (by USD market cap):

| Market cap | risk | meaning |
|---|---|---|
| ≥ $10B | **0.05** | super-safe |
| $1B – $10B | **0.18** | large / safe |
| $100M – $1B | **0.45** | medium |
| $50M – $100M | **0.80** | very risky |
| < $50M | **0.98** | highest — near-certain eventual zero |

**RANK tiers** (by market-cap rank; the validation re-aligned three lines so rank never *overstates* a size the
cap tier already vouched for):

| Rank | risk |
|---|---|
| ≤ 10 | 0.05 |
| 11 – 50 | 0.12 |
| 51 – 100 | 0.18 |
| 101 – 300 | 0.45 |
| 301 – 500 | 0.70 |
| 501 – 1000 | 0.85 |
| > 1000 | 0.95 |
| **absent / `null`** | **no signal** → score on cap alone (if cap also absent → 0.98) |

**Bands:** `score < 0.20 → Low` · `0.20 ≤ score < 0.50 → Moderate` · `score ≥ 0.50 → High`.

**⚠️ Two calibration traps the validation caught (bake into the tests):**
- **`null` rank is ABSENT, not `rank > 1000`.** The app shows rank as `—`/`null` until the daily universe
  refresh assigns one. Mapping `null → 0.95` would let `max()` flip a **fresh $3B large-cap to High**. Score on
  **cap alone** when rank is null. (A sub-$50M unranked coin still reads 0.98 via its **cap** tier — nothing masked.)
- **`max(cap, rank)` means a tiny-cap coin can't hide behind an OK rank:** a $30M coin at rank 200 reads **0.98**
  (cap), not 0.45 (rank).

**Worked-examples acceptance oracle (12/12 pass — use these as the unit tests):**
Assume BTC rank1 ~$1.3T; ETH rank2 ~$330B; SOL rank5 ~$70B; *mid* = rank~120/~$500M; *small* = rank~350/~$80M;
*micro* = rank~900/~$30M; *unranked-micro* = no rank/~$20M. Per-coin: BTC/ETH/SOL 0.05 · mid 0.45 · small 0.80 ·
micro 0.98 · unranked-micro 0.98.

| Portfolio | Score | Label |
|---|---|---|
| 100% BTC | 0.050 | Low |
| 50% BTC + 20% SOL + 20% ETH + 10% micro | 0.143 | Low |
| 50% BTC + 50% micro | 0.515 | High |
| 70% BTC + 30% small | 0.275 | Moderate |
| 30% BTC + 40% ETH + 30% SOL | 0.050 | Low |
| 100% micro (<$50M) | 0.980 | High |
| 100% small ($50–100M) | 0.800 | High |
| 100% mid ($100M–$1B, rank~120) | 0.450 | Moderate |
| 80% BTC + 20% micro | 0.236 | Moderate |
| 80% BTC + 10% micro + 10% small | 0.218 | Moderate |
| 100% unranked-micro (<$50M, no rank) | 0.980 | High |
| 33% BTC + 33% mid + 34% small | 0.437 | Moderate |

**Risk-note copy** (cap-tier language, replaces the rank-bucket note). One-line template — a 3-bucket rollup of
the 5 tiers: `{safe}% safe (>$1B) · {medium}% medium ($100M–$1B) · {high}% high-risk (<$100M)` (safe = cap ≥ $1B;
high-risk = cap < $100M). Examples: *Low* — "83% in safe large-caps over $1B and only 10% in high-risk coins
under $100M — small enough to go to zero without denting the total. Reads Low." *High* — "Over half of this book
is in high-risk coins under $100M market cap, which can lose most of their value — so it reads High." Per-coin
card vocabulary (for a later Coins-tab label): `super-safe (≥$10B) · large ($1–10B) · medium ($100M–$1B) · very
risky ($50–100M) · highest-risk (<$50M)`.

**Edge cases:** no cap AND no rank → 0.98 (honest default when we can't measure). One signal present → use that
tier alone (cap-present/rank-absent → cap tier; do NOT synthesize a rank). Boundary steps at $10B/$1B/$100M/$50M
are intentional discrete cliffs; `max()` cushions most rank cliffs because the overlapping cap tier holds the floor.

### Implementation (consistency sweep — change in EVERY file; no drift)
1. **`portfolio.js`** — rewrite `coinRisk` (tiered `max(cap,rank)`, **null-rank = absent**, neither → 0.98);
   `deriveRisk` (**drop the mega floor**, re-tier bands to 0.20/0.50, build a **cap-tier** breakdown for the
   note); replace the rank-bucket `riskNote` with the cap-rollup copy. Keep everything pure.
2. **`OverviewView.jsx`** — Part 1 two-card split.
3. **`RiskMeter.jsx`** — mechanics unchanged (reads `risk.score`/`level`/note); it just renders the new note.
4. **`research-tab.css`** — card-pill styles for the split if needed.
5. **Tests** — `tests/unit/research-risk.test.js`: **replace** the old rank-log assertions with the 12
   worked-example portfolios as the oracle + the two calibration traps (null-rank-on-cap-alone; `max` beats a
   deceptive rank); `research-adapters` if it asserts risk; the Overview render test for the 2-card split.
6. **Docs** — CLAUDE.md "Research tab" + the **R23/R14** notes (rank-log risk, mega floor, rank-bucket note) go
   stale → update to the tiered model in the same commit; [`DESIGN-PASS.md`](../design/DESIGN-PASS.md) R23/R14
   cross-note.

### Acceptance (RED first; never weaken a test)
- **Unit (pure):** the 12 worked-example portfolios produce the **exact** score+label above; a $30M/rank-200 coin
  reads 0.98 (cap beats rank); a **null-rank $3B** coin reads 0.18/**Low** (not High); neither-signal → 0.98;
  band boundaries at 0.20/0.50; the mega floor is gone (50% BTC + 50% micro = 0.515 → **High**).
- **Component:** Overview renders **two** separate cards (Allocation, Portfolio Risk); the meter note uses
  cap-tier language.
- **`npm run build`** clean. **No `test:rules`** (no rules/backend change).

### Definition of Done
- test:unit + build green. Emulator browser-verify: the two cards render separately; 50% BTC + 50% sub-$50M reads
  **High** (was capped Moderate by the old floor); a fresh unranked large-cap reads **Low**.
- Docs synced in the same commit (CLAUDE.md R23 note is now wrong).
- Staged, not queued: no BUILD-LOOP row until founder says go.

### Cross-links
- **Supersedes** the R23 rank-log risk model + R14/R23 mega-cap floor + rank-bucket note (DESIGN-PASS §R23/§R14).
- The 5-tier **per-coin** vocabulary could later label the **conviction-signal pills** on the Coins tab (a
  separate per-coin signal, mock-fed today) — optional follow-on, not in scope here.

---

## RESEARCH-SWITCH. Portfolio switcher in the Research tab — pick which portfolio you're researching, in-tab  (📋 STAGED 2026-08-04 interview; NOT built)

> **Staged, not queued.** Finished + approved (2026-08-04 interview). NOT in the BUILD-LOOP ledger.
> Gate: **small, client-only** — a selector + prop threading; **no `firestore.rules`, no backend, no new
> dep, no `test:rules`, no pricing change.** Candidate 🟩 GREEN, but founder decides the build order.
> Blast radius: `research/Research.jsx` + `ResearchTab.jsx` (+ optional tiny `PortfolioSwitcher.jsx`) +
> `research-tab.css` + the CLAUDE.md Research note + a component test.

### The founder's ask (2026-08-04, screenshot of Overview Allocation/Risk with multiple portfolios in mind)
"What happens to Research when there are multiple portfolios (max 15, each its own coins)? Is it one combined
risk? What about allocation / coins? I want **separation per portfolio** — each portfolio's allocation, its
own risk, its coins grouped by portfolio, and Portfolio Pulse cards one after another, each showing the
portfolio's name."

### Reconciliation — the founder chose a SWITCHER over stacking (interview Q1)
The ask described portfolios **stacked "one under another."** When shown the cost of that (Research today loads
ONLY the active portfolio; stacking all 15 means loading every portfolio's coins + a large price poll on every
open), the founder chose **"Portfolio switcher"** — *view one portfolio at a time, selectable in-tab.* This is
the reconciled design below. **If the founder actually wants them stacked, this section is re-opened.** (Noted
because the chosen option diverges from the literal first description — a deliberate, cost-aware choice.)

### What already exists (so this is a small add, not a rebuild)
Research is **active-portfolio-only today.** [`Research.jsx`](../../src/features/research/Research.jsx) L19-28
passes just the active `portfolio`; [`CryptoIdea.jsx`](../../src/CryptoIdea.jsx) L857-863 `watchCoins` streams
**only the active portfolio's** coins (the other ≤14 aren't loaded); [`useLivePrices`](../../src/hooks/useLivePrices.js)
polls only the active portfolio's coins; `coinOrder` (R32) + the conviction pills are already keyed to the
active portfolio. **So everything Research shows already follows whichever portfolio is active** — there's just
no way to change *which* without leaving the tab.

### Decisions (locked — 2026-08-04 interview)
1. **Switcher, one portfolio at a time** (Q1) — not stacked, not a combined view. A selector at the top of
   Research lists the user's portfolios by name; picking one shows THAT portfolio's Overview + Coins + Ask.
2. **No whole-account summary** (Q2) — per-portfolio only; no combined value/blended-risk card. (Matches the ask + KISS.)
3. **The one switcher scopes all three sub-tabs** — Overview, Coins **and Ask**. This *is* the "picker in Ask"
   (Q3): Ask inherits the selected portfolio's context, so **no separate Ask picker is needed** (one control,
   not two). If the founder later wants Ask independently selectable, add a second picker — not in scope here.
4. **Pulse cached per portfolio** (Q4) — today Pulse is derived offline **per shown portfolio** (already
   effectively per-portfolio). The decision only bites at **Wave B**: the live-AI Pulse/conviction cache MUST
   be keyed **per `(uid, portfolioId)`** so 15 portfolios cost ≤15 cached refreshes/day, never one per view.
   Recorded here so the B2 proxy keys the cache correctly (cross-link below); **nothing to build now.**

### The design (KISS — reuse the active-portfolio machinery)
**The switcher drives the app's global `activePortId`** (recommended). Selecting a portfolio in Research calls
`setActivePortId` — and `watchCoins`, `useLivePrices`, `coinOrder`, conviction, risk **already** key off the
active portfolio, so **zero new data plumbing**: only the selected portfolio's coins load, exactly as today.
This is what makes the switcher choice cheap — the ≤15-portfolio load problem is *sidestepped*, not solved.
- **Side effect to flag:** switching the portfolio from Research also changes what the **Portfolio / Journal /
  Learn** tabs show (there's one global "active" portfolio). This is arguably *correct* (one current portfolio)
  and is the KISS default. **Alternative** (if the side effect is unwanted): an independent `researchPortId`
  with its own coin load + price poll — more moving parts; revisit at build time only if the founder dislikes
  the cross-tab jump.
- **Free tier (1 portfolio):** hide the switcher (nothing to pick). **Pro (3) / Premium (≤15):** list all by name.
- **Empty selected portfolio:** the existing `source==='empty'` → `<EmptyState/>` already handles it — no new work.
- **Portfolio names** are user strings → React auto-escapes (no `innerHTML`); safe by default.
- **UI placement:** a compact selector (chips or a `<select>`) between the Research header and the
  Overview/Coins/Ask segmented bar. Design-only styling in `research-tab.css`.

### Gaps found (audited)
- **G1 — data load:** the ONLY real blocker for "show all portfolios" was that non-active portfolios aren't
  loaded. The switcher-drives-`activePortId` design **avoids it entirely** (still one portfolio loaded at a time).
- **G2 — Ask double-picker:** naively adding a separate Ask picker would give two controls that can disagree.
  Decision 3 uses the single top switcher for all three sub-tabs → one source of truth.
- **G3 — Wave-B AI cost:** a per-portfolio Pulse with an un-keyed cache would regenerate per view. Decision 4
  pins the cache key to `(uid, portfolioId)` — captured now, enforced when B2 lands.
- **G4 — coinOrder / conviction:** both are already per-active-portfolio, so they follow the switcher for free
  (no per-group re-scoping needed — which a *stacked* design WOULD have required).
- **G5 — RESEARCH-RISK coupling:** orthogonal. RESEARCH-RISK changes the single-portfolio risk math + splits
  the Allocation/Risk cards; the switcher only changes *which* portfolio feeds them. Either can build first; if
  RESEARCH-RISK lands first, the switcher inherits the split cards automatically.

### Consistency sweep (change in every file the topic touches)
- [`Research.jsx`](../../src/features/research/Research.jsx) — pull `portfolios, activePortId, setActivePortId`
  from context (already exposed at CryptoIdea.jsx L991), thread to `ResearchTab`.
- [`ResearchTab.jsx`](../../src/features/research/components/ResearchTab.jsx) — render the switcher; `onChange → setActivePortId`.
- *(optional)* `src/features/research/components/PortfolioSwitcher.jsx` — small presentational selector (or inline).
- [`research-tab.css`](../../src/features/research/styles/research-tab.css) — switcher styles (scoped under `.research-root`).
- `CLAUDE.md` "Research tab" section — update the "active portfolio's coins" note to "the **selected** portfolio (switcher)".
- Tests: a component test that changing the switcher changes the shown portfolio; existing research tests unaffected.

### Definition of Done
- test:unit + build green. Emulator browser-verify (Pro/Premium account with ≥2 seeded portfolios): the switcher
  lists all portfolios; picking one swaps Overview/Coins/Ask to that portfolio; a 1-portfolio account hides it.
- Docs synced in the same commit (CLAUDE.md Research note + this file).
- Staged, not queued: no BUILD-LOOP row until founder says go.

### Cross-links
- **Wave B / [`CACHE-POLICY.md`](../decisions/CACHE-POLICY.md):** the live Pulse/conviction cache key must
  include `portfolioId` (Decision 4) — the B2 proxy owns this; recorded here so it isn't missed.
- **RESEARCH-RISK** (above): orthogonal; the switcher feeds whichever risk model is live.
- **If stacked is what the founder meant** (see Reconciliation): re-open with the heavier "load all + per-group
  allocation/risk/pulse + per-group coinOrder" design — a materially larger build than this switcher.
- **[`PORTFOLIO-SCOPE-MAP`](#portfolio-scope-map-per-portfolio-vs-per-account-tab-by-tab)** (below): Learn is
  explicitly **per-account** and out of scope for any per-portfolio work.

---

## PORTFOLIO-SCOPE-MAP. Per-portfolio vs per-account, tab by tab  (📋 DECISION LOG 2026-08-04 interview)

> **Not a build item — a scope guard rail** for the multi-portfolio thread (RESEARCH-SWITCH above). Records
> which tabs move *per portfolio* and which stay *per account*, so no future increment accidentally adds a
> portfolio dimension where there shouldn't be one (or forgets one where there should).

### Founder decision (2026-08-04) — Learn is per-account
The **Learn tab is per-user, NOT per-portfolio.** One Learn tab per account; multiple portfolios do not affect
it and there is **no reason to have a per-portfolio Learn.** **Verified against the code:** progress is stored
at **`users/{uid}/learn/progress`** (rules `match /learn/{docId}` gated on `isOwner(userId)` — no portfolio in
the path; [`firestore.rules`](../../firestore.rules) L346-352), and [`useLearn.js`](../../src/hooks/useLearn.js)
never reads `activePortId`/`portfolio`. So the RESEARCH-SWITCH switcher (which drives the global active
portfolio) **leaves Learn untouched by design** — level/XP/streak/module state are one shared account journey.
**Guard rail:** do NOT add a portfolio dimension to Learn.

### The map (audited 2026-08-04)
| Tab | Scope | Why / where |
|---|---|---|
| **Portfolio** | per-portfolio | shows the active portfolio's coins; switch = `setActivePortId`. |
| **Research** | per-portfolio | RESEARCH-SWITCH: in-tab switcher selects the portfolio (Overview/Coins/Ask). |
| **Journal** | per-portfolio | theses persist on the **coin doc** (`journal{…}`), bounded by a portfolio's coins. |
| **Learn** | **per-account** | `users/{uid}/learn/progress` — one journey per user. **This decision.** |
| **Search** | global | searches the shared coin universe; not portfolio-scoped (adds *into* the active one). |
| **Account** | per-account | profile / plan / usage / privacy — user-level, no portfolio dimension. |

### Gaps found (audited)
- **G1 — none functional.** Learn already matches the founder's intent; this is documentation + a guard rail,
  not a code change. No `firestore.rules`, no backend, no test change.
- **G2 — cross-tab consistency:** the RESEARCH-SWITCH switcher changing the global active portfolio must NOT be
  read as "Learn should follow too." The map makes the boundary explicit: Learn ignores `activePortId`.
- **G3 — Journal is the one to watch:** unlike Learn, Journal **is** per-portfolio, so a per-portfolio feature
  that lumps "Journal + Learn" together would be wrong. Called out so they're never scoped as a pair.

---

## ARCHITECTURE-DOC. Canonical `ARCHITECTURE.md` — consolidate the scattered architecture rules into ONE wired-in rulebook  (✅ BUILT 2026-08-08 · CRYP-100 · BUILD-LOOP #14 · branch `claude/architecture-doc`)

> **Build note (2026-08-08, docs-scribe):** shipped `docs/decisions/ARCHITECTURE.md` (ARCH-1…ARCH-17) + the
> three wiring anchors (`docs/interview.md` row, `CLAUDE.md` Conventions bullet, `AGILE.md` DoD placement gate)
> + sibling refreshes (`src/ARCHITECTURE.md`, `ARCHITECTURE-AUDIT.md` historical banner, `README.md`,
> `CODEBASE-MAP.md`). D1/D2 corrected to `current`. **⚠️ D3 is ALREADY RESOLVED** — the 3 inline `onclick`
> handlers the 2026-08-05 spec listed were rewired to `addEventListener` in `public/landing.js` by commit
> `824b903` (PR #44, 2026-08-08), which landed before this doc. So **`ARCH-DOC-FIX-1` is superseded / not
> needed** (the doc records D3 as resolved, per the "record the RESOLVED rule, drop stale gap language" rule).
> **`ARCH-DOC-FIX-2` (education-page.jsx direct `fetch` → reduce it to a link in `index.html`, founder-planned
> 2026-08-08) remains the one REQUIRED follow-up** — its own small code commit + a guard test.

> **Queued as [BUILD-LOOP](BUILD-LOOP.md) #14** (2026-08-05). **Docs-only increment** — no source code,
> no `firestore.rules`, no new dependency. Gate: 🟩 GREEN (writing + wiring Markdown; the only "tests" are
> `npm run build` staying clean — the doc ships nothing — and the doc links resolving). Built off a 4-agent
> read-only research sweep (2026-08-05): full rule inventory + enforcement-gap trace + house-style analysis
> + as-built reality check (findings recorded below). **Decisions were taken as the recommended defaults on
> 2026-08-05 (interview offered, not answered); the founder can override any of the four before build.**

### Why (the founder's exact worry: "is the code being built actually using this file?")
The research answer is **no — architecture is the one governed area with no wired-in canonical doc.** Two
files exist and neither governs the build loop:
- **`src/ARCHITECTURE.md`** (73 lines) is a *living* rulebook but scoped to **frontend layers only**
  (`api`/`hooks`/`components`/`utils`). Its only tie to the build process is a *passive* AGILE Definition-of-Done
  line ("update the doc **if** structure changed") — a post-hoc reminder, **not** a placement gate a session
  reads before writing code.
- **`docs/testing/ARCHITECTURE-AUDIT.md`** (152 lines) is a **2026-06-16 point-in-time snapshot**, filed under
  `testing/`, referenced only twice in passing (`REVIEW-FINDINGS.md:57`, `NEXT-STEPS.md:2054`) — **effectively
  orphaned**, and now **stale** (see Drift below).
- The repo's real anti-drift engine is the **`docs/interview.md` consistency map** (10 topic rows, bound in as
  CLAUDE.md Conventions' first mandatory bullet). It has **no "Architecture / layering" row** — so creating or
  moving a component/hook/api/util file is never routed through the layer rules. Compliance today rides on the
  coder *already knowing* the convention, not on any enforced reference.
- Meanwhile the *actual* architecture rules (the security boundary "only `dist/` ships", admin-is-a-separate-app,
  CSP/no-inline-scripts, flat-cost cache model, backend-monolith decision, code-splitting, data model) live
  **scattered across `CLAUDE.md`** with **no single canonical home**.

**So this is not "move the audit into a rules file."** It is: (1) **consolidate** the rules that are spread
across `src/ARCHITECTURE.md` + the audit + `CLAUDE.md` into ONE authoritative doc that matches the house
canonical-doc pattern, and (2) **wire it into the three places a session actually looks** — that wiring is the
fix for the founder's worry.

### Decisions (recommended defaults — locked 2026-08-05 unless the founder overrides)
1. **File home → `docs/decisions/ARCHITECTURE.md`** (founder choice 2026-08-05) — beside the other canonical
   "record" docs (`CACHE-POLICY.md`, `PRODUCT-DECISIONS.md`, `BILLING.md`) for house consistency; a reader who
   knows the `docs/decisions/` convention finds it where every other canonical decision doc lives. **`src/ARCHITECTURE.md`
   stays** as the detailed src-layer sub-doc that *composes under* it (the decisions doc owns the system shape;
   `src/` owns the `api/hooks/components/utils` layer detail + migration status). **`ARCHITECTURE-AUDIT.md` stays**
   with a new banner marking it a **historical 2026-06-16 snapshot** (superseded by `docs/decisions/ARCHITECTURE.md`).
   Nothing is deleted; no history is overwritten (Kaizen rule). *(Alts not chosen: root `ARCHITECTURE.md`, or
   promoting `src/ARCHITECTURE.md` in place.)*
2. **Scope → system-wide + cross-links.** All ~17 categories from the inventory as **ID-tagged rules
   (`ARCH-1…`)**: multi-page Vite/routing, frontend layering (+ documented exceptions), Research feature module,
   build/bundle/code-splitting, backend monolith, data layer & Firestore model, **rules = the security
   boundary**, admin separation/roles/claims, what-ships/secrets, output-encoding/CSP/headers, caching/flat-cost
   proxy, AI/Research safety, billing/audit/observability, responsive/design-system, process/governing-doc rules.
   For the deep areas the rulebook **CROSS-LINKS the existing canonical docs** (caching→`CACHE-POLICY.md`,
   HTTP→`API-SECURITY.md`+`openapi.json`, isolation→`ISOLATION.md`, product→`PRODUCT-DECISIONS.md`) and states
   the *architectural rule* only — **it never copies their decision logs**, so it can't become a NEW drift
   source. *(Alt not chosen: layering-only.)*
3. **Enforcement → all three anchors** (see "Wiring" — this is the load-bearing part). *(Alt not chosen:
   CLAUDE.md bullet only, or doc-only.)*
4. **Two small real drifts → must-fix** (founder choice 2026-08-05): the rulebook states the CLEAN rule with
   **no exception carve-out**; both become **required** fix-increments in the backlog (`ARCH-DOC-FIX-1/2`),
   listed in the doc as **known violations to be fixed** (the audit's "known violations" framing), not as
   accepted exceptions. *(Alts not chosen: document-as-accepted-exception, or document-only.)*

### Structure of the new `ARCHITECTURE.md` (clone the house canonical-doc pattern)
Match `CACHE-POLICY.md` / `PRODUCT-DECISIONS.md` / `API-SECURITY.md` exactly:
1. **Banner blockquote:** "**Canonical record of the system architecture** — 2026-08-05 codebase audit
   (4-agent read-only sweep: 17 rule categories, as-built verified in source)." + an authority clause —
   "Where this doc and a stale planning/design note disagree, **this doc wins** for architecture (as
   `PRODUCT-DECISIONS.md` does for product, `CACHE-POLICY.md` for caching)." + a **scope-composition** line:
   it owns the system/layering shape; `src/ARCHITECTURE.md` keeps the src-layer rules + migration status;
   `CACHE-POLICY`/`API-SECURITY`/`ISOLATION`/`PRODUCT-DECISIONS` keep their deep domains; `CLAUDE.md`+`CODEBASE-MAP.md`
   hold current code reality; `NEXT-STEPS §1/§2` holds build order. Add the "Two readers: future-me + Claude/teammate" line.
2. **Body:** numbered sections, each an **ID-tagged rule** (`ARCH-1 … ARCH-N`) in **imperative** form, each with
   its **source** (file + section) and a **status tag** (`current` / `migration-in-progress` / `aspirational` /
   `by-design-exception` / `historical`). Open with a short **"How this maps to the code"** table
   (layer → dirs). Keep a **"By-design exceptions"** subsection (backend monolith un-split per §2; frontend
   model logic in `api/firebase-*.js`; CRUD/upgrade orchestrators in `CryptoIdea.jsx` per §1b; logical—not
   physical—per-uid isolation per ISO-D1) so a reader never mistakes a deliberate deviation for a violation.
3. **Cross-references / Interplay footer** linking `src/ARCHITECTURE.md`, `ARCHITECTURE-AUDIT.md` (historical),
   `CODEBASE-MAP.md`, `docs/diagrams/frontend-layered-architecture.svg` (register the SVG as the visual
   companion), and the sibling canonical docs. Kaizen footer: "Update this file when an architectural decision
   changes — don't overwrite history silently."

### Wiring — the three anchors (this is what makes a session consult it; do all three in the SAME commit per the consistency rule)
1. **`docs/interview.md` consistency map — ADD A ROW (highest leverage).** New `### Architecture / layering`
   subsection: `Docs: **[ARCHITECTURE.md]** · src/ARCHITECTURE.md · ARCHITECTURE-AUDIT.md (historical) ·
   CODEBASE-MAP.md · docs/diagrams/frontend-layered-architecture.svg` and `Code: src/{api,hooks,components,utils}/
   · src/features/research/ · functions/index.js (+ helper modules) · vite.config.js · index.html/app.html/admin.html`.
   Bold `ARCHITECTURE.md` as the canonical winner. This closes the one gap: today no architecture row and no bold
   owner exist, so structural changes bypass the sweep entirely.
2. **`CLAUDE.md` → Conventions — ADD a mandatory canonical-declaration bullet** mirroring the existing
   "Product direction:" / "Caching policy:" / "API surface & key security:" bullets:
   "**Architecture:** [`ARCHITECTURE.md`] is the canonical record of the system architecture/layering — it
   **wins over any stale planning/design doc**; the `src/` layer rules + migration status stay in
   `src/ARCHITECTURE.md`. When adding or moving a function/component/hook/api/util, follow the layer rules
   (component → hook → api → util; `utils/` pure; no `firebase/*` in components)." Because CLAUDE.md loads every
   session, this guarantees the reference is in-context. *(Leave CLAUDE.md's existing "## Architecture" prose as
   code-reality description; the canonical **pointer** belongs in Conventions.)*
3. **`docs/product/AGILE.md` Definition of Done — turn the passive line into an active gate.** Change the
   ":43" line to name the root doc — "(`README.md` / `ARCHITECTURE.md` / `src/ARCHITECTURE.md` / this backlog)"
   — **and** add a placement-gate item: "New/moved code sits in the correct layer per `ARCHITECTURE.md`; no new
   layer violation introduced." *(Optional 4th touch: add "place code in the correct layer per `ARCHITECTURE.md`"
   to `BUILD-LOOP.md` step-5 build gate + name it in step-3 "Re-read the spec"; and add a "Canonical:
   [ARCHITECTURE.md]" pointer at NEXT-STEPS §1/§2, matching how every other governed area cites its canonical doc.)*

### Drift the rulebook must fix (found in the as-built reality check — record the RESOLVED rule, drop stale gap language)
Stale-doc lag (code moved ahead of docs — **correct the numbers**, no code change):
- **D1 — backend size/shape.** `ARCHITECTURE-AUDIT.md` says "one flat 908-line `index.js`, 18 functions, no
  helper split." Reality: `index.js` ≈ **2,391 lines, 43 exported functions**, with **13 extracted helper
  modules** (`guards`/`billing`/`validate-output`/`config-diff`/`observability`/`net-utils`/`stats-daily`/
  `features`/`signup-gate`/`announcement`/`universe-utils`/`duplicates`/`audit-diff`; `functions/*.js` ≈ 3,652
  lines). Accurate framing: **"modular pure helpers + a per-handler-mixed `index.js`"**, not "flat monolith".
  The per-function controller+service+model mixing *is* still true and stays a documented by-design exception.
- **D2 — `src/ARCHITECTURE.md` "known violation #1"** still lists `admin-dashboard.jsx` as calling Cloud
  Functions directly with `api/admin.js` as "future". Reality: **`api/admin.js` exists** and the panel is
  **hook-driven** (`useAdminDashboard`), no `httpsCallable`/`firebase` imports (fixed in commit df83e51). Also
  its "migration in progress" header is now largely stale — NEXT-STEPS §1a/§1b/§1c are complete; reframe as
  **"layering done, with documented exceptions."**

Genuine small code/CSP inconsistencies (Decision 4 = **must-fix**: rulebook states the clean rule with **no**
carve-out; both are REQUIRED backlog fixes, listed in the doc as known violations to be fixed):
- **D3 — 3 inline `onclick` handlers in `index.html`** (`setBilling('monthly')` L714, `setBilling('yearly')`
  L715, `subscribe()` L777). CLAUDE.md D12 claims "zero inline scripts under a strict CSP", but inline event
  handlers ARE inline script execution that a `script-src` without `'unsafe-inline'` blocks at runtime (the
  functions are defined globally in `landing.js`). **Rulebook:** state the clean rule ("no inline scripts
  **including** `on*` handlers") and list these 3 as a **known violation to be fixed**. Queue **`ARCH-DOC-FIX-1`
  (REQUIRED)**: rewire to `addEventListener` in `landing.js` — this removes a genuinely CSP-blocked path (the
  billing toggle + Subscribe button silently fail under the deployed `script-src`). ⚠️ **Browser-verify after
  the fix** that the landing billing toggle + Subscribe still work.
- **D4 — `src/components/education-page.jsx:15` calls `fetch("/api/subscribe")` directly**, contradicting the
  "components never fetch" rule (and the audit's "Clean (14)" listing). **Rulebook:** list as a **known violation
  to be fixed**. Queue **`ARCH-DOC-FIX-2` (REQUIRED)**: route the newsletter POST through a thin `api/` wrapper
  (+ a small hook/handler) per the layer rule, and add/extend a unit test so a component-level `fetch` can't
  reappear.

Also record (already-resolved gaps whose stale "TODO" language should NOT be copied into the new doc): CSP
`unsafe-inline` removed for scripts (D12 done 2026-07-03; **`style-src` still allows it** — say so precisely);
signups now server-enforced (`beforeCreateUser`, ADMIN-0); grant-admin UI moved into Settings (ADMIN-D3);
`setAdminClaim` removed. And flag the **highest drift-risk topic** — tier limits live in ≈9 code+doc locations
(already has its own consistency-map row) — with a one-line "treat limit/hard-clamp constants as one governed
set" pointer from the data/rules section (don't restate the numbers — they belong to `PRICING.md`/that row).

### As-built facts the rulebook states as `current` (verified in source 2026-08-05 — 5/7 clean, 2 nuanced)
Components import zero `firebase/*` (both `src/components` + `src/features`); `script-src` genuinely has **no**
`'unsafe-inline'`/`'unsafe-eval'` and there are **no inline `<script>` blocks**; ONE shared `cache/universe` +
`cache/trending` flat-cost proxy (denial-of-wallet bounded to distinct held coins); admin fully separated
(own Vite entry + own named Firebase app + client claim re-check; **no admin code/CSS in the user bundle**);
5 Vite entries + `manualChunks` Firebase isolation; `writeBatch`+`increment` counter data layer. Nuanced-but-aligned:
`api/` no longer owns `TIER_LIMITS` (enforcement-only; table lives in `hooks/useUpgrade.js`); `firebase-database.js`
is really the frontend model layer (already conceded).

### Scope / consistency sweep (change in EVERY file below — no drift)
1. **NEW `docs/decisions/ARCHITECTURE.md`** — the canonical rulebook (structure above; sits with the other
   `docs/decisions/` canonical docs).
2. **`src/ARCHITECTURE.md`** — add a top pointer "System-level rules: see root `ARCHITECTURE.md` (canonical);
   this file details the `src/` layers." + apply D2 corrections (admin-dashboard resolved; reframe "migrating").
3. **`docs/testing/ARCHITECTURE-AUDIT.md`** — add a historical-snapshot banner (2026-06-16, superseded by
   `ARCHITECTURE.md`) + apply D1 numbers as a "since this audit" note. Keep the file (history).
4. **`docs/interview.md`** — add the "Architecture / layering" consistency-map row (Wiring #1).
5. **`CLAUDE.md`** — add the Conventions canonical bullet (Wiring #2).
6. **`docs/product/AGILE.md`** — DoD placement-gate + doc-list update (Wiring #3).
7. **`README.md`** — point the existing `ARCHITECTURE.md (src/)` line at the new `docs/decisions/ARCHITECTURE.md`
   as the canonical system rulebook (keep the `src/` link as the layer detail).
8. **`docs/product/CODEBASE-MAP.md`** — add a row for the new `docs/decisions/ARCHITECTURE.md`.
9. **`docs/product/BUILD-LOOP.md`** — (optional 4th touch) step-3/step-5 layer-placement mention.
10. Queue **`ARCH-DOC-FIX-1`** (inline-onclick → `landing.js` listeners; browser-verify) and
    **`ARCH-DOC-FIX-2`** (education-page fetch → `api/`+hook + guard test) as separate **REQUIRED** backlog
    items (NOT part of this docs increment; each its own small code commit).

### Acceptance / Definition of Done
- `npm run build` clean (docs change ships nothing; the no-names guard still passes).
- All new inter-doc links resolve; the consistency-map row lists every file that must agree.
- The three wiring anchors land in the **same commit** as `ARCHITECTURE.md` (per the interview.md rule that the
  map is itself subject to the consistency sweep).
- `ARCHITECTURE.md` cross-links (not copies) the deep canonical docs — grep check: it does NOT restate tier-limit
  numbers, cache TTLs, or the HTTP contract.
- D1/D2 corrections applied; D3/D4 listed as known violations-to-fix and queued as **required** `ARCH-DOC-FIX-1/2`.
- This Status line flipped to ✅ BUILT; commit. (No `firestore.rules` ⇒ no `test:rules`; no new dep, no new hex.)

---

## DARK-MODE-FIXES (DP Round 34). Dark-mode: red Sell buttons, shiny Buy/Sell, white card+pill borders in Research — + fix the NaN diversification note  (✅ BUILT 2026-08-07 · `ac08cb5` · via the Agent Factory · BUILD-LOOP #15)

> **Queued as [BUILD-LOOP](BUILD-LOOP.md) #15** (2026-08-05). Canonical design doc: **[`DESIGN-PASS.md`](../design/DESIGN-PASS.md)** — log this as the next DP round (append after R28; confirm the number at build). **Design-only, 🟩 GREEN** — CSS + one small guard fix, no `firestore.rules`, no new dependency, no new hex beyond the existing token palette. Founder-reported from 4 dark-mode screenshots (2026-08-05).
>
> **HARD CONSTRAINT (house rule R3, founder-restated "only on dark mode"): every change is DARK-BLOCK-ONLY** — scoped under `html[data-theme="dark"]`. **Light mode must stay byte-for-byte identical** (diff the built light CSS to prove it). Dark mode is applied via `html[data-theme="dark"]` (`app.css:48`).

### Decisions locked (2026-08-05 founder)
- **G3 — white border = one shared `--edge-bright:#fff`** (full **opaque** white line, 1px).
- **G4 — neutral surfaces ONLY** get the white line (cards + `.cc-*` stat-boxes); the colored chips
  (`Sentiment` / `Dev/Founders/Team/Community` / catalyst) **keep their semantic tint/border**.
- **G1 — the NaN diversification note = FIX** (required `DARK-FIX-NaN` commit + test).

### The four reported issues → exact locus (verified in source 2026-08-05)
1. **"− Sell" button is white in the Detail overlay; must be RED (parity with the green "+ Buy").**
   Locus: `src/components/Detail.jsx:103-104` → `.tx-btn.buy` / `.tx-btn.sell` in `app.css`. Dark mode never
   re-colors `.tx-btn.sell`, so it renders as a neutral/white pill. **Fix (dark-only):** `.tx-btn.sell` text +
   border → the shiny sell red `--sr` (`#ff6b6b` in dark), matching how `.tx-btn.buy` reads as the accent green.
2. **AddEntry Buy/Sell popup: the Buy | Sell segmented toggle is illegible; the "Add Sell" submit is a dull dark red.**
   - Toggle: `.seg-btn.on-buy` (green `--accent-ink`) / `.seg-btn.on-sell` (`--sr`) at `app.css:505-506`; inactive
     `.seg-btn` is `--ink-soft` in dark (`app.css:143`) — so neither option reads as its color. **Fix (dark-only):**
     make the toggle labels **shiny by state — Buy green, Sell red** — colour the label text per side (buy→`--sg`/`--accent-ink`,
     sell→`--sr`) and lift the active-pill contrast so the selected side is unmistakable in dark.
   - Submit: `.submit-buy.submit-sell` uses `--warn` (`#bf4730`, dull, NOT overridden in dark) — `app.css:520`.
     **Fix (dark-only):** the Sell submit fill → the shiny sell red (`--sr`); the Buy submit (`.submit-buy`, `--accent`)
     → a vivid dark-mode buy green (`--sg`) so both submit buttons "shine" and are consistent with the toggle.
3. **Research → Overview: cards + neutral stat-boxes need a WHITE border in dark (colored chips keep their tint — G4); the Stress-test colours must be vivid; "A note on diversification" must be a shining, visible green.**
   - Cards: `.research-root .card` borders on `--line-2` (`rgba(236,233,225,.08)` in dark — nearly invisible). **Fix
     (dark-only):** raise card + neutral inner-box borders to the opaque white `--edge-bright` (G3); colored chips
     keep their semantic border (G4).
   - Stress test (`.scn-*` / slider track + "$N at today's prices" + `.scn-note`): muted in dark. **Fix (dark-only):**
     brighten the red→green gradient stops and the hero/label text so the model reads as vivid.
   - Diversification note: `html[data-theme="dark"] .research-root .diversify` already tints (`app.css`/
     `research-tab.css:284-285`) but reads dark-on-dark; its `h3`/`p` inherit muted `--ink-soft` and the
     "Read the principle →" link uses `--accent` (`#0a6b4d`, low-contrast on dark). **Fix (dark-only):** brighten the
     card fill/border, set the heading + link to the shining `--accent-ink` (`#5cd6a6`), and lift the body text.
4. **Research → Coins: white border on the card + neutral stat-boxes in dark.**
   Locus: `.coin-card` + the `AVG COST / NOW / P/L / 30D` stat boxes (`.cc-*` in `research-tab.css`). **Fix
   (dark-only):** opaque white `--edge-bright` on `.coin-card` and each stat-box. Per G4 the colored chips
   (`Sentiment`, `Dev/Founders/Team/Community`, catalyst) **keep their semantic border** — no white line.

### Gaps found (founder asked — these go in the plan, some are must-fix beyond the four asks)
- **G1 — NaN bug (functional, MUST-FIX — founder-confirmed 2026-08-05; spun out as `DARK-FIX-NaN`).** `OverviewView.jsx:64` renders
  `Math.round(portfolio.risk.top2)` with no guard, so a not-yet-computable `top2` prints **"about NaN%"** (visible
  in screenshot 3). This violates the module's own "**never NaN**" principle (`usePrices.js:26`). Fix: guard `top2`
  (show the fallback sentence, or `—`, when it isn't a finite number) and add a unit test. **This is a bug, not a
  dark-mode style — queue it as its own small commit `DARK-FIX-NaN` (REQUIRED), not folded into the CSS round.**
- **G2 — Sell uses THREE different reds (drift).** `.tx-btn.sell` (uncolored), `.seg-btn.on-sell` (`--sr`),
  `.submit-sell` (`--warn`). Consolidate every Sell surface onto ONE token (`--sr`) and every Buy surface onto ONE
  (`--sg`/`--accent-ink`) so Buy/Sell are consistent across Detail + AddEntry (single source of truth — same ethos
  as ARCHITECTURE-DOC). Do the light-mode consolidation ONLY if it's provably a no-op; otherwise keep the change
  dark-block-only and leave the `--warn`/`--sr` light values untouched.
- **G3 — one shared dark token (LOCKED 2026-08-05: full opaque white line).** Define a single new
  **`--edge-bright:#fff`** (opaque white, 1px) in the dark `:root` block and apply it uniformly to the NEUTRAL
  surfaces only (see G4): `.card`, `.coin-card`, `.diversify`, the stress card, and the `.cc-*` stat-boxes — one
  token so it can't drift.
- **G4 — colored chips (LOCKED 2026-08-05: neutral only).** The white `--edge-bright` border applies to the NEUTRAL
  cards + stat-boxes ONLY. The colored pills — `Sentiment`, the `Dev/Founders/Team/Community` reason chips, and the
  catalyst pill — **keep their existing semantic tint/border** (no white line). So "card pills → white border"
  resolves to: card + neutral `.cc-*` stat-boxes get the opaque white line; colored chips stay as-is.
- **G5 — consistency sweep across BOTH transaction surfaces + devices.** The Sell/Buy styling lives in the Detail
  overlay (`.tx-btn`), the AddEntry toggle (`.seg-btn`) AND the submit (`.submit-*`); fix all together or they drift.
  The Buy/Sell popups are desktop overlays (`useIsDesktop`) that also render inline on mobile — **verify dark on
  BOTH** (desktop overlay + mobile full-screen).
- **G6 — accessibility.** The shiny red/green (`--sr` `#ff6b6b`, `--sg` `#2ecc71`) as button FILLS must keep the
  `#fff` label text ≥ 4.5:1; as TEXT on the dark card they must clear contrast too. Verify with a contrast check;
  darken the fill a touch if a white label fails (still "shiny", just AA-safe).
- **G7 — 30D shows "+0.0%" on both coins** (screenshots) — this is the documented graceful degradation when
  `/api/history` is missing (never NaN), NOT a bug. Note it so it isn't "fixed" into a fake number; out of scope here.

### Scope / consistency sweep (change in EVERY file — dark-block-only)
1. **`src/styles/app.css`** — dark-only overrides: `.tx-btn.sell` (red), `.seg-btn` label colours (buy green / sell
   red + active contrast), `.submit-buy` (vivid buy green) + `.submit-sell` (shiny red); the shared token(s) `--sr`/
   `--sg` reuse + the new **`--edge-bright:#fff`** in the dark `:root`.
2. **`src/features/research/styles/research-tab.css`** — dark-only: `.card`/`.coin-card`/`.diversify`/stress-card +
   the NEUTRAL `.cc-*` stat-boxes → `--edge-bright` (colored chips untouched, G4); brighten the stress gradient +
   hero/labels; diversify heading/link/body → `--accent-ink`/lifted text.
3. **`src/features/research/components/OverviewView.jsx`** — the G1 NaN guard (functional; `DARK-FIX-NaN`).
4. **`tests/unit/`** — a test asserting the diversification note never renders "NaN" (G1); if any snapshot/style
   test pins the old Sell/toggle look, update it to the new values (never weaken a test).
5. **[`DESIGN-PASS.md`](../design/DESIGN-PASS.md)** — log this as the next DP round (the four fixes + G1–G7); **[`ERRORS.md`](../testing/ERRORS.md)** — add the NaN-diversification entry.
6. **CLAUDE.md** design-follow-on note — one line that this round shipped (keep the doc current).

### Acceptance / Definition of Done
- **Browser-verify DARK (the deliverable):** Detail overlay "− Sell" is red like "+ Buy" is green; AddEntry toggle
  shows Buy green / Sell red unmistakably and the submit is a shiny red (Sell) / green (Buy); Research Overview +
  Coins cards **and pills** show the bright white border; Stress-test gradient + "A note on diversification" are
  vivid and legible; the note reads a real percentage (or the fallback), **never "NaN%"**. Verify on desktop overlay
  AND mobile.
- **Light mode unchanged — prove it:** build and diff the light CSS/output; zero visual change in light (house R3 rule).
- `npm run test:unit` green (incl. the new NaN guard test); `npm run build` clean (no-names guard; ships nothing new).
- `DARK-FIX-NaN` committed as its own REQUIRED small commit (functional), separate from the CSS round.
- G3/G4 decisions recorded in DESIGN-PASS.md; this Status flipped to ✅ BUILT; commit. (No rules ⇒ no `test:rules`.)

### As-built (2026-08-07, via the Agent Factory · BUILD-LOOP #15)
Shipped as planned, all four fixes dark-block-only (light byte-for-byte identical). **Locked decisions
as-built:** **G3** one shared `--edge-bright:#fff` in the dark `:root`; **G4** the white line on NEUTRAL
surfaces only (cards + `.cc-*` stat-boxes + `.diversify`/stress) — coloured chips kept their tint;
**Q1=a** bright `--sr`/`--sg` submit **FILLs** + dark `--paper` ink label (AA-safe ≈ 8.8:1 buy / 6.7:1
sell); **Q2=yes** folded `.tx-btn.sell`/`.tx-badge.sell`/`.kv-v.kv-sell` onto the ONE Sell red `--sr`
(Buy on `--sg`/`--accent-ink`) so every Buy/Sell surface is a single source of truth (kills the G2
"three reds" drift). **DARK-FIX-NaN (functional, own commit `0fbac77`, red-first `ca291bb`):** the
diversification note's `NaN%` fixed **OverviewView-local** — top-two computed from `portfolio.holdings`
behind a `Number.isFinite` guard (both themes; the bug was never dark-only). Logged as
**[`DESIGN-PASS.md`](../design/DESIGN-PASS.md) Round 34** + **[`ERRORS.md`](../testing/ERRORS.md) §A9**
(renumbered from the mis-assigned A6 — A6 was already the blocked-signup entry cross-referenced by
`USER-CREATION.md`) + a one-line CLAUDE.md design-follow-on note. **fix-round-1 (`376e771`)** consolidated
the Research-card white border into `app.css` to drop a fragile equal-specificity cross-file cascade tie.
Commits: `ca291bb` · `0fbac77` · `ac08cb5` (headline CSS round) · `376e771`. Unit 957/957, build clean,
security SAFE, design-consistency CONSISTENT.

**Kaizen (non-blocking):** the fix-round-1 tie is a reusable lesson — for a **lazy-loaded feature module**
(here Research's `research-tab.css`, a separate chunk), an **equal-specificity selector split across two
stylesheets** resolves by source/chunk load order, which can flip. Keep the winning rule in ONE file
(`app.css` for `.ci-app` surfaces). Worth a consistency-map note that Research-module CSS can collide with
`app.css` on shared class names (`.card`), same class as the existing `.research-root` vs `.ci-app`
scoping guard.

---

## PORTFOLIO-TEXT-SIZE. Coin **Detail** card — bump the small text to a readable size (mobile + desktop, both themes)  (✅ BUILT 2026-08-07 · `786c85e` · via the Agent Factory · BUILD-LOOP #16)

> **Queued as [BUILD-LOOP](BUILD-LOOP.md) #16** (2026-08-06). Canonical design doc: **[`DESIGN-PASS.md`](../design/DESIGN-PASS.md)** — log as the next DP round (confirm the number at build). **Design-only, 🟩 GREEN** — CSS in `app.css` + one tiny JSX edit in `Detail.jsx`; **no `firestore.rules`, no new dependency, no new hex/token.** Founder-reported (2026-08-06): the coin Detail drill-in text is too small to read fast; make it bigger for real use.
>
> **NOT dark-block-only.** These are `font-size` bumps on **base `.ci-app` rules** (no `@media`, no theme override), so they apply to **light + dark and mobile + desktop identically** — which is exactly the ask ("make it for mobile and desktop both. its same on mobile"). Size only — **no colour/weight change**, so nothing about dark mode's look changes beyond the larger glyphs. This item touches `app.css`/`Detail.jsx`, the same files as #15 DARK-MODE-FIXES; the loop builds one item at a time so there's no conflict — just build whichever is queued first and re-verify.
>
> **Locus = the coin Detail drill-in (`src/components/Detail.jsx`).** It renders full-screen on mobile and as a shared `<Modal>` popup on desktop (R19-9, `useIsDesktop`) — **the same classes drive both**, so one CSS change covers both surfaces. (Confirmed it's Detail, not CoinInfo: the 24h pill reads "(24h)", `Detail.jsx:78`.)

### Decisions locked (2026-08-06 founder)
- **"Coin name" +4px = the small "BLESS" symbol under the icon (`.ph-sub`).** NOT the big "Bless" header title: on
  desktop that title is the **shared `<Modal>` title `.cm-title` (`app.css:772`)** used by *every* popup in the app, so
  bumping it would resize all dialogs — out of scope. The Detail-scoped `.ph-sub` is the small grey ticker the founder
  can't read, sitting right next to Market Cap; that's the intended target.
- **"All numbers same size on the card."** The muted "· $123.04" sub-amounts (`.kv-sub`) are **nested inside `.kv-v`**,
  so bumping `.kv-v` bumps them automatically to the same 15px (they stay lighter/faint by weight+colour — readable,
  still visually secondary). Avg Buy/Avg Sell Price rows become identical to Holding/Current Value/Bought.
- **Total P/L unchanged** (founder: "its big already, i think its the right size") — `.pnl-label` (13px) / `.pnl-val` (14px) stay.
- **Left amount "1 BLESS" (`.tx-amt`, 13px) and the bold tx total "$0.03" (`.tx-rtotal`, 14px) stay** — not flagged;
  only the date/time + "$price / SYM" sub-line grow in the tx row.
- **24h change pill in the hero ("+112.20% (24h)") +2px → 15px** (`.price-hero .chg-pill`, `app.css:426`; founder-added
  2026-08-06). ⚠️ Scope to the **hero** pill only — the base `.chg-pill` (`app.css:388`) is the Portfolio-card % pill and stays.
- **"Transactions (N)" header stays 14px = the new Buy/Sell button size** (founder: "make same size as the buy/sell
  buttons with new sizes (14px)"). `.tx-title` is already 14px, and `.tx-btn` goes 12 → 14px, so they match with **no
  edit to the header** — locked here so a future change keeps the two in sync.

### Exact size map (verified in source 2026-08-06 — every value is a current `app.css` `font-size`)
| Element | Class | Now → New | Δ |
|---|---|---|---|
| Market Cap ("$46.45M") | `.price-hero .ph-mc` (`app.css:438`) | 11 → **15px** | +4 |
| Coin name ("BLESS" under icon) | `.price-hero .ph-sub` (`app.css:424`) | 11.5 → **15.5px** | +4 |
| 24h change pill ("+112.20% (24h)") | `.price-hero .chg-pill` (`app.css:426`) | 13 → **15px** | +2 |
| Holding / Current Value / Bought — labels | `.kv-row .kv-k` (`app.css:430`) | 13 → **15px** | +2 |
| …their values | `.kv-row .kv-v` (`app.css:431`) | 13 → **15px** | +2 |
| "· $123.04" muted sub-amounts | `.kv-sub` (`app.css:439`, nested in `.kv-v`) | 13 → **15px** | +2 (auto) |
| **Avg Buy Price + Avg Sell Price** | **retire `kv-sm`** — `Detail.jsx:89,92` | 11/12 → **15px** | now identical to the rows above (size **+ weight + colour**) |
| Total P/L | `.pnl-*` | — | **unchanged** |
| Buy / Sell buttons | `.tx-btn` (`app.css:453`) | 12 → **14px** | +2 |
| "Transactions (N)" header | `.tx-head .tx-title` (`app.css:451`) | 14 → **14px** | matched — already = the new Buy/Sell button size, **no edit** |
| BUY/SELL tags per tx | `.tx-badge` (`app.css:458`) | 9 → **11px** | +2 |
| Date & time row | `.tx-row .tx-meta` (`app.css:462`) | 11 → **12px** | +1 |
| "$0.0253 / BLESS" (price + symbol) | `.tx-right .tx-rprice` (`app.css:483`) | 11.5 → **12.5px** | +1 |

### How to retire `kv-sm` (the Avg Buy/Sell "same as all other text" ask)
`kv-sm` is used on **exactly two rows** — Avg Buy Price (`Detail.jsx:89`) and Avg Sell Price (`Detail.jsx:92`) — and its
CSS (`app.css:441-443`) makes them smaller (11/12px), lighter (weight 400) and fainter (`--ink-faint`) than the
standard rows. The founder wants them "same as all other text, like Holding, Current Value, Bought" → **remove the
`kv-sm` class from both JSX rows** so they inherit the plain `.kv-row`/`.kv-k`/`.kv-v` (now 15px, weight 600, `--ink`),
then **delete the now-dead `.kv-row.kv-sm{…}` CSS block** (grep-confirm zero other uses first). This is the cleanest
read of "same as" — it matches size **and** weight **and** colour, not just size. (Effect: those rows gain the standard
row divider + padding like the others — consistent.)

### Scope / consistency sweep (change in EVERY file)
1. **`src/styles/app.css`** — the 9 `font-size` bumps in the table above (`.ph-mc`, `.ph-sub`, `.price-hero .chg-pill`,
   `.kv-k`, `.kv-v`, `.tx-btn`, `.tx-badge`, `.tx-meta`, `.tx-rprice`); **delete** the `.kv-row.kv-sm` block. **`.tx-title`
   needs NO edit** — it's already 14px = the new `.tx-btn`. ⚠️ Bump the **hero** pill `.price-hero .chg-pill` ONLY; leave
   the base `.chg-pill` (Portfolio-card % pill).
2. **`src/components/Detail.jsx`** — remove `kv-sm` from the two rows (`className="kv-row kv-sm"` → `"kv-row"`, lines 89, 92).
3. **[`DESIGN-PASS.md`](../design/DESIGN-PASS.md)** — log as the next DP round (the size table + the two locked decisions).
4. **CLAUDE.md** design-follow-on note — one line that this readability round shipped.

### Acceptance / Definition of Done
- **Browser-verify** the coin Detail card on **mobile (full-screen) AND desktop (Modal popup)**, **light AND dark**:
  Avg Buy/Sell Price read identically to Holding/Current Value/Bought; Market Cap + the "BLESS" ticker are clearly
  larger; the "(24h)" change pill is a notch bigger; Buy/Sell buttons, BUY/SELL tags, the date/time and "$price / SYM"
  lines are all a notch bigger; the "Transactions (N)" header matches the Buy/Sell buttons (both 14px); Total P/L
  is untouched; no layout breakage (rows don't wrap/overflow at the 560 narrow track or on the smallest phones).
- **Only sizes changed** — no colour, weight (except the intended `kv-sm` retirement), spacing-token, or dark-block change.
- `npm run test:unit` green (update any snapshot that pins the old Detail sizes — never weaken a test); `npm run build` clean.
- Status flipped to ✅ BUILT with commit. (No rules ⇒ no `test:rules`.)

### As-built (2026-08-07, `786c85e`)
Shipped exactly as planned: the 9 `font-size` bumps + `.kv-row.kv-sm` block deletion in `app.css` and
`kv-sm` removed from the two `Detail.jsx` rows (89, 92). Logged as **[`DESIGN-PASS.md`](../design/DESIGN-PASS.md)
Round 33** and a one-line CLAUDE.md design-follow-on note. **Option A confirmed as-built:** the four shared
base `.ci-app` selectors (`.price-hero .ph-sub` / `.price-hero .chg-pill` / `.kv-row .kv-k` / `.kv-row .kv-v`)
were bumped directly, so the **CoinInfo overlay grew too** (same readability win; `CoinInfo.jsx` not edited —
it inherits). Base `.chg-pill` (Portfolio-card pill) + Total P/L left unchanged as decided. Unit + build green.

**Kaizen (non-blocking):** Option A surfaced that `Detail.jsx` and `CoinInfo.jsx` share `.ci-app` base
rules in `app.css` with no consistency-map row noting that a "Detail-scoped" style edit can silently
co-change CoinInfo. Consider adding a DESIGN-PASS / design-system consistency-map row that links
`Detail.jsx` ↔ `CoinInfo.jsx` ↔ the shared `app.css` `.price-hero`/`.kv-row` base rules, so a future
"just Detail" tweak is a conscious both-surfaces decision, not a surprise.

---

## PORTFOLIO-NUM-FIX (Gap Group A). Portfolio number-display correctness — 6 honest-numbers bugs on the Portfolio/Detail/CoinInfo/AddEntry surfaces  (✅ BUILT 2026-08-06 · `c9b3d05` · via the Agent Factory · BUILD-LOOP #17)

> **Queued as [BUILD-LOOP](BUILD-LOOP.md) #17** (2026-08-06). From the 2026-08-06 Portfolio-tab gap sweep (three read-only passes), **Group A** = the display-correctness cluster the founder chose to fix first. **🟩 GREEN, client-only** — display/format logic in components + a small pure helper; **no `firestore.rules`, no new dependency.** These are "the numbers shown are wrong/misleading" bugs, all seen every session, all cheap. Deduped against the backlog: none overlaps DI, #12, #15, or R10/TX-SAFE except where noted (A5).
>
> **North star:** the app must never show a *wrong* or *misleading* number — a missing datum reads as "—"/neutral, never as a loss or a fake gain (same ethos as DI-1 verify-then-toast and the Research module's "never NaN" rule).

### The six bugs → exact locus + fix (all verified in source 2026-08-06)
- **A1 — $1 rounding error on every dollar amount (functional).** `Portfolio.jsx:21,45` (portfolio total) and `:114`
  (each asset card): dollars use `Math.floor(tv)` while cents are computed **independently** as `(tv % 1).toFixed(2).slice(2)`.
  When the fraction rounds up the two disagree by $1 — `100.999` → floor `100` + cents `"00"` → renders **`$100.00`**
  (a dollar low). **Fix:** round to cents **first**, then split — e.g. a pure `utils/money.js` `splitMoney(n)` →
  `{dollars, cents}` where `const r = Math.round(n*100); dollars = Math.floor(r/100); cents = String(((r%100)+100)%100).padStart(2,'0')`
  (handles the ≥.995 carry AND negatives). Use it at both loci; **grep for the same `Math.floor(…)`+`(…%1).toFixed` split
  elsewhere** (Search/Account/CoinInfo) and sweep any copies. Unit-test `splitMoney` incl. `100.999`, `0`, `1234.995`, negatives.
- **A2 — negative P/L dollar shown with NO minus sign.** `Detail.jsx:93` (Total P/L) and `CoinInfo.jsx:89` (Unrealised P/L):
  `{v>=0?"+":""}$…Math.abs(v)` drops the sign on losses — only colour + the percent convey it. **Fix:** use the value-card
  convention (`Portfolio.jsx:47` already renders `−$`): `{v>=0?"+":"−"}$…`. Sweep any other P/L-dollar render for the same pattern.
- **A3 — missing 24h price drawn as a RED loss pill.** `Portfolio.jsx:118` and `Detail.jsx:78`: `ch = p?.usd_24h_change`
  is `undefined` before prices load, and `undefined >= 0` is false → the pill gets the red **`dn`** class while showing "—".
  **Fix:** only apply up/`dn` colour when `Number.isFinite(ch)`; otherwise render a **neutral** pill ("—", no red/green).
  Locked default: reuse a muted/neutral pill style (add a minimal `.chg-pill.muted` if none exists — neutral tint, no new hex beyond existing `--ink-*`/line tokens).
- **A4 — a real `0` replaced by MOCK data.** `CoinInfo.jsx:32-33`: `pr = p?.usd || cd?.mockPrice || 0` and
  `ch = p?.usd_24h_change || cd?.mockChange || 0` use `||`, so a genuine `0` (exactly 0.00% change, or a $0 price)
  falls through to the mock estimate. **Fix:** use `??` (nullish) so only truly-absent values fall back
  (`p?.usd ?? cd?.mockPrice ?? 0`). (The broader "mock shown with no 'estimated' signal" is **Group D** — out of scope here;
  A4 is only the `||`→`??` correctness fix.)
- **A5 — `$NaN` in the AddEntry "Total cost" + Submit enabled in that state.** `AddEntry.jsx:113-116` renders `tx-total`
  when `eAmt && ePrice` are truthy, but a lone `.` is truthy and `parseFloat(".")` is `NaN` → shows **`$NaN`**; Submit
  (`:121`, guarded only by `!eAmt||!ePrice`) is also enabled. **Fix:** derive `const amt=parseFloat(eAmt), prc=parseFloat(ePrice),
  valid = Number.isFinite(amt)&&amt>0&&Number.isFinite(prc)&&prc>0`; show the total only when `valid`; **disable Submit when
  `!valid`.** (Complements R10 positive-only + TX-SAFE input hardening — closes the lone-"." gap they didn't cover; keep their guards intact.)
- **A6 — green "▲ +$0.00" gain on an empty/zero book.** `Portfolio.jsx:46-47`: an empty portfolio shows a green up-arrow
  gain that implies a return that doesn't exist. **Fix (locked default):** when there's nothing invested
  (`totalBuys === 0` / no holdings), render a **neutral** gain row (a muted "—", no arrow/colour) instead of the green +$0.00.

### Gaps / notes (surfaced during the sweep)
- **A1 helper is a single source of truth.** Once `splitMoney` exists, route the value card, asset cards, and any other
  floor+cents split through it — a second inline copy is exactly how the drift started.
- **A3/A6 are the only two with a small visible-design choice** (neutral pill vs hide; muted dash vs blank). Locked
  defaults above (neutral, keep the row, show "—") — no founder sign-off needed; the correct behaviour ("don't show
  missing data as a loss / don't show a fake gain") is unambiguous.
- **Out of scope (other groups, do NOT fold in):** ~~the P/L math on oversold/missing-price books (Group B)~~
  **→ Group B is now ✅ BUILT 2026-08-08 (CRYP-94); see §GROUP-B**, the
  loading-skeleton/estimated-signal states (Group D), the copy/token/responsive polish (Group E). This item is
  strictly the six display-correctness fixes above.

### Scope / consistency sweep (change in EVERY file)
1. **`src/utils/money.js`** (new) — pure `splitMoney(n)`; **`tests/unit/`** — its unit tests (A1).
2. **`src/components/Portfolio.jsx`** — A1 (total + cards via `splitMoney`), A3 (neutral pill on missing `ch`), A6 (neutral empty gain).
3. **`src/components/Detail.jsx`** — A2 (Total P/L minus sign), A3 (neutral 24h pill).
4. **`src/components/CoinInfo.jsx`** — A2 (Unrealised P/L minus sign), A4 (`||` → `??`), A1 if it renders a floor+cents split.
5. **`src/components/AddEntry.jsx`** — A5 (NaN-safe total + Submit disabled when invalid).
6. **`src/styles/app.css`** — only if A3 needs a minimal neutral `.chg-pill.muted` (no new hex).
7. **`tests/unit/`** — assertions for each fix where testable (money split; a missing-price pill is not red; AddEntry total never "NaN" + Submit disabled on a lone "."). **[`ERRORS.md`](../testing/ERRORS.md)** — add the A1 rounding entry.
8. **CLAUDE.md** — one line noting the Portfolio number-display correctness round shipped.

### Acceptance / Definition of Done
- **A1:** `$100.999`-class values render the correct dollar (e.g. `$101.00`), on both the total and every card; `splitMoney` unit-tested.
- **A2:** a negative Total P/L / Unrealised P/L shows a leading `−` on the dollar figure (parity with the value card).
- **A3:** before prices load / on a missing 24h datum, the pill is **neutral "—"**, never red.
- **A4:** a genuine `0` price/change is shown as `0`, not the mock estimate.
- **A5:** typing a lone "." never shows `$NaN` and leaves Submit **disabled**; a valid amount+price re-enables it.
- **A6:** an empty portfolio shows a neutral gain row, not a green +$0.00.
- **Browser-verify** the above on Portfolio + Detail + CoinInfo + AddEntry, mobile + desktop. `npm run test:unit` green; `npm run build` clean. Status flipped to ✅ BUILT with commit. (No rules ⇒ no `test:rules`.)

**Status: ✅ BUILT 2026-08-06 (commit `c9b3d05`, via the Agent Factory — the factory's first end-to-end item).**
All six fixes shipped: new pure `src/utils/money.js` `splitMoney(n)` (rounds to cents FIRST, then splits —
A1), routed through the Portfolio total + asset cards; real `−` (U+2212) on losing Total/Unrealised P/L in
`Detail.jsx`/`CoinInfo.jsx` (A2); neutral "muted" pill (—) on a missing 24h datum, with a dark-block contrast
override in `app.css` (A3); `CoinInfo.jsx` `||`→`??` so a genuine live `0` isn't overwritten by mock (A4);
`AddEntry.jsx` shows no `$NaN` and disables Submit unless amount/price are finite `>0` (A5); neutral empty-book
gain (`totalBuys===0` → "—", not green +$0.00 — A6). Client-only; two dark-safe `app.css` rules; ERRORS.md §A7
records the A1 rounding bug. `npm run test:unit` **951/951**, build clean. The one deliberately-deferred piece —
the app-vs-Research **formatter divergence** — was split out per the founder's G1 (1a narrow scope) decision into
its own backlog item **§FORMATTER-UNIFY** (below).

---

## FORMATTER-UNIFY. Unify the two diverging number formatters (app `utils/format.js` ↔ Research `features/research/utils/format.js`)  (📋 STAGED 2026-08-06 — NOT built; split out of PORTFOLIO-NUM-FIX per founder G1)

> **Split out of PORTFOLIO-NUM-FIX** per the founder's **G1 decision (1a — narrow scope):** PORTFOLIO-NUM-FIX
> fixed only the six app-side display bugs; unifying the app and Research formatters is its own item so the
> narrow correctness fix wasn't widened mid-flight. **🟩 GREEN, client-only** — display/format logic only; **no
> `firestore.rules`, no new dependency.**
>
> **The gap:** the app uses `src/utils/format.js` (+ the new `src/utils/money.js`) while the Research tab uses
> its OWN `src/features/research/utils/format.js`, and the two **disagree**: Research `fmtPct(null)` renders
> **"NaN%"** (vs the app never showing NaN), and the two `money`/`fmtPct` implementations **round differently**,
> so the same value can read one way on a Portfolio/Detail surface and another in Research. This is the drift the
> interview.md "Number / money display" map row now guards against.
>
> **Note — partial overlap already staged.** The Research **"NaN%"** piece is partly covered by **DARK-FIX-NaN**
> (the required spin-off commit under [BUILD-LOOP](BUILD-LOOP.md) #15 **§DARK-MODE-FIXES** — guards
> `OverviewView.jsx` so the diversification note never renders "NaN%"). FORMATTER-UNIFY is the broader,
> single-source-of-truth consolidation of the two formatters (rounding parity + null-safety across every Research
> call site), not just that one note. Sequence after DARK-MODE-FIXES so the pieces don't collide.
>
> **Direction (not yet locked — needs a G1/G2 pass):** make the app pair (`format.js` + `money.js`) the single
> source of truth and have Research consume it (or a thin shared re-export), so `money`/`fmtPct`/`splitMoney`
> round identically and never emit "NaN%"/`$NaN`. Deduped against DARK-MODE-FIXES (DARK-FIX-NaN handles the one
> note; this handles the formatter itself) and against PORTFOLIO-NUM-FIX (which was app-only). Consistency sweep
> will follow the interview.md **"Number / money display"** map row. No rules ⇒ no `test:rules`.

---

## Commands

| Command | What |
|---|---|
| `npm run start:all` | Full local stack (emulators + Vite) in one lifecycle |
| `npm run test:unit` | Vitest component/hook tests (jsdom) |
| `npm run test:rules` | Firestore security-rules tests (emulator) |
| `npm run test:integration` | Data-layer integration tests (emulator) |
| `npm run build` | Production build + service-worker stamp |
| `npm run deploy` | Build + `firebase deploy` (Blaze for functions) |
