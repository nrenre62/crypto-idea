import { useState, useEffect } from "react";
import { fetchHistory } from "../api/coingecko.js";

// Module-level cache so re-selecting a coin doesn't refetch its history (the
// backend also caches it server-side; this avoids even the round-trip).
const _cache = new Map();

// Fetches a coin's full daily price history once (cached), via the /api/history
// proxy. Returns the prices array ([[tsMs, price], ...]) or null while loading or
// on error — callers fall back to the built-in estimate when it's null.
export function useCoinHistory(id) {
  const [prices, setPrices] = useState(() => (id && _cache.get(id)) || null);

  useEffect(() => {
    if (!id) { setPrices(null); return; }
    if (_cache.has(id)) { setPrices(_cache.get(id)); return; }
    let cancelled = false;
    fetchHistory(id).then((p) => {
      if (cancelled || !p) return;
      _cache.set(id, p);
      setPrices(p);
    });
    return () => { cancelled = true; };
  }, [id]);

  return prices;
}
