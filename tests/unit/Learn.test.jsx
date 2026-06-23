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
});
