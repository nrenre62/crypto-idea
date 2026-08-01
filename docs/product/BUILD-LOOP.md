# BUILD-LOOP — safe, resumable, one-item-at-a-time build campaign

**Purpose.** Build the queued `📋 PLAN` items in [`NEXT-STEPS.md`](NEXT-STEPS.md) **one at a time,
safely**, with a **compaction between each item** so a long campaign never runs out of context or
carries stale state forward. The loop is:

> **build one item → verify → commit → tick the ledger → compact → build the next → …**

**Why this is safe across compaction (the key idea): all progress lives in FILES, not in chat.**
The plan is in `NEXT-STEPS.md`; the running progress is the **ledger table** in this file. Compaction
wipes the *conversation*, not the *files* — so after a compact, a fresh context reads the ledger, picks
the first unfinished item, and continues exactly where it left off. Nothing is lost.

**Honest note on "compact auto."** I cannot press `/compact` myself — it's a local command. It happens
two ways, both fine: (a) **auto** — the harness compacts automatically when the context fills (this is
the common case in a long loop), or (b) **you run `/compact`** after an item's commit. Either way, you
then paste the **Resume prompt** (bottom of this file) and the loop continues. Because state is in
files, it does not matter *which* item the compaction lands on.

---

## The per-item loop (run top-to-bottom, for EXACTLY ONE item, then stop)

1. **Pick the item.** Open the **Queue** table below; take the first row whose status is not ✅.
   Announce which item and that you're building only this one this pass.
2. **Gate check (safety).** If the row is **🔶 CHECKPOINT**, do **not** build yet — surface the open
   question(s) with `AskUserQuestion` and wait for a yes. If it's **🟩 GREEN**, the decisions are
   already locked in its `NEXT-STEPS.md` entry — proceed without re-interviewing.
3. **Re-read the spec.** Read that item's full section in `NEXT-STEPS.md` (scope, decisions,
   Acceptance, DoD). The plan is the source of truth; don't improvise scope.
4. **TDD first.** Write/extend the failing test(s) the item's **Acceptance** names. For a bug-class
   item (AUTH-DUP, TX-SAFE) commit the red test as a checkpoint per
   [`JIRA-WORKFLOW.md`](../testing/JIRA-WORKFLOW.md); never weaken a test to make it pass.
5. **Build the smallest thing that works.** KISS. Do the **consistency sweep** — change it in *every*
   file the topic touches (no drift). Security-first: no new client-writable field that gates access;
   validate server-side; encode output; admin surfaces are **light-paper only**; no new hex/dependency
   for design items; grep a CSS class before reusing it (the `.adm-note`/`.grid-auto` collision trap).
6. **Verify — and report the REAL result.**
   - `npm run test:unit` **(standalone — stack stopped)** and `npm run build` (build runs the no-names
     `dist/` guard). Both must be green/clean.
   - Rules-touching item (ONBOARD-GATE, ADMIN-6) → also `npm run test:rules:solo`.
   - Previewable UI change → browser-verify per the verification workflow **if the emulator stack can
     run** (see *Environment caveats*). If it can't, say so and rely on unit + build; don't claim a
     browser check you didn't do.
7. **Commit.** Clear message (`feat(...)` / `fix(...)` / `docs(...)`); never force-push, never
   `--no-verify`. The pre-commit secret scan must pass clean.
8. **Update docs + tick the ledger.** Flip the item's **Status** line in `NEXT-STEPS.md` from
   `📋 PLAN — NOT built` to `✅ BUILT <date> <commit>`, and set its row here to ✅ with the commit hash.
   Update README/CLAUDE/canonical docs only if the change altered how things build or run.
9. **Compact, then resume.** Let auto-compaction fire (or run `/compact`), then paste the **Resume
   prompt**. The next pass returns to step 1 for the next unfinished item.

**Stop the whole loop and ask if:** a test run is **red or inconclusive** (a `test:unit` run while
`start:all` is up is *inconclusive, not a failure* — re-run standalone), the build's name-guard trips,
the plan turns out to be wrong once you're in the code, or an item needs a **founder-only / prohibited**
action (see below). Never paper over a failure to keep the loop moving.

---

## Queue — recommended build order (risk-ascending) · this is the LEDGER

Ordered lowest-blast-radius first, so the loop mechanics are proven on trivial items before the
security-critical, rules-touching ones. **This column is the source of truth for "what's next"** —
update it after every item. (Reorder if you'd rather do the `launch-blocker` first — see the note.)

| # | Item | Gate | Scope / blast radius | Status |
|---|------|------|----------------------|--------|
| 1 | **STORAGE-LIMIT** | 🟩 GREEN | Delete a display-only row (admin-dashboard.jsx). Trivial. | 📋 not built |
| 2 | **ADMIN-JOBS** | 🟩 GREEN | Client-only friendly job labels + custom tooltip (admin bundle). Small. | 📋 not built |
| 3 | **USER-SET-UI** | 🟩 GREEN | Design-only: responsive framed settings panels (Account.jsx + app.css). Moderate. | 📋 not built |
| 4 | **LOGO** | 🔶 CHECKPOINT | Design-only shared `<Logo>`; **2 open sub-decisions** (brand-text copy; other tab headers). | 📋 not built |
| 5 | **TX-SAFE** | 🟩 GREEN | Client correctness: numeric-input cap + dedupe/one-row-delete. No backend. | 📋 not built |
| 6 | **AUTH-DUP** | 🟩 GREEN | Client in-flight lock + one read-only admin callable + admin UI. Moderate. | 📋 not built |
| 7 | **ONBOARD-GATE** | 🔶 CHECKPOINT | **Touches `firestore.rules`** (security boundary) + server callable + client. `launch-blocker`, high blast radius. | 📋 not built |
| 8 | **ADMIN-6** | 🔶 CHECKPOINT | **Touches `firestore.rules`** + server + email + client. Largest, security-critical. | 📋 not built |

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

- **Emulators need Java 21**, which isn't installed on this machine right now → `npm run start:all` and
  the emulator-backed tiers (`test:rules`, `test:integration`, browser verification) can't run here.
  Until Java 21 is installed, GREEN items verify via **`npm run test:unit` + `npm run build`** only, and
  the two rules-touching CHECKPOINT items (ONBOARD-GATE, ADMIN-6) **cannot be fully verified locally** —
  flag that at their gate. Installing Java 21 unblocks the full loop.
- **Never run `test:unit` while `start:all` is up** — the parallel jsdom run starves for CPU and a red
  result is *inconclusive, not a failure*. Run it standalone.

---

## Resume prompt (paste this after each compact)

```
Continue the BUILD-LOOP (docs/product/BUILD-LOOP.md): open the Queue/ledger table, pick the first
item whose status is not ✅, and run the per-item loop for EXACTLY that one item — stop after its
commit + ledger tick. If the item is a 🔶 CHECKPOINT, ask me before building. Report the real test
and build results. When every row is ✅, say the loop is complete and stop.
```
