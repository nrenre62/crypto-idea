// Builds a human-readable CSV (spreadsheet) from the exportMyData() payload.
// One file, two clearly-labelled sections:
//   HOLDINGS      — one row per coin: amount held, what you paid (avg cost, invested,
//                   sold), and a grand TOTAL row. Sorted by portfolio, then biggest
//                   position first.
//   TRANSACTIONS  — one row per transaction, listed newest-first (matches the app view).
// Pure + unit-tested. (Current market value isn't included — the export holds your own
// data only, no live prices.)
import { txCreatedMillis } from "./tx.js";

// CSV-escape one field: wrap in quotes if it contains a comma, quote, or newline.
function esc(v) {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
const row = (cells) => cells.map(esc).join(",");

// Round to `dp` decimals and drop float noise / trailing zeros (0.3, not 0.30000000004).
const num = (n, dp) => {
  const f = Math.pow(10, dp);
  return String(Math.round((Number(n) || 0) * f) / f);
};

// Reduce a coin's transactions to a holdings summary (cost basis — no live price).
function summarize(txs) {
  let boughtQty = 0, soldQty = 0, invested = 0, sold = 0;
  for (const t of txs || []) {
    const amt = Number(t.amount) || 0;
    const val = amt * (Number(t.priceAtBuy) || 0);
    if (t.type === "sell") { soldQty += amt; sold += val; }
    else { boughtQty += amt; invested += val; }
  }
  return {
    held: boughtQty - soldQty,
    avgBuy: boughtQty > 0 ? invested / boughtQty : 0,
    invested, sold,
    count: (txs || []).length,
  };
}

export function buildPortfolioCsv(data) {
  const portfolios = (data && data.portfolios) || [];
  const out = [];

  out.push(row(["Crypto Idea — portfolio export"]));
  if (data && data.exportedAt) out.push(row(["Exported", data.exportedAt]));
  if (data && data.account && data.account.email) out.push(row(["Account", data.account.email]));
  out.push("");

  // Flatten to coin-level rows once, reused by both sections.
  const coinRows = [];
  for (const p of portfolios) {
    for (const co of p.coins || []) {
      coinRows.push({ portfolio: p.name || p.id, coin: co, sum: summarize(co.transactions) });
    }
  }

  // ── HOLDINGS: sorted by portfolio, then largest position (by invested) first ──
  out.push(row(["HOLDINGS"]));
  out.push(row(["Portfolio", "Coin", "Symbol", "Amount held", "Avg buy price (USD)",
    "Total invested (USD)", "Total sold (USD)", "Transactions"]));
  const holdings = coinRows.slice().sort((a, b) =>
    a.portfolio.localeCompare(b.portfolio) || b.sum.invested - a.sum.invested);
  let totInvested = 0, totSold = 0;
  for (const r of holdings) {
    totInvested += r.sum.invested;
    totSold += r.sum.sold;
    out.push(row([
      r.portfolio, r.coin.name || "", (r.coin.symbol || "").toUpperCase(),
      num(r.sum.held, 8), num(r.sum.avgBuy, 8),
      num(r.sum.invested, 2), num(r.sum.sold, 2), r.sum.count,
    ]));
  }
  out.push(row(["TOTAL", "", "", "", "", num(totInvested, 2), num(totSold, 2), ""]));
  out.push("");

  // ── TRANSACTIONS: every transaction, NEWEST first (R19-5 — matches the coin list) ──
  out.push(row(["TRANSACTIONS"]));
  out.push(row(["Portfolio", "Coin", "Symbol", "Type", "Amount", "Price (USD)", "Value (USD)", "Date"]));
  const txRows = [];
  for (const p of portfolios) {
    for (const co of p.coins || []) {
      for (const t of co.transactions || []) {
        txRows.push({ portfolio: p.name || p.id, coin: co, t });
      }
    }
  }
  txRows.sort((a, b) =>
    String(b.t.date || "").localeCompare(String(a.t.date || "")) ||   // date desc
    (txCreatedMillis(b.t) - txCreatedMillis(a.t)) ||                   // same-minute tie-break
    a.portfolio.localeCompare(b.portfolio));
  for (const { portfolio, coin, t } of txRows) {
    const amt = Number(t.amount) || 0;
    const price = Number(t.priceAtBuy) || 0;
    out.push(row([
      portfolio, coin.name || "", (coin.symbol || "").toUpperCase(),
      t.type || "buy", num(amt, 8), num(price, 8), num(amt * price, 2), t.date || "",
    ]));
  }

  return out.join("\r\n");
}
