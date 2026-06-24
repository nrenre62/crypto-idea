"use strict";
// functions/validate-output.js
// Fail-closed validator for in-app AI output (#13 / #14 / #15 / #16). This is the
// regex PREFILTER half of #15 (the stricter LLM judge is wired in B2); it runs
// SERVER-SIDE in the research proxy and must NEVER let violating text reach the
// client — the system prompt is not a control, this is.
//
// It enforces the in-app naming wall + the no-advice rules. A violation is any of:
//   • name       — a crypto project/token/exchange the model was NOT given (BTC/ETH/
//                  SOL always excepted); the naming wall (#14).
//   • price      — a $ amount, "N dollars/cents", a valuation/market-cap/target, or a
//                  multiple ("ten-bagger", "5x current price") (#13).
//   • advice     — buy/sell/hold recommendations or rating labels (#13/#14).
//   • allocation — a % (or word fraction) tied to a portfolio/position (#13).
//   • score      — any single aggregate score/rating/grade (#13 — separate signals only).
//
// FAIL CLOSED: empty/garbage output is invalid; any violation is invalid; and the
// regen cap is N = 2 (#16) — after 1 initial + 2 regens with no clean output, the
// caller returns the safe fallback, never the violating text. Pure (no I/O) so it is
// exhaustively unit-tested and red-teamed.
//
// It is a PREFILTER, not the whole control: context-ambiguous names that are also
// common English words (Optimism / Near / Maker / Stellar / Ripple / Avalanche) and
// cleverly-spaced obfuscation are deliberately left to the B2 LLM judge — over-
// matching them here would nuke ordinary prose. Tickers + cashtags + distinctive
// names + the obvious advice/price/score/allocation forms ARE caught here.

const MAX_REGENS = 2; // #16 (locked)

// Always-allowed reference assets (the universal majors) — naming-wall exception.
const ALWAYS_ALLOWED = ["btc", "eth", "sol", "bitcoin", "ethereum", "solana"];

// Distinctive project / exchange NAMES (low English-word collision), matched
// case-insensitively as whole words. English-word names are caught via TICKERS only.
const PROJECT_NAMES = [
  "cardano", "dogecoin", "polkadot", "chainlink", "uniswap", "litecoin",
  "polygon", "binance", "coinbase", "toncoin", "shiba inu", "pancakeswap",
  "sushiswap", "monero", "zcash", "arbitrum", "dogwifhat", "algorand", "tezos",
  "fantom", "decentraland", "pepe", "thorchain", "worldcoin", "celestia",
  "bittensor", "ftx", "kraken", "kucoin", "bitfinex", "bybit", "okx",
];

// Known TICKERS, matched as standalone ALL-CAPS words or $cashtags. A curated set so
// ordinary acronyms (API/CEO/NFT/DAO/DEX/TVL/APY/ROI/…) never trip it.
const TICKERS = [
  "ADA", "XRP", "DOGE", "DOT", "LTC", "AVAX", "LINK", "TRX", "ATOM", "UNI",
  "BNB", "MATIC", "USDT", "USDC", "XMR", "XLM", "CRO", "ARB", "OP", "SUI",
  "SEI", "MKR", "AAVE", "TON", "SHIB", "NEAR", "APT", "ALGO", "XTZ", "FTM",
  "ICP", "FIL", "VET", "HBAR", "GRT", "SAND", "MANA", "AXS", "INJ", "XLM",
];

// Number words (for written-out money / scores).
const NUM = "(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion)";
const PCT = "\\d{1,3}(?:\\.\\d+)?\\s?(?:%|percent)";

// Price targets / monetary amounts / valuations / multiples (#13).
const PRICE_PATTERNS = [
  /\$\s?\d/, // $5, $ 1,234, $0.05, $50k
  /\b\d[\d,]*(?:\.\d+)?\s?(?:dollars?|cents?|usd|bucks?)\b/i, // 5 dollars, 50 cents
  new RegExp("\\b" + NUM + "\\s+(?:dollars?|cents?|bucks?)\\b", "i"), // two dollars, fifty cents
  /\b(?:a\s+)?bucks?\b/i, // a buck, bucks
  /\b(?:price\s+target|target\s+price|fair\s+value|price\s+prediction|valuation)\b/i,
  /\bvalued?\s+(?:at|north|above|around|near|over)\b/i, // valued at/north…, value at
  /\bvalue\s+(?:it|this|them)\s+at\b/i, // value this at
  /\bmarket\s?cap(?:italization)?\s+(?:of|around|near|at|north\s+of|above)\b/i,
  new RegExp("\\b(?:reach|reaches|reaching|hit|hits|hitting|rise\\s+to|climb\\s+to|fall\\s+to|drop\\s+to|go\\s+to|trade\\s+at|trading\\s+at)\\s+(?:\\$?\\d|a\\s+buck|" + NUM + ")", "i"),
  /\b\d{1,3}\s?-?\s?bagger\b/i,
  new RegExp("\\b" + NUM + "\\s?-?\\s?bagger\\b", "i"), // ten-bagger
  new RegExp("\\b(?:\\d+|" + NUM + ")\\s+times\\s+(?:its\\s+|the\\s+|current\\s+)*(?:price|value|valuation)\\b", "i"), // five times current price
];

