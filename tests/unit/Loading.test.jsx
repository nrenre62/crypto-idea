import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Loading } from "../../src/components/Loading.jsx";

// LOGO-2: the full-screen startup loader is unified onto the shared brand mark —
// the <Logo> lockup (a `.ci-logo` node: green "C" tile + one-word "CryptoIdea")
// plus the ellipsis "Loading…" subtext. It currently renders the OLD thin
// two-word "Crypto <span>Idea</span>" wordmark and "Loading your data...".
// Structure/text ONLY — geometry + font-family come from app.css, which jsdom
// does NOT apply to getComputedStyle (asserting them here is false confidence).
describe("Loading — unified brand loader (LOGO-2)", () => {
  it("renders the shared <Logo> brand mark (.ci-logo), not the old two-word wordmark", () => {
    const { container } = render(<Loading />);
    expect(container.querySelector(".ci-logo")).toBeTruthy();
    // the old split "Crypto <span>Idea</span>" lockup must be gone
    expect(container.textContent).not.toContain("Crypto Idea");
  });

  it("subtext is exactly 'Loading…' (ellipsis char, not the three-dot 'Loading your data...')", () => {
    const { container } = render(<Loading />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    // the legacy copy + any three-ASCII-dot form must be gone
    expect(screen.queryByText("Loading your data...")).toBeNull();
    expect(container.textContent).not.toContain("...");
  });
});
