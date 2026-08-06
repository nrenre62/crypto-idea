// Pure money-display splitter (A1). Rounds to the nearest CENT FIRST, then splits into
// a whole-dollar part + a 2-digit cents string — so a value like $100.999 renders as
// $101.00 (the rounded-up dollar is never lost by flooring the dollars independently of
// the cents). No I/O, no imports, deterministic. Non-finite input is treated as 0.
export function splitMoney(n) {
  if (!Number.isFinite(n)) n = 0;
  const c = Math.round(n * 100);            // round to cents first (the A1 fix)
  const dollars = Math.trunc(c / 100);       // signed whole-dollar Number
  const cents = String(Math.abs(c) % 100).padStart(2, "0"); // 2-char cents string
  return { dollars, cents };
}
