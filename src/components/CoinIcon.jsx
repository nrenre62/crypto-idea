import { useApp } from "../hooks/app-context.js";
import { CI } from "./ui.jsx";

// R25-1: the shared interactive coin icon. Every browse/list coin icon (Portfolio
// cards, Search results + trending, Journal thesis + needs-a-thesis rows, Detail
// header) opens the Coin-info overlay on click/Enter/Space, with the Portfolio
// accent-ring hover + a press state (.coin-ic). stopPropagation keeps the icon tap
// from firing the row's own action (card→Detail, row→journal detail, etc.).
// Decorative icons INSIDE a coin's own popups stay plain <CI> (you're already there).
export function CoinIcon({ coin, size }) {
  const { openCoinInfo } = useApp();
  const open = (e) => { e.stopPropagation(); openCoinInfo(coin); };
  return (
    <span
      className="coin-ic"
      role="button"
      tabIndex={0}
      title={`View ${coin.name} info`}
      onClick={open}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(e); } }}
    >
      <CI thumb={coin.thumb} symbol={coin.symbol} size={size} />
    </span>
  );
}
