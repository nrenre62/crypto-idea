// hooks/useSharePulse.js — snapshot/share the Pulse as a PNG. Logic lives here;
// the Pulse component just calls share(). No fetching.
import { useCallback } from 'react';
import { visualFor } from '../utils/coins';
import { abbreviate } from '../utils/format';

const TFWORD = { '24h': 'Last 24 hours', '7d': 'Last 7 days', '30d': 'Last 30 days' };

function roundRect(x, X, Y, W, H, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); }
// A turtle flipper (teardrop) drawn around its (0,0) shoulder.
function flip(x) { x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(-4, 0, -4.6, 5, -2.6, 8.6); x.bezierCurveTo(-1, 10.2, 1, 10.2, 2.6, 8.6); x.bezierCurveTo(4.6, 5, 4, 0, 0, 0); x.closePath(); }
// The corner turtle (LOGO-TURTLE), static head-up — the same shapes as the SVG
// mark, ported to canvas. Fully isolated by save/restore so it leaks no state.
function drawTurtle(x, cx, cy, s) {
  x.save(); x.translate(cx, cy); x.rotate(-28 * Math.PI / 180); x.scale(s, s);
  x.lineCap = 'round'; x.lineJoin = 'round';
  x.strokeStyle = '#4fa6a8'; x.lineWidth = 2.1; x.beginPath(); x.moveTo(-19, 11); x.lineTo(-3, 11); x.lineTo(2, 6.4); x.lineTo(7, 11); x.lineTo(21, 11); x.stroke();
  x.strokeStyle = '#7fc0c1'; x.lineWidth = 1.5; x.globalAlpha = 0.7;
  x.beginPath(); x.moveTo(-13, 15.5); x.lineTo(-4, 15.5); x.stroke();
  x.beginPath(); x.moveTo(7, 15.5); x.lineTo(17, 15.5); x.stroke(); x.globalAlpha = 1;
  x.fillStyle = '#c39a6b';
  x.save(); x.translate(-11, 3); flip(x); x.fill(); x.restore();                 // back flipper
  x.beginPath(); x.moveTo(-15, 1); x.lineTo(-20, 2.6); x.lineTo(-15.6, 5.6); x.closePath(); x.fill(); // tail
  x.beginPath(); x.moveTo(5, -3.4); x.lineTo(19, -4.2); x.lineTo(19, 3); x.lineTo(5, 3); x.closePath(); x.fill(); // neck
  x.beginPath(); x.ellipse(20.5, -2, 6.2, 5.2, 0, 0, Math.PI * 2); x.fill();      // head
  x.fillStyle = '#2f2013'; x.beginPath(); x.ellipse(22.6, -4, 1.3, 1.3, 0, 0, Math.PI * 2); x.fill(); // eye
  x.fillStyle = '#6fbe93'; x.beginPath(); x.ellipse(0, -1, 16, 11, 0, 0, Math.PI * 2); x.fill();      // shell
  x.strokeStyle = '#3e8e6a'; x.lineWidth = 1.5; x.globalAlpha = 0.85;
  x.beginPath(); x.moveTo(-9, -6.5); x.bezierCurveTo(-3, -9.6, 3, -9.6, 9, -6.5); x.stroke();
  x.beginPath(); x.moveTo(-6, -8.4); x.bezierCurveTo(-8, -1, -8, 4, -5, 9.4); x.stroke();
  x.beginPath(); x.moveTo(6, -8.4); x.bezierCurveTo(8, -1, 8, 4, 5, 9.4); x.stroke(); x.globalAlpha = 1;
  x.fillStyle = '#c39a6b'; x.save(); x.translate(9, 4); flip(x); x.fill(); x.restore(); // front flipper
  x.restore();
}
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
  // Brand lockup — the index.html mark: green "C" tile + one-word "CryptoIdea"
  // wordmark, drawn on the canvas above the title (fonts are already awaited).
  const TILE = 48, TX = P, TY = 104;
  x.fillStyle = '#0b6b4f'; roundRect(x, TX, TY, TILE, TILE, 12); x.fill();
  x.fillStyle = '#fff'; x.font = '600 30px "Fraunces",Georgia,serif';
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('C', TX + TILE / 2, TY + TILE / 2 + 1);
  x.textAlign = 'left'; x.textBaseline = 'alphabetic';
  drawTurtle(x, TX + 93 * TILE / 100, TY + 12 * TILE / 100, 1.42 * TILE / 100); // turtle riding the tile corner
  x.fillStyle = '#15140f'; x.font = '600 34px "Hanken Grotesk",sans-serif'; x.fillText('CryptoIdea', TX + TILE + 16, TY + TILE / 2 + 12);
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
          await navigator.share({ files: [file], title: 'My Portfolio Pulse', text: 'My portfolio pulse from CryptoIdea' });
          return;
        }
      } catch (e) { if (e && e.name === 'AbortError') return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'crypto-idea-pulse.png';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }, 'image/png');
  }, []);
}
