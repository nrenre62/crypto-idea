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
  // "CryptoIdea" never matches.
  { id: "two-word", re: /Crypto\s+Idea/, msg: "two-word 'Crypto Idea' wordmark" },
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

// --- CLI: scan the repo and fail on any hit ----------------------------------
// Guarded so importing this module from a test never triggers the scan/exit.
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const offenders = [];
  for (const file of listShippedFiles(REPO_ROOT)) {
    const hits = findBrandViolations(readFileSync(file, "utf8"));
    if (hits.length) offenders.push(`  ${relative(REPO_ROOT, file)}: ${hits.join(", ")}`);
  }
  if (offenders.length) {
    console.error("brand-guard: stale brand identity in shipped client code (LOGO-2):");
    console.error(offenders.join("\n"));
    console.error("Use the one-word 'CryptoIdea' + <Logo> mark, brand green (--accent), and 'Loading…'.");
    process.exit(1);
  }
  console.log("brand-guard: clean — no #6C5CE7, two-word wordmark, or legacy loading copy shipped.");
}
