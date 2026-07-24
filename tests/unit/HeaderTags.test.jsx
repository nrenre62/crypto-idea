import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AppContext } from "../../src/hooks/app-context.js";
import { HeaderTags } from "../../src/components/HeaderTags.jsx";

// R4-4 — the shared LIVE + plan header pills (Journal / Learn / Search use this;
// Portfolio + Research mirror its markup).
function provide(value) {
  return render(
    <AppContext.Provider value={{ api: "mock", isPro: false, isPremium: false, setScreen: vi.fn(), ...value }}>
      <HeaderTags />
    </AppContext.Provider>
  );
}

describe("HeaderTags (R4-4)", () => {
  it("shows ● LIVE only when prices are live", () => {
    const { unmount } = provide({ api: "live" });
    expect(screen.getByText(/● LIVE/)).toBeInTheDocument();
    unmount();
    provide({ api: "mock" });
    expect(screen.queryByText(/● LIVE/)).toBeNull();
  });

  it("labels the plan pill by tier", () => {
    const { unmount: u1 } = provide({ isPremium: false, isPro: false });
    expect(screen.getByText("STARTER")).toBeInTheDocument();
    u1();
    const { unmount: u2 } = provide({ isPro: true });
    expect(screen.getByText("PRO")).toBeInTheDocument();
    u2();
    provide({ isPremium: true, isPro: true });
    expect(screen.getByText("PREMIUM")).toBeInTheDocument();
  });

  it("the plan pill routes to Account on click", () => {
    const setScreen = vi.fn();
    provide({ setScreen });
    fireEvent.click(screen.getByText("STARTER"));
    expect(setScreen).toHaveBeenCalledWith("account");
  });

  /* ADMIN-2 — the marketData kill-switch. Prices keep being SERVED from cache while
     the switch is off, so without this the header would keep flashing "● LIVE" over
     values that stopped updating. A stale number presented as live is worse than an
     obviously stale one. */
  describe("ADMIN-2: paused market data", () => {
    const paused = { features: { marketData: false, checkout: true, aiResearch: true } };

    it("shows ● PAUSED instead of ● LIVE when an admin switched market data off", () => {
      provide({ api: "live", site: paused });
      expect(screen.getByText(/● PAUSED/)).toBeInTheDocument();
      expect(screen.queryByText(/● LIVE/)).toBeNull();
    });

    it("shows ● PAUSED even when prices were never live — the switch is the fact", () => {
      // Otherwise the pill would vanish entirely and the user would just see prices
      // silently frozen, with nothing on screen accounting for it.
      provide({ api: "mock", site: paused });
      expect(screen.getByText(/● PAUSED/)).toBeInTheDocument();
    });

    it("explains itself on hover rather than leaving a bare word", () => {
      provide({ api: "live", site: paused });
      expect(screen.getByText(/● PAUSED/).getAttribute("title")).toMatch(/last known values/i);
    });

    it("stays ● LIVE for every not-switched-off shape, incl. a failed config fetch", () => {
      // The config fetch can fail or predate the feature; neither means "paused".
      for (const site of [undefined, {}, { features: {} }, { features: { marketData: true } }]) {
        const { unmount } = provide({ api: "live", site });
        expect(screen.getByText(/● LIVE/), JSON.stringify(site)).toBeInTheDocument();
        expect(screen.queryByText(/● PAUSED/)).toBeNull();
        unmount();
      }
    });
  });
});
