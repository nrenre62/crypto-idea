/**
 * Build-time guard: FAIL the build if a named investor leaks into the shipped
 * bundle. Product decision #24 (no-names voice) — the Learn tab and the landing
 * teach principles WITHOUT attributing them to real people. A stale or
 * re-introduced name in dist/ would ship that violation to real users, so we
 * block it at build time rather than trusting ourselves to remember.
 *
 * Matching is CASE-SENSITIVE and whole-word on purpose: investor names in copy
 * are always capitalized ("Marks"), while the lowercase forms are ordinary
 * English ("marks", "remarks", "bookmark", "benchmark") and appear all over
 * minified vendor code. A case-insensitive check here would be a false-positive
 * machine that never lets the build pass.
 *
 * Runs automatically after `vite build` (see package.json "build"). The pure
 * matcher is exported so tests/unit/dist-name-guard.test.js can exercise it
 * without a real build.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// The real people whose names must never reach user-facing copy (#24).
export const FORBIDDEN_NAMES = ["Buffett", "Munger", "Marks", "Graham"];

// Only text assets can carry copy; fonts/images/icons can't, so skip them.
const TEXT_EXT = new Set([".html", ".js", ".css", ".json", ".txt", ".svg", ".webmanifest", ".map"]);

/**
 * Return the forbidden names found in a chunk of text (case-sensitive, whole
 * word). Pure + exported so it can be unit-tested without building.
 */
export function findForbiddenNames(text, names = FORBIDDEN_NAMES) {
  return names.filter((name) => new RegExp(`\\b${name}\\b`).test(text));
}

function walkTextFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walkTextFiles(full));
    else if (TEXT_EXT.has(extname(full))) out.push(full);
  }
  return out;
}

// --- CLI: scan dist/ and fail the build on any hit ---------------------------
// Guarded so importing this module from a test never triggers the scan/exit.
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const distDir = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
  if (!existsSync(distDir)) {
    console.error("dist-name-guard: dist/ not found — run `npm run build` first.");
    process.exit(1);
  }
  const offenders = [];
  for (const file of walkTextFiles(distDir)) {
    const hits = findForbiddenNames(readFileSync(file, "utf8"));
    if (hits.length) offenders.push(`  ${file}: ${hits.join(", ")}`);
  }
  if (offenders.length) {
    console.error("dist-name-guard: forbidden investor name(s) in the build (#24 no-names voice):");
    console.error(offenders.join("\n"));
    console.error("Remove the name from the source copy and rebuild.");
    process.exit(1);
  }
  console.log(`dist-name-guard: clean — none of [${FORBIDDEN_NAMES.join(", ")}] shipped.`);
}
