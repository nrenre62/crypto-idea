// api/ai-client.js — app-side AI client for the research tab (the "Ask" seam).
//
// SECURITY: the AI provider key must NEVER ship to the browser, so we do not call
// the provider API (or any relay) directly from here. Live "Ask" answers go
// through the server-side `researchAsk` Cloud Function, which holds the key,
// builds the safety context from the caller's OWN coin docs, runs the fail-closed
// output validator, and meters the spend. The client sends ONLY the question — the
// system prompt / holdings context the caller passes is discarded (the server is
// authoritative).
//
// The whole path is gated on AI_PROXY_LIVE (in ./ai-status.js): while the flag is
// false the seam short-circuits — askAI throws BEFORE any network call, so the
// remaining caller (useAsk) falls back to its built-in deterministic answer and no
// httpsCallable ever fires. Flip AI_PROXY_LIVE to true in the same increment that
// deploys `researchAsk`.
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../api/firebase.config.js';
import { AI_PROXY_LIVE } from './ai-status.js';

export async function askAI(_system, question) {
  // Flag off → short-circuit before any network call (no callable is invoked).
  if (!AI_PROXY_LIVE) throw new Error('research-ai-proxy-not-configured');
  // Send EXACTLY { question } — the server builds context/system from the caller's
  // own coins; the client-built prompt (_system) is discarded. A callable rejection
  // propagates so useAsk's catch can fall back.
  const res = await httpsCallable(functions, 'researchAsk')({ question });
  const { answer, fellBack } = res.data || {};
  // Fail closed: a fell-back or empty answer reads as "no AI answer" (never budget
  // fields or the whole payload — only the answer string ever leaves this module).
  if (fellBack || !answer) return '';
  return answer;
}
