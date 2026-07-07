// components/ResearchTab.jsx — CONTAINER. Calls hooks, owns view/tf state, and
// passes plain data + callbacks down to presentational components.
//
// Adapted for the app: renders as an in-app screen under `.research-root` (no
// standalone phone frame), and takes the active portfolio's coins + the app's
// live prices as props instead of reading window globals / CoinGecko directly.
import { useMemo, useState } from 'react';
import '../styles/research-tab.css';

import { useHoldings } from '../hooks/useHoldings';
import { usePrices } from '../hooks/usePrices';
import { usePortfolio } from '../hooks/usePortfolio';
import { usePulse } from '../hooks/usePulse';
import { useAsk } from '../hooks/useAsk';
import { useSharePulse } from '../hooks/useSharePulse';

import OverviewView from './OverviewView';
import CoinsView from './CoinsView';
import AskView from './AskView';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'coins', label: 'Coins' },
  { id: 'ask', label: 'Ask' },
];

// Props:
//   coins      — the active portfolio's coin objects (with their `entries`).
//   livePrices — the app's live price map: { [id]: { usd, usd_24h_change, ... } }.
export default function ResearchTab({ coins, livePrices, api, plan, onAccount, coinOrder, onReorder }) {
  const [tab, setTab] = useState('overview');
  const [tf, setTf] = useState('30d');

  const { holdings, source } = useHoldings(coins);
  const empty = source === 'empty';

  const ids = useMemo(() => holdings.map((h) => h.id), [holdings]);
  const { prices } = usePrices(ids, source, livePrices);   // status/asOf dropped with the R13-3 freshness line

  const portfolio = usePortfolio(holdings, prices);
  const pulse = usePulse(portfolio, tf, !empty);
  const ask = useAsk(portfolio.context);
  const sharePulse = useSharePulse();

  const askAboutCoin = (name) => { setTab('ask'); ask.send(`Tell me about my ${name} position.`); };
  const onShare = () => sharePulse({ portfolio, tf, pulseText: pulse.text });

  return (
    <div className="research-root">
      <div className="apphead">
        <div>
          <div className="title">Research <span className="beta">BETA</span>
            {api === 'live' && <span className="badge badge-live">● LIVE</span>}
            {plan && <span className="badge badge-plan" onClick={onAccount} style={{ cursor: 'pointer' }}>{plan}</span>}
          </div>
        </div>
      </div>

      <div className="segwrap">
        <div className="seg">
          {TABS.map((t) => (
            <button key={t.id} className={t.id === tab ? 'active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>
      </div>

      <div className="pad">
        {tab === 'overview' && (
          <OverviewView portfolio={portfolio} empty={empty} pulse={pulse} tf={tf} onTf={setTf} onShare={onShare} />
        )}
        {tab === 'coins' && <CoinsView holdings={portfolio.holdings} coinOrder={coinOrder} onReorder={onReorder} empty={empty} onAsk={askAboutCoin} />}
        {tab === 'ask' && <AskView messages={ask.messages} busy={ask.busy} onSend={ask.send} />}

        <p className="disclaimer">
          AI-generated insights and the Stress test are for information and education only — not financial advice or a
          prediction. Crypto is volatile and you can lose money. Always do your own research.
        </p>
      </div>
    </div>
  );
}
