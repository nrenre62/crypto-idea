import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import CoinCard from "../../src/features/research/components/CoinCard.jsx";
import { mockConviction } from "../../src/features/research/data/mock-conviction.js";

// A8 — CoinCard renders the conviction rubric pills from the (mock) reducer output.
function holding(over) {
  return {
    id: "bitcoin", sym: "BTC", name: "Bitcoin", amount: 0.5, value: 20000, alloc: 50,
    c24: 1.2, c7d: 3, spark: [1, 2, 3, 4], price: 42000, avgCost: 40000, ...over,
  };
}

describe("CoinCard — conviction pills (A8)", () => {
  it("renders all four conviction axes + the #26 bridge note", () => {
    render(<CoinCard holding={holding()} index={0} onAsk={vi.fn()} />);
    for (const label of ["Dev", "Founders", "Team", "Community"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText(/you apply 3–5/)).toBeInTheDocument();
  });

  it("a major coin shows four healthy pills + an upcoming catalyst", () => {
    render(<CoinCard holding={holding()} index={0} onAsk={vi.fn()} />);
    expect(document.querySelectorAll(".csig-healthy").length).toBe(4);
    expect(screen.getByText(/Protocol upgrade/)).toBeInTheDocument();
  });

  // R4-1 — every coin card renders the SAME four position-stat boxes with the same
  // labels (BTC == ETH == any coin). The founder's "inconsistency" was a CSS label-wrap,
  // not markup divergence; this guards the markup from drifting so the CSS fix holds.
  it("renders exactly four position-stat boxes with consistent labels on every card", () => {
    render(<CoinCard holding={holding()} index={0} onAsk={vi.fn()} />);
    const stats = document.querySelectorAll(".pos-stat");
    expect(stats.length).toBe(4);
    const labels = [...document.querySelectorAll(".pos-stat .ps-l")].map((n) => n.textContent);
    expect(labels).toEqual(["Avg cost", "Now", "P / L", "30d"]);
  });

  it("an insufficient-data axis shows its reason chip, never a silent blank (#9)", () => {
    // Pick a coin id whose mock evidence yields at least one ⬛ axis (deterministic).
    const ids = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel"];
    const thin = ids.find((id) => mockConviction({ id }).axes.some((a) => a.state === "insufficient"));
    expect(thin, "expected a mock profile with a ⬛ axis").toBeTruthy();
    const reason = mockConviction({ id: thin }).axes.find((a) => a.state === "insufficient").reason;

    render(<CoinCard holding={holding({ id: thin, name: thin })} index={1} onAsk={vi.fn()} />);
    expect(document.querySelector(".csig-insufficient")).toBeTruthy();
    // the reason chip renders (a ⬛ axis is a finding, not a blank); the same reason
    // can legitimately appear on more than one axis (e.g. "no coverage").
    expect(screen.getAllByText(new RegExp(reason)).length).toBeGreaterThan(0);
  });
});
