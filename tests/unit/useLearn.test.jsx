import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the A4 persistence layer so the hook is tested in isolation.
const getLearnProgress = vi.fn();
const saveLearnProgress = vi.fn().mockResolvedValue({ success: true });
vi.mock("../../src/api/firebase-database.js", () => ({
  getLearnProgress: (...a) => getLearnProgress(...a),
  saveLearnProgress: (...a) => saveLearnProgress(...a),
}));

import React from "react";
import { AppContext } from "../../src/hooks/app-context.js";
import { useLearn } from "../../src/hooks/useLearn.js";

const wrap = (uid) => ({ children }) => (
  <AppContext.Provider value={{ user: uid ? { uid } : null }}>{children}</AppContext.Provider>
);

describe("useLearn", () => {
  beforeEach(() => { getLearnProgress.mockReset(); saveLearnProgress.mockClear(); });

  it("loads persisted progress and derives level / next lesson", async () => {
    getLearnProgress.mockResolvedValue({ success: true, xp: 50, streak: 2, lastActivity: "2026-06-23", completedLessons: ["markets-1"] });
    const { result } = renderHook(() => useLearn(), { wrapper: wrap("u1") });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.progress.xp).toBe(50);
    expect(result.current.isComplete("markets-1")).toBe(true);
    expect(result.current.next.lesson.id).toBe("markets-2"); // next incomplete
    expect(result.current.level.level).toBe(1);
  });

  it("completes a lesson, updates derived state, and persists", async () => {
    getLearnProgress.mockResolvedValue({ success: true, xp: 0, streak: 0, lastActivity: "", completedLessons: [] });
    const { result } = renderHook(() => useLearn(), { wrapper: wrap("u1") });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.complete("markets-1"); });   // async since C-R2e
    expect(result.current.isComplete("markets-1")).toBe(true);
    expect(result.current.progress.xp).toBe(50);
    expect(saveLearnProgress).toHaveBeenCalled();
    expect(saveLearnProgress.mock.calls[0][1].completedLessons).toContain("markets-1");
  });

  it("re-completing a lesson does not double-count or re-save", async () => {
    getLearnProgress.mockResolvedValue({ success: true, xp: 50, streak: 1, lastActivity: "2026-06-23", completedLessons: ["markets-1"] });
    const { result } = renderHook(() => useLearn(), { wrapper: wrap("u1") });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.complete("markets-1"); });   // async since C-R2e
    expect(result.current.progress.xp).toBe(50);
    expect(saveLearnProgress).not.toHaveBeenCalled();
  });

  it("C-R2e: a failed persist reverts the optimistic XP and surfaces a toast", async () => {
    getLearnProgress.mockResolvedValue({ success: true, xp: 0, streak: 0, lastActivity: "", completedLessons: [] });
    saveLearnProgress.mockRejectedValueOnce(new Error("network down"));
    const showErr = vi.fn();
    const wrapErr = ({ children }) => (
      <AppContext.Provider value={{ user: { uid: "u1" }, showErr }}>{children}</AppContext.Provider>
    );
    const { result } = renderHook(() => useLearn(), { wrapper: wrapErr });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.complete("markets-1"); });
    // reverted — no phantom XP the server never recorded
    expect(result.current.progress.xp).toBe(0);
    expect(result.current.isComplete("markets-1")).toBe(false);
    expect(showErr).toHaveBeenCalledWith(expect.stringMatching(/Learn progress/));
  });

  it("signed out: stays at the zeroed default and never touches the data layer", async () => {
    const { result } = renderHook(() => useLearn(), { wrapper: wrap(null) });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.progress.xp).toBe(0);
    expect(getLearnProgress).not.toHaveBeenCalled();
  });
});
