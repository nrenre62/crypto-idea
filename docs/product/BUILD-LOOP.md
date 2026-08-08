# BUILD-LOOP — continuous, resumable build campaign (no stop between items)

**Purpose.** Build the queued `📋 PLAN` items in [`NEXT-STEPS.md`](NEXT-STEPS.md) **one after another,
continuously** — finish one item, then go straight to the next **without stopping between them** — until
every queued item is done (founder rule 2026-08-04: "build items one after another without stop until
finish"). The loop is:

> **build one item → verify → commit → tick the ledger → straight to the next → …**  (no compact, no stop)

**The loop stops only for a real reason, never as a routine step:** a 🔶 CHECKPOINT item with an
unanswered question (asked in **plain chat** at the factory's G1 gate), a **red/inconclusive** test, a
tripped name-guard, a wrong plan, a **founder-only / prohibited** action (see *Global safety rails*),
or the runaway **cost tripwire**. 🟩 GREEN items flow through to commit unattended, one after the next.

**Progress lives in FILES, not in chat — which is what makes a long continuous run robust.** The plan is
in `NEXT-STEPS.md`; the running progress is the **ledger table** in this file; the in-flight gate/loop
state (G1/G2 decisions + the fix-round count) is [`factory-state.md`](factory-state.md) and the run
history is [`factory-runs.md`](factory-runs.md). So even if the harness has to **auto-compact** the
conversation on a very long run (a harness behavior I can't switch off — see the note below), the
*files* survive: a fresh context reads them, resumes the in-flight item from its recorded phase (or
picks the first unmerged ledger row), and keeps going. The loop **does not stop for compaction** and
there is **no per-item compact step**.

**Honest note on compaction.** I can't press `/compact` (it's a local command) and I can't stop the
harness from auto-compacting when the context fills — but neither is a step in this loop anymore. The
loop just keeps building. If a session ever restarts mid-campaign (a forced auto-compaction, or a new
session), the **Recovery prompt** at the bottom re-enters the continuous loop from the ledger. It is a
recovery tool, **not** a routine between-item stop.

---

## The per-item loop — the Agent Factory executes it (`/build-feature`)

**This file is the campaign LEDGER** (the Queue table below is the source of truth for *what's next*).
**The EXECUTION path is the Agent Factory** — [`/build-feature`](../../.claude/commands/build-feature.md),
specced in [`AGENT-FACTORY.md`](AGENT-FACTORY.md). There is **one process**: don't run a separate manual
loop — run the factory, which carries each ledger item through the full
[Definition of Done](AGILE.md) (G1 interview → G2 plan → red test → builders → verify+review → fix-loop
→ simplify → sweep → re-verify → docs → commit → G3 merge), pausing only at the three gates and the
real-failure stops.

**Per-item progress is durable in FILES**, which is what makes a long continuous run robust across an
auto-compaction: the backlog is `NEXT-STEPS.md`, the ledger is the Queue table here, the in-flight
gate/loop state is [`factory-state.md`](factory-state.md) (G1/G2 decisions + the fix-round count), and
the run history is [`factory-runs.md`](factory-runs.md). The factory writes those; a fresh context
reads them and continues.

**How the ledger lines up with the factory:**
1. **Pick** — the factory takes the first Queue row that is not `✅ merged`.
2. **Gate** — a **🔶 CHECKPOINT** is asked at G1 in plain chat (never boxes, never timed; must be
   answered). Provenance decides G1: a **PLANNED** item — a 🟩 GREEN row (or one carrying a
   written/locked plan block) with locked `NEXT-STEPS.md` decisions — **skips the G1 interview**
   (G2 still runs as a non-blocking plan-of-record); an **AD-HOC** item — a bare stub with no plan, or
   a free-text "build this now" — gets the **mandatory** G1 interview + a blocking G2, **no exceptions**
   (founder rule 2026-08-08; [`interview.md`](../interview.md)).
3. **Build → verify → commit** — the factory's inner loop + finalize. Never weaken a test; the rules
   file is the security boundary (→ `test:rules`); report the REAL result (INCONCLUSIVE ≠ pass).
4. **Tick the ledger — built ≠ merged.** A committed item is `✅ built <commit>`; it becomes
   `✅ merged` only after the founder's G3 yes. **A built-but-unmerged item re-presents at G3 on
   resume — it is not skipped** (the resume reads `factory-state.md`).
5. **Next item — no stop.** Continue straight to the next row (the Absolute "no stop between items"
   rule). The only stops are a gate, a real-failure/escalation, and the **runaway cost tripwire**
   (one item > 25 agents or a run > 150 — see `build-feature.md`). Never paper over a failure to keep
   the loop moving — a real stop is a real stop.

---

## Queue — recommended build order (risk-ascending) · this is the LEDGER

Ordered lowest-blast-radius first, so the loop mechanics are proven on trivial items before the
security-critical, rules-touching ones. **This column is the source of truth for "what's next"** —
update it after every item. (Reorder if you'd rather do the `launch-blocker` first — see the note.)

| # | Item | Gate | Scope / blast radius | Status |
|---|------|------|----------------------|--------|
| 1 | **STORAGE-LIMIT** | 🟩 GREEN | Delete a display-only row (admin-dashboard.jsx). Trivial. | ✅ built 2026-08-01 |
| 2 | **ADMIN-JOBS** | 🟩 GREEN | Client-only friendly job labels + custom tooltip (admin bundle). Small. | ✅ built 2026-08-01 |
| 3 | **USER-SET-UI** | 🟩 GREEN | Design-only: responsive framed settings panels (Account.jsx + app.css). Moderate. | ✅ built 2026-08-01 |
| 4 | **LOGO** | 🔶 CHECKPOINT | Design-only shared `<Logo>`; **2 open sub-decisions** (brand-text copy; other tab headers). | ✅ built 2026-08-01 |
| 5 | **TX-SAFE** | 🟩 GREEN | Client correctness: numeric-input cap + dedupe/one-row-delete. No backend. | ✅ built 2026-08-01 |
| 6 | **AUTH-DUP** | 🟩 GREEN | Client in-flight lock + one read-only admin callable + admin UI. Moderate. | ✅ built 2026-08-01 |
| 7 | **ONBOARD-GATE** | 🔶 CHECKPOINT | **Touches `firestore.rules`** (security boundary) + server callable + client. `launch-blocker`, high blast radius. | ✅ built 2026-08-01 (App Check + rules-deploy = go-live) |
| 8 | **ADMIN-6** | 🔶 CHECKPOINT | **Touches `firestore.rules`** + server + email + client. Largest, security-critical. | ⏸️ HELD 2026-08-02 (founder) — no mail transport exists; see NEXT-STEPS ADMIN-6 Status |
| 9 | **LOGO-2** | 🟩 GREEN | Design-only: true landing-match logo (body-font wordmark, scaled) across app + admin + all 4 loading screens; fix leftover purple spinner. Client CSS/JSX + pre-bundle HTML shells. Moderate. | ✅ built 2026-08-04 (c08661d) |
| 10 | **LAUNCH-FREE** | 🔶 CHECKPOINT (decisions locked) | **Touches `firestore.rules`** (Starter limits → 2/30/100) + billing gate (`paidPlansEnabled` flag: new regs Starter-only, no new subs, existing users untouched) + config/indexes + admin toggle + client + landing. Security-critical. Decisions locked 2026-08-02. | 📋 not built |
| 11 | **ADMIN-SEP** | 🔶 CHECKPOINT (decisions locked) | Admin/user separation: admins out of the Users list (+count/CSV/bulk), owner-only Admin-access **roster** (new `listAdmins` callable), eliminate the no-role admin state at the auth **choke point** (`guards.js`), hard-cap owners at 2 (`set-admin.js`). Server + admin-UI; **`firestore.rules` NOT touched** (no `test:rules`). Security-critical. Decisions locked 2026-08-03. | 📋 not built |
| 12 | **PLAN-LIMITS-MAX** | 🔶 CHECKPOINT (decisions locked, rev.2) | **Touches `firestore.rules`** — plan limit bumps (Starter 3/30/**300** **supersedes LAUNCH-FREE §A** · Pro 6/100/**1000** · Premium lowered to **15/200/2000**; **prices unchanged**) across DEFAULT_PLANS + rules fallbacks + the stored `config/app.plans` doc + index exemptions + landing/app copy + PRICING/USER-BENEFITS docs, **plus** a lazy-load read optimization (Part B). Raised Pro/Premium limits **hard-gated on Part B (lazy-load) + Wave-B abuse controls** (App Check + rate limiter + `addCoinGuarded`) before prod. Overlaps #10 LAUNCH-FREE §A — first-to-build does the shared Starter work. Decisions locked 2026-08-03 (rev.2). | 📋 not built |
| 13 | **RESEARCH-NO-AI + AI-CHAT-SWITCH** | 🟩 GREEN (decisions locked) | **ONE increment** for both plans (shared `aiResearch` flag → `chatEnabled` + `aiChrome` gates). Research-tab honesty: **AI-CHAT-SWITCH** hides/disables the **Ask** chat when the flag is off (+ moves the admin toggle onto the AI settings screen); **RESEARCH-NO-AI** reframes the **Overview/Pulse** as honest deterministic analytics (multi-signal no-AI Pulse from a pure `pulseFacts` source + unrealized P&L, **AI-status pill** on/off, drop the "AI-generated"/"AI insights" copy + gradient, hide Regenerate) and adds the build-constant `AI_PROXY_LIVE`. Also folds in the **Daily Brief** fix (biggest-decliner mover, drops the "volatility" mislabel) + optional **RESEARCH-METRICS** (4 added deterministic Pulse calculations — return attribution · effective-N · 7d drawdown + volatility — under S1–S4 compliance rules, + a Wave-B data roadmap). Client Research components + `functions/features.js` string + admin-toggle move; **no `firestore.rules`, no new callable, no new dep** → no `test:rules`. Wave-B "Plan B" AI rules recorded, not built. Decisions locked 2026-08-03. | 📋 not built |
| 14 | **ARCHITECTURE-DOC** | 🟩 GREEN | **Docs-only** (no code/rules/dep): write canonical `docs/decisions/ARCHITECTURE.md` + wire into the 3 anchors (interview.md map row, CLAUDE.md Conventions, AGILE DoD). Spins off two REQUIRED small code fixes as their own commits — **ARCH-DOC-FIX-1** (index.html inline `onclick` → `landing.js` listeners; browser-verify) + **ARCH-DOC-FIX-2** (education-page direct `fetch` → `api/`+hook + guard test). | 📋 not built |
| 15 | **DARK-MODE-FIXES** | 🟩 GREEN | **Design-only, dark-block-only** (no rules/dep): red Sell + shiny Buy/Sell across Detail overlay & AddEntry popup, white/bright card+stat-box borders (`--edge-bright:#fff`) across Research Overview & Coins, vivid Stress-test + diversification note. ⚠️ Light mode byte-for-byte identical. Spins off REQUIRED **DARK-FIX-NaN** (guard `OverviewView.jsx` "NaN%" + test) as its own commit. | ✅ merged 2026-08-07 (PR #43) |
| 16 | **PORTFOLIO-TEXT-SIZE** | 🟩 GREEN | **Design-only** (no rules/dep/hex): readability `font-size` bumps on the coin **Detail** card (mobile+desktop, both themes — size only) per a locked size map + retire `kv-sm` so Avg Buy/Sell Price match the other rows. `app.css` + tiny `Detail.jsx`. | ✅ merged 2026-08-07 (PR #39) |
| 17 | **PORTFOLIO-NUM-FIX** | 🟩 GREEN | **Client-only** (no rules/dep): 6 number-display correctness bugs (gap Group A) — $1 rounding (new pure `utils/money.js`), missing `−` on losses, missing-price → neutral pill (not red), `\|\|`→`??` real-0-vs-mock, AddEntry `$NaN`+Submit guard, empty-book neutral gain. Components + pure helper + unit tests. | ✅ merged 2026-08-06 (PR #32) |

**Loop state (2026-08-04):** items 1–7 ✅ built; **#9 LOGO-2 ✅ built 2026-08-04 (c08661d)** — design-only
landing-match logo across app + admin + all 4 loading screens, purple-spinner purge, repo-wide brand guard;
unit 931/931 green. #8 ADMIN-6 is ⏸️ **HELD by founder** (no mail transport exists for the emailed-reset
piece — see NEXT-STEPS ADMIN-6 Status). Two items remain queued from 2026-08-02/03 gap/interview sessions,
PLAN-ONLY awaiting a "go": **#10 LAUNCH-FREE** (🔶 CHECKPOINT, decisions locked — Starter→2/30/100 + a
Starter-only launch-mode billing switch), and **#11 ADMIN-SEP** (🔶 CHECKPOINT, decisions locked
2026-08-03 — admin/user separation: admins out of the Users list, owner-only Admin-access roster, no-role
admin state eliminated at the auth choke point, owners hard-capped at 2).
**#10 touches `firestore.rules`** → `test:rules:solo` before commit; **#11 does NOT touch rules** (roster
lives in Auth custom claims) → no `test:rules`, but it IS security-critical (auth `guards.js` choke point +
a new owner-gated `listAdmins` callable, which trips the `admin-gate-coverage` + `audit-labels` source
scans). Also queued 2026-08-03: **#12 PLAN-LIMITS-MAX** (🔶 CHECKPOINT — touches `firestore.rules`) and
**#13 RESEARCH-NO-AI + AI-CHAT-SWITCH** (🟩 GREEN — Research-tab AI honesty in one increment, **no rules /
no new dep**, a low-risk design/copy build). Queued 2026-08-05: **#14 ARCHITECTURE-DOC** (🟩 GREEN —
**docs-only**, no code/rules/dep: write the canonical `docs/decisions/ARCHITECTURE.md` rulebook + wire it into
the three anchors — interview.md consistency-map row, CLAUDE.md Conventions bullet, AGILE DoD gate — so a code
session actually consults the architecture rules; see NEXT-STEPS §ARCHITECTURE-DOC). It also **spins off two
REQUIRED small code fixes** — **ARCH-DOC-FIX-1** (index.html inline `onclick` → `landing.js` listeners;
browser-verify) and **ARCH-DOC-FIX-2** (education-page direct `fetch` → `api/`+hook + guard test) — each its
own commit, NOT part of the docs increment. Queued 2026-08-05: **#15 DARK-MODE-FIXES** (🟩 GREEN — **design-only,
dark-block-only**, no rules/dep: red Sell buttons + shiny Buy/Sell across the Detail overlay & AddEntry popup +
white/bright card+pill borders across Research Overview & Coins + vivid Stress-test & diversification note; log
as the next DESIGN-PASS.md round; see NEXT-STEPS §DARK-MODE-FIXES). ⚠️ Light mode must stay byte-for-byte
identical. It **spins off one REQUIRED functional fix** — **DARK-FIX-NaN** (guard `OverviewView.jsx` so the
diversification note never renders "NaN%", + a unit test) — its own commit, NOT part of the CSS round.
Queued 2026-08-06 from the Portfolio-tab gap sweep +
founder pick: **#16 PORTFOLIO-TEXT-SIZE** (🟩 GREEN — design-only readability `font-size` bumps on the coin
Detail card, both themes, size only; retires the `kv-sm` Avg-Buy/Sell shrink; see NEXT-STEPS §PORTFOLIO-TEXT-SIZE)
and **#17 PORTFOLIO-NUM-FIX** (🟩 GREEN — client-only, the 6 number-display correctness bugs of gap Group A:
$1 rounding via a new pure `utils/money.js`, missing minus signs, missing-price neutral pill, `||`→`??`, AddEntry
`$NaN` guard, empty-book neutral gain; **no rules/dep**; see NEXT-STEPS §PORTFOLIO-NUM-FIX). Both are low-risk
client builds; the remaining Portfolio gap groups (B oversell/P&L integrity, C lock-ordering/usage, D a11y/loading
states, E polish) were surfaced but NOT staged — founder to prioritize later.

**Priority override:** ONBOARD-GATE is the only `launch-blocker` here. If launch timing matters more
than risk-ordering, move it to the front — but keep it a 🔶 CHECKPOINT (it rewrites the rules gate) and
run `test:rules:solo` before its commit.

**Not in this loop (bigger / separate tracks):** `§0` Wave-B live AI, `ADMIN` research-audit backlog,
`OSS` skills, `GOLIVE` deploy blockers — these need the Blaze plan, a real Firebase project, or founder
interviews, so they're out of an unattended build loop.

---

## Global safety rails (apply to every item)

- **The rules file is the security boundary.** Any change to `firestore.rules` is a 🔶 CHECKPOINT and
  must pass `npm run test:rules:solo` before commit. Never add a client-writable field that gates access
  (ONBOARD-GATE's `planChosen` must be **server-only**, like `tier`/`role`/`deleted`).
- **Founder-only / prohibited — the loop must NOT attempt these:** live PayPal calls, OAuth, `firebase
  deploy`, enabling App Check / Identity Platform / MFA / Firestore PITR, anything needing the Blaze
  plan or the real (non-demo) Firebase project, and any financial action. If an item's *full* DoD needs
  one of these (e.g. ONBOARD-GATE's App Check, ADMIN-6's real email delivery), build + verify the
  **local/emulator** portion, mark the deploy-time piece clearly, and hand it to the founder — don't
  fake it.
- **Verify before "done."** No item is ✅ until its tests + build are green and reported honestly.
- **Commit hygiene.** One item per commit range; clear message; no secret files staged; hooks run.
- **KISS + security-first** on every item (see [`CLAUDE.md`](../../CLAUDE.md) Conventions and the
  `secure-by-design` skill). Leave it better than you found it (Kaizen); log any new gap back into
  `NEXT-STEPS.md`.

## Environment caveats (2026-08-01)

- **Java 21 is installed and is now the active `java`** (fixed 2026-08-01) → `npm run start:all` and the
  emulator-backed tiers (`test:rules`, `test:integration`, browser verification) **run here now.** Java 21
  (Microsoft OpenJDK 21.0.11) was already on the machine, but an old Oracle **Java 8** sat ahead of it on
  the machine `PATH`; the Firebase emulator runs bare `java`, so it picked up Java 8 and refused to start.
  Fixed system-wide by moving JDK 21's `bin` to the front of the machine `PATH` (and pointing `JAVA_HOME`
  at it). **Verified:** `java -version` reports 21 and `npm run test:rules:solo` boots the Firestore
  emulator on Java 21 → **43/43 green**. So GREEN items get full verification, and the two rules-touching
  CHECKPOINT items (ONBOARD-GATE, ADMIN-6) **can now be fully verified locally.** (If a shell ever shows
  `java` = 8 again, it inherited a stale `PATH` — open a fresh terminal.)
- **Never run `test:unit` while `start:all` is up** — the parallel jsdom run starves for CPU and a red
  result is *inconclusive, not a failure*. Run it standalone.

---

## Recovery prompt (only if a session restarts mid-campaign — NOT a routine step)

Use it only if the session actually restarts (a forced auto-compaction, or a new session) and you need
to re-enter the run. It re-enters the **Agent Factory** (`/build-feature`) — **not** a separate manual
loop — resuming from durable state:

```
Resume the Agent Factory (/build-feature). FIRST read docs/product/factory-state.md: if an item is
mid-flight, continue it from its recorded Phase — a G2-approved plan jumps straight to the inner loop
(do NOT re-interview it), a built-not-merged item re-presents at G3, and the fix-round count continues
(never reset). Otherwise open the Queue/ledger in docs/product/BUILD-LOOP.md and start the first row
that is not "✅ merged" from G1. Run items one after another without stopping between them; stop only at
a gate (ask me in plain chat), a real-failure/escalation, or the runaway cost tripwire. Report REAL
test + build results (INCONCLUSIVE ≠ pass). When every row is ✅ merged, say the campaign is complete
and stop.
```
