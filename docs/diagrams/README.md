# Architecture Diagrams

Saved, version-controlled drawings of how Crypto Idea is built. Open the `.svg`
files in any browser or VS Code. These are kept up to date as components change —
**when a new component is built, a diagram for it is added here.**

| Diagram | What it shows |
|---------|---------------|
| [system-overview.svg](system-overview.svg) | The big picture — every component (3 front-ends, Hosting/CDN, Cloud Functions, Firestore collections, CoinGecko + PayPal) and how they connect. |
| [coin-data-flow.svg](coin-data-flow.svg) | How coin metadata, prices and history flow to the DCA calculator vs the app — the shared `cache/universe`, the hot/tail split, the refresh jobs, and the single CoinGecko upstream. |
| [api-key-flow.svg](api-key-flow.svg) | How the CoinGecko/PayPal keys move from the admin panel to the locked `config/app` doc to upstream calls — and why no browser can ever read them. |

## Conventions
- **Blue** = DCA / public flow.  **Grey** = app flow.  **Dark** = refresh / upstream.
- Colors use `var(--token, #fallback)` so they theme inside chat **and** render
  standalone as files.
- Cadence (e.g. "every 5 min") and cost notes are written on the diagram itself.

## Status note
`coin-data-flow.svg` matches the **implemented** hybrid: `refreshPrices` refreshes
the hot top ~1,250 (`HOT_PAGES`=5) every 5 min; the tail (1,250–3,000) is priced
on demand by `/api/prices`; `refreshUniverseDaily` refreshes all ~3,000 daily.
The diagram says "~1,300" — the code default is the nearest page boundary (~1,250),
tunable via `HOT_PAGES`.
