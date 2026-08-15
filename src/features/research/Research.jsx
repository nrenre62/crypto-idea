// features/research/Research.jsx — app wrapper for the Research tab.
//
// Bridges AppContext → the (otherwise self-contained) research feature: feeds the
// active portfolio's coins and the app's live prices. All data flows through the
// app's own hooks/proxy — no direct CoinGecko or AI-provider calls from the client.
import { useApp } from '../../hooks/app-context';
import ResearchTab from './components/ResearchTab';

export default function Research() {
  const { portfolio, prices, api, isPro, isPremium, setScreen, coinOrder, updateCoinOrder, site } = useApp();
  const plan = isPremium ? "PREMIUM" : isPro ? "PRO" : "STARTER";
  // ADMIN-2: the marketData kill-switch, threaded in as a prop like the other header
  // inputs — ResearchTab stays self-contained and context-free by design.
  const pricesPaused = !!(site && site.features && site.features.marketData === false);
  // CRYP-93: the AI-research kill-switch also hides the Research → Ask chat client-side.
  // Same !== false idiom as the server (default-ON: a missing/unreadable flag keeps chat).
  const chatEnabled = !(site && site.features && site.features.aiResearch === false);
  // R4-4: thread the live/plan header pills + the Account route into the (otherwise
  // self-contained) feature so its header matches the other tabs.
  // R32: also thread the active portfolio's custom coin order + its persister.
  return (
    <ResearchTab
      coins={portfolio}
      livePrices={prices}
      api={api}
      plan={plan}
      onAccount={() => setScreen("account")}
      pricesPaused={pricesPaused}
      chatEnabled={chatEnabled}
      coinOrder={coinOrder}
      onReorder={updateCoinOrder}
    />
  );
}
