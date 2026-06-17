// utils/format.js — pure formatting helpers. No state, no DOM, no fetching.

export const money = (n) => '$' + Math.round(n).toLocaleString();

// Price with sensible precision for large vs sub-dollar coins.
export const priceFmt = (p) =>
  p >= 100 ? money(p) : '$' + Number(p).toFixed(p < 1 ? 4 : 2);

// Signed percentage, e.g. +3.1% / −0.6% (uses a real minus glyph).
export const fmtPct = (x) =>
  (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(1) + '%';

// Abbreviate large figures for scannability (used by RT-16 onward).
export const abbreviate = (n) => {
  const a = Math.abs(n);
  if (a >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (a >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (a >= 1e4) return '$' + (n / 1e3).toFixed(1) + 'K';
  return money(n);
};
