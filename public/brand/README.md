# CryptoIdea brand assets

Standalone logo files for the CryptoIdea turtle mark. These are **generated
artifacts** — do not hand-edit; re-run the generator (see
[`scripts/brand/`](../../scripts/brand/)) and commit the output. See also the
[project README](../../README.md).

The design: the green "C" tile, a small turtle riding the upper-right corner on
a stylized sea line, and the one-word **CryptoIdea** wordmark. Brand greens only
(`#0B6B4F` tile, `#6FBE93` shell), light-brown head/flippers (`#C39A6B`), teal
sea (`#4FA6A8`).

## Files

| File | What it is | Use |
|------|-----------|-----|
| `logo.svg` | Full lockup (tile + C + turtle + wordmark), **animated** (turtle pops its head up, flippers paddle, blinks — seamless 1.2s loop). Scalable; references the brand fonts. | Vector source; anywhere an SVG works. |
| `logo.png` | Full lockup, **static** (head up), transparent background, hi-res. | Docs, email, slides, social. |
| `logo.gif` | Full lockup, **animated** loop, on the paper background (`#F5F3ED`). | Chat/social where a GIF is needed. |
| `icon.svg` / `favicon.svg` | The **turtle-only** icon centered on the green tile (no "C", no wordmark). Identical files. | App icon / favicon source. |
| `favicon-16/32/48.png` | Raster favicons. | Browser tab. |
| `apple-touch-icon.png` (180) | iOS home-screen icon. | `apple-touch-icon`. |
| `icon-192.png` / `icon-512.png` | PWA install icons. | `manifest.json`. |

## Notes

- `logo.png` / `logo.gif` bake the real fonts (Fraunces for the "C", Hanken
  Grotesk for the wordmark) so they're faithful standalone. `logo.svg`
  *references* the font families, so viewed on its own the wordmark falls back to
  a system sans — inside the app it uses the loaded brand fonts.
- The GIF uses a solid paper background because GIF only supports 1-bit
  transparency (a transparent GIF would fringe). Use `logo.png` for a
  transparent still, or `logo.svg` for a transparent scalable animated logo.
- These files are **not yet wired into the app pages** — that's a follow-up
  change. This set is the standalone asset library.
