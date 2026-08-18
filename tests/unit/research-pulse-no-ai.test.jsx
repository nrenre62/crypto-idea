/**
 * CRYP-106 (Plan B PR-E3) — Part B: prove the Portfolio Pulse is SEVERED from AI.
 *
 * usePulse currently calls askAI whenever enabled (= !empty && aiChrome). This file
 * mocks AI_PROXY_LIVE = TRUE (so aiChrome would be true) with a non-empty book, which on
 * the current tree makes usePulse hit askAI. After PR-E3 usePulse is deterministic by
 * construction (no askAI import, no AI branch): it returns pulseLines(pulseFacts())
 * unconditionally and never touches the AI seam.
 *
 * (g) THE CRUX — mount alone must call askAI ZERO times even with the flag mocked
 *     true (RED today: usePulse calls it once).
 * (h) the Pulse card shows the deterministic summary text, not the AI text (RED today:
 *     the card renders the mocked AI text).
 */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Flag mocked TRUE — the crux: even so, Pulse must not call AI.
vi.mock('../../src/features/research/api/ai-status.js', () => ({ AI_PROXY_LIVE: true }));

// A resolved sentinel so that IF the current code wires askAI into the Pulse it
// renders a distinctive string we can assert is ABSENT (and never a null → text.split crash).
vi.mock('../../src/features/research/api/ai-client.js', () => ({
  askAI: vi.fn(() => Promise.resolve('AI_SENTINEL_MUST_NOT_RENDER_IN_PULSE')),
}));

// No network from usePrices' history/price derivation.
vi.mock('../../src/api/coingecko.js', () => ({
  fetchHistory: vi.fn(() => Promise.resolve([])),
  fetchPrices: vi.fn(() => Promise.resolve(null)),
  searchCoins: vi.fn(() => Promise.resolve(null)),
  fetchTrending: vi.fn(() => Promise.resolve(null)),
}));

import ResearchTab from '../../src/features/research/components/ResearchTab.jsx';
import { askAI } from '../../src/features/research/api/ai-client.js';

const COINS = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', entries: [{ id: 'e1', type: 'buy', amount: 0.5, priceAtBuy: 40000, date: '2025-01-01' }] },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', entries: [{ id: 'e2', type: 'buy', amount: 4, priceAtBuy: 2000, date: '2025-01-01' }] },
];
const LIVE = {
  bitcoin: { usd: 45000, usd_24h_change: 1.5, usd_market_cap: 8e11, usd_24h_vol: 2e10, circulating: 19e6, usd_market_cap_rank: 1 },
  ethereum: { usd: 2500, usd_24h_change: -0.8, usd_market_cap: 3e11, usd_24h_vol: 1e10, circulating: 120e6, usd_market_cap_rank: 2 },
};
const baseProps = {
  coins: COINS, livePrices: LIVE, api: 'live', plan: 'STARTER',
  onAccount: () => {}, coinOrder: [], onReorder: () => {}, pricesPaused: false,
};
const renderTab = (over = {}) => render(<ResearchTab {...baseProps} {...over} />);

// Wait until the Pulse text has settled (loading → done) so any AI call would have fired.
const settledPulse = async (container) => {
  await screen.findByText('Portfolio Pulse');
  await waitFor(() => {
    const el = container.querySelector('.pulse-text');
    expect(el && el.textContent.trim().length).toBeGreaterThan(0);
  });
};

describe('Research Pulse — severed from AI even when the proxy flag is true (PR-E3)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('CRYP-106: Pulse never calls askAI on mount even with AI_PROXY_LIVE mocked true', async () => {
    const { container } = renderTab({ aiEnabled: true });
    await settledPulse(container);
    expect(askAI).toHaveBeenCalledTimes(0);
  });

  it('CRYP-106: the Pulse shows the deterministic summary, not AI-produced text', async () => {
    const { container } = renderTab({ aiEnabled: true });
    await settledPulse(container);
    const txt = container.querySelector('.pulse-text').textContent;
    // Deterministic R-A line (utils/pulse.js) for the default 30d timeframe.
    expect(txt).toContain('Your portfolio is');
    expect(txt).toContain('over the last 30 days');
    // The mocked AI text must never reach the card.
    expect(txt).not.toContain('AI_SENTINEL_MUST_NOT_RENDER_IN_PULSE');
  });
});
