// Per-module line icons for the Learn screen. Feather/Lucide 24-grid, stroke set to
// currentColor so the .m-icon circle's color token drives them (dark-safe, no hex).
// Keyed by module id; LockIcon is shown for locked modules. Presentation-only — the
// modules still carry an emoji `icon` in data (reused by the badges row).
const svg = (children) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);

export const LockIcon = svg(<><rect x="4.5" y="11" width="15" height="9.5" rx="2" /><path d="M8 11V7.5a4 4 0 0 1 8 0V11" /></>);

export const MODULE_ICONS = {
  // How Markets Really Work — trending up
  markets: svg(<><polyline points="3 16 9 10 13 14 21 6" /><polyline points="15 6 21 6 21 12" /></>),
  // Reading the Fundamentals — magnifier
  fundamentals: svg(<><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>),
  // Tokenomics & Supply — layered stack
  tokenomics: svg(<><path d="M12 2 2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></>),
  // Spotting Real Demand — bar chart
  demand: svg(<><line x1="3" y1="20" x2="21" y2="20" /><line x1="6" y1="20" x2="6" y2="11" /><line x1="12" y1="20" x2="12" y2="5" /><line x1="18" y1="20" x2="18" y2="14" /></>),
  // Real Yield & Sustainability — sprout
  yield: svg(<><path d="M12 20v-8" /><path d="M12 12C9 12 6 10 6 6c4 0 6 2 6 6z" /><path d="M12 12c3 0 6-2 6-6-4 0-6 2-6 6z" /></>),
  // Risk & Position Sizing — shield + check
  risk: svg(<><path d="M12 3 5 5.5v5C5 15 8 18 12 19.5 16 18 19 15 19 10.5v-5z" /><path d="M9.4 11.6l1.9 1.9 3.3-3.4" /></>),
  // The Psychology of Conviction — lightbulb
  psychology: svg(<><path d="M9 18h6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4.9 1 .9 1.7V16h5.2v-.4c0-.7.3-1.3.9-1.7A6 6 0 0 0 12 3z" /></>),
  // Security & Self-Custody — key
  security: svg(<><circle cx="7.5" cy="15.5" r="3.5" /><path d="M10 13 19 4" /><path d="M16 7l3 3" /><path d="M13.5 9.5l2.5 2.5" /></>),
  // Building Your Thesis — document
  thesis: svg(<><path d="M14 3v5h5" /><path d="M15 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><line x1="8" y1="13" x2="15" y2="13" /><line x1="8" y1="17" x2="13" y2="17" /></>),
};
