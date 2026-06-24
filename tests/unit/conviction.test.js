import { describe, it, expect } from "vitest";
import {
  reduceAxis, activeCatalysts, computeConviction, AXES, MIN_SOURCES,
} from "../../src/features/research/utils/conviction.js";
import { mockConviction } from "../../src/features/research/data/mock-conviction.js";

// A8 (0c-pure) — the conviction rubric reducer (#8 accuracy gate, #9 4-state rubric,
// #11 freshness/catalyst expiry). The marketed differentiator, so this is the
// highest-value early test set.
const dev = { key: "dev", label: "Dev", noData: "no public repo" };

describe("reduceAxis — accuracy gate (#8) + rubric (#9)", () => {
  it("single source → ⬛ insufficient, with the axis reason chip", () => {
    const r = reduceAxis(dev, [{ source: "github", verdict: "healthy" }]);
    expect(r.state).toBe("insufficient");
    expect(r.reason).toBe("no public repo");
  });

  it("thin coverage (no data / invalid verdicts) → ⬛ insufficient", () => {
    expect(reduceAxis(dev, []).state).toBe("insufficient");
    expect(reduceAxis(dev, undefined).state).toBe("insufficient");
    // an invalid/empty verdict doesn't count toward the 2-source gate
    expect(reduceAxis(dev, [{ source: "a", verdict: "none" }, { source: "b", verdict: "" }]).state).toBe("insufficient");
    expect(reduceAxis(dev, []).reason).toBe("no public repo");
  });

  it("two corroborating healthy → 🟢 healthy", () => {
    const r = reduceAxis(dev, [{ source: "a", verdict: "healthy" }, { source: "b", verdict: "healthy" }]);
    expect(r.state).toBe("healthy");
    expect(r.reason).toBe(null);
    expect(r.sources).toEqual(["a", "b"]);
  });

  it("conflict (healthy vs problem) → 🟡 mixed", () => {
    expect(reduceAxis(dev, [{ source: "a", verdict: "healthy" }, { source: "b", verdict: "problem" }]).state).toBe("mixed");
  });

  it("any 'mixed' verdict among 2+ sources → 🟡 mixed", () => {
    expect(reduceAxis(dev, [{ source: "a", verdict: "healthy" }, { source: "b", verdict: "mixed" }]).state).toBe("mixed");
    expect(reduceAxis(dev, [{ source: "a", verdict: "problem" }, { source: "b", verdict: "mixed" }]).state).toBe("mixed");
  });

  it("two corroborating problem (dead/abandoned) → 🔴 problem", () => {
    expect(reduceAxis(dev, [{ source: "a", verdict: "problem" }, { source: "b", verdict: "problem" }]).state).toBe("problem");
  });

  it("the accuracy gate is 2 sources", () => {
    expect(MIN_SOURCES).toBe(2);
  });
});

describe("activeCatalysts — freshness / auto-expiry (#11)", () => {
  const today = "2026-06-24";

  it("drops catalysts dated before today (a past unlock is never 'upcoming')", () => {
    const cats = [{ label: "past unlock", date: "2026-01-01" }, { label: "future upgrade", date: "2026-12-01" }];
    expect(activeCatalysts(cats, today).map((c) => c.label)).toEqual(["future upgrade"]);
  });

  it("keeps a catalyst dated exactly today", () => {
    expect(activeCatalysts([{ label: "today", date: today }], today)).toHaveLength(1);
  });

  it("tolerates missing input and missing today", () => {
    expect(activeCatalysts(undefined, today)).toEqual([]);
    expect(activeCatalysts([{ label: "x", date: "2026-01-01" }], undefined)).toHaveLength(1); // can't expire without a reference
  });
});

describe("computeConviction — integration over all 4 axes", () => {
  it("grades every axis, stamps asOf, and expires stale catalysts", () => {
    const evidence = {
      asOf: "2026-06-22",
      axes: {
        dev: [{ source: "a", verdict: "healthy" }, { source: "b", verdict: "healthy" }],       // 🟢
        founders: [{ source: "a", verdict: "healthy" }, { source: "b", verdict: "problem" }],  // 🟡 conflict
        team: [{ source: "a", verdict: "healthy" }],                                            // ⬛ single source
        community: [{ source: "a", verdict: "problem" }, { source: "b", verdict: "problem" }],  // 🔴 corroborated bad
      },
      catalysts: [{ label: "old", date: "2020-01-01" }, { label: "new", date: "2026-12-01" }],
    };
    const c = computeConviction(evidence, "2026-06-24");
    expect(c.asOf).toBe("2026-06-22");
    expect(c.axes.map((a) => a.state)).toEqual(["healthy", "mixed", "insufficient", "problem"]);
    expect(c.axes.find((a) => a.key === "team").reason).toBe("anonymous team");
    expect(c.catalysts.map((x) => x.label)).toEqual(["new"]);
  });

  it("the four axes are Dev / Founders / Team / Community", () => {
    expect(AXES.map((a) => a.key)).toEqual(["dev", "founders", "team", "community"]);
  });

  it("empty evidence degrades to four ⬛ axes (never throws)", () => {
    const c = computeConviction(undefined, "2026-06-24");
    expect(c.axes).toHaveLength(4);
    expect(c.axes.every((a) => a.state === "insufficient")).toBe(true);
    expect(c.catalysts).toEqual([]);
  });
});

describe("mockConviction — the offline seam (deterministic)", () => {
  it("majors read as fully healthy with an upcoming catalyst", () => {
    const c = mockConviction({ id: "bitcoin", sym: "BTC" }, "2026-06-24");
    expect(c.axes.every((a) => a.state === "healthy")).toBe(true);
    expect(c.catalysts.length).toBeGreaterThan(0);
  });

  it("is stable for the same coin and always returns 4 graded axes", () => {
    const a = mockConviction({ id: "some-longtail-coin", sym: "LTC2" }, "2026-06-24");
    const b = mockConviction({ id: "some-longtail-coin", sym: "LTC2" }, "2026-06-24");
    expect(a.axes.map((x) => x.state)).toEqual(b.axes.map((x) => x.state));
    expect(a.axes).toHaveLength(4);
  });
});
