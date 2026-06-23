// src/hooks/useLearn.js
// Loads the user's Learn progress (A4 persistence) once on mount, exposes the
// derived gamification state from utils/learn.js, and persists quiz-gated lesson
// completions. Degrades gracefully when signed out or a read fails (keeps the
// zeroed default — the tab still renders), so it never blocks the UI.
import { useState, useEffect, useCallback } from "react";
import { useApp } from "./app-context.js";
import { getLearnProgress, saveLearnProgress } from "../api/firebase-database.js";
import {
  MODULES, levelFromXp, moduleStates, nextLesson, earnedBadges,
  completeLesson as completeLessonPure,
} from "../utils/learn.js";

const DEFAULT = { xp: 0, streak: 0, lastActivity: "", completedLessons: [] };

const today = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

export function useLearn() {
  const app = useApp();
  const uid = app && app.user && app.user.uid;
  const [progress, setProgress] = useState(DEFAULT);
  const [loading, setLoading] = useState(!!uid);

  useEffect(() => {
    let alive = true;
    if (!uid) { setProgress(DEFAULT); setLoading(false); return; }
    setLoading(true);
    getLearnProgress(uid)
      .then((r) => {
        if (!alive) return;
        if (r && r.success) {
          setProgress({
            xp: r.xp || 0,
            streak: r.streak || 0,
            lastActivity: r.lastActivity || "",
            completedLessons: Array.isArray(r.completedLessons) ? r.completedLessons : [],
          });
        }
        setLoading(false);
      })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [uid]);

  // Quiz-gated completion: callers invoke this only when the quiz is passed.
  // Optimistic local update + fire-and-forget persist; the `includes` guard makes
  // re-completes a no-op (no double XP, no redundant write).
  const complete = useCallback((lessonId) => {
    setProgress((prev) => {
      if ((prev.completedLessons || []).includes(lessonId)) return prev;
      const next = completeLessonPure(prev, lessonId, today());
      if (uid) saveLearnProgress(uid, next);
      return next;
    });
  }, [uid]);

  return {
    progress,
    loading,
    level: levelFromXp(progress.xp),
    modules: moduleStates(MODULES, progress.completedLessons),
    next: nextLesson(MODULES, progress.completedLessons),
    badges: earnedBadges(MODULES, progress.completedLessons),
    isComplete: (id) => (progress.completedLessons || []).includes(id),
    complete,
  };
}
