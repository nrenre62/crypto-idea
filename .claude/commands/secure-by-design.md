---
description: Adversarial security review of the working change against THIS repo's real invariants (rules boundary, awaited admin gates, secret flow, IDOR, denial-of-wallet)
argument-hint: "[optional target — a file, a callable, or 'the admin panel'; defaults to the working diff]"
---

Run a secure-by-design review of: ${ARGUMENTS:-the current working change}

Spawn the **`secure-by-design`** subagent (Agent tool, `subagent_type:
"secure-by-design"`) and pass it the target above. That agent is **read-only** —
it reviews the working-tree diff (or the named target) against Crypto Idea's
documented threat model and returns ranked findings (severity · `file:line` ·
exploit scenario · fix) plus a verdict.

## What it checks (repo-specific, not generic OWASP)

The **AWAITED async admin gates** (`assertAdmin`/`assertManager`/`assertOwner`/
`assertFreshOwner` — a missing `await` is an open endpoint that looks gated),
`context.auth.uid`-not-body-uid IDOR, deny-by-default `firestore.rules`
(server-only collections, `counterNoForge`, closed-shape `hasOnly` allowlists,
`isChosen` onboard gate, `isAdminOwner` vs `isAdmin` write branches, null-safe
claim reads), the `keep()` secret idiom (no secret ever ships / is echoed), the
`cgFetch` denial-of-wallet choke point + universe-membership gating, the PayPal
webhook signature/idempotency model, CSP no-`unsafe-inline`, right-anchored
`X-Forwarded-For`, and the fail-open/fail-closed direction of each control. It
also flags regressions of the 8 fixed findings in `API-SECURITY.md` §4.

## What to do with the result

- **Relay the agent's report** — the ranked findings and the verdict (SAFE TO
  COMMIT / CHANGES NEEDED / INCONCLUSIVE). It isn't shown to the user
  automatically.
- **Do NOT fix from this command** unless the user asks — report first. A real
  fix follows the Interview & Consistency process (`docs/interview.md`): plan →
  get a "yes" → sweep → verify → commit.
- **Honor the "must-run before commit" box:** if `firestore.rules` changed, the
  fix is not verified until `npm run test:rules` is green; guards/validators →
  `npm run test:unit` (incl. the `admin-0-guards` await pin); client/CSP/dist →
  `npm run build`.
- **INCONCLUSIVE is not a pass.** If the agent couldn't read a changed security
  file, say so and name it — never present a partial read as "safe".

## This complements, not replaces, `/security-review`

The built-in `/security-review` skill does broad, generic review; this agent adds
the **repo-specific invariant checks** above. For a high-stakes change, run both.

## If the subagent isn't registered yet

A freshly added `.claude/agents/*.md` only registers on the **next** session, so
right after creating it `subagent_type: "secure-by-design"` errors with "agent
type not found". If that happens, run the same read-only method inline (or via an
`Explore`/`general-purpose` agent): read `.claude/agents/secure-by-design.md`,
then review the diff against its checklist. Never fix — report.
