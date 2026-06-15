import { useState, useEffect, useMemo } from "react";
import { searchCoins } from "../api/coingecko.js";
import { TOP_COINS } from "../utils/coins.js";

// Coin search for the Add Coin screen. Given the current query string, returns
// the merged result list: built-in top-coin matches first, then any other live
// CoinGecko results (deduped). Live results are debounced (300ms) and fetched
// through the cached /api proxy. Owns its own result state; the caller owns the
// input string `sq`.
export function useCoinSearch(sq) {
  const [liveCoins, setLiveCoins] = useState([]);

  // Local top-coin matches (instant, offline).
  const sr = useMemo(() => {
    if (sq.length < 1) return [];
    const q = sq.toLowerCase();
    return TOP_COINS.filter(c => c.name.toLowerCase().startsWith(q) || c.symbol.toLowerCase().startsWith(q)).slice(0, 25);
  }, [sq]);

  // Live coin search via the /api proxy (any coin on CoinGecko).
  useEffect(() => {
    const q = sq.trim();
    if (q.length < 2) { setLiveCoins([]); return; }
    let cancelled = false;
    const t = setTimeout(() => {
      searchCoins(q).then(coins => { if (!cancelled && coins) setLiveCoins(coins); });
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [sq]);

  // Local top-coin matches first, then any other live results (deduped).
  return useMemo(() => {
    const seen = new Set(sr.map(c => c.id));
    return [...sr, ...liveCoins.filter(c => !seen.has(c.id))];
  }, [sr, liveCoins]);
}
