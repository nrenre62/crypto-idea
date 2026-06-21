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

  it("Save persists the typed thesis with the coin", () => {
    const addCoin = vi.fn();
    provide({ addCoin });
    fireEvent.click(screen.getByText("+ Add"));
    fireEvent.change(screen.getByPlaceholderText(/active GitHub/), {
      target: { value: "Real revenue + active devs" },
    });
    fireEvent.click(screen.getByText("Save to Journal & add coin"));
    expect(addCoin).toHaveBeenCalledTimes(1);
    const [coin, journal] = addCoin.mock.calls[0];
    expect(coin.id).toBe("bitcoin");
    expect(journal).toBeTruthy();
    expect(journal.thesis).toBe("Real revenue + active devs");
    expect(journal.status).toBe("intact");
    expect(journal.priceAtAdd).toBe(50000);
  });

  it("Save with empty fields just adds the coin (no empty journal)", () => {
    const addCoin = vi.fn();
    provide({ addCoin });
    fireEvent.click(screen.getByText("+ Add"));
    fireEvent.click(screen.getByText("Save to Journal & add coin"));
    expect(addCoin).toHaveBeenCalledTimes(1);
    expect(addCoin.mock.calls[0][1] == null).toBe(true);
  });
});
