import { describe, it, expect } from "vitest";
import { findForbiddenNames, FORBIDDEN_NAMES } from "../../scripts/check-dist-names.js";

// The build-time guard (scripts/check-dist-names.js) blocks named investors from
// shipping (#24 no-names voice). Here we lock the pure matcher's behaviour —
// especially that it does NOT false-positive on the lowercase English words that
// fill minified vendor bundles (otherwise the build could never pass).
describe("dist name guard — findForbiddenNames (#24)", () => {
  it("flags forbidden investor names in user-facing copy", () => {
    expect(findForbiddenNames("Principles from Buffett, Munger, Marks.")).toEqual(["Buffett", "Munger", "Marks"]);
    expect(findForbiddenNames("Benjamin Graham · The Intelligent Investor")).toEqual(["Graham"]);
  });

  it("is case-sensitive + whole-word: ignores ordinary lowercase words", () => {
    expect(findForbiddenNames("remarks, bookmarks, benchmark and trademarks")).toEqual([]);
    expect(findForbiddenNames("performance marks and watermarks")).toEqual([]);
  });

  it("does not match a name embedded inside a larger identifier", () => {
    expect(findForbiddenNames("PerformanceMarks Markside resourceMarks")).toEqual([]);
  });

  it("passes clean first-party copy", () => {
    expect(findForbiddenNames("Timeless principles from the world's best investors.")).toEqual([]);
  });

  it("guards exactly the four names that appeared in the product", () => {
    expect(FORBIDDEN_NAMES).toEqual(["Buffett", "Munger", "Marks", "Graham"]);
  });
});
