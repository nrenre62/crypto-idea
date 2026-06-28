import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { AppContext } from "../../src/hooks/app-context.js";

// AddEntry now fetches real coin history (useCoinHistory -> fetchHistory). Stub it
// so the form falls back to the built-in estimate and tests hit no network.
vi.mock("../../src/api/coingecko.js", () => ({ fetchHistory: vi.fn().mockResolvedValue(null) }));
import { AddEntry } from "../../src/components/AddEntry.jsx";

// AddEntry is reached via Detail -> +Buy/+Sell (needs a held coin), so we test it
// in isolation against the real AppContext — same value shape CryptoIdea.jsx supplies.
function Harness({ amt = "", price = "", editEntry = null, addEntry = vi.fn(), setScreen = vi.fn() }) {
  const [eAmt, setEAmt] = useState(amt);
  const [ePrice, setEPrice] = useState(price);
  const [eDate, setEDate] = useState("2024-01-01T00:00");
  const [eTxType, setETxType] = useState("buy");
  return (
    <AppContext.Provider value={{
      sel: { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
      eAmt, setEAmt, ePrice, setEPrice, eDate, setEDate,
      eTxType, setETxType, editEntry, setEditEntry: vi.fn(), addEntry, setScreen,
    }}>
      <AddEntry />
    </AppContext.Provider>
  );
}

describe("AddEntry screen (extracted, via AppContext)", () => {
  it("renders the add-transaction form with Buy/Sell toggle and amount field", () => {
    render(<Harness />);
    expect(screen.getByText("Add transaction")).toBeInTheDocument();
    expect(screen.getByText("Buy")).toBeInTheDocument();
    expect(screen.getByText("Sell")).toBeInTheDocument();
    expect(screen.getByText(/Amount \(BTC\)/)).toBeInTheDocument();
  });

  it("shows the coin name + symbol header above the Buy/Sell toggle", () => {
    const { container } = render(<Harness />);
    const head = container.querySelector(".tx-coin-head .tx-coin-name");
    expect(head).toBeTruthy();
    expect(head.textContent).toContain("Bitcoin");
    expect(head.textContent).toContain("BTC");
    // the coin head precedes the Buy/Sell segmented control in the DOM
    const seg = container.querySelector(".seg");
    expect(container.querySelector(".tx-coin-head").compareDocumentPosition(seg) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("shows the edit-mode title when editing an existing entry", () => {
    render(<Harness editEntry={{ id: "t1" }} />);
    expect(screen.getByText("Edit transaction")).toBeInTheDocument();
    expect(screen.getByText("Save Changes")).toBeInTheDocument();
  });

  it("the submit button is disabled until amount and price are set", () => {
    render(<Harness />);
    expect(screen.getByText("Add Buy")).toBeDisabled();
  });

  it("submits a buy via addEntry when amount and price are present", () => {
    const addEntry = vi.fn();
    render(<Harness amt="0.5" price="40000" addEntry={addEntry} />);
    const btn = screen.getByText("Add Buy");
    expect(btn).not.toBeDisabled();
    // total-cost preview is computed from amount * price
    expect(screen.getByText(/\$20,000\.00/)).toBeInTheDocument();
    fireEvent.click(btn);
    expect(addEntry).toHaveBeenCalled();
  });

  it("shows Total cost as a labelled display row (R2-5)", () => {
    const { container } = render(<Harness amt="0.5" price="40000" />);
    const total = container.querySelector(".tx-total");
    expect(total).toBeTruthy();
    expect(total.querySelector(".tx-total-label").textContent).toMatch(/Total cost/i);
    expect(total.querySelector(".tx-total-amt").textContent).toMatch(/\$20,000\.00/);
  });
});
