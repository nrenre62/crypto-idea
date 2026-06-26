import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AppContext } from "../../src/hooks/app-context.js";
import { Journal } from "../../src/components/Journal.jsx";

// Journal lists the active portfolio's coins that have a thesis (journal), surfaces
// coins that still need one ("Needs a thesis" + add-thesis-later), and its detail
// overlay records the review decision. Tested in isolation against the real AppContext.
function provide(value) {
  return render(
    <AppContext.Provider value={{
      setScreen: vi.fn(), reviewThesis: vi.fn(), saveFunnel: vi.fn(),
      addThesis: vi.fn().mockResolvedValue(true), portfolio: [], ...value,
    }}>
      <Journal />
    </AppContext.Provider>
  );
}

const withThesis = {
  id: "bitcoin", symbol: "BTC", name: "Bitcoin", entries: [],
  journal: {
    thesis: "Strong fundamentals and active dev", changeMyMind: "Devs go quiet",
    status: "intact", priceAtAdd: 50000, createdAt: "2026-01-01T00:00:00.000Z",
  },
};
const noThesis = { id: "cardano", symbol: "ADA", name: "Cardano", entries: [] };

describe("Journal tab (extracted, via AppContext)", () => {
  it("shows the empty state only when there are NO coins at all", () => {
    provide({ portfolio: [] });
    expect(screen.getByText("Your journal is empty")).toBeInTheDocument();
    expect(screen.getByText("Add your first coin →")).toBeInTheDocument();
  });

  it("surfaces a coin with no thesis under 'Needs a thesis' (not the empty state)", () => {
    provide({ portfolio: [noThesis] });
    expect(screen.queryByText("Your journal is empty")).toBeNull();
    expect(screen.getByText(/Needs a thesis \(1\)/)).toBeInTheDocument();
    expect(screen.getByText("Cardano")).toBeInTheDocument();
    expect(screen.getByText("Add thesis")).toBeInTheDocument();
  });

  it("lists coins that have a thesis, with an excerpt and the SHORT status label", () => {
    provide({ portfolio: [withThesis] });
    expect(screen.getByText("Bitcoin")).toBeInTheDocument();
    expect(screen.getByText(/Strong fundamentals/)).toBeInTheDocument();
    expect(screen.getByText(/🟢 Intact/)).toBeInTheDocument();
  });

  it("shows the corrected privacy note (thesis feeds the AI), not the old wording", () => {
    provide({ portfolio: [withThesis] });
    expect(screen.queryByText(/private to your account/)).toBeNull();
    expect(screen.getByText(/Your thesis helps the AI give you better Research & Ask/)).toBeInTheDocument();
  });

  it("opens the add-thesis overlay and saves a new thesis via addThesis(coinId, …)", () => {
    const addThesis = vi.fn().mockResolvedValue(true);
    provide({ portfolio: [noThesis], addThesis });
    fireEvent.click(screen.getByText("Add thesis"));
    expect(screen.getByText("Add your thesis")).toBeInTheDocument();
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "Real on-chain usage and a credible roadmap." } });
    fireEvent.click(screen.getByText("Save thesis"));
    expect(addThesis).toHaveBeenCalledWith(
      "cardano",
      expect.objectContaining({ thesis: "Real on-chain usage and a credible roadmap." })
    );
  });

  it("opens the detail overlay and records a review decision", () => {
    const reviewThesis = vi.fn();
    provide({ portfolio: [withThesis], reviewThesis });
    fireEvent.click(screen.getByText("Bitcoin")); // open detail
    expect(screen.getByText("Is your thesis still intact?")).toBeInTheDocument();
    expect(screen.getByText("Devs go quiet")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Reconsidering"));
    expect(reviewThesis).toHaveBeenCalledWith("bitcoin", "challenged");
  });

  it("shows saved funnel findings in the detail overlay (#27)", () => {
    const withFunnel = { ...withThesis, journal: { ...withThesis.journal, funnel: { dilution: "40% unlocks in 2027" } } };
    provide({ portfolio: [withFunnel] });
    fireEvent.click(screen.getByText("Bitcoin"));
    expect(screen.getByText("Manual research findings")).toBeInTheDocument();
    expect(screen.getByDisplayValue("40% unlocks in 2027")).toBeInTheDocument();
  });

  it("edits funnel findings and persists them via saveFunnel", () => {
    const saveFunnel = vi.fn();
    provide({ portfolio: [withThesis], saveFunnel });
    fireEvent.click(screen.getByText("Bitcoin"));
    fireEvent.change(screen.getByPlaceholderText(/supply unlocks/i), {
      target: { value: "big unlock cliff ahead" },
    });
    fireEvent.click(screen.getByText("Save findings"));
    expect(saveFunnel).toHaveBeenCalledTimes(1);
    expect(saveFunnel.mock.calls[0][0]).toBe("bitcoin");
    expect(saveFunnel.mock.calls[0][1].dilution).toBe("big unlock cliff ahead");
  });
});
