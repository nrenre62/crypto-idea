/**
 * CRYP-106 (Plan B PR-E3) — Part A: unit-test the REAL body of
 * src/features/research/api/ai-client.js after it is swapped from the unconditional
 * throw to the `researchAsk` callable seam.
 *
 * The module is imported FRESH per case (vi.resetModules + vi.doMock + dynamic import)
 * so each case pins its own AI_PROXY_LIVE value and callable payload. Three collaborators
 * are mocked; the doMock specifiers are the TEST-RELATIVE paths that resolve to the SAME
 * absolute module ids ai-client imports after PR-E3:
 *   • ../../src/features/research/api/ai-status.js  → { AI_PROXY_LIVE }
 *   • firebase/functions                            → { httpsCallable } spy
 *   • ../../src/api/firebase.config.js              → { functions } stub (no real init)
 *
 * TODAY (pre-PR-E3) askAI throws 'research-ai-proxy-not-configured' unconditionally
 * and imports none of these, so cases (a)/(b)/(c)/(e) are RED — it throws instead of
 * routing through the callable — and (d) is a GREEN GUARD (it already throws when the
 * flag is off and never calls the callable).
 */
import { describe, it, expect, vi } from 'vitest';

const AI_STATUS = '../../src/features/research/api/ai-status.js';
const FN_CONFIG = '../../src/api/firebase.config.js';
const AI_CLIENT = '../../src/features/research/api/ai-client.js';

// Build a fresh ai-client with the three collaborators mocked for this case.
async function loadClient({ live, callable, functions = {} }) {
  vi.resetModules();
  const httpsCallable = vi.fn(() => callable);
  vi.doMock(AI_STATUS, () => ({ AI_PROXY_LIVE: live }));
  vi.doMock('firebase/functions', () => ({ httpsCallable }));
  vi.doMock(FN_CONFIG, () => ({ functions }));
  const mod = await import(AI_CLIENT);
  return { askAI: mod.askAI, httpsCallable, functions };
}

describe('Research ai-client — askAI routes through the researchAsk callable (PR-E3)', () => {
  it('CRYP-106: sends ONLY { question } to researchAsk and returns the answer (flag on)', async () => {
    const inner = vi.fn(async () => ({ data: { answer: 'clean', fellBack: false } }));
    const fns = { __fns: true };
    const { askAI, httpsCallable } = await loadClient({ live: true, callable: inner, functions: fns });

    const out = await askAI('sys', 'q');
    expect(out).toBe('clean');
    // Wired to the right callable on the app's functions instance…
    expect(httpsCallable).toHaveBeenCalledWith(fns, 'researchAsk');
    // …and the request body is EXACTLY { question } — no system/context/holdings leak.
    expect(inner).toHaveBeenCalledWith({ question: 'q' });
    expect(Object.keys(inner.mock.calls[0][0])).toEqual(['question']);
  });

  it("CRYP-106: returns '' on an empty answer or a fellBack response (flag on)", async () => {
    const empty = await loadClient({ live: true, callable: vi.fn(async () => ({ data: { answer: '', fellBack: false } })) });
    expect(await empty.askAI('s', 'q')).toBe('');

    const fell = await loadClient({ live: true, callable: vi.fn(async () => ({ data: { answer: 'x', fellBack: true } })) });
    expect(await fell.askAI('s', 'q')).toBe('');
  });

  it('CRYP-106: propagates a callable rejection so useAsk/useAsk catch can fire (flag on)', async () => {
    const inner = vi.fn(async () => { throw new Error('callable-boom'); });
    const { askAI, httpsCallable } = await loadClient({ live: true, callable: inner });
    // The rejection must be the CALLABLE's error (proving it reached the callable),
    // not the pre-flight 'research-ai-proxy-not-configured' guard.
    await expect(askAI('s', 'q')).rejects.toThrow('callable-boom');
    expect(httpsCallable).toHaveBeenCalled();
  });

  it('CRYP-106: throws proxy-not-configured and never calls the callable when the flag is off', async () => {
    const inner = vi.fn(async () => ({ data: { answer: 'nope' } }));
    const { askAI, httpsCallable } = await loadClient({ live: false, callable: inner });
    await expect(askAI('s', 'q')).rejects.toThrow('research-ai-proxy-not-configured');
    expect(httpsCallable).not.toHaveBeenCalled();
  });

  it('CRYP-106: discards budget/cost/extra fields and returns only the answer (flag on)', async () => {
    const inner = vi.fn(async () => ({ data: { answer: 'ok', fellBack: false, budgetCents: 999, remainingCents: 1 } }));
    const { askAI } = await loadClient({ live: true, callable: inner });
    expect(await askAI('s', 'q')).toBe('ok');
  });
});
