import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import OverviewView from "../../src/features/research/components/OverviewView.jsx";

// Mock the heavy child components so only OverviewView's OWN markup renders (the
// diversification note is rendered by OverviewView itself, not by these children).
vi.mock("../../src/features/research/components/Pulse.jsx", () => ({ default: () => null }));
vi.mock("../../src/features/research/components/AllocationBar.jsx", () => ({ default: () => null }));
vi.mock("../../src/features/research/components/RiskMeter.jsx", () => ({ default: () => null }));
vi.mock("../../src/features/research/components/StressTest.jsx", () => ({ default: () => null }));

// R7-5: the "A note on diversification" icon slot (.dic) was an EMPTY <div> — a blank
// box in both themes (which is why R2-8 + DP-7 missed it: they fixed colour, not the
// missing glyph). This guards against it regressing back to empty.
const pulse = { text: "", offline: false, loading: false, regenerate: vi.fn() };
const base = { empty: true, portfolio: {}, pulse, tf: "24h", onTf: vi.fn(), status: "ok", asOf: null, onShare: vi.fn() };

describe("OverviewView — diversification icon (R7-5)", () => {
  it("renders a non-empty glyph in the .dic icon slot", () => {
    const { container } = render(<OverviewView {...base} />);
    const dic = container.querySelector(".diversify .dic");
    expect(dic).toBeTruthy();
    expect(dic.textContent.trim().length).toBeGreaterThan(0);
  });
});

describe("OverviewView — diversification note (DARK-FIX-NaN)", () => {
  it("CRYP-92 (DARK-FIX-NaN): diversification note shows the real top-two % and never renders NaN", () => {
    const portfolio = {
      total: 1000,
      perf: { "24h": 1.2, "7d": 0, "30d": 0 },
      holdings: [
        { name: "BTC", alloc: 40, c24: 1.2 },
        { name: "ETH", alloc: 25, c24: -0.5 },
      ],
      // deriveRisk() returns exactly these fields — note there is NO `top2` here,
      // which is why the current `Math.round(portfolio.risk.top2)` yields NaN.
      risk: { level: "Moderate", score: 0.5, breakdown: { top: 0, mid: 0, small: 0 }, megaAlloc: 0 },
    };
    const { container } = render(
      <OverviewView portfolio={portfolio} empty={false} pulse={pulse} tf="24h" onTf={vi.fn()} onShare={vi.fn()} />
    );
    const note = container.querySelector(".diversify p")?.textContent;
    // RED assertion: today the note reads "…about NaN%…" on every non-empty session.
    expect(note).not.toMatch(/NaN/);
    // Guard against a regression that just prints "—": it must read the REAL 40+25 alloc.
    expect(note).toMatch(/about 65%/);
  });
});
