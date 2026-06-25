// components/CoinsView.jsx — pure UI.
import CoinCard from './CoinCard';
import EmptyState from './EmptyState';

export default function CoinsView({ holdings, empty, onAsk }) {
  return (
    <div className="view active">
      <div className="sec-label"><h2>Your coins</h2><a href="#">Sort</a></div>
      {empty ? (
        <EmptyState />
      ) : (
        <div className="coins-grid">
          {holdings.map((h, i) => <CoinCard key={h.id} holding={h} index={i} onAsk={onAsk} />)}
        </div>
      )}
    </div>
  );
}
