# `tdd-testing` skill — audit & update plan

**Status: 📋 PLAN ONLY — the live skill has NOT been edited.**
Founder interview + multi-agent audit, **2026-07-18**. Apply on a "go".

The skill under review is `~/.claude/skills/tdd-testing/SKILL.md` (175 lines, last modified
2026-07-02). It is a *global user skill*, not part of this repo — but it is the testing doctrine this
repo is built to, so the plan lives here beside the other planning docs.

---

## 0. The naming question — settled, no action

> *"Can I use the word 'TDD testing'? Is it protected because I learned this principle from YouTube?
> Maybe I should rename it?"*

**No restriction. Keep the name.** Three distinct legal mechanisms, none of which bite:

| Mechanism | What it protects | Applies? |
|---|---|---|
| **Copyright** | The *expression* — a specific video's script, slides, wording, code samples | ❌ Not the method or its name |
| **Patent** | Inventions | ❌ Nobody patented TDD |
| **Trademark** | A *brand* identifying goods/services in commerce | ❌ "TDD" is generic in software |

- **17 U.S.C. §102(b)**: copyright never extends to "any idea, procedure, process, system, method of
  operation, concept, principle, or discovery, **regardless of the form in which it is described,
  explained, illustrated, or embodied**." The US Copyright Office adds that it does not protect
  "names, titles, slogans, or short phrases."
