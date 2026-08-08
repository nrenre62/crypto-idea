// hooks/usePulse.js — fetch the AI "Portfolio Pulse" for a timeframe, falling to the
// deterministic multi-signal summary (utils/pulse.js) whenever the AI isn't live.
import { useCallback, useEffect, useState } from 'react';
import { askClaude } from '../api/ai-client';
import { fmtPct } from '../utils/format';
import { pulseFacts, pulseLines, TFWORD } from '../utils/pulse';

const SYS =
  'You are a research assistant in a crypto portfolio app. Write a 2-3 sentence ' +
  "neutral summary of the user's portfolio for the requested timeframe. Wrap key " +
  'figures in **double asterisks**. Be educational and neutral — never give advice ' +
  'or predictions. ';

// The honest deterministic product (R-A…R-F) — a newline-joined multi-signal summary.
const deterministicText = (portfolio, tf) => pulseLines(pulseFacts(portfolio, tf)).join('\n');

// enabled=false (e.g. empty portfolio or AI proxy not live) skips the network entirely.
export function usePulse(portfolio, tf, enabled = true) {
  const [state, setState] = useState({ text: '', loading: true });

  const run = useCallback(async () => {
    if (!enabled) { setState({ text: deterministicText(portfolio, tf), loading: false }); return; }
    setState((s) => ({ ...s, loading: true }));
    const perf = portfolio.perf[tf];
    try {
      const text = await askClaude(
        SYS + portfolio.context,
        `Summarize my portfolio for the ${TFWORD[tf]}. Performance: ${fmtPct(perf)}.`
      );
      setState({ text, loading: false });
    } catch (_) {
      setState({ text: deterministicText(portfolio, tf), loading: false });
    }
  }, [portfolio, tf, enabled]);

  useEffect(() => { run(); }, [run]);

  return { ...state, regenerate: run };
}
