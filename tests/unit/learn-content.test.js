import { describe, it, expect } from "vitest";
import { MODULES } from "../../src/data/learn-content.js";
import { FORBIDDEN_NAMES, findForbiddenNames } from "../../scripts/check-dist-names.js";

// A7 (0f-content) — the full Learn library. These tests validate every shipped
// lesson STRUCTURALLY (valid quiz / correctIdx) and for VOICE (no author names,
// #24). They reuse the build's forbidden-name guard so the list can't drift.
const allLessons = MODULES.flatMap((m) => m.lessons.map((l) => ({ moduleId: m.id, ...l })));

describe("Learn content library (A7)", () => {
  it("ships the full library: 9 modules and ~50 lessons", () => {
    expect(MODULES.length).toBe(9);
    expect(allLessons.length).toBeGreaterThanOrEqual(45);
  });

  it("every module has the required shape", () => {
    const bad = MODULES.filter(
      (m) =>
        typeof m.id !== "string" || !m.id ||
        typeof m.icon !== "string" || !m.icon ||
        typeof m.title !== "string" || !m.title ||
        typeof m.sub !== "string" || !m.sub ||
        !Array.isArray(m.lessons) || m.lessons.length < 4
    ).map((m) => m.id || "(no id)");
    expect(bad).toEqual([]);
  });

  it("every lesson id is unique", () => {
    const ids = allLessons.map((l) => l.id);
    const dups = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dups).toEqual([]);
  });

  it("every lesson has a valid quiz: exactly 4 non-empty options + an in-range correctIdx", () => {
    const bad = allLessons.filter((l) => {
      const q = l.quiz;
      return (
        !q ||
        typeof q.q !== "string" || !q.q.trim() ||
        !Array.isArray(q.options) || q.options.length !== 4 ||
        !q.options.every((o) => typeof o === "string" && o.trim()) ||
        !Number.isInteger(q.correctIdx) || q.correctIdx < 0 || q.correctIdx >= q.options.length
      );
    }).map((l) => l.id);
    expect(bad).toEqual([]);
  });

  it("every lesson has a title, minutes, body paragraphs, and an insight", () => {
    const bad = allLessons.filter((l) => {
      return (
        typeof l.title !== "string" || !l.title.trim() ||
        !Number.isInteger(l.minutes) || l.minutes < 1 ||
        !Array.isArray(l.body) || l.body.length < 2 ||
        !l.body.every((p) => typeof p === "string" && p.trim()) ||
        typeof l.insight !== "string" || !l.insight.trim()
      );
    }).map((l) => l.id);
    expect(bad).toEqual([]);
  });

  it("no author names appear anywhere in the content (#24)", () => {
    const violations = allLessons
      .map((l) => ({ id: l.id, hits: findForbiddenNames(JSON.stringify(l)) }))
      .filter((v) => v.hits.length);
    expect(violations).toEqual([]);
    // Guards against an empty/disabled name list silently passing this test.
    expect(FORBIDDEN_NAMES.length).toBeGreaterThan(0);
  });

  it("correctIdx positions are varied across the library (not all the same index)", () => {
    const positions = new Set(allLessons.map((l) => l.quiz.correctIdx));
    expect(positions.size).toBeGreaterThan(1);
  });

  it("preserves the test-locked seed lessons + module order", () => {
    const byId = Object.fromEntries(allLessons.map((l) => [l.id, l]));
    const m1 = byId["markets-1"];
    expect(m1).toBeTruthy();
    expect(m1.quiz.options[m1.quiz.correctIdx]).toBe("More people are buying it right now");
    expect(byId["markets-2"]).toBeTruthy();
    expect(MODULES[0].title).toBe("How Markets Really Work");
    expect(MODULES[1].title).toBe("Reading the Fundamentals");
  });
});
