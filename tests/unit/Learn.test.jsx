import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const getLearnProgress = vi.fn();
const saveLearnProgress = vi.fn().mockResolvedValue({ success: true });
vi.mock("../../src/api/firebase-database.js", () => ({
  getLearnProgress: (...a) => getLearnProgress(...a),
  saveLearnProgress: (...a) => saveLearnProgress(...a),
}));

import React from "react";
import { AppContext } from "../../src/hooks/app-context.js";
import { Learn } from "../../src/components/Learn.jsx";

const renderLearn = () =>
  render(<AppContext.Provider value={{ user: { uid: "u1" } }}><Learn /></AppContext.Provider>);

const fresh = { success: true, xp: 0, streak: 0, lastActivity: "", completedLessons: [] };

describe("Learn tab (wired to useLearn)", () => {
  beforeEach(() => { getLearnProgress.mockReset(); saveLearnProgress.mockClear(); });

  it("renders the level + module titles for a fresh learner", async () => {
    getLearnProgress.mockResolvedValue(fresh);
    renderLearn();
    expect(await screen.findByText(/Level \d ·/)).toBeInTheDocument();
    expect(screen.getByText(/Level 1 ·/)).toBeInTheDocument();
    expect(screen.getAllByText("How Markets Really Work").length).toBeGreaterThan(0); // module card + today's-lesson meta
    expect(screen.getByText("Reading the Fundamentals")).toBeInTheDocument();
  });

  it("R19-7/R20-1: header reads 'Learn'; cumulative XP bar with NO level marks; title + XP text stay", async () => {
    getLearnProgress.mockResolvedValue({ ...fresh, xp: 300 }); // Level 2, exactly at its start
    const { container } = renderLearn();
    await screen.findByText(/Level \d ·/);
    // R19-7: the header title is just "Learn" (BETA/tags follow in spans)
    expect(container.querySelector(".apphead .title").textContent).toMatch(/^Learn/);
    // R19-8 (kept): the fill reflects OVERALL progress (300 / 2500 = 12%), NOT per-level (0% at 300)
    expect(container.querySelector(".xp-fill").style.width).toBe("12%");
    // R20-1: the L1–L5 tick-marks + labels are GONE — only the color bar remains
    expect(container.querySelector(".xp-tick")).toBeNull();
    expect(container.querySelector(".xp-marks")).toBeNull();
    expect(container.querySelectorAll(".xp-mark").length).toBe(0);
    // ...but the level title and the per-level "to next level" text are kept
    expect(screen.getByText(/Level 2 ·/)).toBeInTheDocument();
    expect(screen.getByText(/XP to Level 3/)).toBeInTheDocument();
  });

  it("does not render the badges row (R2-2 removed)", async () => {
    getLearnProgress.mockResolvedValue(fresh);
    const { container } = renderLearn();
    await screen.findByText(/Level \d ·/);
    expect(container.querySelector(".badges-row")).toBeNull();
    expect(screen.queryByText(/earn your first badge/i)).toBeNull();
  });

  it("R11-Q quiz: selecting an option does NOT reveal/complete; Submit on the correct pick completes", async () => {
    getLearnProgress.mockResolvedValue(fresh);
    renderLearn();
    await screen.findByText(/Level \d ·/);
    fireEvent.click(screen.getByText("Start lesson"));                 // opens the first lesson
    expect(await screen.findByText("The key insight")).toBeInTheDocument();
    const correct = screen.getByText("More people are buying it right now");
    fireEvent.click(correct);                                          // select only
    // Selection is neutral (not revealed as correct) and nothing is completed yet.
    expect(correct.closest(".quiz-opt").className).toContain("selected");
    expect(correct.closest(".quiz-opt").className).not.toContain("correct");
    expect(saveLearnProgress).not.toHaveBeenCalled();
    // Submit → green result + completion persisted.
    fireEvent.click(screen.getByText("Submit"));
    expect(screen.getByText(/Correct — lesson complete/)).toBeInTheDocument();
    await waitFor(() => expect(saveLearnProgress).toHaveBeenCalled());
    expect(saveLearnProgress.mock.calls[0][1].completedLessons).toContain("markets-1");
  });

  it("R11-Q quiz: Submit on a wrong pick shows a hint, does NOT complete, and allows a retry", async () => {
    getLearnProgress.mockResolvedValue(fresh);
    renderLearn();
    await screen.findByText(/Level \d ·/);
    fireEvent.click(screen.getByText("Start lesson"));
    await screen.findByText("The key insight");
    fireEvent.click(screen.getByText("The token is now undervalued")); // a wrong option
    fireEvent.click(screen.getByText("Submit"));
    expect(screen.getByText(/Not quite/)).toBeInTheDocument();
    expect(saveLearnProgress).not.toHaveBeenCalled();
    // Retry: pick the correct option (clears the hint) and submit → completes.
    fireEvent.click(screen.getByText("More people are buying it right now"));
    expect(screen.queryByText(/Not quite/)).toBeNull();
    fireEvent.click(screen.getByText("Submit"));
    await waitFor(() => expect(saveLearnProgress).toHaveBeenCalled());
  });

  it("shows the hero streak + lessons chips (DP-4)", async () => {
    getLearnProgress.mockResolvedValue({ success: true, xp: 50, streak: 2, lastActivity: "2026-06-23", completedLessons: ["markets-1"] });
    renderLearn();
    await screen.findByText(/Level \d ·/);
    expect(screen.getByText(/🔥 2-day streak/)).toBeInTheDocument();
    expect(screen.getByText(/1 of \d+ lessons/)).toBeInTheDocument();
  });

  it("renders an SVG icon for every module incl. a lock for locked ones (DP-4)", async () => {
    getLearnProgress.mockResolvedValue(fresh);
    const { container } = renderLearn();
    await screen.findByText(/Level \d ·/);
    // one icon per module (active/done show the module SVG, locked shows the lock SVG)
    expect(container.querySelectorAll(".m-icon svg").length).toBeGreaterThanOrEqual(9);
    expect(container.querySelector(".m-icon.locked-icon svg")).toBeTruthy();
  });

  it("module footer is a single row with count + CTA (DP-4)", async () => {
    getLearnProgress.mockResolvedValue(fresh);
    const { container } = renderLearn();
    await screen.findByText(/Level \d ·/);
    const foot = container.querySelector(".m-foot");          // markets is the only unlocked module for a fresh learner
    expect(foot).toBeTruthy();
    expect(foot.querySelector(".m-foot-count").textContent).toMatch(/0\/\d+ lessons/);
    expect(foot.querySelector(".m-btn").textContent).toBe("Start →");
  });

  // R20 — module-scoped lesson player: Previous | Submit → Next → / Done →, review-from-start.
  describe("R20 — module-scoped lesson player", () => {
    it("R20-2/3: Submit → 'Next →' advances within the module; Previous steps back and re-arms (start-fresh)", async () => {
      getLearnProgress.mockResolvedValue(fresh);
      const { container } = renderLearn();
      await screen.findByText(/Level \d ·/);
      fireEvent.click(screen.getByText("Start lesson")); // opens markets-1 (idx 0)
      expect(container.querySelector(".lesson-title").textContent).toBe("Price is a vote, not a verdict");
      // R20-3: one compact nav row holding BOTH buttons; Previous disabled on the first lesson
      const nav = container.querySelector(".lesson-nav");
      expect(nav).toBeTruthy();
      expect(nav.querySelectorAll("button").length).toBe(2);
      expect(screen.getByText("Previous").disabled).toBe(true);
      expect(screen.getByText("Submit").disabled).toBe(true); // nothing picked yet
      // correct pick + Submit → the right button becomes "Next →" and completion persists
      fireEvent.click(screen.getByText("More people are buying it right now"));
      fireEvent.click(screen.getByText("Submit"));
      expect(screen.getByText(/Correct — lesson complete/)).toBeInTheDocument();
      await waitFor(() => expect(saveLearnProgress).toHaveBeenCalled());
      expect(saveLearnProgress.mock.calls[0][1].completedLessons).toContain("markets-1");
      // Next → advances to lesson 2 and re-arms to a fresh Submit
      fireEvent.click(screen.getByText("Next →"));
      expect(container.querySelector(".lesson-title").textContent).toBe("Why bull markets feel like skill");
      expect(screen.getByText("Submit").disabled).toBe(true); // start-fresh: nothing picked
      expect(screen.queryByText(/Correct — lesson complete/)).toBeNull();
      expect(screen.getByText("Previous").disabled).toBe(false);
      // Previous → back to lesson 1, also fresh (no pre-revealed answer)
      fireEvent.click(screen.getByText("Previous"));
      expect(container.querySelector(".lesson-title").textContent).toBe("Price is a vote, not a verdict");
      expect(screen.getByText("Submit")).toBeInTheDocument();
      expect(screen.queryByText("Next →")).toBeNull();
    });

    it("R20-2: the module's LAST lesson shows 'Done →' which closes the player", async () => {
      // markets-1..5 done → Continue opens markets-6 (the first incomplete = the last lesson)
      getLearnProgress.mockResolvedValue({
        success: true, xp: 250, streak: 0, lastActivity: "",
        completedLessons: ["markets-1", "markets-2", "markets-3", "markets-4", "markets-5"],
      });
      const { container } = renderLearn();
      await screen.findByText(/Level \d ·/);
      fireEvent.click(screen.getByText("Continue →"));
      expect(container.querySelector(".lesson-title").textContent).toBe("Why most 'news' is already in the price");
      fireEvent.click(screen.getByText("The event was already priced in, so positioned holders sold into it"));
      fireEvent.click(screen.getByText("Submit"));
      expect(screen.getByText("Done →")).toBeInTheDocument();
      expect(screen.queryByText("Next →")).toBeNull(); // last lesson: Done, not Next
      fireEvent.click(screen.getByText("Done →"));
      expect(container.querySelector(".lesson-title")).toBeNull(); // overlay closed
    });

    it("R20-4: 'Review →' opens a done module from lesson 1, fresh (Submit, no pre-reveal)", async () => {
      getLearnProgress.mockResolvedValue({
        success: true, xp: 300, streak: 0, lastActivity: "",
        completedLessons: ["markets-1", "markets-2", "markets-3", "markets-4", "markets-5", "markets-6"],
      });
      const { container } = renderLearn();
      await screen.findByText(/Level \d ·/);
      fireEvent.click(screen.getByText("Review →"));
      // review starts at the BEGINNING of the module…
      expect(container.querySelector(".lesson-title").textContent).toBe("Price is a vote, not a verdict");
      // …and starts fresh: Submit armed-but-disabled, no revealed answer, no Next yet
      expect(screen.getByText("Submit").disabled).toBe(true);
      expect(screen.queryByText("Next →")).toBeNull();
      expect(screen.queryByText(/Correct — lesson complete/)).toBeNull();
    });
  });

  // R4-4 — the LIVE + plan header pills are wired into the Learn hero.
  it("renders the LIVE + plan header pills in the hero (R4-4)", async () => {
    getLearnProgress.mockResolvedValue(fresh);
    const setScreen = vi.fn();
    render(
      <AppContext.Provider value={{ user: { uid: "u1" }, api: "live", isPro: true, setScreen }}>
        <Learn />
      </AppContext.Provider>
    );
    await screen.findByText(/Level \d ·/);
    expect(screen.getByText(/● LIVE/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("PRO"));
    expect(setScreen).toHaveBeenCalledWith("account");
  });
});
