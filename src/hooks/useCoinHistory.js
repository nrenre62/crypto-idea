import { useState, useEffect } from "react";
import { fetchHistory } from "../api/coingecko.js";

// Module-level cache so re-selecting a coin doesn't refetch its history (the
// backend also caches it server-side; this avoids even the round-trip).
// C-A2: LRU-capped — history arrays are big (~365 points each), and an unbounded
// Map grew for the whole session. Reads refresh recency; inserts past the cap
// evict the least-recently-used coin. Exported (underscored) for the unit test.
export const HISTORY_CACHE_MAX = 50;
const _cache = new Map();

export function _cacheGet(id) {
  if (!_cache.has(id)) return null;
  const v = _cache.get(id);
  _cache.delete(id); _cache.set(id, v);   // refresh recency (Map keeps insertion order)
  return v;
}

export function _cachePut(id, prices) {
  if (_cache.has(id)) _cache.delete(id);
  _cache.set(id, prices);
  while (_cache.size > HISTORY_CACHE_MAX) _cache.delete(_cache.keys().next().value);
}

// Fetches a coin's full daily price history once (cached), via the /api/history
// proxy. Returns the prices array ([[tsMs, price], ...]) or null while loading or
// on error — callers fall back to the built-in estimate when it's null.
export function useCoinHistory(id) {
  const [prices, setPrices] = useState(() => (id && _cacheGet(id)) || null);

  useEffect(() => {
    if (!id) { setPrices(null); return; }
    const hit = _cacheGet(id);
    if (hit) { setPrices(hit); return; }
    let cancelled = false;
    fetchHistory(id).then((p) => {
      if (cancelled || !p) return;
      _cachePut(id, p);
      setPrices(p);
    });
    return () => { cancelled = true; };
  }, [id]);

  return prices;
}
