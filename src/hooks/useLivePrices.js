import { useState, useEffect } from "react";
import { fetchPrices } from "../api/coingecko.js";
import { TOP_COINS } from "../utils/coins.js";

// Live USD prices for the user's coins. Seeds with the built-in mock prices on
// mount (so the UI shows numbers immediately and offline), then polls the cached
// /api/prices proxy every 60s for the currently held coins. Returns { prices, api }
// where `api` is "demo" until the first live response, then "live".
export function useLivePrices(portfolio) {
  const [prices, setPrices] = useState({});
  const [api, setApi] = useState("demo");

  // Seed mock prices once so the UI isn't empty before the first fetch.
  useEffect(() => {
    const m = {};
    TOP_COINS.forEach(c => { m[c.id] = { usd: c.mockPrice, usd_24h_change: c.mockChange, usd_market_cap: c.mockMcap }; });
    setPrices(m);
  }, []);

  // Poll live prices for the held coins.
  useEffect(() => {
    if (!portfolio.length) return;
    const ids = portfolio.map(c => c.id).join(",");
    const f = () => fetchPrices(ids).then(d => { if (d) { setPrices(p => ({ ...p, ...d })); setApi("live"); } });
    f();
    const iv = setInterval(f, 60000);
    return () => clearInterval(iv);
  }, [portfolio]);

  return { prices, api };
}
