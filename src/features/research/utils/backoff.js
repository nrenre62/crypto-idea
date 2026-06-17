// utils/backoff.js — pure helper for 429 backoff windows. No state of its own.

// Given the current step and an optional Retry-After (ms), return the next
// { until, step } backoff window. Escalates 60s→2m→4m→8m→10m (capped).
export function nextBackoff(step, retryAfterMs) {
  const nextStep = Math.min(step + 1, 5);
  const wait = retryAfterMs != null ? retryAfterMs : Math.min(60000 * 2 ** (nextStep - 1), 600000);
  return { until: Date.now() + wait, step: nextStep };
}
