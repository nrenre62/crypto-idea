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

// Per-coin P/L at a given current unit price. P/L = (current value of holdings +
// proceeds already realised from sells) − total buy cost.
export function coinPnl(entries, price) {
  const holding = holdings(entries);
  const cost = buysCost(entries);
  const sold = sellsGain(entries);
  const value = holding * (price || 0);
  const pnl = (value + sold) - cost;
  const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
  return { holding, value, buysCost: cost, sellsGain: sold, pnl, pnlPct };
}

// Portfolio-wide P/L. `coins` each have `.id` and `.entries`; `prices` maps a
// coin id to `{ usd }`. `invested` is net cash in (buys − sells realised).
export function portfolioPnl(coins, prices) {
  let value = 0, totalBuys = 0, totalSells = 0;
  for (const c of coins || []) {
    const price = (prices && prices[c.id] && prices[c.id].usd) || 0;
    value += holdings(c.entries) * price;
    totalBuys += buysCost(c.entries);
    totalSells += sellsGain(c.entries);
  }
  const pnl = (value + totalSells) - totalBuys;
  const pnlPct = totalBuys > 0 ? (pnl / totalBuys) * 100 : 0;
  return { value, totalBuys, totalSells, invested: totalBuys - totalSells, pnl, pnlPct };
}
