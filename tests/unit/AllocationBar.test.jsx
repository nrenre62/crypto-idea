import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import AllocationBar from "../../src/features/research/components/AllocationBar.jsx";
import { coinColor } from "../../src/components/ui.jsx";

// R2-7: each allocation segment + legend dot uses the coin's ORIGINAL brand colour
// (coinColor), so no two coins repeat — the old PALETTE fallback gave SOL and BNB the
// same green.
// jsdom normalises an inline hex background to rgb(...), so compare in rgb form.
const hexToRgb = (h) => {
  const n = h.replace("#", "");
  return `rgb(${parseInt(n.slice(0, 2), 16)}, ${parseInt(n.slice(2, 4), 16)}, ${parseInt(n.slice(4, 6), 16)})`;
};
const norm = (s) => (s || "").trim().toLowerCase();
const brand = (sym) => norm(hexToRgb(coinColor(sym)));

describe("AllocationBar (R2-7 brand colours)", () => {
  it("colours SOL/BNB/XRP with their distinct brand colours (no repeats)", () => {
    const holdings = [
      { sym: "SOL", alloc: 34 },
      { sym: "BNB", alloc: 33 },
      { sym: "XRP", alloc: 33 },
    ];
    const { container } = render(<AllocationBar holdings={holdings} />);
    const segs = [...container.querySelectorAll(".alloc-seg")].map((s) => norm(s.style.background));
    expect(segs).toHaveLength(3);
    // distinct from each other
    expect(new Set(segs).size).toBe(3);
    // and they are the brand colours, not an index palette
    expect(segs[0]).toBe(brand("SOL"));
    expect(segs[1]).toBe(brand("BNB"));
  });

  it("legend swatch colour matches its segment colour", () => {
    const { container } = render(<AllocationBar holdings={[{ sym: "SOL", alloc: 100 }]} />);
    const seg = norm(container.querySelector(".alloc-seg").style.background);
    const sw = norm(container.querySelector(".alloc-legend .sw").style.background);
    expect(seg).toBe(sw);
    expect(seg).toBe(brand("SOL"));
  });
});
