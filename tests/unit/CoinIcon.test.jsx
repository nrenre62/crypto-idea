import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AppContext } from "../../src/hooks/app-context.js";
import { CoinIcon } from "../../src/components/CoinIcon.jsx";

// R25-1: the shared interactive coin icon — every browse/list icon opens Coin info,
// with the accent hover ring + press state (.coin-ic) and keyboard access.

const BTC = { id: "bitcoin", symbol: "BTC", name: "Bitcoin", thumb: "" };

function provide(ui, ctx = {}) {
  return render(
    <AppContext.Provider value={{ openCoinInfo: vi.fn(), ...ctx }}>{ui}</AppContext.Provider>
  );
}

describe("CoinIcon (R25-1)", () => {
  it("renders the .coin-ic wrapper as an accessible button with a title", () => {
    const { container } = provide(<CoinIcon coin={BTC} size={36} />);
    const ic = container.querySelector(".coin-ic");
    expect(ic).toBeTruthy();
    expect(ic.getAttribute("role")).toBe("button");
    expect(ic.getAttribute("tabindex")).toBe("0");
    expect(ic.getAttribute("title")).toMatch(/Bitcoin info/);
  });

  it("click opens Coin info AND stops propagation (the parent row's action must not fire)", () => {
    const openCoinInfo = vi.fn();
    const rowClick = vi.fn();
    const { container } = provide(
      <div onClick={rowClick}><CoinIcon coin={BTC} /></div>,
      { openCoinInfo }
    );
    fireEvent.click(container.querySelector(".coin-ic"));
    expect(openCoinInfo).toHaveBeenCalledWith(BTC);
    expect(rowClick).not.toHaveBeenCalled();
  });

  it("Enter and Space open Coin info (keyboard access)", () => {
    const openCoinInfo = vi.fn();
    const { container } = provide(<CoinIcon coin={BTC} />, { openCoinInfo });
    fireEvent.keyDown(container.querySelector(".coin-ic"), { key: "Enter" });
    expect(openCoinInfo).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(container.querySelector(".coin-ic"), { key: " " });
    expect(openCoinInfo).toHaveBeenCalledTimes(2);
  });
});
