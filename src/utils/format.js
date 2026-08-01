// Pure formatting + small helper functions. No React, no I/O — same input
// always yields the same output, so these are trivially unit-testable.

// Price -> display string, with precision that grows as the price shrinks.
export function fmtP(p){if(p==null)return"—";if(p>=1)return"$"+p.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});if(p>=0.01)return"$"+p.toFixed(4);if(p>=0.0001)return"$"+p.toFixed(6);return"$"+p.toFixed(10)}

// Price -> a bare numeric string for a number INPUT (no "$", precision grows as
// the price shrinks). Empty string for a non-positive/missing price. Used to
// auto-fill the transaction price field. Shared by AddEntry + Detail.
export function fmtPriceInput(p){if(!p||p<=0)return"";if(p>=1)return p.toFixed(2);if(p>=0.0001)return p.toFixed(6);if(p>=0.0000001)return p.toFixed(10);return p.toFixed(12)}

// TX-SAFE (Part A): clean a raw input string down to a safe positive decimal — keep
// digits and AT MOST one dot, and cap the DIGIT count (the dot doesn't count toward
// the cap). Everything else (scientific-notation e/E, signs +/-, a second dot, letters,
// spaces, thousands separators) is dropped. Pure — the backstop for typing / paste /
// spinner in the Buy/Sell Amount + Price fields. The 15-digit default aligns with JS
// float precision (~15-17 significant digits) and sits under the server's amount bound
// (CryptoIdea addEntry: _amt>1e15 / _prc>1e9). Does NOT normalise a leading "." here
// (that happens on blur via normalizeLeadingDot, so mid-typing ".5" isn't fought).
export function sanitizeDecimal(str, { maxDigits = 15 } = {}) {
  if (str == null) return "";
  let out = "", digits = 0, dot = false;
  for (const ch of String(str)) {
    if (ch >= "0" && ch <= "9") { if (digits >= maxDigits) continue; out += ch; digits++; }
    else if (ch === "." && !dot) { out += ch; dot = true; }
    // e/E/+/-/second dot/anything else: dropped
  }
  return out;
}

// TX-SAFE (Part A): true if this keydown should be BLOCKED (preventDefault) in a decimal
// number field, so an <input type=number> never enters the "badInput" state (which shows
// the raw garbage while .value silently returns "" — the "field full of e" symptom).
// Blocks e/E, +/-, a SECOND dot, and a digit past maxDigits. Named keys (Backspace,
// Arrow*, Tab, Enter) and single letters the browser already rejects pass through; the
// caller also skips this while a modifier (Ctrl/Cmd/Alt) is held so copy/paste/select-all
// are never touched. Pure.
export function blockDecimalKey(key, value, { maxDigits = 15 } = {}) {
  if (key == null || String(key).length !== 1) return false;      // named/control keys pass
  if (key === "e" || key === "E" || key === "+" || key === "-") return true;
  const v = String(value ?? "");
  if (key === ".") return v.includes(".");                        // only a second dot is blocked
  if (key >= "0" && key <= "9") return v.replace(/[^0-9]/g, "").length >= maxDigits;
  return false;
}

// TX-SAFE (Part A): on blur, canonicalise a leading-dot value (".5" -> "0.5") and a lone
// "." -> "". Pure, cosmetic (parseFloat already accepts ".5", so the submit path is
// unaffected) — it just keeps the displayed value tidy after typing.
export function normalizeLeadingDot(str) {
  const s = String(str ?? "");
  if (s === ".") return "";
  return s.startsWith(".") ? "0" + s : s;
}

// Market cap -> short string ($1.23T / $4.56B / $7.89M).
export function fmtMc(m){if(!m)return"—";if(m>=1e12)return"$"+(m/1e12).toFixed(2)+"T";if(m>=1e9)return"$"+(m/1e9).toFixed(2)+"B";if(m>=1e6)return"$"+(m/1e6).toFixed(2)+"M";return"$"+m.toLocaleString()}

// Percent change -> signed string (+1.23% / -4.56%).
export function fmtPct(v){if(v==null)return"—";return(v>=0?"+":"")+v.toFixed(2)+"%"}

// Short unique id for client-side rows (not security-sensitive).
export function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}

// Date(-ish) -> "Mon D, YYYY HH:MM:SS".
export function fmtDT(d){if(!d)return"";const x=new Date(d);return x.toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"})+" "+x.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}

// Calendar gap between two dates -> {years, months, days, totalDays}.
export function timeBetween(s,e){const a=new Date(s),b=new Date(e);let y=b.getFullYear()-a.getFullYear(),m=b.getMonth()-a.getMonth(),d=b.getDate()-a.getDate();if(d<0){m--;d+=new Date(b.getFullYear(),b.getMonth(),0).getDate()}if(m<0){y--;m+=12}const td=Math.floor((b-a)/(864e5));return{years:y,months:m,days:d,totalDays:td}}
