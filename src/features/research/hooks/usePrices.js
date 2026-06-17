// hooks/usePrices.js — APP-NATIVE price layer for the research tab.
//
// The original design fetched CoinGecko directly from the browser. In this app
// that would bypass the shared, cached /api proxy (flat backend cost) and leak
// rate limits per user. Instead we build the price map from:
//   - the app's live prices (current price + 24h change), passed in as a prop, and
//   - each coin's /api/history (CDN-cached) to derive 7d/30d change + sparkline.
import { useEffect, useRef, useState } from 'react';
import { fetchHistory } from '../../../api/coingecko';
import { buildResearchPrices } from '../utils/priceAdapter';

// status: 'empty' | 'loading' | 'live'
export function usePrices(ids, source, livePrices) {
  const [state, setState] = useState({ prices: null, status: 'loading', asOf: null });
  const idsKey = ids.join(',');
  const histRef = useRef({}); // id -> history array (persists across renders)

  useEffect(() => {
    if (source === 'empty' || ids.length === 0) {
      setState({ prices: null, status: source === 'empty' ? 'empty' : 'loading', asOf: null });
      return;
    }
    let alive = true;

    // Show something immediately from live prices (7d/30d default to 0 until the
    // histories load — computePortfolio degrades gracefully, never NaN).
    setState({ prices: buildResearchPrices(ids, livePrices, histRef.current), status: 'live', asOf: new Date() });

    // Fetch histories we don't already have. fetchHistory is module-cached in the
    // app's coingecko client, so re-opening the tab is free.
    const missing = ids.filter((id) => !histRef.current[id]);
    if (missing.length) {
      Promise.all(
        missing.map((id) =>
          fetchHistory(id)
            .then((h) => { histRef.current[id] = Array.isArray(h) ? h : []; })
            .catch(() => { histRef.current[id] = []; })
        )
      ).then(() => {
        if (!alive) return;
        setState({ prices: buildResearchPrices(ids, livePrices, histRef.current), status: 'live', asOf: new Date() });
      });
    }

    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, source, livePrices]);

  return state;
}
