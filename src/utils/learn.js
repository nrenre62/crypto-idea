// src/utils/learn.js
// Pure Learn gamification logic — level / XP / streak / module-state. No state,
// DOM, or fetch; fully unit-testable. Consumed by the useLearn hook and persisted
// via firebase-database (saveLearnProgress, bounded by validLearnProgress).

import { MODULES } from "../data/learn-content.js";

export const XP_PER_LESSON = 50;

// Level thresholds (cumulative XP) + titles. Tuned for the full ~50-lesson library;
// the A5 seed (4 lessons) keeps a learner in level 1, which is honest.
export const LEVELS = [
  { level: 1, title: "Curious Beginner", minXp: 0 },
  { level: 2, title: "Fundamental Analyst", minXp: 300 },
  { level: 3, title: "Conviction Investor", minXp: 700 },
  { level: 4, title: "Cycle-Aware", minXp: 1200 },
  { level: 5, title: "Master Allocator", minXp: 2000 },
];

// Resolve the level for an XP total: current level/title, progress into it, and the
// XP threshold for the next level (null at max). `pct` is progress toward next.
export function levelFromXp(xp) {
  const x = Math.max(0, Number(xp) || 0);
  let cur = LEVELS[0];
  for (const l of LEVELS) if (x >= l.minXp) cur = l;
  const next = LEVELS.find((l) => l.minXp > cur.minXp) || null;
  const nextAt = next ? next.minXp : null;
  const span = nextAt != null ? nextAt - cur.minXp : 0;
  const into = x - cur.minXp;
  const pct = nextAt != null ? Math.min(100, Math.round((into / span) * 100)) : 100;
  return { level: cur.level, title: cur.title, xp: x, nextAt, into, pct };
}

// Whole days from YYYY-MM-DD `a` to `b` (b - a), or null if either is missing/bad.
function dayDiff(a, b) {
  if (!a || !b) return null;
  const ta = Date.parse(a + "T00:00:00Z");
  const tb = Date.parse(b + "T00:00:00Z");
  if (Number.isNaN(ta) || Number.isNaN(tb)) return null;
  return Math.round((tb - ta) / 86400000);
}

// Update the daily streak for activity on `today` (YYYY-MM-DD). Same day → no change;
// the next calendar day → +1; a gap (or first ever) → reset to 1.
export function streakOn(progress, today) {
  const diff = dayDiff(progress && progress.lastActivity, today);
  let streak;
  if (diff === 0) streak = (progress && progress.streak) || 1; // already counted today
  else if (diff === 1) streak = ((progress && progress.streak) || 0) + 1;
  else streak = 1; // first activity or a gap
  return { streak, lastActivity: today };
}

// Mark a lesson complete (pure). Idempotent: re-completing returns the SAME object
// (no double XP). A new completion appends the id, recomputes XP from the lesson
// count, and advances the streak for `today`.
export function completeLesson(progress, lessonId, today) {
  const done = (progress && progress.completedLessons) || [];
  if (done.includes(lessonId)) return progress;
  const completedLessons = [...done, lessonId];
  const s = streakOn(progress || {}, today);
  return {
    ...progress,
    completedLessons,
    xp: completedLessons.length * XP_PER_LESSON,
    streak: s.streak,
    lastActivity: s.lastActivity,
  };
}

// Per-module state from the set of completed lesson ids. Modules unlock
// sequentially: a module is `active` once the previous one is `done`, else `locked`.
export function moduleStates(modules, completedLessons) {
  const done = new Set(completedLessons || []);
  let prevDone = true; // the first module is always unlocked
  return modules.map((m) => {
    const total = m.lessons.length;
    const doneCount = m.lessons.filter((l) => done.has(l.id)).length;
    const isDone = total > 0 && doneCount === total;
    const status = isDone ? "done" : prevDone ? "active" : "locked";
    prevDone = isDone;
    return { ...m, done: doneCount, total, pct: total ? Math.round((doneCount / total) * 100) : 0, status };
  });
}

// The next lesson to do: the first incomplete lesson in the first unlocked module.
// Returns { module, lesson } or null when everything is done.
export function nextLesson(modules, completedLessons) {
  const done = new Set(completedLessons || []);
  for (const m of moduleStates(modules, completedLessons)) {
    if (m.status === "locked") continue;
    const lesson = m.lessons.find((l) => !done.has(l.id));
    if (lesson) return { module: m, lesson };
  }
  return null;
}

// One badge (the module's icon) per fully-completed module. Derived, not stored.
export function earnedBadges(modules, completedLessons) {
  return moduleStates(modules, completedLessons)
    .filter((m) => m.status === "done")
    .map((m) => m.icon);
}

export { MODULES };
