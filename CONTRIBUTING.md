# Contributing

How to run CryptoIdea locally, the rules the code holds to, and how a change gets made. This is an
open-source project under the [MIT License](LICENSE) — fork it, self-host it, rebrand it, and send
changes back if you want to.

## Run it locally

Everything runs on your machine against the Firebase emulators — no cloud project needed.

- **Prerequisites:** Node.js 22 and a JDK 17+ (the Firestore emulator needs Java).
- **Install:** `npm install`
- **Seed once:** `npm run seed` (creates local test accounts in `./emulator-data`).
- **Start the stack:** `npm run start:all` (emulators + dev server, one lifecycle, Ctrl-C stops all).

The app is at `http://localhost:3000`, the built site at `http://localhost:5000`, the Emulator UI at
`http://localhost:4000`. Full details in the [README](README.md#quick-start-local-no-firebase-account-needed).

## Tests

Every change keeps all three tiers green.

- `npm run test:unit` — components, hooks, and pure logic (jsdom, no emulator).
- `npm run test:rules` — Firestore security-rules tests (emulator).
- `npm run test:integration` — data layer + live callables over HTTP (emulator).

Use the `:solo` variants (`test:rules:solo`, `test:integration:solo`) when a full `start:all` stack is
already holding the default ports. CI runs all three on every push.

## The rules the code holds to

These are invariants, not preferences — a change that breaks one is wrong even if the tests pass.

- **Only `dist/` ships.** `functions/`, `firestore.rules`, configs, scripts, and tests are
  backend/build-only. No secret ever reaches the browser bundle.
- **Firestore rules are the security boundary.** Deny-by-default; server-only fields (tier, billing,
  soft-delete) are never client-writable. Verify any rule change with `npm run test:rules`. See
  [SECURITY.md](docs/security/SECURITY.md).
- **Secrets stay server-side.** Keys live in Cloud Functions config, never in the client. The in-bundle
  web config is public by design.
- **Encode output.** React auto-escapes; the static landing uses `textContent`, never `innerHTML`, for
  API data. The Content-Security-Policy ships no inline scripts.
- **Keep it simple.** Build the smallest thing that works — fewer moving parts, fewer bugs, smaller
  attack surface.

Design-system rules (CSS scoping, dark-mode safety, the responsive standard) live in
[DESIGN.md](docs/design/DESIGN.md). The layered code structure (`api` → `hooks` → `components`, pure
`utils`) lives in [ARCHITECTURE.md](docs/decisions/ARCHITECTURE.md).

## Making a change

- **One change, one branch, one pull request** — small and single-purpose (aim for under ~200 changed
  lines).
- **Branch off the default branch**, never commit straight to it.
- Write a clear, imperative commit message that says what changed and why.
- Run the relevant test tiers and make sure CI is green before requesting a merge.
- Update the docs the change affects — a feature isn't done until its documentation matches the code.

## Documentation

Docs follow a hub-and-spoke model: a short index points to one canonical file per subject, and each
file links to the others instead of repeating them. Start at [docs/INDEX.md](docs/INDEX.md). When you
change behavior, update the one file that owns that subject — don't create a second file that says the
same thing differently.

## See also

- [README](README.md) — what the project is and how to deploy your own.
- [docs/INDEX.md](docs/INDEX.md) — the documentation map.
- [LICENSE](LICENSE) — MIT.
