import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AppContext } from "../../src/hooks/app-context.js";
import { Journal } from "../../src/components/Journal.jsx";

// Journal lists the active portfolio's coins that have a thesis (journal), and its
// detail overlay records the "is your thesis still intact?" review decision. Tested
// in isolation against the real AppContext.
function provide(value) {
  return render(
    <AppContext.Provider value={{ setScreen: vi.fn(), reviewThesis: vi.fn(), saveFunnel: vi.fn(), portfolio: [], ...value }}>
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

describe("Journal tab (extracted, via AppContext)", () => {
  it("shows the empty state when no coin has a thesis", () => {
    provide({ portfolio: [{ id: "eth", symbol: "ETH", name: "Ethereum", entries: [] }] });
    expect(screen.getByText("Your journal is empty")).toBeInTheDocument();
  });

  it("lists coins that have a thesis, with an excerpt and status pill", () => {
    provide({ portfolio: [withThesis] });
    expect(screen.getByText("Bitcoin")).toBeInTheDocument();
    expect(screen.getByText(/Strong fundamentals/)).toBeInTheDocument();
    expect(screen.getByText(/Thesis intact/)).toBeInTheDocument();
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
