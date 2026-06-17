// utils/sparkline.js — turn a price series into an SVG path string. Pure.

export function sparkPath(prices, w, h) {
  if (!Array.isArray(prices) || prices.length < 2) return null;
  const n = Math.min(prices.length, 40);
  const step = prices.length / n;
  const pts = [];
  for (let i = 0; i < n; i++) pts.push(prices[Math.floor(i * step)]);
  pts.push(prices[prices.length - 1]);
  const min = Math.min(...pts), max = Math.max(...pts), range = max - min || 1;
  const dx = w / (pts.length - 1);
  return pts
    .map((p, i) => (i ? 'L' : 'M') + (i * dx).toFixed(1) + ',' + (h - ((p - min) / range) * h).toFixed(1))
    .join(' ');
}