- **Origin**: Kent Beck popularised TDD via Extreme Programming and *Test-Driven Development: By
  Example* (2003) — and frames it as a **rediscovery**, traceable to McCracken (1957). It is plain
  industry vocabulary (Fowler's bliki, IBM, ISTQB/TMAP material all use it descriptively).
- **Watching a video and then writing your own doc implicates neither copyright nor trademark.**
  Generic terms cannot function as trademarks at all, and descriptive fair use protects even a
  competitor describing their own goods.

**What *would* create a problem** (none of it applicable here):
1. Copying an author's **expression** verbatim or near-verbatim — their slide text, worked-example
   narrative, diagrams, or a distinctive selection/ordering that reproduces their presentation.
2. Adopting a **distinctive branded** course/certification name (a trainer's coined program name).
3. Implying **endorsement or affiliation** with a trainer or vendor.

The skill's strongest defence is that it already passes test 1 decisively: every gotcha in it is
grounded in a real Crypto Idea incident. It is demonstrably original writing about original work.

**Caveat, stated honestly:** the research agent could not machine-query `tmsearch.uspto.gov` (a JS
app), so the trademark conclusion is a legal-structure argument plus absence of evidence, not a
cleared search. Irrelevant at present scale. If the skill is ever **commercialised under a brand**,
get a real clearance search — note this interacts with [`NEXT-STEPS.md`](../product/NEXT-STEPS.md)
**§OSS**, which lists `tdd-testing` as the 3rd candidate for public release (MIT). Publishing
free/open under a generic name needs nothing extra.

**Rename considered and rejected.** `tdd-testing` does read redundantly ("test-driven-development
testing"), and the rename is cheap — 5 references + the folder (`responsive-app/SKILL.md:12`,
`memory/design-migration.md:72`, `DESIGN-PASS.md:353`, `NEXT-STEPS.md:167`, plus the `name:` field).
But the folder name is nearly invisible in practice; the **frontmatter `description` is what drives
auto-triggering**. Not worth the churn. *(Decision 4.)*

---

## 1. Locked decisions (founder interview, 2026-07-18)

| # | Decision | Consequence |
|---|---|---|
| 1 | **`tdd-testing` stays stack-agnostic** | NEW Firebase-emulator mechanics route to `firebase-saas-starter`; one pointer line back |
| 2 | **Security-testing depth STAYS in `tdd-testing`** | Written as agnostic rules with Firebase as the example — they are committed regression suites, not one-off audits |
| 3 | **The "no test at all" sweep is NOT a skill line** | Becomes a one-time `NEXT-STEPS` backlog item (§5.3) |
| 4 | **Keep the name `tdd-testing`** | Zero edits |
| 5 | **Not retroactive** | Existing Firebase-specific gotchas STAY; only new content is routed out |
| 6 | **Gotcha wall stays flat, gains a maintenance rule** | No taxonomy (the audit refuted it — six bullets fit no bucket) |
| 7 | **Prune the old wall first, then add at full fidelity** | Exercises decision 6 rather than merely documenting it |
| 8 | **If content must give, D1 goes first** | ⚠️ **Superseded — see §6.1.** New evidence found after the interview |
| 9 | **Deliverable = plan + paste-ready text; skill untouched** | The founder uses the skill in background sessions |

### The chronological-boundary problem (decisions 1 vs 5)

Decisions 1 and 5 point in opposite directions: new Firebase content routes **out**, existing
Firebase content stays **in**. That is coherent as *"stop the bleeding, don't re-litigate the past"*
and it is the KISS call — but the resulting line is **chronological, not principled**, and will erode
within a month unless written down. **Rule to apply going forward:**

> **New material that requires a running emulator, or that describes emulator/CLI operation, goes to
> `firebase-saas-starter`. New material about *what to assert* — even about Firebase constructs —
> stays in `tdd-testing`. Pre-2026-07-18 content is grandfathered and not moved.**

This also directly serves **§OSS**: a stack-agnostic `tdd-testing` needs far less sanitization before
public release than a Firebase manual would.

---

## 2. How the audit was run

Two adversarial multi-agent passes, then a third for pruning.

| Pass | Agents | Output |
|---|---|---|
| **Gap hunt** — 5 dimensions (repo reality · learned gotchas since 2026-07-02 · coverage blind spots · workflow/process · external best practice + naming) | 52 | 45 candidate gaps → **19 verified, 26 refuted** |
| **Drafting** — compress each fix, voice-match, verify every citation | 26 | 12 paste-ready blocks + the routed section |
| **Pruning** — assess each existing gotcha, with a *keep-biased advocate* per candidate | see §7 | the retirement list |

**The refutation rate is the useful signal.** Most rejected findings were agents proposing advice the
skill already carries in different words, or generic testing-blog filler. Verifiers were instructed to
**refute by default** and to kill anything true-but-worthless as bloat.

**Verdict: healthy in principle, stale in specifics.** The philosophy (red→green, three tiers,
extract-pure-logic, never finish red) survived intact. What survived is *operational residue* — things
this repo learned the hard way after the skill was last written. **19 findings collapse to ~12 distinct
facts** (port collision appeared twice, source-text tests three times, integration order-dependence
three times), and roughly two-thirds of the fixes are **appends to existing bullets**, not new
sections. *This skill does not need a rewrite.*

### What the audit itself got wrong

Recorded so a future pass trusts the method appropriately, not blindly:

1. **It missed the fourth test tier entirely** (§4, item **H1**) — the single highest-value gap.
   No finder agent raised it; a *verifier* noticed it incidentally while checking an unrelated claim.
2. **Its own paste-text carried a stale filename** — `firebase.rules-only.json`, which does not
   exist. The real file is `firebase.solo.json`. (`README.md:38` has the same stale name; spun off
   as a separate fix.)
3. **Its line-budget arithmetic was wrong** — it claimed routing Themes A+B out lands ~190 lines.
   Routing them out only *avoids* ~12 new lines; it removes none. Real projection was ~227.
4. **Three of four line-number citations had already drifted** (see §3).

---

## 3. Citation policy — verified, and a standing rule

Every citation in the drafted text was opened and checked. Results:

| Citation | Verdict |
|---|---|
| `src/utils/errors.js` + `reason` classification | ✅ Exact — the file's own header says the message fires "never on a blind guess" |
| `functions/index.js` webhook marker + rollback | ✅ Exact — marker before side effect, rollback in the `catch` |
| `makeFakeDb` in `tests/unit/guards.test.js` | ✅ Exists |
| `test:rules:solo` **and** `test:integration:solo` + `firebase.solo.json` | ✅ Both exist; config confirmed |
| ~~"14 callables"~~ | ❌ `functions/index.js` has **27** `onCall`; 14 is the admin subset. A hardcoded count goes stale on the 15th. **Number dropped.** |
| ~~`useTrending.test.jsx:25`~~ | ❌ Wrong line, and the sleep is **10ms**, not 50. **Line number dropped.** |
| ~~`firebase.solo.json` = "rules only"~~ | ❌ It also runs **auth (9098) + functions (5002)**. |

> **Standing rule adopted: no line-number citations in a durable skill.** Three of the four checked
> had already drifted. Cite **file + symbol name**; never `file:line`, never a hardcoded count.

---

## 4. The change plan

Grouped by destination. Every block below is **final paste-ready text** — no re-derivation needed at
apply time.

### 4.1 `tdd-testing` — new & replacement content

---

#### **H1 — the fourth tier** ⭐ *highest value; missed by the audit's finders*

**Why:** the skill teaches *"mock the `api/` layer for component smoke tests"* — and that is exactly
the hole [`ERRORS.md`](../testing/ERRORS.md) **C6** shipped through (2026-07-18). `suspendUser`'s
un-suspend branch called `admin.firestore.FieldValue.delete()`; inside the functions emulator that
static is `undefined`, so it threw **after** `admin.auth().updateUser()` had already re-enabled the
account. The user could sign in, but `suspendedAt` was never cleared and the R31-6 paid-time
extension never ran — a suspended paying customer silently lost their frozen days. Pure helpers were
unit-tested, the gate was source-tested, the client tests mocked `httpsCallable`. **Nothing executed
the callable body.** The repo grew `tests/functions-callable.test.js` the same day; the skill still
says "Three tiers."

**Change A — the tier table gains a row (and the heading becomes "Four tiers"):**

```markdown
| **Callables** | against the emulator | **node:test** + real HTTP | Cloud Function *bodies* — the only tier that runs one |
```

**Change B — new bullet in *Gotchas that bite*:**

```markdown
- **Mocking the API layer means NO test ever executes the server function's BODY.** Component tests mock
  `httpsCallable`, pure helpers are unit-tested, and a source matrix proves the gate is wired — none of that
  runs the handler, so a runtime-only fault (an SDK static that's `undefined` under the emulator, a bad
  import) ships green. Add one tier that invokes the real callable over HTTP, and assert the **side effects,
  not the return value**: the un-suspend bug threw *after* re-enabling the Auth account, so it looked
  half-done — Auth updated, the Firestore bookkeeping silently skipped.
```

---

#### **C4 + C2 (merged)** — replaces the security-rules bullet at `:58-59`

> The drafting pass found C2 and C4 both targeted this bullet and both ended with "prove the deny with
> a privileged token". Merged; C2 drops from 5 lines to one clause. The legacy-token case lives in **C3**.

```markdown
- **Security rules — a per-collection deny checklist, not a one-time audit.** Owner-allow · stranger-deny ·
  server-only-field-deny (`tier`, `deleted`, role) · **unknown-key deny** (`hasOnly` allowlist on create AND
  update — never a blocklist) · **no-list deny** (`list` is a separate path from `get` — enumeration) ·
  **explicit `if false`** on internal collections (rate limits, webhook markers) so a later catch-all
  `match /{document=**}` can't open them. Prove each deny with a privileged token too — **and mirror every
  server-side callable role gate here: the client SDK reaches the database without passing through your
  functions, so a role the callable just refused can still satisfy a coarse `isAdmin()` branch and write the
  field directly.**
```

*Excluded deliberately:* the `collectionGroup` item — this repo asserts it by design in
[`ISOLATION.md`](../security/ISOLATION.md) but has **no test** for it. Add the guidance only alongside
an actual test.

---

#### **C3** — new bullet, *Gotchas that bite*

```markdown
- **Claim-based authz fails via truthiness, not via strangers — test the near misses.** For every role check
  assert CLOSED on: wrong case/whitespace/superstring (`"OWNER"`, `"owner "`, `"ownerr"`); empty/missing/wrong
  type (`""`, `null`, `1`, `true`); a role claim WITHOUT the base admin flag; and a **legacy token minted before
  the role existed** (`{admin:true}`, no role — unprivileged, not grandfathered). Test both tiers (pure guard +
  emulator rules) and read claims null-safely (`request.auth.token.get('role','')`) so a missing claim denies.
```

---

#### **C1** — appends *inside* the existing counter bullet (`:93-99`)

```markdown
  A ceiling test only proves the TOP. If the client maintains the counter the rule reads, also assert a
  client DECREASE is denied — otherwise the cap is bypassable by writing a smaller `count` with no child
  delete (real bug: unbounded creates past the tier cap). Rule shape: allow same-or-+1 only; bring counts
  down solely from a trusted server callable — keep the drift fail-safe: too high, never too low.
```

---

#### **D1** — new bullet, *What to test* ⭐ *promoted — see §6.1*

```markdown
- **N endpoints that must each carry the same check? Assert the matrix from the SOURCE.** A behavioural test
  covers only the endpoints you remembered, and the miss is invisible — the UI still looks walled. Assert a
  committed name→gate map over *every* entry so a new ungated endpoint fails the suite
  (`tests/unit/admin-gate-coverage.test.js`), and ban the unsafe idiom outright where one exists
  (`functions-runtime-safety.test.js`). Give the matcher a "did it get renamed?" failure message, and pair it
  with behavioural tests of the guard helper. The one place a source-text test earns its keep.
```

---

#### **E2** — new bullet, *What to test*

```markdown
- **At-least-once delivery needs a redelivery test AND a rollback test.** Webhooks, queues and retried
  callables write the idempotency marker BEFORE the side effect: (1) deliver the same event twice → assert
  the side effect ran ONCE; (2) make it throw, then redeliver → assert it REPROCESSES. Skip 2 and a missing
  marker rollback in the `catch` acks the retry as a duplicate, losing the change forever. The pure
  key-builder test is NOT this test — use the `db` fake below.
```

---

#### **F1** — new bullet, *What to test*

```markdown
- **Error-path tests must assert the CLASSIFICATION, not the code.** One code covers many causes
  (`permission-denied` = at the cap OR oversized data), so mapping it to one message lies — the false
  "coin limit" toast was really an over-long thesis. Have the data layer return a `reason` beside the
  `code`, unit-test the pure `(code, reason) → message` mapper for EVERY reason (`src/utils/errors.js`),
  assert an unclassified denial falls back to an honest generic message not the scary one, and add an
  integration test that provokes the real denial.
```

---

#### **E1** — appends *inside* the `functions/` CJS bullet (`:148-154`)

```markdown
  **Corollary — a module that TAKES `db` as its first argument (never imports it) is unit-testable too.**
  Pass a ~10-line fake whose `doc(path)` returns `{path}` and whose `runTransaction(fn)` runs `fn` with
  `get`/`set` over a `Map` (`makeFakeDb`, `tests/unit/guards.test.js`). Use it for DECISION logic — limits,
  cooldowns, day keys, patches; keep the emulator for security *rules* and real multi-doc/latency behaviour.
```

---

#### **F2** — ⚠️ REPLACES wrong content inside the walkthrough bullet (`:143-145`)

**The only place the skill is actively wrong.** It currently teaches a fixed `setTimeout(50)` after an
async click — flaky by construction. `findBy*` polls to a 1000ms default and strictly dominates it.
Replace sub-item `(1)` in place (it must stay inside the `(1)/(2)/(3)` enumeration):

```markdown
(1) **async handlers — use a RETRYING assertion, not a sleep.** After a click on an `await`-ing
handler (e.g. `addCoin` awaits the DB write), `await screen.findByText(...)` / `await waitFor(() =>
expect(...))` poll to a 1000ms default, strictly dominating a fixed sleep that's flaky under CI load.
Sleep only when nothing observable can be polled — a hook whose initial state already equals the
expected value, so `waitFor` passes vacuously (`useTrending.test.jsx`).
```

---

#### **G1** — appends to *The loop*, after step 5 (unindented paragraph, **not** a 6th step)

```markdown
**Inner loop vs outer loop — step 5 has two speeds.** While driving one test red→green run just that file —
`npx vitest run tests/unit/<File>.test.jsx` (`-t "<name>"` narrows, `npx vitest` watches). Run the FULL
`npm run test:unit` before you commit or claim done: a targeted run can't catch the cross-file leaks below
(`localStorage` bleed, mock implementations surviving `clearAllMocks`, shared walkthrough flows).
```

> ⚠️ The draft originally claimed a full `test:unit` "takes minutes". **Unverified** — and it would
> contradict the current DoD line, which calls `test:unit` "fast". Wording above avoids the claim.
> Time the suite before restoring any duration.

---

#### **G3** — NEW, the maintenance rule (founder decision 6); italic note under the *Gotchas* heading

```markdown
*Maintenance: keep this list **flat** (no categories) and **pruned**, not append-only — one incident
per bullet, led by the symptom you'd actually search for; a bullet bundling two unrelated footguns is
two bullets. Retire one when its footgun is gone (lib upgrade, API change, code deleted).*
```

---

#### **G2** — structural split of the bundled bullet at `:118-127`

Currently one lead-in covers the `matchMedia` jsdom gotcha **and** an unrelated CSS-*selector* gotcha.
Split into two; wording preserved, second gets its own bold lead-in. Net **−1 line** (it also becomes
the first worked example of the G3 rule).

```markdown
- **A `matchMedia`-based hook has NO `matchMedia` in jsdom — default it to keep existing tests on their
  current path.** A responsive hook (`useIsDesktop`) must fall back to the value the WHOLE existing suite
  already assumes (usually mobile/`false`) so every test renders unchanged; in the new desktop-only test set
  `window.matchMedia = vi.fn().mockReturnValue({ matches:true, addEventListener(){}, removeEventListener(){} })`
  (renderHook → assert).
- **A CSS *selector* bug is invisible to jsdom** (stylesheets aren't applied), so only a **browser**
  computed-style probe catches it — e.g. a modal scrim computing `display:block; padding:0` because
  `.app .scrim` (descendant) didn't match a root-level mount. Browser-verify anything whose correctness
  lives in the CSS *match* (compound vs descendant, `:has()`, media queries), not the markup.
```

---

### 4.2 `firebase-saas-starter` — the routed section

Insert as **§5b**, immediately after §5 (*Emulator testing + one-command dev*), before
"## Gotchas learned the hard way".

```markdown
## 5b) Running emulator-backed test suites
- **Never hardcode the emulator port — read the env `emulators:exec` exports.** It passes
  `FIRESTORE_EMULATOR_HOST` / `FIREBASE_AUTH_EMULATOR_HOST` to the child, so
  `process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080"` follows whatever port actually bound.
  It does NOT export the functions port — ask the emulator hub (`FIREBASE_EMULATOR_HUB`) so a suite
  follows whichever config started the run.
- **A rules/integration run that dies INSTANTLY on "port already in use" is your own dev stack, not a
  flake.** Don't tear `start:all` down (and never point the suite at it — you'd test against live dev
  data). Ship a second script (`test:rules:solo` / `test:integration:solo`) with `--config
  firebase.solo.json`: alternate ports, `ui:false`, `singleProjectMode:true` — same suite, beside the stack.
- **The emulator persists data BETWEEN tests in one run.** `after(() => testEnv.cleanup())` destroys
  contexts but does NOT clear data — rules suites need `beforeEach(() => testEnv.clearFirestore())`.
- **A suite that PASSES then never exits is an open handle, not a hang.** The real client SDK holds the
  node event loop open after the last assertion even with `unsub()` in a `finally` — that's why the
  integration script carries `--test-force-exit`; keep it. The rules suite can omit it only because
  `testEnv.cleanup()` closes its connections, so copying the rules script for a real-SDK suite hangs
  until the `emulators:exec` timeout. (Distinct from the no-emulator hang.)
- **Integration tests share ONE authenticated SDK — put account-creating tests LAST.** A single
  module-level `auth`/`db` means a second `registerUser`/`signIn` silently re-authenticates the whole
  module, and every later test still asserting the first `uid` fails `permission-denied` far from the
  cause. Add a comment saying why they're at the end.
- **That suite is deliberately SEQUENTIAL — APPEND tests, never insert.** A module-level `let uid` is
  assigned by the first test (registration) and read by all the rest; reordering breaks the file with
  confusing `undefined`-uid failures. Uniquify the account (`tester_${Date.now()}@example.com`) so
  re-runs against an already-running stack don't collide. The rules suite is the opposite —
  `beforeEach(clearFirestore)` makes those tests independent and freely ordered.
```

**Frontmatter** — the description needs emulator-test mechanics added so it still triggers:

> …per-IP rate limiting, and a free public lead-gen tool. **Also owns emulator-backed test MECHANICS —
> running rules / integration suites via `emulators:exec`, emulator host/port env vars, port conflicts
> with a running dev stack, clearing Firestore between tests, open-handle hangs, and shared-SDK test
> ordering.** Use when starting a new SaaS/web-app, …, wiring an admin dashboard, **or running/debugging
> emulator tests.**

**Pointer line** — appended to `tdd-testing`'s existing emulator gotcha (`:77-78`):

```markdown
  For the emulator mechanics themselves — host/port env vars, the `:solo` config for running beside a live
  dev stack, `clearFirestore` between tests, `--test-force-exit` open handles, and shared-SDK test ordering
  — see the **`firebase-saas-starter`** skill (§5b).
```

### 4.3 `NEXT-STEPS.md` — the one-time coverage sweep (decision 3)

Not a permanent DoD line. See §5 of this doc for the entry to paste.

---

## 5. `NEXT-STEPS.md` entry

```markdown
## SKILL. `tdd-testing` audit — top-up + prune  (📋 PLAN — 2026-07-18)

Multi-agent audit of the global `tdd-testing` skill (19 verified gaps / 26 refuted). Verdict: healthy
in principle, stale in specifics — a targeted top-up, not a rewrite. Full plan + paste-ready text:
[`TDD-SKILL-UPDATE.md`](../planning/TDD-SKILL-UPDATE.md).

**Decisions:** skill stays stack-agnostic (new emulator mechanics → `firebase-saas-starter` §5b);
security-testing depth stays in `tdd-testing`; keep the name (TDD is generic — no IP restriction);
prune the gotcha wall before adding, so the file stays under ~200 lines.

**Highest-value item (H1):** the skill teaches "mock the `api/` layer" and still says "Three tiers" —
but that mocking is exactly the hole ERRORS.md **C6** shipped through, and the repo grew a fourth tier
(`tests/functions-callable.test.js`) on 2026-07-18. Add the tier + the "mocks hide the body" gotcha.

**Also queued — one-time coverage sweep (not a standing DoD line):** find exported logic with no test,
matching on the **export name**, not the filename (tests are flat and grouped by topic —
`research-adapters.test.js` covers `priceAdapter` + `sparkline` — so a filename diff false-positives
~30%). Known misses: `nextBackoff` (`src/features/research/utils/backoff.js`); `riskColor.js`
(`riskSpectrum`/`levelColor`/`levelTint`); hooks `useAsk`, `usePulse`, `useSharePulse`, `useHoldings`,
`usePrices`, `useRelativeTime`. Test or consciously waive each. Don't add a coverage tool for this.
```

---

## 6. Adjustments to the interview decisions

### 6.1 ⚠️ Decision 8 (cut D1 first) — superseded by new evidence

At interview time D1 (source-text matrix tests) looked like the safest cut: one instance in the repo,
cite-heavy, and its framing overlapped the existing adversarial-generation bullet. **Two facts
surfaced afterwards:**

1. `tests/unit/functions-runtime-safety.test.js` is a **second** instance of the pattern — a source
   guard banning `admin.firestore.<Static>`. The audit's finder claimed only one existed.
2. That second instance was written **2026-07-18 in direct response to a shipped bug** (C6), i.e. the
   technique is actively earning its keep, not a one-off.

**Recommendation: keep D1 as a full bullet; take the lines from E1 instead** (the second-choice cut —
it *speeds up a workflow* rather than *preventing a bug*, and E2 still carries "use the `db` fake").
Flip back if you disagree; nothing else depends on it.

### 6.2 Line budget

| | Lines |
|---|---|
| Current | 175 |
| New content, after merging the three duplicate collisions | +43 |
| **H1** (tier row + gotcha) | +7 |
| **G2** split | −1 |
| Pruning pass (§7) | *see below* |

Without pruning this lands ~224. Decision 7 (prune first) is what buys it back.

> **Honesty note:** if the pruning pass cannot recover ~20 lines *without cutting content you'd miss*,
> the right answer is to land at ~208 and say so — **not** to gut good bullets to hit a round number.
> The cap is a readability heuristic, not a constraint worth losing scar tissue over.

---

## 7. Pruning pass — retirement list

**⏸️ NOT YET RUN — this is the one open piece of the plan.** The analysis was in flight when the
session ended and was stopped rather than left orphaned; no results were produced. Nothing else in
this document depends on it.

**Method to use when resuming** (it was designed to bias *against* losing scar tissue):

1. Enumerate every bullet in *Gotchas that bite* with its line range.
2. Assess each against five questions: is the footgun **still live** (does the code/library/pattern
   still exist, or did an upgrade or deletion make it moot)? Is it a **narrow one-off** or a
   recurring class? Is it **counterintuitive** enough to earn its lines? Does it **overlap** another
   bullet? Is the lead-in **searchable** — does it state the symptom you'd actually grep for?
3. For every bullet proposed for change, run a **keep-biased advocate** that argues it must stay and
   independently re-checks the repo. The standing rule is **KEEP-IF-UNCERTAIN**; only concede when
   the change is clearly safe. Retiring a gotcha that can still bite is a worse error than carrying
   one line too many.
4. Stop once ~20 lines are recovered. Record a **DO NOT TOUCH** list of successfully-defended bullets
   so a future pass doesn't re-litigate them.

**Likely candidates** (impressions from reading the file, *not* assessed — do not act on these
without step 3): the jsdom hex→`rgb` normalization and the `toHaveStyle`-reads-inline-only bullets
are both narrow artifacts of finished design work; the two dark-mode/CSS-probe bullets overlap and
may merge. Roughly ~20 lines sit in that cluster.

> Per §6.2: if this cannot recover ~20 lines **without cutting content you'd miss**, land at ~208 and
> say so. The cap is a readability heuristic, not worth losing scar tissue over.

---

## 8. Deliberately NOT doing

Recorded so a future pass does not re-litigate settled ground. **26 candidate findings were refuted.**
The recurring reasons:

| Rejected idea | Why |
|---|---|
| **Reorganise the gotcha wall into a taxonomy** | Six bullets fit no proposed bucket; the categories would fight the content. Flat + pruned instead (G3). |
| **Split into a second testing skill** | Two skills covering one loop is the top drift risk; five findings were refuted on these grounds. |
| **Add a `references/` directory** | The file loads whole on trigger and has no jump-to-section mechanism, so a split buys nothing at this size and adds a moving part. |
| **Move security-testing depth to `api-security`** | Considered and rejected in the interview (decision 2) — these are committed regression suites; the person writing a rules test must see them. |
| **Rename the skill** | Decision 4. No legal driver; the description drives triggering, not the folder name. |
| **Add IP/attribution/disclaimer boilerplate** | Changes no testing behaviour and dilutes 175 lines of incident-grounded guidance. |
| **A `collectionGroup` rules-test bullet** | Asserted by design in `ISOLATION.md` but never tested. Guidance only alongside a real test. |
| **A `user-event` vs `fireEvent` note** | True, but not a gap — the suite's `fireEvent` usage is deliberate and works. |
| **A standing "coverage sweep" DoD line** | Decision 3 — an unenforced ritual devalues the rest of the DoD. One-time backlog item instead. |
| **Retroactively moving existing Firebase gotchas** | Decision 5 — churn on battle-tested content, and it would break the incident→lesson pairing. |

---

## 9. Apply order (when the "go" comes)

**Apply bottom-up** — every anchor is a line number in the current 175-line file, so any top-down edit
shifts all the ones below it.

| # | Item | Anchor | Action |
|---|---|---|---|
| 1 | **E1** | after `:154` | append inside the `functions/` bullet |
| 2 | **G2** | `:118-127` | replace wholesale |
| 3 | **C3** | after C1's appended text | new bullet |
| 4 | **C1** | after `:99` | append inside the counter bullet |
| 5 | **pointer line** | after `:78` | append inside the emulator gotcha |
| 6 | **H1-B** | *Gotchas* section | new bullet |
| 7 | **G3** | just after the `## Gotchas that bite` heading | italic note |
| 8 | **F1**, then **E2** | after `:65` | new bullets, in that order |
| 9 | **D1** | after the rewritten rules bullet | new bullet |
| 10 | **C4+C2** | `:58-59` | replace both lines |
| 11 | **H1-A** | tier table `:30-35` | add row + retitle to "Four tiers" |
| 12 | **F2** | inside `:143-145` | in-place substitution of sub-item `(1)` |
| 13 | **G1** | after `:26`, before `:28` | insert unindented paragraph |
| — | pruning | §7 | apply with the above, bottom-up |

**Three mechanical traps:**
- **C1 before C3.** Both anchor near `:99`. C1 goes *inside* the counter bullet; C3 starts a new one
  after it. Reversed, the counter rule reads as a claim rule.
- **F2 is a substitution, not an append.** Its text opens `(1) **async handlers**` and only parses
  inside the existing `(1)/(2)/(3)` enumeration. Appending produces two `(1)`s.
- **G1 is a paragraph, not a 6th step.** The loop is titled "non-negotiable"; a 6th numbered step
  changes that section's meaning.

**Then:** run `npm run test:unit` to confirm nothing referenced changed, and commit the two skills
separately from the `NEXT-STEPS.md` entry.
