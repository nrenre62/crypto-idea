// src/hooks/useLearn.js
// Loads the user's Learn progress (A4 persistence) once on mount, exposes the
// derived gamification state from utils/learn.js, and persists quiz-gated lesson
// completions. Degrades gracefully when signed out or a read fails (keeps the
// zeroed default — the tab still renders), so it never blocks the UI.
import { useState, useEffect, useCallback, useRef } from "react";
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
  // Mirror the latest progress for `complete` (C-R2e): the persist must live
  // OUTSIDE a setState updater (StrictMode double-invokes updaters → double writes).
  const progressRef = useRef(progress);
  useEffect(() => { progressRef.current = progress; }, [progress]);

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
  // Optimistic local update, then an AWAITED persist (C-R2e): a write flake no
  // longer silently drops earned XP — the update reverts + the user sees a toast.
  const complete = useCallback(async (lessonId) => {
    const prev = progressRef.current;
    if ((prev.completedLessons || []).includes(lessonId)) return;   // no double XP
    const next = completeLessonPure(prev, lessonId, today());
    setProgress(next);
    if (!uid) return;   // signed-out stays local-only (graceful degrade, as before)
    try {
      const r = await saveLearnProgress(uid, next);
      if (r && r.success === false) throw new Error("save failed");
    } catch (_e) {
      setProgress(prev);   // revert the optimistic XP/completion
      if (app && app.showErr) app.showErr("Couldn't save your Learn progress — check your connection and redo the quiz.");
    }
  }, [uid, app]);

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
