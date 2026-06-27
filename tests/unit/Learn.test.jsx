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
    expect(await screen.findByText("Your Investing Edge")).toBeInTheDocument();
    expect(screen.getByText(/Level 1 ·/)).toBeInTheDocument();
    expect(screen.getAllByText("How Markets Really Work").length).toBeGreaterThan(0); // module card + today's-lesson meta
    expect(screen.getByText("Reading the Fundamentals")).toBeInTheDocument();
  });

  it("quiz-gated: a correct answer completes the lesson and persists it", async () => {
    getLearnProgress.mockResolvedValue(fresh);
    renderLearn();
    await screen.findByText("Your Investing Edge");
    fireEvent.click(screen.getByText("Start lesson"));                 // opens the first lesson
    expect(await screen.findByText("The key insight")).toBeInTheDocument();
    const correct = screen.getByText("More people are buying it right now");
    fireEvent.click(correct);
    expect(correct.closest(".quiz-opt").className).toContain("correct");
    await waitFor(() => expect(saveLearnProgress).toHaveBeenCalled());
    expect(saveLearnProgress.mock.calls[0][1].completedLessons).toContain("markets-1");
  });

  it("a wrong answer reveals the correct option but does NOT complete the lesson", async () => {
    getLearnProgress.mockResolvedValue(fresh);
    renderLearn();
    await screen.findByText("Your Investing Edge");
    fireEvent.click(screen.getByText("Start lesson"));
    await screen.findByText("The key insight");
    fireEvent.click(screen.getByText("The token is now undervalued")); // a wrong option
    expect(saveLearnProgress).not.toHaveBeenCalled();
  });

  it("shows the hero streak + lessons chips (DP-4)", async () => {
    getLearnProgress.mockResolvedValue({ success: true, xp: 50, streak: 2, lastActivity: "2026-06-23", completedLessons: ["markets-1"] });
    renderLearn();
    await screen.findByText("Your Investing Edge");
    expect(screen.getByText(/🔥 2-day streak/)).toBeInTheDocument();
    expect(screen.getByText(/1 of \d+ lessons/)).toBeInTheDocument();
  });

  it("renders an SVG icon for every module incl. a lock for locked ones (DP-4)", async () => {
    getLearnProgress.mockResolvedValue(fresh);
    const { container } = renderLearn();
    await screen.findByText("Your Investing Edge");
    // one icon per module (active/done show the module SVG, locked shows the lock SVG)
    expect(container.querySelectorAll(".m-icon svg").length).toBeGreaterThanOrEqual(9);
    expect(container.querySelector(".m-icon.locked-icon svg")).toBeTruthy();
  });

  it("module footer is a single row with count + CTA (DP-4)", async () => {
    getLearnProgress.mockResolvedValue(fresh);
    const { container } = renderLearn();
    await screen.findByText("Your Investing Edge");
    const foot = container.querySelector(".m-foot");          // markets is the only unlocked module for a fresh learner
    expect(foot).toBeTruthy();
    expect(foot.querySelector(".m-foot-count").textContent).toMatch(/0\/\d+ lessons/);
    expect(foot.querySelector(".m-btn").textContent).toBe("Start →");
  });
});
