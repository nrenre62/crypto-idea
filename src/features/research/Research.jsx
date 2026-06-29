// features/research/Research.jsx — app wrapper for the Research tab.
//
// Bridges AppContext → the (otherwise self-contained) research feature: feeds the
// active portfolio's coins and the app's live prices. All data flows through the
// app's own hooks/proxy — no direct CoinGecko or Anthropic calls from the client.
import { useApp } from '../../hooks/app-context';
import ResearchTab from './components/ResearchTab';

export default function Research() {
  const { portfolio, prices, api, isPro, isPremium, setScreen } = useApp();
  const plan = isPremium ? "PREMIUM" : isPro ? "PRO" : "STARTER";
  // R4-4: thread the live/plan header pills + the Account route into the (otherwise
  // self-contained) feature so its header matches the other tabs.
  return (
    <ResearchTab
      coins={portfolio}
      livePrices={prices}
      api={api}
      plan={plan}
      onAccount={() => setScreen("account")}
    />
  );
}
