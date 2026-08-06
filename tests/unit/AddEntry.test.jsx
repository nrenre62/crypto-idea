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
function Harness({ amt = "", price = "", editEntry = null, addEntry = vi.fn(), setScreen = vi.fn(), addingTx = false }) {
  const [eAmt, setEAmt] = useState(amt);
  const [ePrice, setEPrice] = useState(price);
  const [eDate, setEDate] = useState("2024-01-01T00:00");
  const [eTxType, setETxType] = useState("buy");
  return (
    <AppContext.Provider value={{
      sel: { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
      eAmt, setEAmt, ePrice, setEPrice, eDate, setEDate,
      eTxType, setETxType, editEntry, setEditEntry: vi.fn(), addEntry, setScreen, addingTx,
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

  // R10-2a: only positive numbers — a "-" is stripped from Amount and Price on input,
  // so a negative can't be typed/pasted (the screenshot's "-1" can no longer happen).
  it("strips a minus sign from Amount and Price (R10-2)", () => {
    const { container } = render(<Harness />);
    const inputs = container.querySelectorAll(".field-input");
    const amount = inputs[0], price = inputs[1];
    fireEvent.change(amount, { target: { value: "-1" } });
    expect(amount.value).toBe("1");
    fireEvent.change(price, { target: { value: "-25.5" } });
    expect(price.value).toBe("25.5");
  });

  // TX-SAFE (Part A): pasting a formatted/garbage number is sanitized into the field.
  // (Paste is the case sanitizeDecimal uniquely handles — a number input already strips
  // invalid TYPED chars to ""; the garbage-string detail is covered by format.test.js.)
  it("TX-SAFE: pasting a formatted/garbage number is sanitized into Amount and Price", () => {
    const { container } = render(<Harness />);
    const inputs = container.querySelectorAll(".field-input");
    const amount = inputs[0], price = inputs[1];
    fireEvent.paste(amount, { clipboardData: { getData: () => "$12.3.4e5+" } });
    expect(amount.value).toBe("12.345");        // $ , e, + and the 2nd dot stripped; one dot kept
    fireEvent.paste(price, { clipboardData: { getData: () => "1,234.56" } });
    expect(price.value).toBe("1234.56");
  });
  it("TX-SAFE: onChange caps Amount at 15 digit chars", () => {
    const { container } = render(<Harness />);
    const amount = container.querySelectorAll(".field-input")[0];
    fireEvent.change(amount, { target: { value: "1234567890123456789" } }); // 19 digits
    expect(amount.value).toBe("123456789012345"); // 15
  });
  it("TX-SAFE: onKeyDown blocks e/E/+/- and a 2nd dot, but allows digits and the 1st dot", () => {
    // "1.2" is a valid number the input preserves; the dot logic is also unit-tested purely.
    const { container } = render(<Harness amt="1.2" />);
    const amount = container.querySelectorAll(".field-input")[0];
    // fireEvent.keyDown returns false when the handler called preventDefault()
    expect(fireEvent.keyDown(amount, { key: "e" })).toBe(false);
    expect(fireEvent.keyDown(amount, { key: "+" })).toBe(false);
    expect(fireEvent.keyDown(amount, { key: "." })).toBe(false); // "1.2" already has a dot
    expect(fireEvent.keyDown(amount, { key: "5" })).toBe(true);  // a digit is allowed
    // a FIRST dot is allowed when none is present yet
    const { container: c2 } = render(<Harness amt="12" />);
    expect(fireEvent.keyDown(c2.querySelectorAll(".field-input")[0], { key: "." })).toBe(true);
  });

  // TX-SAFE (Part B): the submit button is disabled + shows a busy label while a write
  // is in flight, so a double-click can't fire two writes (two duplicate docs).
  it("TX-SAFE: the submit button is disabled + busy while a transaction write is in flight", () => {
    render(<Harness amt="0.5" price="40000" addingTx={true} />);
    const btn = screen.getByText(/Saving/i);
    expect(btn).toBeInTheDocument();
    expect(btn).toBeDisabled();
    expect(screen.queryByText("Add Buy")).toBeNull(); // action label replaced by the busy label
  });

  // R4-2: AddEntry is always reached from Detail, so back returns there.
  it("back returns to the Detail screen", () => {
    const setScreen = vi.fn();
    const { container } = render(<Harness setScreen={setScreen} />);
    fireEvent.click(container.querySelector(".detail-head .icon-btn"));
    expect(setScreen).toHaveBeenCalledWith("detail");
  });

  it("shows Total cost as a labelled display row (R2-5)", () => {
    const { container } = render(<Harness amt="0.5" price="40000" />);
    const total = container.querySelector(".tx-total");
    expect(total).toBeTruthy();
    expect(total.querySelector(".tx-total-label").textContent).toMatch(/Total cost/i);
    expect(total.querySelector(".tx-total-amt").textContent).toMatch(/\$20,000\.00/);
  });

  // R4-5: AUTO is an always-visible, clickable button that applies the market price.
  it("shows the AUTO button (inactive + suggestion hint) when the price is off-market", () => {
    render(<Harness price="1" />);   // $1 is far from BTC's market price for the date
    const auto = screen.getByRole("button", { name: "AUTO" });
    expect(auto).toBeInTheDocument();
    expect(auto.className).not.toContain("on");
    expect(screen.getByText(/tap AUTO to use/i)).toBeInTheDocument();
  });

  it("clicking AUTO applies the market price and marks the button active", () => {
    render(<Harness price="1" />);
    fireEvent.click(screen.getByRole("button", { name: "AUTO" }));
    // price now matches the market price → AUTO renders active, no more "tap to use" hint
    expect(screen.getByRole("button", { name: "AUTO" }).className).toContain("on");
    expect(screen.queryByText(/tap AUTO to use/i)).toBeNull();
  });

  // ── A5: a lone "." is what sanitizeDecimal yields mid-typing — it is NOT a number,
  //       so no "$NaN" preview may render and the submit must stay disabled
  //       (today "." is truthy → $NaN previews AND the Add button is enabled). ──
  it("A5: an amount of '.' shows no $NaN preview and keeps the submit button disabled", () => {
    const { container } = render(<Harness amt="." price="40000" />);
    expect(container.textContent).not.toContain("$NaN");
    expect(screen.getByText("Add Buy")).toBeDisabled();
  });

  // ── A5: a zero amount is not a valid transaction — submit stays disabled
  //       (today "0" is truthy → the Add button is enabled). ──
  it("A5: an amount of '0' with a valid price keeps the submit button disabled", () => {
    render(<Harness amt="0" price="40000" />);
    expect(screen.getByText("Add Buy")).toBeDisabled();
  });
});
