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
