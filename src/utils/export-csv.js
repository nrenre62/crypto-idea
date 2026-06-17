// Builds a human-readable CSV (spreadsheet) from the exportMyData() payload.
// Two sections in one file: a HOLDINGS summary (net amount held per coin) and a
// full TRANSACTIONS detail list — so the user can open it in Excel/Sheets and see
// their coin list, how much they hold, and every transaction. Pure + unit-tested.

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

// Net amount currently held for a coin = total bought minus total sold.
const netHeld = (txs) =>
  (txs || []).reduce((n, t) => n + (t.type === "sell" ? -1 : 1) * (Number(t.amount) || 0), 0);

export function buildPortfolioCsv(data) {
  const portfolios = (data && data.portfolios) || [];
  const lines = [];

  lines.push(row(["Crypto Idea — data export"]));
  if (data && data.exportedAt) lines.push(row(["Exported", data.exportedAt]));
  if (data && data.account && data.account.email) lines.push(row(["Account", data.account.email]));
  lines.push("");

  // ── Holdings summary: one row per coin ──
  lines.push(row(["HOLDINGS"]));
  lines.push(row(["Portfolio", "Coin", "Symbol", "Amount held", "Transactions"]));
  for (const p of portfolios) {
    for (const co of p.coins || []) {
      lines.push(row([
        p.name || p.id, co.name || "", (co.symbol || "").toUpperCase(),
        num(netHeld(co.transactions), 8), (co.transactions || []).length,
      ]));
    }
  }
  lines.push("");

  // ── Transactions detail: one row per transaction ──
  lines.push(row(["TRANSACTIONS"]));
  lines.push(row(["Portfolio", "Coin", "Symbol", "Type", "Amount", "Price (USD)", "Value (USD)", "Date"]));
  for (const p of portfolios) {
    for (const co of p.coins || []) {
      for (const t of co.transactions || []) {
        const amt = Number(t.amount) || 0;
        const price = Number(t.priceAtBuy) || 0;
        lines.push(row([
          p.name || p.id, co.name || "", (co.symbol || "").toUpperCase(),
          t.type || "buy", num(amt, 8), num(price, 8), num(amt * price, 2), t.date || "",
        ]));
      }
    }
  }

  return lines.join("\r\n");
}
