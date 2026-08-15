// hooks/useAsk.js — manage the Ask thread. Business logic only.
import { useCallback, useState } from 'react';
import { askAI } from '../api/ai-client';

const SYS =
  'You are the research assistant inside "CryptoIdea", a crypto portfolio app. ' +
  "Answer the user's question about THEIR portfolio in plain, friendly English, " +
  '2-4 sentences. Be neutral and educational. Never give financial advice, ' +
  'buy/sell/hold recommendations, or price predictions. ';

const DEFAULT_A =
  'Your results are driven mostly by your largest holding. Ask about a specific ' +
  'coin or your concentration for a more detailed breakdown.';

const FOLLOWUPS = [
  "What's my biggest risk?", 'How did my top coin do?', 'Am I too concentrated?',
  'What should I watch this week?', 'How volatile is my portfolio?',
];

const pickFollowups = (exclude) => {
  const pool = FOLLOWUPS.filter((f) => f !== exclude);
  const out = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
};

export function useAsk(context) {
  const [messages, setMessages] = useState([]); // {role:'user'|'assistant', text, followups?}
  const [busy, setBusy] = useState(false);

  const send = useCallback(
    async (q) => {
      const text = (q || '').trim();
      if (!text || busy) return;
      setBusy(true);
      setMessages((m) => [...m, { role: 'user', text }]);
      try {
        // CRYP-93: the canned answer no longer apologizes for being "offline" — until
        // the AI proxy ships every answer is the deterministic data-driven fallback.
        const answer = await askAI(SYS + context, text);
        setMessages((m) => [...m, { role: 'assistant', text: answer || DEFAULT_A, followups: pickFollowups(text) }]);
      } catch (_) {
        setMessages((m) => [...m, { role: 'assistant', text: DEFAULT_A, followups: pickFollowups(text) }]);
      } finally {
        setBusy(false);
      }
    },
    [context, busy]
  );

  return { messages, send, busy };
}
