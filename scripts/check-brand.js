/**
 * Build/CI guard: FAIL if the OLD brand identity leaks into shipped client code
 * (LOGO-2, brand-mark unification). The brand is unified to ONE wordmark —
 * the one-word "CryptoIdea" + the green "C" tile — and every loading state to the
 * ellipsis "Loading…" form. Three stale artefacts must never ship again:
 *   1. the off-brand purple #6C5CE7 (any inline colour / border / spinner),
 *   2. the two-word "Crypto Idea" wordmark, split (`Crypto <b>Idea</b>`) or plain,
 *   3. the legacy loading copy ("Loading admin", "Loading your data", "Loading...").
 *
 * Mirrors scripts/check-dist-names.js: a PURE exported matcher
 * (`findBrandViolations`) + a file-walk, so tests/unit/brand-guard.test.js can
 * exercise the matcher without a build.
 *
 * The matcher is a DUMB substring/regex scan with NO comment-stripping — that is
 * DELIBERATE: a leftover `#6C5CE7` sitting in a code comment is still a stale
 * brand reference we want purged, and a scanner that "understands" comments is a
 * scanner that can be fooled. Because this file AND the test necessarily CONTAIN
 * the forbidden strings (as patterns / fixtures), the repo walk EXCLUDES
 * `scripts/**`, `tests/**` and any `*.test.*` — otherwise the guard would flag
 * itself forever. See `listShippedFiles`.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, dirname, extname, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// The repo root: this file lives in <root>/scripts/, so up one level.
export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Each rule = a stable id + a matcher regex + a human message. Kept as DATA so
// the test can enumerate the rules and the CLI can report which one fired.
export const BRAND_RULES = [
  { id: "purple", re: /#6C5CE7/i, msg: "off-brand purple #6C5CE7" },
  // Split wordmark: `Crypto` + a tag + `Idea`, e.g. `Crypto <b>Idea</b>` /
  // `Crypto<b>Idea</b>` / `Crypto <span>Idea</span>`. The intervening `<...>` is
  // what the plain two-word rule below can't see.
  { id: "split-wordmark", re: /Crypto\s*<[^>]*>\s*Idea/i, msg: "split two-word wordmark (Crypto <tag>Idea)" },
  // Plain two-word wordmark. Requires real whitespace, so the one-word
  // "CryptoIdea" never matches. CASE-INSENSITIVE so the UPPERCASE form
  // "CRYPTO IDEA" (e.g. the old Pulse share-image wordmark) is caught too.
  { id: "two-word", re: /Crypto\s+Idea/i, msg: "two-word 'Crypto Idea' wordmark" },
  { id: "loading-admin", re: /Loading admin/, msg: "legacy 'Loading admin' string" },
  { id: "loading-data", re: /Loading your data/, msg: "legacy 'Loading your data' string" },
  // Three ASCII dots — NOT the single ellipsis char "…", which is the new form.
  { id: "loading-dots", re: /Loading\.\.\./, msg: "legacy 'Loading...' (three ASCII dots)" },
];

/**
 * Return the brand-violation messages found in a chunk of text. Pure + exported
 * so it can be unit-tested without touching the filesystem. Never flags the
 * one-word "CryptoIdea" or the ellipsis "Loading…".
 */
export function findBrandViolations(text, rules = BRAND_RULES) {
  return rules.filter((r) => r.re.test(text)).map((r) => r.msg);
}

// Root-level HTML entries that ship to the browser (Vite build inputs).
const ROOT_HTML = ["index.html", "app.html", "admin.html", "terms.html", "privacy.html"];
// Only these source extensions carry shipped client copy/styles.
const SRC_EXT = new Set([".js", ".jsx", ".css"]);

const isTestFile = (name) => /\.test\./.test(name);

function walkSrc(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walkSrc(full, out);
    else if (SRC_EXT.has(extname(full)) && !isTestFile(entry)) out.push(full);
  }
  return out;
}

/**
 * The exact set of shipped client files to scan: the five root HTML entries +
 * `src/**` (.js/.jsx/.css). Deliberately EXCLUDES tests/, scripts/, docs/,
 * README.md, CLAUDE.md, .claude/, dist/, node_modules/ and any *.test.* — those
 * are build/tooling/doc files (and this guard + its test legitimately contain the
 * forbidden strings, so scanning them would false-positive forever).
 */
