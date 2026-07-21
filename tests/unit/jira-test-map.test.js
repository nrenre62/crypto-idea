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

  it("is INCONCLUSIVE when every test was SKIPPED — counters say total>0 but nothing executed", () => {
    // vitest counts skipped tests in numTotalTests; a run of .skip-ed tests must
    // not read as GREEN (nothing was actually proven).
    const json = artifact({
      total: 2,
      passed: 0,
      failed: 0,
      files: [
        {
          name: "C:/repo/tests/unit/a.test.js",
          status: "passed",
          assertionResults: [t("CRYP-8: skipped one", "skipped"), t("CRYP-8: skipped two", "skipped")],
        },
      ],
    });

    expect(mapJiraResults(json).verdict).toBe("INCONCLUSIVE");
  });

  it("a key whose only evidence is a SKIPPED test is reported skipped, never passed", () => {
    const json = artifact({
      total: 2,
      passed: 1,
      failed: 0,
      files: [
        {
          name: "C:/repo/tests/unit/a.test.js",
          status: "passed",
          assertionResults: [t("unrelated green test", "passed"), t("CRYP-9: skipped regression", "skipped")],
        },
      ],
    });

    const out = mapJiraResults(json);
    expect(out.keys["CRYP-9"].status).toBe("skipped");
    // and the result flags that some key lacks executed evidence
    expect(out.skippedKeys).toEqual(["CRYP-9"]);
  });

  it("is INCONCLUSIVE when a suite failed to load even though every collected test passed", () => {
    // A file with a broken import is not collected: counters look green but
    // success:false / numFailedTestSuites>0. That run proved nothing about the
    // uncollected file's tickets — never GREEN.
    const json = {
      ...artifact({
        total: 3,
        passed: 3,
        failed: 0,
        files: [
          {
            name: "C:/repo/tests/unit/ok.test.js",
            status: "passed",
            assertionResults: [t("CRYP-5: fine", "passed")],
          },
        ],
      }),
      success: false,
      numFailedTestSuites: 1,
    };

    expect(mapJiraResults(json).verdict).toBe("INCONCLUSIVE");
  });

  it("a title naming two keys is attributed to the FIRST key only", () => {
    // "CRYP-42: … (regression for CRYP-43)" must not mark CRYP-43 failed too.
    const json = artifact({
      total: 1,
      passed: 0,
      failed: 1,
      files: [
        {
          name: "C:/repo/tests/unit/a.test.js",
          status: "failed",
          assertionResults: [
            t("CRYP-42: cap rejects the 4th (regression for CRYP-43)", "failed", ["AssertionError: nope"]),
          ],
        },
      ],
    });

    const out = mapJiraResults(json);
    expect(Object.keys(out.keys)).toEqual(["CRYP-42"]);
  });

  it("redacts paths, URLs and emails from the failure line and caps its length", () => {
    const json = artifact({
      total: 1,
      passed: 0,
      failed: 1,
      files: [
        {
          name: "C:/repo/tests/unit/a.test.js",
          status: "failed",
          assertionResults: [
            t("CRYP-6: leak probe", "failed", [
              "Error: ENOENT open 'C:\\Users\\nrenr\\OneDrive\\מסמכים\\crypto idea app\\x.js' for tester_1@example.com via https://127.0.0.1:9099/verify?oobCode=abc123",
            ]),
          ],
        },
      ],
    });

    const failure = mapJiraResults(json).keys["CRYP-6"].tests[0].failure;
    expect(failure).not.toContain("מסמכים");
    expect(failure).not.toContain("nrenr");
    expect(failure).not.toContain("example.com");
    expect(failure).not.toContain("oobCode");
    expect(failure).toContain("ENOENT");
    expect(failure.length).toBeLessThanOrEqual(200);
  });
});
