# Brand asset generator

`generate-logo-assets.js` regenerates every file in [`public/brand/`](../../public/brand/)
from one source-of-truth turtle design (shapes, colours, animation live in this
script). Re-run it and commit the output whenever the mark changes. See also the
[project README](../../README.md).

## Regenerate

```bash
npm i gifenc            # dev-only GIF encoder; NOT added to package.json
CHROME_BIN=/path/to/chrome node scripts/brand/generate-logo-assets.js
```

- `sharp` is already a repo dependency (SVG → PNG, frame extraction).
- `gifenc` is a tiny GIF encoder installed ad hoc — it is a build-time tool, not
  an app runtime dependency, so it is deliberately kept out of `package.json`.
- `CHROME_BIN` is any headless Chromium; it renders the wordmark with the real
  fonts for the raster (`logo.png` / `logo.gif`). Defaults to the Playwright
  cache path.

## Fonts (`fonts/`)

Vendored so the raster renders are reproducible and font-faithful:

- **Fraunces** (the "C") and **Hanken Grotesk** (the wordmark), both from Google
  Fonts under the **SIL Open Font License 1.1** — redistribution and embedding
  are permitted (the [full license text](https://openfontlicense.org) is published online).

These fonts are used only to bake the raster assets; the app itself loads the
same families the normal way.
