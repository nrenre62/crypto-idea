import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import OverviewView from "../../src/features/research/components/OverviewView.jsx";

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
