import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { AppContext } from "../../src/hooks/app-context.js";
import { Contact } from "../../src/components/Contact.jsx";

// Contact is reachable in the app only for Pro users near their limit, so we test
// it in isolation against the real AppContext provider — the same value shape
// CryptoIdea.jsx supplies. Guards the screen extraction (KISS over a hard-to-reach
// navigation path).
function Harness({ setScreen = vi.fn() }) {
  const [contactMsg, setContactMsg] = useState("");
  const [contactSent, setContactSent] = useState(false);
  return (
    <AppContext.Provider value={{
      contactMsg, setContactMsg, contactSent, setContactSent, setScreen,
      user: { email: "pro@test.com" },
    }}>
      <Contact />
    </AppContext.Provider>
  );
}

describe("Contact screen (extracted, via AppContext)", () => {
  it("renders the inquiry form with the signed-in account email", () => {
    render(<Harness />);
    expect(screen.getByText("Need higher limits?")).toBeInTheDocument();
    expect(screen.getByText(/pro@test.com/)).toBeInTheDocument();
  });

  it("submitting a non-empty message shows the sent confirmation", () => {
    render(<Harness />);
    fireEvent.change(screen.getByPlaceholderText(/I need more portfolios/i), {
      target: { value: "Need 20 portfolios" },
    });
    fireEvent.click(screen.getByText("Send Request"));
    expect(screen.getByText("Message sent")).toBeInTheDocument();
  });

  it("ignores an empty/whitespace message (stays on the form)", () => {
    render(<Harness />);
    fireEvent.change(screen.getByPlaceholderText(/I need more portfolios/i), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByText("Send Request"));
    expect(screen.queryByText("Message sent")).not.toBeInTheDocument();
    expect(screen.getByText("Need higher limits?")).toBeInTheDocument();
  });

  it("'Back to Portfolio' from the sent screen calls setScreen('portfolio')", () => {
    const setScreen = vi.fn();
    render(<Harness setScreen={setScreen} />);
    fireEvent.change(screen.getByPlaceholderText(/I need more portfolios/i), {
      target: { value: "Need more" },
    });
    fireEvent.click(screen.getByText("Send Request"));
    fireEvent.click(screen.getByText("Back to Portfolio"));
    expect(setScreen).toHaveBeenCalledWith("portfolio");
  });
});