export function listShippedFiles(root = REPO_ROOT) {
  const out = [];
  for (const f of ROOT_HTML) {
    const full = join(root, f);
    if (existsSync(full)) out.push(full);
  }
  const srcDir = join(root, "src");
  if (existsSync(srcDir)) out.push(...walkSrc(srcDir));
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// REQUIRED-PRESENCE guards (brand-lockup unification). BRAND_RULES above is a
// DENYLIST (stale artefacts that must NOT ship); the three lists below are an
// ALLOWLIST — the brand assets that MUST be present on every surface that shows
// the logo, so the complete index.html tile+wordmark lockup can't silently
// regress to a text-only mark on one page. Same DATA-driven shape (a {file, re,
// msg} entry list + a pure walk) so the test can enumerate them and drive the
// walk without a build.
// ─────────────────────────────────────────────────────────────────────────────

// Read a repo-relative file; a MISSING file reads as "" so its required marker
// is reported MISSING rather than throwing (an enforcement guard must fail loud,
// never error out and skip the check).
function readShipped(root, rel) {
  const full = join(root, rel);
  return existsSync(full) ? readFileSync(full, "utf8") : "";
}

// AC1 — surfaces that must render the FULL tile lockup (a "C" tile glyph next to
// the one-word "CryptoIdea"), not a text-only wordmark. The regex proves a tile:
// a `class="mark"` span (any attrs) OR a bare `>C<` glyph, then "CryptoIdea"
// within ~120 chars — robust to whitespace/attribute order. A plain
// `<div class="brand">CryptoIdea</div>` (today's terms/privacy header) does NOT
// match: the "C" is followed by "ryptoIdea", never by `<`.
const LOCKUP_RE = /(?:class=["']mark["'][^>]*>|>)\s*C\s*<[\s\S]{0,120}?CryptoIdea/;
export const REQUIRED_LOCKUPS = [
  { file: "terms.html", re: LOCKUP_RE, msg: "tile+wordmark logo lockup" },
  { file: "privacy.html", re: LOCKUP_RE, msg: "tile+wordmark logo lockup" },
];

// Return the repo-relative files that are MISSING their required lockup. []=clean.
export function findMissingLockups(root = REPO_ROOT) {
  return REQUIRED_LOCKUPS
    .filter(({ file, re }) => !re.test(readShipped(root, file)))
    .map(({ file }) => file);
}

// AC2 — the two static legal pages must self-host the brand type (Fraunces +
// Hanken Grotesk) from Google Fonts so the hand-authored lockup renders in the
// real brand fonts, not the OS default.
export const REQUIRED_FONTS = ["terms.html", "privacy.html"];

// Return the files MISSING the Google-Fonts link for BOTH brand families. []=clean.
export function findMissingFonts(root = REPO_ROOT) {
  return REQUIRED_FONTS.filter((file) => {
    const text = readShipped(root, file);
    return !(text.includes("fonts.googleapis.com") && /Fraunces/.test(text) && /Hanken\+Grotesk/.test(text));
  });
}

// AC3 + AC6 — source-presence markers for surfaces jsdom can't verify at render:
// a build-time HTML page's `<Logo>` import, and the `:hover`/geometry CSS that
// getComputedStyle does NOT resolve under jsdom. Each entry pins ONE marker.
export const REQUIRED_SOURCE = [
  // AC3 — the /edge header renders the shared <Logo> (imported from ui.jsx).
  { file: "src/components/education-page.jsx", re: /<Logo\b/, msg: "the /edge header must render the shared <Logo> lockup" },
  // AC6 — the app + admin logo tiles pin the brand green and the index hover-rotate.
  { file: "src/styles/app.css", re: /rotate\(-6deg\)\s+scale\(1\.06\)/, msg: ".ci-logo:hover must rotate(-6deg) scale(1.06)" },
  { file: "src/styles/app.css", re: /#0b6b4f/i, msg: ".ci-logo-mark must pin the brand green #0b6b4f" },
  { file: "src/styles/admin-settings.css", re: /rotate\(-6deg\)\s+scale\(1\.06\)/, msg: ".adm-logo:hover must rotate(-6deg) scale(1.06)" },
  { file: "src/styles/admin-settings.css", re: /#0b6b4f/i, msg: ".adm-logo must pin the brand green #0b6b4f" },
];

// Return "<file>: <msg>" for every required source marker that is absent. []=clean.
export function findMissingSource(root = REPO_ROOT) {
  return REQUIRED_SOURCE
    .filter(({ file, re }) => !re.test(readShipped(root, file)))
    .map(({ file, msg }) => `${file}: ${msg}`);
}

// --- CLI: scan the repo and fail on any hit ----------------------------------
// Guarded so importing this module from a test never triggers the scan/exit.
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const offenders = [];
  for (const file of listShippedFiles(REPO_ROOT)) {
    const hits = findBrandViolations(readFileSync(file, "utf8"));
    if (hits.length) offenders.push(`  ${relative(REPO_ROOT, file)}: ${hits.join(", ")}`);
  }
  for (const f of findMissingLockups()) offenders.push(`  ${f}: missing the tile+wordmark logo lockup`);
  for (const f of findMissingFonts()) offenders.push(`  ${f}: missing the Fraunces + Hanken Grotesk font links`);
  for (const m of findMissingSource()) offenders.push(`  ${m} (required brand source marker missing)`);
  if (offenders.length) {
    console.error("brand-guard: brand identity not unified in shipped client code (LOGO-2 / lockup):");
    console.error(offenders.join("\n"));
    console.error("Use the one-word 'CryptoIdea' + <Logo> mark, brand green (--accent / #0b6b4f), and 'Loading…'.");
    process.exit(1);
  }
  console.log("brand-guard: clean — unified tile+wordmark lockup, no stale purple/wordmark/loading copy.");
}
