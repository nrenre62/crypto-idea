import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Logo } from "../../src/components/ui.jsx";
import { AppContext } from "../../src/hooks/app-context.js";
import { ForgotPass } from "../../src/components/ForgotPass.jsx";

// LOGO (BUILD-LOOP item 4): the shared <Logo> brand lockup — a CSS-drawn green "C"
// tile + the one-word "CryptoIdea" wordmark — replacing the old serif "Crypto Idea"
// text on the app header and the auth screens. Design-only; these lock the structure
// + the single accessible name so getByText / getByLabelText stay clean.
describe("LOGO — shared <Logo> brand mark", () => {
  it("renders the green 'C' tile (decorative) + the 'CryptoIdea' wordmark", () => {
    const { container } = render(<div className="ci-app"><Logo /></div>);
    const logo = container.querySelector(".ci-logo");
    expect(logo).toBeTruthy();
    const mark = logo.querySelector(".ci-logo-mark");
    expect(mark.textContent).toBe("C");
    expect(mark.getAttribute("aria-hidden")).toBe("true"); // tile is decorative
    expect(logo.querySelector(".ci-logo-word").textContent).toBe("CryptoIdea");
  });

  it("exposes ONE accessible name 'CryptoIdea' (getByText + getByLabelText both resolve)", () => {
    render(<div className="ci-app"><Logo /></div>);
    expect(screen.getByText("CryptoIdea")).toBeInTheDocument();
    expect(screen.getByLabelText("CryptoIdea")).toBeInTheDocument();
  });

  // LOGO-2: re-lock the confirmed structure spec in ONE place. DOM / text / class
  // ONLY — geometry (28px / r8 / 16) and font-family (Hanken) come from app.css,
  // which jsdom does NOT apply to getComputedStyle, so asserting them here is false
  // confidence. Those stay a real-browser check, never a unit assertion.
  it("LOGO-2 spec: role='img' + aria-label, decorative 'C' tile, one-word 'CryptoIdea', size='lg' → .lg", () => {
    const { container, rerender } = render(<div className="ci-app"><Logo /></div>);
    const logo = container.querySelector(".ci-logo");
    expect(logo.getAttribute("role")).toBe("img");
    expect(logo.getAttribute("aria-label")).toBe("CryptoIdea");
    const mark = logo.querySelector(".ci-logo-mark");
    expect(mark.textContent).toBe("C");
    expect(mark.getAttribute("aria-hidden")).toBe("true"); // tile is decorative
    const word = logo.querySelector(".ci-logo-word");
    expect(word.textContent).toBe("CryptoIdea");
    expect(word.textContent).not.toContain("Crypto Idea"); // one word, not two
    // exactly ONE accessible name (the decorative tile must not add a second)
    expect(screen.getAllByLabelText("CryptoIdea")).toHaveLength(1);
    expect(container.querySelector(".ci-logo.lg")).toBeNull();
    rerender(<div className="ci-app"><Logo size="lg" /></div>);
    expect(container.querySelector(".ci-logo.lg")).toBeTruthy();
  });

  it("default is header size; size='lg' adds the .lg modifier for the auth screens", () => {
    const { container, rerender } = render(<div className="ci-app"><Logo /></div>);
    expect(container.querySelector(".ci-logo")).toBeTruthy();
    expect(container.querySelector(".ci-logo.lg")).toBeNull();
    rerender(<div className="ci-app"><Logo size="lg" /></div>);
    expect(container.querySelector(".ci-logo.lg")).toBeTruthy();
  });

  it("Forgot-password screen shows the large logo (and drops the old .auth-logo text)", () => {
    const ctx = {
      fpEmail: "", setFpEmail: vi.fn(), fpErr: "", resetSent: false,
      setResetSent: vi.fn(), setScreen: vi.fn(), handleReset: vi.fn(),
    };
    const { container } = render(
      <AppContext.Provider value={ctx}><ForgotPass /></AppContext.Provider>
    );
    expect(container.querySelector(".ci-logo.lg")).toBeTruthy();
    expect(screen.getByText("CryptoIdea")).toBeInTheDocument();
    expect(container.querySelector(".auth-logo")).toBeNull();
    expect(screen.getByText("Reset your password")).toBeInTheDocument();
  });
});