// Buy / sell / hold advice (#13/#14) — recommendation phrasing or a rating label, NOT
// descriptive use ("buyers", "holders", "selling pressure").
const ADVICE_PATTERNS = [
  /\b(?:should|shouldn't|must|ought\s+to|need\s+to|recommend(?:ed|ing|s)?|advise|advising|suggest(?:ing|s)?|consider)\s+(?:you\s+|to\s+|that\s+you\s+)?(?:buy|sell|hold|accumulat|exit|dump|short\b|long\b)/i,
  /\b(?:good\s+|right\s+)?time\s+to\s+(?:buy|sell|exit|accumulate|take|scale|trim|add)\b/i,
  /\b(?:strong\s+)?(?:buy|sell|hold)\b\s*(?:rating|signal|recommendation|call|verdict)/i,
  /\b(?:rating|recommendation|signal|verdict|call)\b[:\s]+\s*(?:strong\s+)?(?:buy|sell|hold)\b/i,
  /\b(?:buy|sell)\s+(?:now|the\s+dip|here|more|today)\b/i,
  /\bthis\s+is\s+a\s+(?:strong\s+)?(?:buy|sell|hold)\b/i,
  /\b(?:i'?d|i\s+would|i'?m|we'?d|we\s+would|we'?re|you\s+could|one\s+(?:could|would|might|can))\s+(?:be\s+)?(?:a\s+)?(?:buy(?:er|ing)?|sell(?:er|ing)?|hold(?:er|ing)?|accumulat\w+|load(?:ing)?\s+up)\b/i,
  /\bworth\s+(?:accumulating|buying|holding|adding|owning|keeping|a\s+(?:buy|hold|look))\b/i,
  /\b(?:take\s+(?:some\s+)?profits?|take\s+some\s+off|cut\s+(?:your\s+)?losses|go(?:ing)?\s+(?:long|short)|load(?:ing)?\s+up|ape\s+in)\b/i,
  /\bscal(?:e|ing)\s+(?:in|out|back)\b/i,
  /\btrim(?:ming|s)?\s+(?:exposure|position|the\s+position|your\s+position|some)\b/i,
  /\b(?:no\s+)?reason\s+to\s+(?:buy|sell|hold|exit|own)\b/i,
  /\b(?:easy|core|comfortable|solid|long[-\s]term)\s+hold\b/i,
  /\b(?:deserves?\s+to\s+be\s+held|case\s+for\s+holding|add(?:ing)?\s+(?:to\s+)?on\s+(?:any\s+)?weakness)\b/i,
  /\baccumulat\w+\s+(?:here|aggressively|now|the\s+dip)\b/i,
  /\b(?:strong\s+)?accumulation\s+opportunity\b/i,
  /\b(?:your|the|a\s+(?:good|great|solid))\s+entry\s+point\b/i,
  /^\s*(?:strong\s+)?(?:buy|sell|hold)\s*[.!]?\s*$/im, // a standalone "Buy" line/label
];

// %-allocation (#13) — a percentage or word-fraction tied to a portfolio/position,
// NOT bare percentages (price moves, supply %, holder %).
const ALLOCATION_PATTERNS = [
  new RegExp("\\b" + PCT + "\\s*(?:of\\s+(?:your\\s+)?(?:portfolio|holdings|bag|stack|net\\s+worth)|allocation|position)", "i"),
  new RegExp("\\b(?:allocat\\w*|invest\\w*|put\\w*|siz\\w*|weight\\w*)\\b[^.\\n]{0,40}?\\b" + PCT, "i"),
  new RegExp("\\b" + PCT + "\\s*(?:position|allocation|weighting|stake)\\b", "i"),
  new RegExp("\\b" + PCT + "\\b[^.\\n]{0,30}?\\b(?:of\\s+)?(?:your\\s+)?(?:portfolio|holdings|stack|bag|net\\s+worth|(?:your|a|the)\\s+position)\\b", "i"),
  /\b(?:a\s+)?(?:tenth|fifth|quarter|third|half)\s+of\s+(?:your\s+)?(?:portfolio|holdings|bag|stack|net\s+worth|position)\b/i,
  /\bslice\s+of\s+(?:your\s+)?(?:portfolio|holdings|bag|stack)\b/i,
];

// Aggregate score / rating / grade (#13 — the app shows separate signals, never one
// blended number).
const SCORE_PATTERNS = [
  /\b\d{1,3}\s?\/\s?(?:5|10|100)\b(?!\s?\/)/, // 7/10, 85/100 (not a date 12/10/26)
  /\b\d{1,2}\s+(?:out\s+of|outta)\s+(?:5|10|100|five|ten)\b/i, // 8 out of 10
  new RegExp("\\b" + NUM + "\\s+out\\s+of\\s+(?:5|10|100|five|ten)\\b", "i"), // seven out of ten
  /\b(?:overall|aggregate|composite|conviction|final|net)\s+(?:score|rating|grade|conviction)\b/i,
  /\b(?:score|rating|grade)\b\s*(?:of\s+|:\s*|=\s*|is\s+|this\s+(?:at\s+)?|it\s+(?:at\s+)?)?\d{1,3}(?:\.\d)?\b/i,
  new RegExp("\\brat(?:e|ed|ing)\\s+(?:this\\s+|it\\s+)?(?:a\\s+|an\\s+|at\\s+)?(?:\\d{1,2}(?:\\.\\d)?|" + NUM + ")\\b", "i"),
  /\b(?:\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)[\s-]+stars?\b/i,
  /\b(?:[Gg]rade|[Rr]ating|[Ss]core|[Cc]onviction)\b[^.\n]{0,14}?\b[A-F][+-]?(?![a-zA-Z])/, // Grade: A (label any case, grade letter must be uppercase)
  /\b[A-F][+-]?\s+(?:overall\s+)?(?:[Gg]rade|[Rr]ating|[Cc]onviction|[Ss]core)\b/, // B+ overall conviction
  /\bconviction\s*(?:level|score|rating)?\s*(?:is|:|=)\s*(?:very\s+|fairly\s+|quite\s+)?(?:high|medium|low|strong|weak)\b/i,
];

function reEscape(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Strip simple obfuscation so split/decorated violations still match: remove markdown
// emphasis/code chars and join single-letter-spaced runs ("b*u*y" -> "buy", "B U Y" ->
// "BUY"). Only ADDS a scanned variant; the original is scanned too.
function deobfuscate(text) {
  let t = text.replace(/[*_`~|]/g, "");
  t = t.replace(/\b(?:[A-Za-z]\s+){2,5}[A-Za-z]\b/g, (m) => m.replace(/\s+/g, ""));
  return t;
}

// Named-entity violations: project names / tickers the model was not given.
function findNameViolations(text, allowed) {
  const hits = [];
  let m;
  const cashtag = /\$([A-Za-z]{2,6})\b/g;
  while ((m = cashtag.exec(text)) !== null) {
    if (!allowed.has(m[1].toLowerCase())) hits.push("$" + m[1]);
  }
  const lower = text.toLowerCase();
  for (const name of PROJECT_NAMES) {
    if (allowed.has(name)) continue;
    if (new RegExp("\\b" + reEscape(name) + "\\b").test(lower)) hits.push(name);
  }
  for (const tk of TICKERS) {
    if (allowed.has(tk.toLowerCase())) continue;
    if (new RegExp("\\b" + tk + "\\b").test(text)) hits.push(tk); // case-sensitive: ALL-CAPS only
  }
  return hits;
}

function scanVariant(variant, allowed, add) {
  const scan = (type, patterns) => {
    for (const re of patterns) {
      const mm = variant.match(re);
      if (mm) add(type, mm[0].trim());
    }
  };
  scan("price", PRICE_PATTERNS);
  scan("advice", ADVICE_PATTERNS);
  scan("allocation", ALLOCATION_PATTERNS);
  scan("score", SCORE_PATTERNS);
  for (const name of findNameViolations(variant, allowed)) add("name", name);
}

// Validate one AI output. Returns { ok, violations:[{type, match}] }. Fails closed on
// empty/non-string input. Scans the raw text AND a de-obfuscated variant.
function validateOutput(text, options) {
  const opts = options || {};
  if (typeof text !== "string" || text.trim() === "") {
    return { ok: false, violations: [{ type: "empty", match: "" }] };
  }

  const allowed = new Set(ALWAYS_ALLOWED);
  for (const n of opts.allowedNames || []) {
    if (n) allowed.add(String(n).toLowerCase());
  }

  const violations = [];
  const seen = new Set();
  const add = (type, match) => {
    const key = type + "|" + String(match).toLowerCase();
    if (!seen.has(key)) { seen.add(key); violations.push({ type, match: String(match) }); }
  };

  for (const variant of [text, deobfuscate(text)]) scanVariant(variant, allowed, add);
  return { ok: violations.length === 0, violations };
}

// Fail-closed selection over candidate outputs (#16). Returns the first candidate that
// validates within (1 initial + MAX_REGENS) attempts; otherwise the SAFE fallback.
// NEVER returns violating text. The caller (B2) generates candidates lazily, but the
// cap + fail-closed selection logic live here so they can be tested directly.
function selectValidated(candidates, options, fallback) {
  const list = Array.isArray(candidates) ? candidates : [];
  const limit = MAX_REGENS + 1; // 1 initial generation + N regens
  const checked = Math.min(list.length, limit);
  for (let i = 0; i < checked; i++) {
    if (validateOutput(list[i], options).ok) {
      return { ok: true, text: list[i], attempts: i + 1, fellBack: false };
    }
  }
  return { ok: false, text: typeof fallback === "string" ? fallback : "", attempts: checked, fellBack: true };
}

module.exports = {
  validateOutput,
  selectValidated,
  findNameViolations,
  deobfuscate,
  MAX_REGENS,
  ALWAYS_ALLOWED,
  PROJECT_NAMES,
  TICKERS,
};
