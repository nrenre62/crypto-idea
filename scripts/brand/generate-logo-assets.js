/**
 * CryptoIdea turtle logo — standalone asset generator.
 *
 * Regenerates every file in `public/brand/` from the single turtle design
 * defined below (one source of truth for the shapes, colours and animation).
 *
 * Outputs: public/brand/{logo.svg, logo.png, logo.gif, icon.svg, favicon.svg,
 *          favicon-16/32/48.png, apple-touch-icon.png, icon-192/512.png}
 *
 * Requirements (dev-only, NOT app runtime deps — run ad hoc):
 *   - sharp            (already a repo dependency)
 *   - gifenc           (npm i gifenc  — tiny GIF encoder, not committed to package.json)
 *   - a headless Chromium binary for the font-faithful raster renders.
 *       Set CHROME_BIN, or it falls back to the Playwright cache path.
 *   - the two OFL fonts in ./fonts (committed alongside this script).
 *
 * Run:
 *   npm i gifenc
 *   CHROME_BIN=/path/to/chrome node scripts/brand/generate-logo-assets.js
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const sharp = require("sharp");

let GIFEncoder, quantize, applyPalette;
try {
  ({ GIFEncoder, quantize, applyPalette } = require("gifenc"));
} catch {
  console.error("Missing 'gifenc'. Run `npm i gifenc` first (dev-only, not a runtime dep).");
  process.exit(1);
}

const DIR = __dirname;
const FONTS = path.join(DIR, "fonts");
const OUT = path.join(DIR, "..", "..", "public", "brand");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "brandgen-"));
const CHROME = process.env.CHROME_BIN || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
fs.mkdirSync(OUT, { recursive: true });

// ── fonts (baked into the raster renders only) ──
const fraunces = fs.readFileSync(path.join(FONTS, "fraunces-600.woff2")).toString("base64");
const hanken = fs.readFileSync(path.join(FONTS, "HankenGrotesk.ttf")).toString("base64");
const FONT_FACE = `
@font-face{font-family:'Fraunces';src:url(data:font/woff2;base64,${fraunces}) format('woff2');font-weight:600;font-display:block}
@font-face{font-family:'Hanken';src:url(data:font/ttf;base64,${hanken}) format('truetype');font-weight:100 900;font-display:block}`;

// ── palette ──
const C = { tile:"#0B6B4F", shell:"#6FBE93", seam:"#3E8E6A", skin:"#C39A6B", eye:"#2F2013", sea:"#4FA6A8", sea2:"#7FC0C1", ink:"#15211B", paper:"#F5F3ED", white:"#fff" };
const FLIP = "M0,0 C-4,0 -4.6,5 -2.6,8.6 C-1,10.2 1,10.2 2.6,8.6 C4.6,5 4,0 0,0 Z";

// ── turtle mark (viewBox 0 0 100 100), classes drive fills + animation ──
const MARK_INNER = `
  <rect class="tile" x="0" y="0" width="100" height="100" rx="28.5"/>
  <text class="cee" x="49" y="55" text-anchor="middle" dominant-baseline="middle">C</text>
  <g class="turtle" transform="translate(93 12) rotate(-28) scale(1.42)">
    <g class="life">
      <path class="crest" d="M-19,11 L-3,11 L2,6.4 L7,11 L21,11"/>
      <path class="ripple" d="M-13,15.5 L-4,15.5"/>
      <path class="ripple" d="M7,15.5 L17,15.5"/>
      <g transform="translate(-11 3)"><g class="fb"><path class="skin flip" d="${FLIP}"/></g></g>
      <path class="skin" d="M-15,1 l-5,1.6 l4.4,3 z"/>
      <g class="head"><g class="bob">
        <path class="skin" d="M5,-3.4 L19,-4.2 L19,3 L5,3 Z"/>
        <ellipse class="skin" cx="20.5" cy="-2" rx="6.2" ry="5.2"/>
        <circle class="eye" cx="22.6" cy="-4" r="1.3"/>
      </g></g>
      <ellipse class="shell" cx="0" cy="-1" rx="16" ry="11"/>
      <path class="seam" d="M-9,-6.5 C-3,-9.6 3,-9.6 9,-6.5"/>
      <path class="seam" d="M-6,-8.4 C-8,-1 -8,4 -5,9.4"/>
      <path class="seam" d="M6,-8.4 C8,-1 8,4 5,9.4"/>
      <g transform="translate(9 4)"><g class="ff"><path class="skin flip" d="${FLIP}"/></g></g>
    </g>
  </g>`;

const FILLS = `
  .tile{fill:${C.tile}}.cee{fill:${C.white};font-family:'Fraunces','Georgia',serif;font-weight:600;font-size:60px}
  .shell{fill:${C.shell}}.skin{fill:${C.skin}}.eye{fill:${C.eye}}
  .seam{fill:none;stroke:${C.seam};stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;opacity:.85}
  .crest{fill:none;stroke:${C.sea};stroke-width:2.1;stroke-linecap:round;stroke-linejoin:round}
  .ripple{fill:none;stroke:${C.sea2};stroke-width:1.5;stroke-linecap:round;opacity:.7}`;

const ANIM = `
  .head{transform:translate(-14px,0);animation:ghead 1200ms ease-in-out infinite}
  .bob{transform-box:fill-box;transform-origin:center;animation:gbob 1200ms ease-in-out infinite}
  .life{transform-box:fill-box;transform-origin:center;animation:gsway 1200ms ease-in-out infinite}
  .ff{transform-box:fill-box;transform-origin:50% 0;animation:gpad 1200ms ease-in-out infinite}
  .fb{transform-box:fill-box;transform-origin:50% 0;animation:gpadB 1200ms ease-in-out infinite}
  .eye{transform-box:fill-box;transform-origin:center;animation:gblink 1200ms linear infinite}
  .ripple{animation:grip 1200ms ease-in-out infinite}
  @keyframes ghead{0%{transform:translate(-14px,0)}14%,86%{transform:translate(0,0)}100%{transform:translate(-14px,0)}}
  @keyframes gbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.4px)}}
  @keyframes gsway{0%,100%{transform:translateY(0)}50%{transform:translateY(-.7px)}}
  @keyframes gpad{0%,100%{transform:rotate(-9deg)}25%{transform:rotate(19deg)}50%{transform:rotate(-9deg)}75%{transform:rotate(19deg)}}
  @keyframes gpadB{0%,100%{transform:rotate(16deg)}25%{transform:rotate(-6deg)}50%{transform:rotate(16deg)}75%{transform:rotate(-6deg)}}
  @keyframes gblink{0%,44%,54%,100%{transform:scaleY(1)}49%{transform:scaleY(.12)}}
  @keyframes grip{0%,100%{opacity:.45}50%{opacity:.9}}`;

const STATIC_HEAD = ".head{transform:translate(0,0)}";

const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="CryptoIdea">
  <rect x="3" y="3" width="90" height="90" rx="22" fill="${C.tile}"/>
  <g transform="translate(42 50) rotate(-45) scale(1.55)">
    <path d="M-19,11 L-3,11 L2,6.4 L7,11 L21,11" fill="none" stroke="${C.sea}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M-13,15.5 L-4,15.5" fill="none" stroke="${C.sea2}" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>
    <path d="M7,15.5 L17,15.5" fill="none" stroke="${C.sea2}" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>
    <g transform="translate(-11 3)"><path d="${FLIP}" fill="${C.skin}"/></g>
    <path d="M-15,1 l-5,1.6 l4.4,3 z" fill="${C.skin}"/>
    <path d="M5,-3.4 L19,-4.2 L19,3 L5,3 Z" fill="${C.skin}"/>
    <ellipse cx="20.5" cy="-2" rx="6.2" ry="5.2" fill="${C.skin}"/>
    <circle cx="22.6" cy="-4" r="1.3" fill="${C.eye}"/>
    <ellipse cx="0" cy="-1" rx="16" ry="11" fill="${C.shell}"/>
    <path d="M-9,-6.5 C-3,-9.6 3,-9.6 9,-6.5" fill="none" stroke="${C.seam}" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M-6,-8.4 C-8,-1 -8,4 -5,9.4" fill="none" stroke="${C.seam}" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M6,-8.4 C8,-1 8,4 5,9.4" fill="none" stroke="${C.seam}" stroke-width="1.5" stroke-linecap="round"/>
    <g transform="translate(9 4)"><path d="${FLIP}" fill="${C.skin}"/></g>
  </g>
</svg>`;

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -26 452 126" role="img" aria-label="CryptoIdea">
  <defs><style>${FILLS}${ANIM}
  .word{font-family:'Hanken Grotesk',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-weight:600;font-size:64px;letter-spacing:-0.64px;fill:${C.ink}}
  </style></defs>
  <g>${MARK_INNER}</g>
  <text class="word" x="136" y="50" dominant-baseline="central">CryptoIdea</text>
</svg>`;

function logoHTML({ animated, bg, mark, word, gap, ink }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  ${FONT_FACE}
  html,body{margin:0;padding:0}
  body{background:${bg};display:flex;align-items:center;justify-content:flex-start}
  .wrap{padding:60px}
  .logo{display:inline-flex;align-items:center;gap:${gap}px}
  .mark{width:${mark}px;height:${mark}px;overflow:visible;display:block}
  .word{font-family:'Hanken',sans-serif;font-weight:600;letter-spacing:-0.01em;font-size:${word}px;line-height:1;color:${ink};white-space:nowrap}
  ${FILLS}
  ${animated ? ANIM : STATIC_HEAD}
  </style></head><body><div class="wrap"><div class="logo">
  <svg class="mark" viewBox="0 0 100 100">${MARK_INNER}</svg>
  <span class="word">CryptoIdea</span>
  </div></div></body></html>`;
}

function shot(html, out, { w, h, t }) {
  const f = path.join(TMP, "page.html");
  fs.writeFileSync(f, html);
  execFileSync(CHROME, ["--headless", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
    "--force-color-profile=srgb", "--default-background-color=00000000",
    `--virtual-time-budget=${t}`, `--window-size=${w},${h}`, `--screenshot=${out}`, f],
    { stdio: "ignore" });
}

(async () => {
  fs.writeFileSync(path.join(OUT, "logo.svg"), LOGO_SVG);
  fs.writeFileSync(path.join(OUT, "icon.svg"), ICON_SVG);
  fs.writeFileSync(path.join(OUT, "favicon.svg"), ICON_SVG);

  const iconBuf = Buffer.from(ICON_SVG);
  for (const [name, size] of [["favicon-16.png",16],["favicon-32.png",32],["favicon-48.png",48],
    ["apple-touch-icon.png",180],["icon-192.png",192],["icon-512.png",512]]) {
    await sharp(iconBuf, { density: Math.ceil(72 * size / 96) }).resize(size, size).png().toFile(path.join(OUT, name));
  }

  const staticPng = path.join(TMP, "logo-static.png");
  shot(logoHTML({ animated:false, bg:"transparent", mark:300, word:193, gap:107, ink:C.ink }), staticPng, { w:2000, h:900, t:600 });
  await sharp(staticPng).trim({ threshold: 8 })
    .extend({ top:16, bottom:16, left:16, right:16, background:{ r:0,g:0,b:0,alpha:0 } })
    .png().toFile(path.join(OUT, "logo.png"));

  const N = 18, DUR = 1200, W = 1040, H = 360;
  const frames = [];
  for (let i = 0; i < N; i++) {
    const fp = path.join(TMP, `fr_${String(i).padStart(2,"0")}.png`);
    shot(logoHTML({ animated:true, bg:C.paper, mark:120, word:77, gap:43, ink:C.ink }),
      fp, { w:W, h:H, t: DUR + Math.round(i * DUR / N) });
    frames.push(fp);
  }
  const union = await sharp(frames[0]).composite(frames.slice(1).map(f => ({ input:f, blend:"darken" }))).png().toBuffer();
  const info = (await sharp(union).trim({ background: C.paper, threshold: 14 }).toBuffer({ resolveWithObject:true })).info;
  const P = 10;
  const box = { left: Math.max(0, -info.trimOffsetLeft - P), top: Math.max(0, -info.trimOffsetTop - P) };
  box.width = Math.min(W - box.left, info.width + 2*P);
  box.height = Math.min(H - box.top, info.height + 2*P);
  const unionRaw = await sharp(union).extract(box).ensureAlpha().raw().toBuffer();
  const palette = quantize(unionRaw, 256);
  const enc = GIFEncoder();
  const delay = Math.round(DUR / N);
  for (let i = 0; i < N; i++) {
    const data = await sharp(frames[i]).extract(box).ensureAlpha().raw().toBuffer();
    enc.writeFrame(applyPalette(new Uint8Array(data), palette), box.width, box.height, { palette: i===0 ? palette : undefined, delay });
  }
  enc.finish();
  fs.writeFileSync(path.join(OUT, "logo.gif"), Buffer.from(enc.bytes()));

  console.log("Generated brand assets in public/brand/");
  for (const f of fs.readdirSync(OUT).sort()) console.log("  ", f, fs.statSync(path.join(OUT, f)).size, "bytes");
})().catch(e => { console.error(e); process.exit(1); });
