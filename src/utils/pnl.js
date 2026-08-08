// Pure profit/loss math over portfolio data — no React, no formatting, no I/O.
// A coin's `entries` are transactions: { type: "buy" | "sell", amount, priceAtBuy }.
// Extracted from CryptoIdea.jsx / Detail.jsx so the math is reusable and testable.

// Net units currently held (sells reduce the balance; never negative).
export function holdings(entries) {
  return Math.max(0, (entries || []).reduce((s, e) => e.type === "sell" ? s - e.amount : s + e.amount, 0));
}

// Total spent acquiring the coin (sum of buy amount × price).
export function buysCost(entries) {
  return (entries || []).filter(e => e.type !== "sell").reduce((s, e) => s + e.amount * e.priceAtBuy, 0);
}

// Total received from selling the coin (sum of sell amount × price).
export function sellsGain(entries) {
  return (entries || []).filter(e => e.type === "sell").reduce((s, e) => s + e.amount * e.priceAtBuy, 0);
}

// CRYP-94 (finding 7): realised sell proceeds counted toward P/L, clamped so an OVER-SOLD
// coin can't book a phantom gain. holdings() clamps units to Math.max(0,…), but the raw
// sellsGain() is unbounded — so selling more than you ever held (reachable by editing a buy
// down, a backdated insert, or a cross-device race) counted proceeds on units never owned.
// When sold > bought we scale the proceeds to the real position (bought/sold); a normal book
// (sold <= bought) is returned unchanged. The RAW sellsGain() is still shown in the "Sold"
// display — this only governs the P/L arithmetic.
export function realizedProceeds(entries) {
  const arr = entries || [];
  let bought = 0, sold = 0, gain = 0;
  for (const e of arr) {
    if (e.type === "sell") { sold += e.amount; gain += e.amount * e.priceAtBuy; }
    else bought += e.amount;
  }
  return (sold > bought && sold > 0) ? gain * (bought / sold) : gain;
}

// Per-coin P/L at a given current unit price. P/L = (current value of holdings +
// proceeds already realised from sells) − total buy cost. Uses the clamped realizedProceeds
// (finding 7) so an over-sold coin can't book a phantom gain; the RAW sellsGain is still
// returned for the "Sold" display line.
// CRYP-94 (finding 8): a held coin with an UNKNOWN price (price == null — not yet fetched,
// distinct from a genuine 0) can't be valued, so value + total P/L are UNKNOWN (null), rendered
// as a muted "—" — never a $0 / −100% loss. A genuine 0 is worthless (known). A fully-sold
// position (holding 0) needs no price, so its realised P/L stays known even without one.
export function coinPnl(entries, price) {
  const holding = holdings(entries);
  const cost = buysCost(entries);
  const sold = sellsGain(entries);
  const realised = realizedProceeds(entries);
  const priceKnown = price != null && Number.isFinite(Number(price));
  const valueUnknown = holding > 0 && !priceKnown;
  const value = valueUnknown ? null : holding * (priceKnown ? Number(price) : 0);
  const pnl = valueUnknown ? null : (value + realised) - cost;
  const pnlPct = pnl == null ? null : (cost > 0 ? (pnl / cost) * 100 : 0);
  return { holding, value, buysCost: cost, sellsGain: sold, pnl, pnlPct, priceKnown };
}

// Portfolio-wide P/L. `coins` each have `.id` and `.entries`; `prices` maps a
// coin id to `{ usd }`. `invested` is net cash in (buys − sells realised).
export function portfolioPnl(coins, prices) {
  // CRYP-94 (finding 8): an unpriced HELD coin is excluded from `value` and from the P/L
  // aggregation (pnlValue/pnlBuys) so it can't drag the total to −100% — but its buy cost
  // still counts in totalBuys/Invested, a price-independent cash figure. A held coin needs a
  // known price (a genuine 0 counts as known/worthless); a fully-sold coin needs none.
  let value = 0, totalBuys = 0, totalSells = 0;
  let pnlValue = 0, pnlBuys = 0, pnlRealised = 0;
  for (const c of coins || []) {
    const raw = prices && prices[c.id] ? prices[c.id].usd : undefined;
    const priceKnown = raw != null && Number.isFinite(Number(raw));
    const price = priceKnown ? Number(raw) : 0;
    const hold = holdings(c.entries);
    const cost = buysCost(c.entries);
    totalBuys += cost;                          // Invested is price-independent — always counts
    totalSells += sellsGain(c.entries);
    if (hold > 0 && !priceKnown) continue;      // unpriced holding → excluded from value & P/L
    value += hold * price;
    pnlValue += hold * price;
    pnlBuys += cost;
    pnlRealised += realizedProceeds(c.entries); // clamped per coin (finding 7)
  }
  const pnl = (pnlValue + pnlRealised) - pnlBuys;
  const pnlPct = pnlBuys > 0 ? (pnl / pnlBuys) * 100 : 0;
  return { value, totalBuys, totalSells, invested: totalBuys - totalSells, pnl, pnlPct };
}

// Portfolio-level 24h % — the value-weighted average of each holding's 24h change
// (weight = the holding's share of current value). A missing price or 24h change
// counts as 0; returns 0 (never NaN) for an empty book or zero total value.
export function portfolio24hPct(coins, prices) {
  let totalVal = 0, weighted = 0;
  for (const c of coins || []) {
    const p = prices && prices[c.id];
    const price = (p && p.usd) || 0;
    const val = holdings(c.entries) * price;
    const ch = p && p.usd_24h_change != null ? Number(p.usd_24h_change) : 0;
    totalVal += val;
    weighted += val * ch;
  }
  return totalVal > 0 ? weighted / totalVal : 0;
}
