// utils/priceAdapter.js — bridge the app's data into the shape the research
// components expect. Pure functions, fully testable. No fetching here.
//
// The app's live prices give us current price + 24h change only. The 7d/30d
// change and the 7-day sparkline are derived from the coin's price HISTORY
// (the same CDN-cached /api/history the DCA calculator uses) — so we never call
// CoinGecko directly from the browser.

const DAY = 86400000;

// From an ascending history array ([[tsMs, price], ...]) derive the % change
// since `days` ago, using the latest point at/before that target time.
function pctSince(history, days, lastPrice, lastTs) {
  const target = lastTs - days * DAY;
  let ref = null;
  for (let i = 0; i < history.length; i++) {
    if (history[i][0] <= target) ref = history[i];
    else break;
  }
  if (!ref || !ref[1]) return 0;
  return (lastPrice / ref[1] - 1) * 100;
}

// Derive {last, c7d, c30d, spark} from a CoinGecko-style history array.
// Returns safe zeros/nulls when data is missing or too thin (never NaN).
export function deriveFromHistory(history) {
  if (!Array.isArray(history) || history.length === 0) {
    return { last: null, c7d: 0, c30d: 0, spark: null };
  }
  const lastPt = history[history.length - 1];
  const lastTs = lastPt[0];
  const lastPrice = lastPt[1];
  const cutoff = lastTs - 7 * DAY;
  const spark = history.filter((p) => p[0] >= cutoff).map((p) => p[1]);
  return {
    last: lastPrice,
    c7d: pctSince(history, 7, lastPrice, lastTs),
    c30d: pctSince(history, 30, lastPrice, lastTs),
    spark: spark.length > 1 ? spark : null,
  };
}

// Build the {[id]: {price, c24, c7d, c30d, spark}} map the research components
// expect, from the app's live-price map and per-id history arrays.
//   livePrices:     { [id]: { usd, usd_24h_change, ... } }   (from useLivePrices)
//   historiesById:  { [id]: [[tsMs, price], ...] }           (from /api/history)
export function buildResearchPrices(ids, livePrices, historiesById) {
  const out = {};
  for (const id of ids) {
    const live = (livePrices && livePrices[id]) || null;
    const hist = (historiesById && historiesById[id]) || null;
    const d = deriveFromHistory(hist);
    const price = (live && Number(live.usd)) || d.last || 0;
    const c24 = live && live.usd_24h_change != null ? Number(live.usd_24h_change) : 0;
    out[id] = { price, c24, c7d: d.c7d, c30d: d.c30d, spark: d.spark };
  }
  return out;
}
