# Testing

How CryptoIdea is tested and the map to the testing docs. Three tiers cover the app; the security
rules and live callables run against the Firebase emulators. Start here, then open a spoke.

## The three tiers

- `npm run test:unit` — components, hooks, and pure logic (jsdom, no emulator). The largest tier.
- `npm run test:rules` — Firestore security-rules tests against the emulator (the security boundary).
- `npm run test:integration` — the data layer + live callables over HTTP against the emulators. This
  is the only tier that executes a callable body, so add a case here when a callable's behavior — not
  just its pure helpers — matters.

Use the `:solo` variants (`test:rules:solo`, `test:integration:solo`) when a full `start:all` stack is
already holding the default ports. CI runs all three on every push.

## How a change is tested

- Write the failing test first, then the code that makes it green (test-first).
- Route each acceptance criterion to the tier that actually proves it — a rule to `test:rules`, a
  callable's behavior to `test:integration`, a component or pure helper to `test:unit`.
- Never weaken, skip, or delete a test to make a suite pass.
- A run that executed zero tests is inconclusive, not a pass.

## When to open what

- [ERRORS.md](ERRORS.md) — the catalog of diagnosed errors, their fixes, and by-design caveats. Open
  when you hit an error that looks familiar, or add an entry when you diagnose a non-trivial one.
- [JIRA-WORKFLOW.md](JIRA-WORKFLOW.md) — the bug workflow: a failing test reproduces the ticket first,
  then the fix.
- [JIRA-PLAYBOOK.md](JIRA-PLAYBOOK.md) — the issue hierarchy, ticket templates, and how the process is
  organized.

## See also

- [docs/INDEX.md](../INDEX.md) — the documentation map.
- [CONTRIBUTING.md](../../CONTRIBUTING.md) — run-locally + the test commands.
- [SECURITY.md](../security/SECURITY.md) — what the rules tests protect.
