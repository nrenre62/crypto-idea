import { describe, it, expect } from "vitest";
import { mapJiraResults, JIRA_KEY_RE } from "../../scripts/jira-test-map.js";

// scripts/jira-test-map.js turns a vitest JSON artifact into a
// "Jira issue key -> did its tests pass?" map, so /jira-test-sync can report a
// result onto a ticket WITHOUT the 190 KB single-line JSON blob ever being read
// by hand. The behaviour locked here is mostly about refusing to lie:
//
//  - a run that executed ZERO tests is INCONCLUSIVE, never GREEN (a port clash
//    or a missing emulator exits non-zero with nothing run, and "no failures"
//    must never be mistaken for "everything passed" — that is how a ticket gets
//    closed by a run that never happened);
//  - keys are read from the it()/test() title ONLY, never the describe() title,
//    because a suite-level marker attributes a sibling test's failure to the
//    wrong ticket;
//  - file paths are reported basename-only, so an absolute path (which on this
//    machine contains the user's OneDrive + Hebrew folder names) can't be pasted
//    into a public Jira comment.

const t = (title, status, failureMessages = null) => ({
  ancestorTitles: [],
  fullName: title,
  title,
  status,
  failureMessages,
  meta: {},
  tags: [],
});

const artifact = ({ files = [], total, passed, failed }) => ({
  numTotalTests: total,
  numPassedTests: passed,
  numFailedTests: failed,
  numPendingTests: 0,
  numTodoTests: 0,
  success: failed === 0,
  startTime: 0,
  testResults: files,
});

describe("jira-test-map — mapJiraResults", () => {
  it("reports GREEN and maps a passing test onto its key", () => {
    const json = artifact({
      total: 1,
      passed: 1,
      failed: 0,
      files: [
        {
          name: "C:/repo/tests/unit/Portfolio.test.jsx",
          status: "passed",
          assertionResults: [t("CRYP-42: portfolio total ignores a coin with no price", "passed")],
        },
      ],
    });

    const out = mapJiraResults(json);

    expect(out.verdict).toBe("GREEN");
    expect(out.totals).toEqual({ total: 1, passed: 1, failed: 0 });
    expect(out.keys["CRYP-42"].status).toBe("passed");
    expect(out.keys["CRYP-42"].tests[0].file).toBe("Portfolio.test.jsx");
  });

  it("reports RED and carries only the FIRST line of the failure message", () => {
    const json = artifact({
      total: 1,
      passed: 0,
      failed: 1,
      files: [
        {
          name: "C:/repo/tests/unit/Portfolio.test.jsx",
          status: "failed",
          assertionResults: [
            t("CRYP-42: portfolio total ignores a coin with no price", "failed", [
              "AssertionError: expected NaN to be 100\n    at C:/Users/nrenr/OneDrive/מסמכים/secret/path.js:12:5\n    at more stack",
            ]),
          ],
        },
      ],
    });

    const out = mapJiraResults(json);

    expect(out.verdict).toBe("RED");
    expect(out.keys["CRYP-42"].status).toBe("failed");
    expect(out.keys["CRYP-42"].tests[0].failure).toBe("AssertionError: expected NaN to be 100");
    // the stack (and the absolute path inside it) must not survive
    expect(out.keys["CRYP-42"].tests[0].failure).not.toContain("at ");
    expect(JSON.stringify(out)).not.toContain("מסמכים");
  });

  it("CRYP-1: is INCONCLUSIVE when zero tests ran, even though nothing failed", () => {
    // A port clash / missing emulator: the command exits non-zero having run nothing.
    const json = artifact({ total: 0, passed: 0, failed: 0, files: [] });

    const out = mapJiraResults(json);

    expect(out.verdict).toBe("INCONCLUSIVE");
    expect(out.keys).toEqual({});
  });

  it("is INCONCLUSIVE — never a throw — on missing or malformed input", () => {
    for (const bad of [null, undefined, {}, "not json", 42, []]) {
      expect(() => mapJiraResults(bad)).not.toThrow();
      expect(mapJiraResults(bad).verdict).toBe("INCONCLUSIVE");
    }
  });

  it("ignores tests with no Jira key instead of crashing on them", () => {
    const json = artifact({
      total: 2,
      passed: 2,
      failed: 0,
      files: [
        {
          name: "C:/repo/tests/unit/format.test.js",
          status: "passed",
          assertionResults: [t("formats a big number", "passed"), t("CRYP-7: rounds to 2dp", "passed")],
        },
      ],
    });

    const out = mapJiraResults(json);

    expect(Object.keys(out.keys)).toEqual(["CRYP-7"]);
    expect(out.verdict).toBe("GREEN");
  });

  it("reads the key from the it() title ONLY — a describe() marker must not claim a sibling's failure", () => {
    // The trap this guards: a suite titled "portfolio cap (CRYP-42)" containing an
    // unrelated failing CRYP-43 test would otherwise report CRYP-42 as failed.
    const json = artifact({
      total: 2,
      passed: 1,
      failed: 1,
      files: [
        {
          name: "C:/repo/tests/unit/Portfolio.test.jsx",
          status: "failed",
          assertionResults: [
            { ...t("CRYP-42: cap allows the 3rd portfolio", "passed"), ancestorTitles: ["portfolio cap (CRYP-42)"] },
            {
              ...t("CRYP-43: cap rejects the 4th", "failed", ["AssertionError: expected true to be false"]),
              ancestorTitles: ["portfolio cap (CRYP-42)"],
            },
          ],
        },
      ],
    });

    const out = mapJiraResults(json);

    expect(out.verdict).toBe("RED");
    expect(out.keys["CRYP-42"].status).toBe("passed");
    expect(out.keys["CRYP-43"].status).toBe("failed");
  });

  it("marks a key failed if ANY of its tests failed", () => {
    const json = artifact({
      total: 2,
      passed: 1,
      failed: 1,
      files: [
        {
          name: "C:/repo/tests/unit/a.test.js",
          status: "failed",
          assertionResults: [
            t("CRYP-9: happy path", "passed"),
            t("CRYP-9: edge case", "failed", ["AssertionError: nope"]),
          ],
        },
      ],
    });

    const out = mapJiraResults(json);

    expect(out.keys["CRYP-9"].status).toBe("failed");
    expect(out.keys["CRYP-9"].tests).toHaveLength(2);
  });

  it("matches whole keys only", () => {
    expect("CRYP-42: x".match(JIRA_KEY_RE)).toEqual(["CRYP-42"]);
    expect("XCRYP-42 and CRYP-4a".match(JIRA_KEY_RE)).toBeNull();
  });
});
