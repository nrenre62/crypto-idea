// ADMIN-2 — per-feature kill-switches.
//
// Two global toggles already existed (maintenance, signupsEnabled). Those stop the
// WHOLE product; this adds switches for the three surfaces that can fail or cost
// money on their own, so an incident in one doesn't force the whole app off.
//
// Stored at config/app → flags.features. Read server-side for enforcement and
// published (non-secret) on /api/config so the UI can be honest about what's off.
//
// Pure module: no Firestore, no network — so every rule below is unit-testable.

// The declared switches. Adding a key here is the ONLY way to add a switch: the
// admin UI, /api/config and sanitizeFeatures all enumerate from this map, so a
// new switch can never be half-wired (settable but not published, or vice versa).
const FEATURES = {
  marketData: "Live market data — CoinGecko prices, search, coin list and history.",
  checkout: "New subscription checkout — starting a PayPal subscription.",
  aiResearch: "AI research — OFF hides the Research → Ask chat AND the Coins section AND the Research sub-nav (Overview-only); default OFF at launch; also gates the Wave-B AI proxy when it ships.",
};

const NAMES = Object.keys(FEATURES);

// Per-flag default state (CRYP-112). A switch is honored when its key is present
// in config; when the key is ABSENT the answer is this default.
const DEFAULTS = { marketData: true, checkout: true, aiResearch: false };

// A present switch is ON unless config says EXACTLY false; an ABSENT switch takes
// its per-flag DEFAULT.
//
// marketData and checkout are default-ON, and that is load-bearing. config/app can
// be missing (fresh project), unreadable (a transient Firestore error), or simply
// predate these switches — and in each of those cases the correct answer for a
// working, cost-bearing feature is "carry on", not "silently take the product down".
// Those kill-switches only ever fire because somebody deliberately flipped them.
// (Contrast signupsEnabled, which uses the same fail-ON idiom for the same reason.)
//
// aiResearch is the deliberate launch exception: it defaults OFF. It gates an
// as-yet-unbuilt feature whose fail-SAFE state is "hidden", and the app degrades to
// a fully working non-AI product when it's off — so an unconfigured / fresh deploy
// hides AI with no admin action. The client MIRRORS this per-flag default, so the
// two ends can't disagree (ADMIN-2). Only an explicit value moves a switch off its
// default; an undeclared name (not in DEFAULTS) still reads as ON.
function featureEnabled(cfg, name) {
  const f = cfg && cfg.flags && cfg.flags.features;
  if (f && name in f) return f[name] !== false;
  return name in DEFAULTS ? DEFAULTS[name] : true;
}

// The full normalized map — every declared switch, always present, always boolean.
// Callers (the /api/config payload, the admin form) never see a partial object,
// so no UI has to decide what a missing key means.
function readFeatures(cfg) {
  const out = {};
  for (const name of NAMES) out[name] = featureEnabled(cfg, name);
  return out;
}

// Normalize what an admin submitted before it is written. Enumerating from
// FEATURES (rather than copying the input) means an unknown key can't be stored:
// the config doc stays exactly the declared shape, so a typo'd switch name is
// dropped instead of silently persisting as a flag nothing reads.
function sanitizeFeatures(input) {
  const src = input && typeof input === "object" ? input : {};
  const out = {};
  for (const name of NAMES) out[name] = name in src ? src[name] !== false : DEFAULTS[name];
  return out;
}

// Merge a submitted map over the stored one with KEEP semantics: a switch the
// payload does not mention keeps its stored value.
//
// This is the difference between a working kill-switch and a booby trap. saveConfig
// is called from several places (the full Settings form, but also the instant
// maintenance/signups toggles), and any payload that omitted `features` must keep the
// STORED value of every absent switch. A copy-the-input merge would let a `flags`-only
// toggle silently re-enable the very feature you just killed (marketData/checkout), or
// resurrect aiResearch to ON past its DEFAULT-OFF (CRYP-112). We derive `current` from
// the default-aware sanitizeFeatures, so an unset switch falls back to its per-flag
// default, never a blanket ON. Same rule Firestore's {merge:true} gives the rest of
// the config doc.
//
// BOTH arguments are feature MAPS ({marketData: false, …}) — not the enclosing
// `flags` object. Handing it `flags` finds no switch names at the top level and
// silently returns the defaults, which is the precise failure this function exists to
// prevent; tests/unit/features.test.js pins the intended call shape.
function mergeFeatures(incoming, existing) {
  const current = sanitizeFeatures(existing);
  if (!incoming || typeof incoming !== "object") return current;
  const out = {};
  for (const name of NAMES) out[name] = name in incoming ? incoming[name] !== false : current[name];
  return out;
}

// Which switches are currently OFF — for the admin status strip and for logs.
function disabledFeatures(cfg) {
  return NAMES.filter((name) => !featureEnabled(cfg, name));
}

module.exports = { FEATURES, FEATURE_NAMES: NAMES, featureEnabled, readFeatures, sanitizeFeatures, mergeFeatures, disabledFeatures };
