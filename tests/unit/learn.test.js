import { describe, it, expect } from "vitest";
import {
  levelFromXp, streakOn, completeLesson, moduleStates, nextLesson, earnedBadges,
  XP_PER_LESSON, LEVELS, overallPct, LEVEL_MARKERS, MAX_XP, TOTAL_LESSONS,
} from "../../src/utils/learn.js";

// A tiny content fixture so these tests don't depend on the real lesson copy.
const M = [
  { id: "a", icon: "📈", title: "A", sub: "", lessons: [{ id: "a1" }, { id: "a2" }] },
  { id: "b", icon: "🔍", title: "B", sub: "", lessons: [{ id: "b1" }] },
];

describe("levelFromXp", () => {
  it("maps XP to the right level + progress toward the next", () => {
    expect(levelFromXp(0)).toMatchObject({ level: 1, nextAt: 300, pct: 0 });
    expect(levelFromXp(150)).toMatchObject({ level: 1, pct: 50 });
    expect(levelFromXp(299).level).toBe(1);
    expect(levelFromXp(300)).toMatchObject({ level: 2, title: "Fundamental Analyst" });
  });
  it("caps at the max level with no next threshold", () => {
    const top = LEVELS[LEVELS.length - 1];
    const r = levelFromXp(top.minXp + 5000);
    expect(r.level).toBe(top.level);
    expect(r.nextAt).toBeNull();
    expect(r.pct).toBe(100);
  });
  it("treats junk / negative XP as 0", () => {
    expect(levelFromXp(undefined).level).toBe(1);
    expect(levelFromXp(-50).level).toBe(1);
  });
});

describe("overallPct + LEVEL_MARKERS (R19-8 — cumulative bar)", () => {
  it("the library is 50 lessons → MAX_XP 2,500", () => {
    expect(TOTAL_LESSONS).toBe(50);
    expect(MAX_XP).toBe(XP_PER_LESSON * 50);
  });
  it("overallPct = xp / MAX_XP (grows past each level, unlike levelFromXp.pct)", () => {
    expect(overallPct(0)).toBe(0);
    expect(overallPct(300)).toBe(12);   // Level 2 start → 12% overall, but levelFromXp(300).pct is 0
    expect(levelFromXp(300).pct).toBe(0);
    expect(overallPct(1250)).toBe(50);
    expect(overallPct(2500)).toBe(100);
    expect(overallPct(9999)).toBe(100); // clamped
    expect(overallPct(-5)).toBe(0);
  });
  it("level markers sit at their XP thresholds along the bar (L5 ≈ 80%)", () => {
    expect(LEVEL_MARKERS.map(m => m.at)).toEqual([0, 12, 28, 48, 80]);
    expect(LEVEL_MARKERS.map(m => m.level)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("streakOn", () => {
  it("starts a streak on first activity", () => {
    expect(streakOn({ lastActivity: "", streak: 0 }, "2026-06-23")).toEqual({ streak: 1, lastActivity: "2026-06-23" });
  });
  it("does not double-count the same day", () => {
    expect(streakOn({ lastActivity: "2026-06-23", streak: 4 }, "2026-06-23")).toEqual({ streak: 4, lastActivity: "2026-06-23" });
  });
  it("increments on a consecutive day", () => {
    expect(streakOn({ lastActivity: "2026-06-23", streak: 4 }, "2026-06-24")).toEqual({ streak: 5, lastActivity: "2026-06-24" });
  });
  it("resets to 1 after a gap", () => {
    expect(streakOn({ lastActivity: "2026-06-20", streak: 9 }, "2026-06-23")).toEqual({ streak: 1, lastActivity: "2026-06-23" });
  });
});

describe("completeLesson", () => {
  it("adds a new lesson, awards XP, advances the streak", () => {
    const p = { xp: 0, streak: 0, lastActivity: "", completedLessons: [] };
    const r = completeLesson(p, "a1", "2026-06-23");
    expect(r.completedLessons).toEqual(["a1"]);
    expect(r.xp).toBe(XP_PER_LESSON);
    expect(r.streak).toBe(1);
    expect(r.lastActivity).toBe("2026-06-23");
  });
  it("is idempotent — re-completing returns the same object (no double XP)", () => {
    const p = { xp: 50, streak: 1, lastActivity: "2026-06-23", completedLessons: ["a1"] };
    expect(completeLesson(p, "a1", "2026-06-24")).toBe(p);
  });
  it("accumulates XP across lessons", () => {
    const r = completeLesson({ completedLessons: ["a1"] }, "a2", "2026-06-23");
    expect(r.completedLessons).toEqual(["a1", "a2"]);
    expect(r.xp).toBe(2 * XP_PER_LESSON);
  });
});

describe("moduleStates", () => {
  it("first module active, the rest locked when nothing is done", () => {
    const s = moduleStates(M, []);
    expect(s[0]).toMatchObject({ status: "active", done: 0, total: 2, pct: 0 });
    expect(s[1].status).toBe("locked");
  });
  it("partial progress stays active with the right counts", () => {
    expect(moduleStates(M, ["a1"])[0]).toMatchObject({ status: "active", done: 1, total: 2, pct: 50 });
  });
  it("completing a module marks it done and unlocks the next", () => {
    const s = moduleStates(M, ["a1", "a2"]);
    expect(s[0]).toMatchObject({ status: "done", done: 2, pct: 100 });
    expect(s[1].status).toBe("active");
  });
});

describe("nextLesson", () => {
  it("returns the first incomplete lesson in the first unlocked module", () => {
    expect(nextLesson(M, []).lesson.id).toBe("a1");
    expect(nextLesson(M, ["a1"]).lesson.id).toBe("a2");
    expect(nextLesson(M, ["a1", "a2"]).lesson.id).toBe("b1");
  });
  it("returns null when everything is done", () => {
    expect(nextLesson(M, ["a1", "a2", "b1"])).toBeNull();
  });
});

describe("earnedBadges", () => {
  it("one badge (icon) per fully-completed module", () => {
    expect(earnedBadges(M, ["a1", "a2"])).toEqual(["📈"]);
    expect(earnedBadges(M, [])).toEqual([]);
  });
});
