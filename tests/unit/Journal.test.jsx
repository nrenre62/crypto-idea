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
      addThesis: vi.fn().mockResolvedValue(true),
      editThesis: vi.fn().mockResolvedValue(true), deleteThesis: vi.fn().mockResolvedValue(true),
      portfolio: [], ...value,
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
    // CRYP-105 (AC9): the footer is now the honest privacy line — it names WHO can see
    // the journal (you + the CryptoIdea team) and drops the false "feeds the AI" claim.
    const { container } = provide({ portfolio: [withThesis] });
    expect(screen.getByText("Your journal is visible only to you and the CryptoIdea team.")).toBeInTheDocument();
    expect(container.textContent).not.toContain("helps the AI");
  });

  it("opens the add-thesis overlay and saves a new thesis via addThesis(coinId, …)", () => {
    const addThesis = vi.fn().mockResolvedValue(true);
    provide({ portfolio: [noThesis], addThesis });
    fireEvent.click(screen.getByText("Add thesis"));
    expect(screen.getByText("Add your thesis")).toBeInTheDocument();
    // §J3: both questions are required to save
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "Real on-chain usage and a credible roadmap." } });
    fireEvent.change(screen.getAllByRole("textbox")[1], { target: { value: "Usage collapses or devs leave." } });
    fireEvent.click(screen.getByText("Save thesis"));
    expect(addThesis).toHaveBeenCalledWith(
      "cardano",
      expect.objectContaining({ thesis: "Real on-chain usage and a credible roadmap.", changeMyMind: "Usage collapses or devs leave." })
    );
  });

  // R24-1: the Add popup never discards typed work — a PARTIAL thesis saves too
  // (flagged Incomplete in the list, R24-2); the old both-required block is gone.
  it("R24-1: a partial thesis saves via 'Save thesis' (no both-required block, no error)", () => {
    const addThesis = vi.fn().mockResolvedValue(true);
    provide({ portfolio: [noThesis], addThesis });
    fireEvent.click(screen.getByText("Add thesis"));
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "only the why" } });
    fireEvent.click(screen.getByText("Save thesis"));
    expect(addThesis).toHaveBeenCalledWith(
      "cardano",
      expect.objectContaining({ thesis: "only the why", changeMyMind: "" })
    );
    expect(screen.queryByRole("alert")).toBeNull();   // no .j-err — partial is fine now
  });

  it("R24-1: the X saves whatever's written (fire-and-close); an empty popup saves nothing", () => {
    const addThesis = vi.fn().mockResolvedValue(true);
    const { unmount } = provide({ portfolio: [noThesis], addThesis });
    // X with content → saved
    fireEvent.click(screen.getByText("Add thesis"));
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "keep this note" } });
    fireEvent.click(screen.getByLabelText("Close"));
    expect(addThesis).toHaveBeenCalledWith("cardano", expect.objectContaining({ thesis: "keep this note" }));
    expect(screen.queryByText("Add your thesis")).toBeNull();   // closed
    unmount();
    // X with NOTHING typed → no write at all
    const addThesis2 = vi.fn().mockResolvedValue(true);
    provide({ portfolio: [noThesis], addThesis: addThesis2 });
    fireEvent.click(screen.getByText("Add thesis"));
    fireEvent.click(screen.getByLabelText("Close"));
    expect(addThesis2).not.toHaveBeenCalled();
  });

  it("R24-1: the Add popup keeps 'Save thesis' but has NO Cancel button (decision 2)", () => {
    provide({ portfolio: [noThesis] });
    fireEvent.click(screen.getByText("Add thesis"));
    expect(screen.getByText("Save thesis")).toBeInTheDocument();
    expect(screen.queryByText("Cancel")).toBeNull();
  });

  // R24-2: derived "Incomplete" flag — a partial thesis shows the yellow pill instead
  // of the status pill; it clears once both questions are filled.
  it("R24-2: a partial journal shows the yellow 'Incomplete' pill; a full one shows its status", () => {
    const partial = { ...withThesis, id: "sol", name: "Solana", symbol: "SOL",
      journal: { ...withThesis.journal, changeMyMind: "" } };
    provide({ portfolio: [withThesis, partial] });
    expect(screen.getByText(/🟡 Incomplete/)).toBeInTheDocument();   // partial → flagged
    expect(screen.getByText(/🟢 Intact/)).toBeInTheDocument();       // complete → status
  });

  // R24-3: the detail X is a safety net — pending edits + changed findings persist.
  it("R24-3: the detail X persists a pending thesis edit and changed findings", () => {
    const editThesis = vi.fn().mockResolvedValue(true);
    const saveFunnel = vi.fn().mockResolvedValue(true);
    provide({ portfolio: [withThesis], editThesis, saveFunnel });
    fireEvent.click(screen.getByText("Bitcoin"));   // open detail
    // change a funnel finding (no explicit "Save findings")
    const boxes = screen.getAllByRole("textbox");
    fireEvent.change(boxes[0], { target: { value: "unlocks look manageable" } });
    // enter edit mode and change the thesis (no explicit "Save changes")
    fireEvent.click(screen.getByText("Edit"));
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "Edited before closing" } });
    fireEvent.click(screen.getByLabelText("Close"));
    expect(editThesis).toHaveBeenCalledWith(
      "bitcoin",
      expect.objectContaining({ thesis: "Edited before closing" })
    );
    expect(saveFunnel).toHaveBeenCalledWith(
      "bitcoin",
      expect.objectContaining({ dilution: "unlocks look manageable" })
    );
  });

  it("R24-3: an untouched detail X saves nothing (no redundant writes)", () => {
    const editThesis = vi.fn().mockResolvedValue(true);
    const saveFunnel = vi.fn().mockResolvedValue(true);
    provide({ portfolio: [withThesis], editThesis, saveFunnel });
    fireEvent.click(screen.getByText("Bitcoin"));
    fireEvent.click(screen.getByLabelText("Close"));
    expect(editThesis).not.toHaveBeenCalled();
    expect(saveFunnel).not.toHaveBeenCalled();
  });

  it("edits an existing thesis and persists via editThesis (§J1)", () => {
    const editThesis = vi.fn().mockResolvedValue(true);
    provide({ portfolio: [withThesis], editThesis });
    fireEvent.click(screen.getByText("Bitcoin"));   // open detail
    fireEvent.click(screen.getByText("Edit"));       // enter edit mode
    const boxes = screen.getAllByRole("textbox");
    fireEvent.change(boxes[0], { target: { value: "Updated: real revenue now" } });
    fireEvent.click(screen.getByText("Save changes"));
    expect(editThesis).toHaveBeenCalledWith(
      "bitcoin",
      expect.objectContaining({ thesis: "Updated: real revenue now", changeMyMind: "Devs go quiet" })
    );
  });

  it("deletes a thesis after a confirm step via deleteThesis (§J2)", () => {
    const deleteThesis = vi.fn().mockResolvedValue(true);
    provide({ portfolio: [withThesis], deleteThesis });
    fireEvent.click(screen.getByText("Bitcoin"));        // open detail
    fireEvent.click(screen.getByText("Delete thesis"));  // step 1: reveal confirm
    expect(deleteThesis).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Yes, delete thesis")); // confirm
    expect(deleteThesis).toHaveBeenCalledWith("bitcoin");
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

  // R8 — a Read button opens the read-only Breakdown popup with the full thesis.
  it("opens the read-only Breakdown popup from the Read button (R8)", () => {
    const withFunnel = { ...withThesis, journal: { ...withThesis.journal, funnel: { dilution: "40% unlocks in 2027" } } };
    provide({ portfolio: [withFunnel] });
    fireEvent.click(screen.getByText("Bitcoin"));   // open detail
    fireEvent.click(screen.getByText("Read"));        // open breakdown
    expect(screen.getByText("Thesis breakdown")).toBeInTheDocument();
    expect(screen.getByText("Devs go quiet")).toBeInTheDocument();        // change-my-mind
    expect(screen.getByText("40% unlocks in 2027")).toBeInTheDocument();  // funnel finding
  });

  // R8 — the detail popup closes with the X (replaced the back-arrow).
  it("closes the Journal detail popup with the X button (R8)", () => {
    provide({ portfolio: [withThesis] });
    fireEvent.click(screen.getByText("Bitcoin"));
    expect(screen.getByText("Is your thesis still intact?")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Close"));
    expect(screen.queryByText("Is your thesis still intact?")).toBeNull();
  });

  // R4-4 — the LIVE + plan header pills are wired into this tab.
  it("renders the LIVE + plan header pills (R4-4)", () => {
    const setScreen = vi.fn();
    provide({ portfolio: [], api: "live", isPremium: true, isPro: true, setScreen });
    expect(screen.getByText(/● LIVE/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("PREMIUM"));
    expect(setScreen).toHaveBeenCalledWith("account");
  });

  // CRYP-105 (AC8): the Add-thesis callout drops the false "powers your Research & Ask"
  // claim for the honest "you'll know exactly why you bought" copy (matching Search's).
  it("CRYP-105: the Add-thesis callout uses honest copy (no 'powers your Research')", () => {
    const { container } = provide({ portfolio: [noThesis] });
    fireEvent.click(screen.getByText("Add thesis"));   // open the Add-thesis overlay
    expect(
      screen.getByText("Your thesis lives with this coin. When the market drops, you'll know exactly why you bought — and whether that reason still holds.")
    ).toBeInTheDocument();
    expect(container.textContent).not.toContain("powers your Research");
  });

  // CRYP-105 (AC6): with coins but no theses the "No thesis yet" empty-state renders as
  // a .j-none pill card; it disappears the moment any coin carries a thesis.
  it("CRYP-105: 'No thesis yet' renders as a .j-none pill only when no coin has a thesis", () => {
    const noneYet = provide({ portfolio: [noThesis] });        // a coin, but no thesis
    const pill = noneYet.container.querySelector(".j-none");
    expect(pill).not.toBeNull();
    expect(pill.textContent).toMatch(/No thesis yet/);

    const hasOne = provide({ portfolio: [withThesis] });        // a thesis exists → no pill
    expect(hasOne.container.querySelector(".j-none")).toBeNull();
  });

  // CRYP-105 (AC5): revealing the two-step delete confirm scrolls it into view. jsdom
  // does not implement scrollIntoView at all, so vi.spyOn(prototype) can't hook a
  // missing method — install the mock directly on the prototype and restore it after.
  it("CRYP-105: revealing the delete-confirm scrolls it into view", () => {
    const orig = HTMLElement.prototype.scrollIntoView;   // undefined under jsdom
    const spy = vi.fn();
    HTMLElement.prototype.scrollIntoView = spy;
    try {
      provide({ portfolio: [withThesis] });
      fireEvent.click(screen.getByText("Bitcoin"));        // open detail
      fireEvent.click(screen.getByText("Delete thesis"));  // step 1: reveal confirm
      expect(screen.getByText("Yes, delete thesis")).toBeInTheDocument();
      expect(spy).toHaveBeenCalled();
    } finally {
      if (orig) HTMLElement.prototype.scrollIntoView = orig;
      else delete HTMLElement.prototype.scrollIntoView;
    }
  });

  // CRYP-105 (AC2): the detail overlay shows the coin name ONCE — the Modal title is
  // dropped so it no longer duplicates the .bj-coin-name in the detail head.
  it("CRYP-105: the detail overlay shows the coin name once (no Modal title)", () => {
    const { container } = provide({ portfolio: [withThesis] });
    fireEvent.click(screen.getByText("Bitcoin"));   // open detail
    expect(container.querySelector(".bj-coin-name").textContent).toBe("Bitcoin");
    const title = container.querySelector(".cm-title");
    expect(title === null || !title.textContent.includes("Bitcoin")).toBe(true);
  });
});
