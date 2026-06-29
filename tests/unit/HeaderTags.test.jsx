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
});
