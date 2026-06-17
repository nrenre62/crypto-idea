// utils/riskColor.js — pure colour helpers for the risk gauge.
// Traffic-light best practice: low = green → amber/orange → high = red.

const lerp = (a, b, t) => Math.round(a + (b - a) * t);
const hex = (c) => '#' + c.map((v) => ('0' + v.toString(16)).slice(-2)).join('');

// stops: [position 0..1, [r,g,b]]  → #1f9d55 #e0a423 #ea7317 #cf3a2c
const STOPS = [
  [0, [31, 157, 85]],
  [0.45, [224, 164, 35]],
  [0.75, [234, 115, 23]],
  [1, [207, 58, 44]],
];

// Colour for a position along the low→high spectrum (t in 0..1).
export function riskSpectrum(t) {
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < STOPS.length; i++) {
    if (t <= STOPS[i][0]) {
      const a = STOPS[i - 1], b = STOPS[i];
      const u = (t - a[0]) / ((b[0] - a[0]) || 1);
      return hex([lerp(a[1][0], b[1][0], u), lerp(a[1][1], b[1][1], u), lerp(a[1][2], b[1][2], u)]);
    }
  }
  return hex(STOPS[STOPS.length - 1][1]);
}

// Level pill colour + tint, aligned to the spectrum endpoints.
export const levelColor = (level) => (level === 'High' ? '#cf3a2c' : level === 'Elevated' ? '#d99715' : '#1f9d55');
export const levelTint = (level) => (level === 'High' ? '#fbede9' : level === 'Elevated' ? '#fdf3e0' : '#e7f3ec');
