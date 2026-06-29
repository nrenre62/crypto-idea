// Data fetching for coin market data, via the same-origin /api proxy
// (Cloud Function -> CoinGecko, with server-side key + caching). UI/business
// logic lives elsewhere; this module ONLY fetches and normalizes the response.
//
// Each function swallows network errors and returns a neutral value so callers
// can stay simple. `null` means "no data, don't update" (callers preserve their
// current state); never throws.

// Live USD prices for a comma-joined list of coin ids -> { [id]: {usd, usd_24h_change, usd_market_cap} } or null.
export async function fetchPrices(ids) {
  try {
    const r = await fetch(`/api/prices?ids=${encodeURIComponent(ids)}`);
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

// Full daily price history for a coin -> [[tsMs, price], ...] (ascending) or null.
// Served from the cached /api/history proxy (shared across all users).
export async function fetchHistory(id) {
  try {
    const r = await fetch(`/api/history?id=${encodeURIComponent(id)}`);
    if (!r.ok) return null;
    const d = await r.json();
    return Array.isArray(d.prices) ? d.prices : null;
  } catch {
    return null;
  }
}

// Search any CoinGecko coin by name/symbol -> array of {id,symbol,name,thumb,rank}, or null on error/empty.
export async function searchCoins(q) {
  try {
    const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    if (!r.ok) return null;
    const d = await r.json();
    return Array.isArray(d.coins) ? d.coins : null;
  } catch {
    return null;
  }
}

// Currently-trending coins (cached /api/trending proxy) -> array of {id,symbol,name,thumb,rank},
// or null on error. Powers the Search tab's empty-state TRENDING list.
export async function fetchTrending() {
  try {
    const r = await fetch("/api/trending");
    if (!r.ok) return null;
    const d = await r.json();
    return Array.isArray(d.coins) ? d.coins : null;
  } catch {
    return null;
  }
}
