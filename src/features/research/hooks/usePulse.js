// hooks/usePulse.js — the "Portfolio Pulse" summary. Deterministic by construction:
// PR-E3 (CRYP-106) severed the Pulse from AI, so this never touches the askAI
// seam — it returns the honest multi-signal summary (utils/pulse.js) directly.
import { useMemo } from 'react';
import { pulseFacts, pulseLines } from '../utils/pulse';

export function usePulse(portfolio, tf) {
  const text = useMemo(
    () => pulseLines(pulseFacts(portfolio, tf)).join('\n'),
    [portfolio, tf]
  );
  return { text, loading: false };
}
