// hooks/usePulse.js — fetch the AI "Portfolio Pulse" for a timeframe.
import { useCallback, useEffect, useState } from 'react';
import { askClaude } from '../api/ai-client';
import { fmtPct, money } from '../utils/format';

const SYS =
  'You are a research assistant in a crypto portfolio app. Write a 2-3 sentence ' +
  "neutral summary of the user's portfolio for the requested timeframe. Wrap key " +
  'figures in **double asterisks**. Be educational and neutral — never give advice ' +
  'or predictions. ';

const TFWORD = { '24h': 'last 24 hours', '7d': 'last 7 days', '30d': 'last 30 days' };

function fallbackText(portfolio, tf) {
  if (!portfolio.holdings.length) return 'Once you add coins, I’ll summarise your portfolio here.';
  const top = portfolio.holdings[0];
  const top2 = portfolio.holdings.slice(0, 2).reduce((s, h) => s + h.alloc, 0);
  return (
    `Your portfolio is **${money(portfolio.total)}**, with **${top.name} at ${Math.round(top.alloc)}%** ` +
    `your biggest position. Over the ${TFWORD[tf]} it's **${fmtPct(portfolio.perf[tf])}**. ` +
    `With ~${Math.round(top2)}% in your top two coins, your results lean heavily on them.`
  );
}

// enabled=false (e.g. empty portfolio) skips the network entirely.
export function usePulse(portfolio, tf, enabled = true) {
  const [state, setState] = useState({ text: '', offline: false, loading: true });

  const run = useCallback(async () => {
    if (!enabled) { setState({ text: fallbackText(portfolio, tf), offline: false, loading: false }); return; }
    setState((s) => ({ ...s, loading: true }));
    const perf = portfolio.perf[tf];
    try {
      const text = await askClaude(
        SYS + portfolio.context,
        `Summarize my portfolio for the ${TFWORD[tf]}. Performance: ${fmtPct(perf)}.`
      );
      setState({ text, offline: false, loading: false });
    } catch (_) {
      setState({ text: fallbackText(portfolio, tf), offline: true, loading: false });
    }
  }, [portfolio, tf, enabled]);

  useEffect(() => { run(); }, [run]);

  return { ...state, regenerate: run };
}
