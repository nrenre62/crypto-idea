# Architecture Diagrams

Saved, version-controlled drawings of how Crypto Idea is built. Open the `.svg`
files in any browser or VS Code. Authored per the **`drawing-diagram`** skill;
**when a component is built or changes, its diagram is added/updated here.**

## Finished diagrams
| Diagram | What it shows |
|---------|---------------|
| [system-overview.svg](system-overview.svg) | The big picture — every component (3 front-ends, Hosting/CDN, Cloud Functions, Firestore collections, CoinGecko + PayPal) and how they connect. |
| [coin-data-flow.svg](coin-data-flow.svg) | How coin metadata, prices and history flow to the DCA calculator vs the app — the shared `cache/universe`, the hot/tail split, the refresh jobs, and the single CoinGecko upstream. |
| [api-key-flow.svg](api-key-flow.svg) | How the CoinGecko/PayPal keys move from the admin panel to the locked `config/app` doc to upstream calls — and why no browser can ever read them. |
| [multi-agent-workflow.svg](multi-agent-workflow.svg) | Running several agents on one project safely — worktrees + lanes, one shared `.git`/`master`, the single shared dev stack. |
| [auth-and-session.svg](auth-and-session.svg) | Register / login / logout / reset via Firebase Auth (password never on device); `onAuthChange` → `useAuthSession` loads the server-authoritative tier + portfolios; admin = a verified custom claim. |
| [firestore-data-model.svg](firestore-data-model.svg) | The nested owner-only tree (users → portfolios → coins → transactions) with per-parent counters, plus the server-only top-level docs (config/app, cache/universe, historyCache, audit) and how counters enforce tier limits. |
| [authorization-and-tier-limits.svg](authorization-and-tier-limits.svg) | The rule gates every write passes (signed-in → owner/admin → field guards → counter+limit), the per-tier limits sourced from `config/app.plans`, and the invariants (no self-upgrade, no counter smuggling, locked config/audit). |

## Backlog — diagram everything (the auto-loop worklist)
The drawing loop draws **one per iteration**, ticks it, commits, and stops when all are done.
- [x] system overview
- [x] coin data flow (prices/history, hybrid)
- [x] API-key flow
- [x] multi-agent workflow
- [x] auth & session (register / login / `onAuthChange` / custom-claim admin)
- [x] Firestore data model (users → portfolios → coins → transactions + counters)
- [x] authorization & tier limits (owner/admin rules + counter-enforced plan ceilings)
- [ ] PayPal subscription + webhook flow (create → approve → verified webhook → tier)
- [ ] admin dashboard operations (getStats / listUsers / lookup / setTier / suspend / delete / audit)
- [ ] GDPR self-service (deleteMyAccount / exportMyData)
- [ ] live-prices polling (app `useLivePrices`, 60s, demo→live)
- [ ] app buy-date history (`useCoinHistory` + `priceAtDate`, fallback)
- [ ] multi-page build + code-splitting (Vite `manualChunks`, lazy routes, dist)
- [ ] service-worker update flow (network-first, build stamp, auto-reload on deploy)
- [ ] rate-limiting & abuse (per-IP read/write budgets, honeypot, App Check)
- [ ] config & feature flags (`config/app` → public `/api/config`, maintenance/signups)
- [ ] frontend layered architecture (`src/` api / hooks / components / utils)
- [ ] deploy: Hosting / CDN / rewrites / cache headers
- [ ] emulator dev stack (`start:all` one-lifecycle, ports, on-demand cache fill)

## Conventions (see the `drawing-diagram` skill for the full guide)
- **Blue** = public / DCA flow.  **Grey** = app flow.  **Dark** = upstream / refresh / external.
- Colors use `var(--token, #fallback)` so they theme in chat **and** render standalone.
- Cadence ("every 5 min"), cost, and "why" notes go on the diagram itself.
- Each `<svg>` is `role="img"` with a `<title>` + `<desc>` for accessibility.

## Status note
`coin-data-flow.svg` matches the **implemented** hybrid: `refreshPrices` refreshes
the hot top ~1,250 (`HOT_PAGES`=5) every 5 min; the tail (1,250–3,000) is priced
on demand by `/api/prices`; `refreshUniverseDaily` refreshes all ~3,000 daily.
The diagram says "~1,300" — the code default is the nearest page boundary (~1,250),
tunable via `HOT_PAGES`.
