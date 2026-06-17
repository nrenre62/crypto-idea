// features/research/Research.jsx — app wrapper for the Research tab.
//
// Bridges AppContext → the (otherwise self-contained) research feature: feeds the
// active portfolio's coins and the app's live prices. All data flows through the
// app's own hooks/proxy — no direct CoinGecko or Anthropic calls from the client.
import { useApp } from '../../hooks/app-context';
import ResearchTab from './components/ResearchTab';

export default function Research() {
  const { portfolio, prices } = useApp();
  return <ResearchTab coins={portfolio} livePrices={prices} />;
}
