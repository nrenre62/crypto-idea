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
 * "everything passed":
 *  - a port clash, a missing emulator, or a typo'd script name exits non-zero
 *    having run ZERO tests;
 *  - a run where every test was SKIPPED has total > 0 but executed nothing;
 *  - a suite that failed to LOAD (broken import) leaves its tests uncollected,
 *    so the counters look green while `success` is false.
 * All three are INCONCLUSIVE, and callers must refuse to report them — collapsing
 * them into pass/fail is how a ticket gets closed by a run that never happened.
 *
 * Keys are read from the it()/test() title ONLY, never from the describe() title.
 * A suite-level marker would attribute a sibling test's failure to the wrong
 * ticket. A title naming several keys is attributed to the FIRST key only, so
 * "CRYP-42: … (regression for CRYP-43)" doesn't mark CRYP-43 as failed too. The
 * repo already marks tests this way — e.g. `it("R26: ...")` — so
 * `it("CRYP-42: ...")` extends an existing convention.
 *
 * The failure detail is bounded AND redacted before it can reach a Jira comment:
 * first line only, paths/URLs/emails masked, capped at 200 chars — emulator
 * output carries seeded emails and live verification links, and stack lines
 * carry absolute local paths.
 *
 * The pure mapper is exported so tests/unit/jira-test-map.test.js can exercise it
 * without running a real suite (same pattern as scripts/check-dist-names.js).
 *
 * CLI:  node scripts/jira-test-map.js .tmp/jira-report.json
 * Exit: 0 = GREEN · 1 = RED · 2 = INCONCLUSIVE (also used when a CRYP key's only
 *       evidence is skipped tests — that key was not actually proven).
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

const MAX_FAILURE_CHARS = 200;

/** First line only, then redact: absolute paths (drive-letter or /Users|/home,
 *  spaces included — this repo's path has both spaces and Hebrew), URLs (the
 *  auth emulator prints live verification links), and email addresses (seeded
 *  test users). The rest of a failure message is a stack trace — dropped. */
const firstLine = (messages) => {
  if (!Array.isArray(messages) || messages.length === 0) return null;
  const line = String(messages[0])
    .split("\n")[0]
    .replace(/[A-Za-z]:[\\/][^'")\n]*/g, "<path>")
    .replace(/\/(?:Users|home)\/[^'")\n ]*/g, "<path>")
    .replace(/https?:\/\/\S+/g, "<url>")
    .replace(/\S+@\S+\.\S+/g, "<email>")
    .trim()
    .slice(0, MAX_FAILURE_CHARS);
  return line || null;
};

/**
 * @param {unknown} json Parsed vitest JSON report (`--reporter=json`).
 * @returns {{verdict: "GREEN"|"RED"|"INCONCLUSIVE",
 *            totals: {total: number, passed: number, failed: number},
 *            skippedKeys: string[],
 *            keys: Record<string, {status: "passed"|"failed"|"skipped",
 *                                  tests: Array<{title: string, file: string, failure: string|null}>}>}}
 */
export function mapJiraResults(json) {
  const inconclusive = {
    verdict: "INCONCLUSIVE",
    totals: { total: 0, passed: 0, failed: 0 },
    skippedKeys: [],
    keys: {},
  };
  if (!json || typeof json !== "object") return inconclusive;

  const totals = {
    total: count(json.numTotalTests),
    passed: count(json.numPassedTests),
    failed: count(json.numFailedTests),
  };

  // Nothing EXECUTED (zero collected, or all skipped) => we learned nothing.
  if (totals.passed + totals.failed === 0) return { ...inconclusive, totals };

  const keys = {};
  for (const file of Array.isArray(json.testResults) ? json.testResults : []) {
    const where = basename(String(file?.name ?? "unknown"));
    for (const assertion of Array.isArray(file?.assertionResults) ? file.assertionResults : []) {
      const title = String(assertion?.title ?? "");
      const matched = title.match(JIRA_KEY_RE);
      if (!matched) continue;

      const key = matched[0]; // FIRST key owns the test — see header
      const status = assertion?.status === "failed" ? "failed" : assertion?.status === "passed" ? "passed" : "skipped";
      if (!keys[key]) keys[key] = { status: "skipped", tests: [] };
      // failed dominates; passed beats skipped; skipped never overrides evidence
      if (status === "failed") keys[key].status = "failed";
      else if (status === "passed" && keys[key].status !== "failed") keys[key].status = "passed";
      keys[key].tests.push({
        title,
        file: where,
        failure: status === "failed" ? firstLine(assertion?.failureMessages) : null,
      });
    }
  }

  const skippedKeys = Object.keys(keys).filter((k) => keys[k].status === "skipped").sort();
  const anyKeyFailed = Object.values(keys).some((k) => k.status === "failed");
  const suiteBroke = count(json.numFailedTestSuites) > 0 || json.success === false;

  const verdict =
    totals.failed > 0 || anyKeyFailed ? "RED"
    : suiteBroke ? "INCONCLUSIVE" // a file failed to LOAD — its tests were never collected
    : "GREEN";

  return { verdict, totals, skippedKeys, keys };
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
    const label = entry.status === "skipped" ? "SKIPPED (no executed evidence — not proof)" : entry.status.toUpperCase();
    lines.push(`${key}: ${label} (${entry.tests.length} test${entry.tests.length === 1 ? "" : "s"})`);
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
    console.error(`INCONCLUSIVE — could not read the artifact: ${String(err.message).split("\n")[0]}`);
    process.exit(EXIT.INCONCLUSIVE);
  }
  const result = mapJiraResults(parsed);
  console.log(formatSummary(result));
  // A GREEN run with a skipped CRYP key still proved nothing about THAT ticket.
  if (result.verdict === "GREEN" && result.skippedKeys.length > 0) {
    console.error(`NOTE: ${result.skippedKeys.join(", ")} had only skipped tests — inconclusive for those tickets.`);
    process.exit(EXIT.INCONCLUSIVE);
  }
  process.exit(EXIT[result.verdict]);
}
