/**
 * Maps a vitest JSON artifact onto Jira issue keys, so `/jira-test-sync` can say
 * "CRYP-42's test passed" without anyone reading the raw artifact — a full-suite
 * run produces ~190 KB on a SINGLE line, which is unreadable by hand and far too
 * large to page through when deciding what to post onto a ticket.
 *
 * This file is deliberately a PURE PARSER: it does not run tests, does not shell
 * out, and never talks to Jira. Running the suite is already solved by the
 * existing npm scripts, and every Jira write goes through the authenticated
 * Atlassian MCP connection (so no API token has to exist in this repo).
 *
 * The three-state verdict is the whole point. "No failures" is NOT the same as
 * "everything passed": a port clash, a missing emulator, or a typo'd script name
 * all exit non-zero having run ZERO tests. Collapsing that into pass/fail is how
 * a ticket gets closed by a run that never happened, so a run with no tests is
 * INCONCLUSIVE and callers must refuse to report it.
 *
 * Keys are read from the it()/test() title ONLY, never from the describe() title.
 * A suite-level marker would attribute a sibling test's failure to the wrong
 * ticket (a suite "portfolio cap (CRYP-42)" holding a failing CRYP-43 test would
 * report CRYP-42 as broken). The repo already marks tests this way — e.g.
 * `it("R26: ...")` — so `it("CRYP-42: ...")` extends an existing convention.
 *
 * The pure mapper is exported so tests/unit/jira-test-map.test.js can exercise it
 * without running a real suite (same pattern as scripts/check-dist-names.js).
 *
 * CLI:  node scripts/jira-test-map.js .tmp/jira-report.json
 * Exit: 0 = GREEN · 1 = RED · 2 = INCONCLUSIVE
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Whole-key matcher. `\b` on both ends means "XCRYP-42" and "CRYP-4a" do NOT
 * match — only a standalone CRYP-<digits>.
 */
export const JIRA_KEY_RE = /\bCRYP-\d+\b/g;

const count = (v) => (Number.isFinite(v) ? v : 0);

/** First line only — the rest of a failure message is a stack trace whose absolute
 *  paths would leak the local user/folder names into a Jira comment. */
const firstLine = (messages) => {
  if (!Array.isArray(messages) || messages.length === 0) return null;
  const line = String(messages[0]).split("\n")[0].trim();
  return line || null;
};

/**
 * @param {unknown} json Parsed vitest JSON report (`--reporter=json`).
 * @returns {{verdict: "GREEN"|"RED"|"INCONCLUSIVE",
 *            totals: {total: number, passed: number, failed: number},
 *            keys: Record<string, {status: "passed"|"failed",
 *                                  tests: Array<{title: string, file: string, failure: string|null}>}>}}
 */
export function mapJiraResults(json) {
  const inconclusive = { verdict: "INCONCLUSIVE", totals: { total: 0, passed: 0, failed: 0 }, keys: {} };
  if (!json || typeof json !== "object") return inconclusive;

  const totals = {
    total: count(json.numTotalTests),
    passed: count(json.numPassedTests),
    failed: count(json.numFailedTests),
  };

  // Zero tests executed => we learned nothing. Never report this as a pass.
  if (totals.total === 0) return inconclusive;

  const keys = {};
  for (const file of Array.isArray(json.testResults) ? json.testResults : []) {
    const where = basename(String(file?.name ?? "unknown"));
    for (const assertion of Array.isArray(file?.assertionResults) ? file.assertionResults : []) {
      const title = String(assertion?.title ?? "");
      const matched = title.match(JIRA_KEY_RE);
      if (!matched) continue;

      const failed = assertion?.status === "failed";
      for (const key of new Set(matched)) {
        if (!keys[key]) keys[key] = { status: "passed", tests: [] };
        if (failed) keys[key].status = "failed";
        keys[key].tests.push({ title, file: where, failure: failed ? firstLine(assertion?.failureMessages) : null });
      }
    }
  }

  return { verdict: totals.failed > 0 ? "RED" : "GREEN", totals, keys };
}

/** Human-readable one-line-per-key summary for the command to read. */
export function formatSummary(result) {
  const lines = [`VERDICT: ${result.verdict}  (${result.totals.passed} passed, ${result.totals.failed} failed, ${result.totals.total} total)`];
  const keys = Object.keys(result.keys).sort();
  if (keys.length === 0) {
    lines.push("No CRYP-keyed tests in this run.");
    return lines.join("\n");
  }
  for (const key of keys) {
    const entry = result.keys[key];
    lines.push(`${key}: ${entry.status.toUpperCase()} (${entry.tests.length} test${entry.tests.length === 1 ? "" : "s"})`);
    for (const test of entry.tests.filter((t) => t.failure)) {
      lines.push(`    ✗ ${test.file} — ${test.title}`);
      lines.push(`      ${test.failure}`);
    }
  }
  return lines.join("\n");
}

const EXIT = { GREEN: 0, RED: 1, INCONCLUSIVE: 2 };

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const path = process.argv[2];
  if (!path) {
    console.error("usage: node scripts/jira-test-map.js <vitest-json-report>");
    process.exit(2);
  }
  let parsed = null;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    console.error(`INCONCLUSIVE — could not read ${path}: ${err.message}`);
    process.exit(EXIT.INCONCLUSIVE);
  }
  const result = mapJiraResults(parsed);
  console.log(formatSummary(result));
  process.exit(EXIT[result.verdict]);
}
