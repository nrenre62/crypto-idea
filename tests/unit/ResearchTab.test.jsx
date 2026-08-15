/**
 * CRYP-93 — Research tab AI-honesty gate (PR 4a of BUILD-LOOP #13).
 *
 * The Research feature gains a client gate off the published site flag
 * `site.features.aiResearch` plus the build constant AI_PROXY_LIVE (false today):
 *   • chatEnabled = !(aiResearch === false)  → the "Ask" chat tab + per-coin
 *     "Ask AI about …" button render only when true.
 *   • aiChrome    = chatEnabled && AI_PROXY_LIVE (always false today) → the Pulse
 *     card's AI ornaments (gradient label, Regenerate button, "AI-generated"
 *     disclaimer) and whether askAI is ever called.
 *
 * These render <ResearchTab> directly (it takes everything as props — no app
 * providers needed) with a non-empty holdings fixture. They must FAIL on the
 * current tree (TABS always has 'ask'; CoinCard always renders the button; Pulse
 * always shows the gradient label + Regenerate + the offline apology; usePulse is
 * called with enabled=!empty so askAI runs) and PASS once the gate ships.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Spy on the AI client so we can prove askAI is NEVER invoked (case 6) and so
// the Pulse/Ask fallbacks behave exactly as they do live (askAI throws today).
vi.mock("../../src/features/research/api/ai-client.js", () => ({
  askAI: vi.fn(() => Promise.reject(new Error("research-ai-proxy-not-configured"))),
}));

// usePrices derives 7d/30d + sparkline from /api/history — mock it so no network
// is touched and the render is deterministic.
vi.mock("../../src/api/coingecko.js", () => ({
  fetchHistory: vi.fn(() => Promise.resolve([])),
  fetchPrices: vi.fn(() => Promise.resolve(null)),
  searchCoins: vi.fn(() => Promise.resolve(null)),
  fetchTrending: vi.fn(() => Promise.resolve(null)),
}));

import ResearchTab from "../../src/features/research/components/ResearchTab.jsx";
import { askAI } from "../../src/features/research/api/ai-client.js";

// A non-empty active portfolio (entries/priceAtBuy/type → holdingsFromCoins keeps
// them, so `empty` is false and the Coins/Pulse/holdings paths all light up).
const COINS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", entries: [{ id: "e1", type: "buy", amount: 0.5, priceAtBuy: 40000, date: "2025-01-01" }] },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", entries: [{ id: "e2", type: "buy", amount: 4, priceAtBuy: 2000, date: "2025-01-01" }] },
];
const LIVE = {
  bitcoin: { usd: 45000, usd_24h_change: 1.5, usd_market_cap: 8e11, usd_24h_vol: 2e10, circulating: 19e6, usd_market_cap_rank: 1 },
  ethereum: { usd: 2500, usd_24h_change: -0.8, usd_market_cap: 3e11, usd_24h_vol: 1e10, circulating: 120e6, usd_market_cap_rank: 2 },
};
const baseProps = {
  coins: COINS, livePrices: LIVE, api: "live", plan: "STARTER",
  onAccount: () => {}, coinOrder: [], onReorder: () => {}, pricesPaused: false,
};
const renderTab = (over = {}) => render(<ResearchTab {...baseProps} {...over} />);

describe("Research tab — AI honesty gate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("CRYP-93: hides the Ask tab and per-coin Ask button when aiResearch is off", async () => {
    renderTab({ chatEnabled: false });
    await screen.findByText("Research");                    // header rendered

    // No "Ask" chat tab in the sub-nav.
    expect(screen.queryByRole("button", { name: "Ask" })).toBeNull();
    // No AskView content anywhere in the tree.
    expect(screen.queryByText("Ask about your portfolio")).toBeNull();

    // …and no "Ask AI about …" button on any coin card.
    fireEvent.click(screen.getByRole("button", { name: "Coins" }));
    expect(await screen.findByText("Bitcoin")).toBeInTheDocument();   // Coins view mounted
    expect(screen.queryByText(/Ask AI about/i)).toBeNull();
  });

  it("CRYP-93: keeps the Ask tab and per-coin Ask button when aiResearch is on", async () => {
    renderTab({ chatEnabled: true });
    await screen.findByText("Research");

    // The Ask chat tab is present…
    expect(screen.getByRole("button", { name: "Ask" })).toBeInTheDocument();
    // …and a coin card's "Ask AI about …" button is present.
    fireEvent.click(screen.getByRole("button", { name: "Coins" }));
    expect(await screen.findByText("Bitcoin")).toBeInTheDocument();
    expect(screen.getByText(/Ask AI about Bitcoin/i)).toBeInTheDocument();
  });

  it("CRYP-93: a live flip to aiResearch-off falls a stale Ask selection back to Overview", async () => {
    const { rerender } = renderTab({ chatEnabled: true });
    await screen.findByText("Research");

    // Activate the Ask tab.
    fireEvent.click(screen.getByRole("button", { name: "Ask" }));
    expect(await screen.findByText("Ask about your portfolio")).toBeInTheDocument();

    // Flag flips off → the tab bar drops 'ask' and the view falls back to Overview.
    rerender(<ResearchTab {...baseProps} chatEnabled={false} />);
    expect(screen.queryByText("Ask about your portfolio")).toBeNull();          // AskView gone
    expect(screen.getByText("A note on your portfolio")).toBeInTheDocument();    // Overview shown (CRYP-99 notes area)
  });

  it("CRYP-106: the Pulse shows no AI on/off pill and no offline apology", async () => {
    renderTab();
    await screen.findByText("Portfolio Pulse");
    // PR-E3 severs Pulse from AI, so the .ai-status pill is removed entirely.
    expect(screen.queryByText("AI off")).toBeNull();
    expect(screen.queryByText("AI on")).toBeNull();
    // The old offline apology copy must still be absent.
    expect(screen.queryByText(/AI is offline/i)).toBeNull();
    expect(screen.queryByText(/showing a basic summary/i)).toBeNull();
  });

  it("CRYP-93: no AI ornaments render while the AI proxy is not live", async () => {
    renderTab();
    const label = await screen.findByText("Portfolio Pulse");
    // No Regenerate button (an AI action) — Share stays.
    expect(screen.queryByRole("button", { name: "Regenerate" })).toBeNull();
    // The label is not dressed up with the AI gradient class.
    expect(label.className).not.toContain("ai-gradient-text");
    // The disclaimer must not claim "AI-generated" when there is no live AI.
    expect(screen.queryByText(/AI-generated/i)).toBeNull();
  });

  it("CRYP-93: askAI is never called on a mounted Research tab (proxy not live)", async () => {
    renderTab({ chatEnabled: true });
    // Let the mount effects (usePulse) settle.
    await screen.findByText("Portfolio Pulse");
    await waitFor(() => expect(screen.getByText("Portfolio Pulse")).toBeInTheDocument());
    expect(askAI).toHaveBeenCalledTimes(0);
  });

  // CRYP-106 (PR-E3): the per-coin "Ask AI about …" button keeps riding the
  // useAsk → askAI seam after the Pulse is severed from AI. Guard: it already
  // works today via the reject-fallback and must keep working post-PR-E3, proving
  // the refactor doesn't break the one remaining askAI caller (useAsk).
  it("CRYP-106: the per-coin Ask button routes through the useAsk→askAI seam exactly once", async () => {
    renderTab({ chatEnabled: true });
    await screen.findByText("Research");

    // Open Coins and click the fixture coin's Ask button.
    fireEvent.click(screen.getByRole("button", { name: "Coins" }));
    expect(await screen.findByText("Bitcoin")).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Ask AI about Bitcoin/i));

    // The view switches to Ask and the thread carries the user question…
    expect(await screen.findByText("Ask about your portfolio")).toBeInTheDocument();
    expect(await screen.findByText("Tell me about my Bitcoin position.")).toBeInTheDocument();

    // …the seam fired exactly once, producing one assistant reply (no double-send).
    await waitFor(() => expect(askAI).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(document.querySelector(".bubble-a")).toBeTruthy());
  });
});

// CRYP-95 — multi-signal Daily Brief. The Overview "Brief" card is rebuilt to render
// from briefFacts (gainer/decliner), replacing the old single "top mover" + "… volatility"
// line. These render-tier assertions FAIL on the current tree (the Brief names only the
// top mover, never the decliner, and still prints "… volatility") and PASS once the Brief
// renders from briefFacts. Scoped to the `.brief` card because StressTest legitimately
// uses the word "volatility" elsewhere in the Overview.
describe("Research Overview — Daily Brief renders from briefFacts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("CRYP-95: the Brief names the decliner, not just the gainer, on a mixed-mover book", async () => {
    // baseProps: Bitcoin +1.5% (gainer), Ethereum −0.8% (decliner).
    const { container } = renderTab();
    await screen.findByText("Portfolio Pulse");
    const brief = container.querySelector(".brief");
    expect(brief).toBeTruthy();
    expect(brief.textContent).toContain("Bitcoin");   // gainer named
    expect(brief.textContent).toContain("Ethereum");  // decliner named (absent today)
  });

  it("CRYP-95: the Brief no longer labels a coin's move as 'volatility'", async () => {
    const { container } = renderTab();
    await screen.findByText("Portfolio Pulse");
    const brief = container.querySelector(".brief");
    expect(brief.textContent).not.toMatch(/volatility/i);
  });

  it("CRYP-95: a near-zero 24h move shows ≈0%, never +0.0%", async () => {
    const NZ_COINS = [
      { id: "bitcoin", symbol: "BTC", name: "Bitcoin", entries: [{ id: "e1", type: "buy", amount: 1, priceAtBuy: 40000, date: "2025-01-01" }] },
    ];
    const NZ_LIVE = {
      bitcoin: { usd: 50000, usd_24h_change: 0.04, usd_market_cap: 8e11, usd_24h_vol: 1e10, circulating: 19e6, usd_market_cap_rank: 1 },
    };
    const { container } = renderTab({ coins: NZ_COINS, livePrices: NZ_LIVE });
    await screen.findByText("Portfolio Pulse");
    const brief = container.querySelector(".brief");
    expect(brief.textContent).toContain("≈0%");
    expect(brief.textContent).not.toContain("+0.0%");
  });
});
