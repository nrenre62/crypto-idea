// hooks/useSharePulse.js — snapshot/share the Pulse as a PNG. Logic lives here;
// the Pulse component just calls share(). No fetching.
import { useCallback } from 'react';
import { visualFor } from '../utils/coins';
import { abbreviate } from '../utils/format';

const TFWORD = { '24h': 'Last 24 hours', '7d': 'Last 7 days', '30d': 'Last 30 days' };

function roundRect(x, X, Y, W, H, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); }
function tracked(x, t, gap, X, Y) { let xx = X; for (const ch of t) { x.fillText(ch, xx, Y); xx += x.measureText(ch).width + gap; } }
function wrap(x, t, X, Y, maxW, lh, maxLines) {
  const words = t.split(/\s+/); let line = '', n = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + ' ' + words[i] : words[i];
    if (x.measureText(test).width > maxW && line) {
      x.fillText(line, X, Y); Y += lh; n++; line = words[i];
      if (n >= maxLines - 1) { let rest = words.slice(i).join(' '); while (rest.length && x.measureText(rest + '…').width > maxW) rest = rest.slice(0, -1); x.fillText(rest + '…', X, Y); return Y; }
    } else line = test;
  }
  if (line) x.fillText(line, X, Y);
  return Y;
}

function buildCard({ portfolio, tf, pulseText }) {
  const W = 1080, H = 1350, P = 92;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#fbfaf7'); g.addColorStop(1, '#f2f0e9'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = '#0a6b4d'; x.fillRect(0, 0, W, 12);
  const perf = portfolio.perf[tf], up = perf >= 0;
  x.fillStyle = '#0a6b4d'; x.font = '700 26px "Hanken Grotesk",sans-serif'; tracked(x, 'CRYPTO IDEA', 7, P, 156);
  x.fillStyle = '#15140f'; x.font = '500 56px "Fraunces",Georgia,serif'; x.fillText('Portfolio Pulse', P, 224);
  x.fillStyle = '#928f85'; x.font = '500 34px "Hanken Grotesk",sans-serif'; x.fillText(TFWORD[tf] || '', P, 300);
  x.fillStyle = up ? '#0a6b4d' : '#bf4730'; x.font = '600 150px "Fraunces",Georgia,serif';
  x.fillText((up ? '+' : '−') + Math.abs(perf).toFixed(1) + '%', P, 452);
  x.fillStyle = '#55534b'; x.font = '500 42px "Hanken Grotesk",sans-serif'; x.fillText('Total ' + abbreviate(portfolio.total), P, 516);
  x.strokeStyle = '#e4e1d8'; x.lineWidth = 2; x.beginPath(); x.moveTo(P, 572); x.lineTo(W - P, 572); x.stroke();
  x.fillStyle = '#2a2924'; x.font = '400 41px "Hanken Grotesk",sans-serif';
  const yy = wrap(x, (pulseText || '').replace(/\*\*/g, ''), P, 648, W - 2 * P, 58, 6);
  const segs = portfolio.holdings.slice(0, 5).map((h, i) => ({ a: h.alloc, c: visualFor(h, i).color, s: h.sym }));
  const other = portfolio.holdings.slice(5).reduce((s, h) => s + h.alloc, 0); if (other > 0.5) segs.push({ a: other, c: '#c9c6bc', s: 'Other' });
  const barY = Math.min(Math.max(yy + 72, 1040), 1150), barH = 28, barW = W - 2 * P; let bx = P;
  x.save(); roundRect(x, P, barY, barW, barH, 14); x.clip(); segs.forEach((s) => { const w = barW * s.a / 100; x.fillStyle = s.c; x.fillRect(bx, barY, w + 1, barH); bx += w; }); x.restore();
  x.font = '600 28px "Hanken Grotesk",sans-serif'; let lx = P; const ly = barY + 74;
  segs.forEach((s) => { x.fillStyle = s.c; roundRect(x, lx, ly - 19, 19, 19, 5); x.fill(); x.fillStyle = '#55534b'; const t = s.s + ' ' + Math.round(s.a) + '%'; x.fillText(t, lx + 28, ly); lx += 28 + x.measureText(t).width + 30; });
  x.fillStyle = '#928f85'; x.font = '500 26px "Hanken Grotesk",sans-serif';
  x.fillText('Not financial advice · cryptoidea.com', P, H - 118);
  x.fillText(new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }), P, H - 78);
  return c;
}

export function useSharePulse() {
  return useCallback(async ({ portfolio, tf, pulseText }) => {
    if (!portfolio || !portfolio.holdings.length) return;
    try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (_) {}
    const canvas = buildCard({ portfolio, tf, pulseText });
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'crypto-idea-pulse.png', { type: 'image/png' });
      try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'My Portfolio Pulse', text: 'My portfolio pulse from Crypto Idea' });
          return;
        }
      } catch (e) { if (e && e.name === 'AbortError') return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'crypto-idea-pulse.png';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }, 'image/png');
  }, []);
}
