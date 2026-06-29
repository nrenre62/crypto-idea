import { useState, useEffect } from "react";
import { fetchTrending } from "../api/coingecko.js";

// Module-level cache so switching tabs doesn't refetch trending (the backend also
// caches it server-side; this avoids even the round-trip within a session).
let _cache = null;

// Loads the currently-trending coins ONCE (cached), via the /api/trending proxy.
// Returns an array of {id, symbol, name, thumb, rank} — empty while loading or on
// error, so callers can fall back to a built-in list (offline-degrade). (DP-6)
export function useTrending() {
  const [trending, setTrending] = useState(() => _cache || []);

  useEffect(() => {
    if (_cache) { setTrending(_cache); return; }
    let cancelled = false;
    fetchTrending().then((coins) => {
      if (cancelled || !coins || !coins.length) return;
      _cache = coins;
      setTrending(coins);
    });
    return () => { cancelled = true; };
  }, []);

  return trending;
}
