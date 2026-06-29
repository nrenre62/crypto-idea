import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AppContext } from "../../src/hooks/app-context.js";
import { Search } from "../../src/components/Search.jsx";

// Search's add-coin flow opens the Buy-Journal prompt. "Skip" adds the coin with no
// thesis; "Save" persists the typed thesis with the coin (addCoin's 2nd arg).
function provide(value) {
  return render(
    <AppContext.Provider value={{
      sq: "abc", setSq: vi.fn(),
      searchResults: [{ id: "bitcoin", symbol: "BTC", name: "Bitcoin", mockPrice: 50000 }],
      portfolio: [], addCoin: vi.fn(), ...value,
    }}>
      <Search />
    </AppContext.Provider>
  );
}

describe("Search — Buy-Journal capture", () => {
  it("Skip adds the coin without a journal", () => {
    const addCoin = vi.fn();
    provide({ addCoin });
    fireEvent.click(screen.getByText("+ Add"));
    fireEvent.click(screen.getByText("Skip for now"));
    expect(addCoin).toHaveBeenCalledTimes(1);
    expect(addCoin.mock.calls[0][1] == null).toBe(true); // no journal passed
  });

  it("Save persists the typed thesis (both questions) with the coin", () => {
    const addCoin = vi.fn();
    provide({ addCoin });
    fireEvent.click(screen.getByText("+ Add"));
    fireEvent.change(screen.getByPlaceholderText(/active GitHub/), {
      target: { value: "Real revenue + active devs" },
    });
    fireEvent.change(screen.getByPlaceholderText(/GitHub goes quiet/), {
      target: { value: "Revenue dries up" },
    });
    fireEvent.click(screen.getByText("Save to Journal & add coin"));
    expect(addCoin).toHaveBeenCalledTimes(1);
    const [coin, journal] = addCoin.mock.calls[0];
    expect(coin.id).toBe("bitcoin");
    expect(journal).toBeTruthy();
    expect(journal.thesis).toBe("Real revenue + active devs");
    expect(journal.changeMyMind).toBe("Revenue dries up");
    expect(journal.status).toBe("intact");
    expect(journal.priceAtAdd).toBe(50000);
  });

  it("Save with empty fields shows an error and does NOT add the coin (§J3)", () => {
    const addCoin = vi.fn();
    provide({ addCoin });
    fireEvent.click(screen.getByText("+ Add"));
    fireEvent.click(screen.getByText("Save to Journal & add coin"));
    expect(addCoin).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/haven.t written/i);
  });

  it("captures the manual funnel findings (#27) when both questions are filled", () => {
    const addCoin = vi.fn();
    provide({ addCoin });
    fireEvent.click(screen.getByText("+ Add"));
    fireEvent.change(screen.getByPlaceholderText(/active GitHub/), { target: { value: "thesis" } });
    fireEvent.change(screen.getByPlaceholderText(/GitHub goes quiet/), { target: { value: "mind-change" } });
    fireEvent.change(screen.getByPlaceholderText(/supply unlocks/i), {
      target: { value: "  40% unlocks next year  " },
    });
    fireEvent.change(screen.getByPlaceholderText(/wash|organic/i), {
      target: { value: "thin order book" },
    });
    fireEvent.click(screen.getByText("Save to Journal & add coin"));
    const [, journal] = addCoin.mock.calls[0];
    expect(journal.funnel).toEqual({ dilution: "40% unlocks next year", volume: "thin order book" });
  });

  it("funnel-only without the two questions is blocked (§J3 — Skip instead)", () => {
    const addCoin = vi.fn();
    provide({ addCoin });
    fireEvent.click(screen.getByText("+ Add"));
    fireEvent.change(screen.getByPlaceholderText(/emissions/i), {
      target: { value: "real protocol fees" },
    });
    fireEvent.click(screen.getByText("Save to Journal & add coin"));
    expect(addCoin).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  // R4-4 — the LIVE + plan header pills are wired into this tab.
  it("renders the LIVE + plan header pills (R4-4)", () => {
    const setScreen = vi.fn();
    provide({ api: "live", isPro: true, setScreen });
    expect(screen.getByText(/● LIVE/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("PRO"));
    expect(setScreen).toHaveBeenCalledWith("account");
  });
});
