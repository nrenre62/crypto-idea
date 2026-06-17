// utils/coins.js — coin reference data + pure transforms. No state/DOM/fetch.

export const SYMBOL_TO_CGID = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', ADA: 'cardano', XRP: 'ripple',
  DOGE: 'dogecoin', BNB: 'binancecoin', DOT: 'polkadot', MATIC: 'matic-network',
  LTC: 'litecoin', AVAX: 'avalanche-2', LINK: 'chainlink', TRX: 'tron',
  ATOM: 'cosmos', UNI: 'uniswap', USDT: 'tether', USDC: 'usd-coin',
  SHIB: 'shiba-inu', NEAR: 'near', APT: 'aptos',
};

export const COIN_META = {
  bitcoin: { g: '₿', c: '#f7931a' }, ethereum: { g: 'Ξ', c: '#4b6ef5' },
  solana: { g: '◎', c: '#11b886' }, cardano: { g: '₳', c: '#1f6feb' },
  ripple: { g: '✕', c: '#23292f' }, dogecoin: { g: 'Ð', c: '#c2a633' },
  tron: { g: 'T', c: '#e0457b' }, litecoin: { g: 'Ł', c: '#345d9d' },
};

export const PALETTE = [
  '#f7931a', '#4b6ef5', '#11b886', '#7c3aed', '#e0457b',
  '#0ea5e9', '#f59e0b', '#10b981', '#ef4444', '#6366f1',
];

export const visualFor = (holding, index) => {
  const m = COIN_META[holding.id] || {};
  return {
    glyph: m.g || (holding.sym || '?').slice(0, 2),
    color: m.c || PALETTE[index % PALETTE.length],
  };
};

export const sentimentOf = (holding) => {
  const c = holding.c7d || 0;
  if (c > 2) return { cls: 's-con', label: 'Constructive' };
  if (c < -2) return { cls: 's-cau', label: 'Cautious' };
  return { cls: 's-mix', label: 'Mixed' };
};

// Convert the app's coin objects (each with a transactions array) into the
// holdings shape the tab needs. Net amount + weighted avg buy cost.
// NOTE: field-name fallbacks are intentionally permissive — once the real app
// coin schema is confirmed, trim these to the exact fields.
export const holdingsFromCoins = (coins) =>
  coins
    .map((c) => {
      let amount = 0, costSum = 0, bought = 0;
      // The app stores transactions on `entries`; keep the others as fallbacks.
      const txs = c.entries || c.transactions || c.txs || c.history || [];
      if (Array.isArray(txs) && txs.length) {
        for (const t of txs) {
          const a = Number(t.amount ?? t.qty ?? t.quantity ?? t.coins ?? 0) || 0;
          // The app stores the unit price on `priceAtBuy`.
          const price = Number(t.priceAtBuy ?? t.price ?? t.pricePerCoin ?? t.unitPrice ?? t.cost ?? 0) || 0;
          const type = String(t.type ?? t.side ?? '').toLowerCase();
          const signed = type === 'sell' ? -Math.abs(a) : type === 'buy' ? Math.abs(a) : a;
          amount += signed;
          if (signed > 0) { bought += signed; costSum += signed * price; }
        }
      } else {
        amount = Number(c.amount ?? c.qty ?? c.holdings ?? c.balance ?? 0) || 0;
        const ac = Number(c.avgCost ?? c.buyPrice ?? c.cost ?? 0) || 0;
        bought = amount; costSum = amount * ac;
      }
      const sym = String(c.symbol || c.sym || c.ticker || '').toUpperCase();
      const id = c.cgId || c.coingeckoId || c.geckoId || c.id ||
        SYMBOL_TO_CGID[sym] || String(c.name || sym).toLowerCase();
      return {
        id, sym: sym || String(id).toUpperCase().slice(0, 4),
        name: c.name || sym || id, amount, avgCost: bought ? costSum / bought : 0,
      };
    })
    .filter((h) => h.amount > 0 && h.id);
