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
  aiResearch: "AI research — hides the Research → Ask chat now; also gates the Wave-B Pulse / Ask AI proxy when it ships.",
};

const NAMES = Object.keys(FEATURES);

// A switch is ON unless config says EXACTLY false.
//
// Default-ON is deliberate and load-bearing. config/app can be missing (fresh
// project), unreadable (a transient Firestore error), or simply predate this
// feature — and in every one of those cases the correct answer is "carry on",
// not "silently take the product down". A kill-switch must only ever fire because
// somebody deliberately flipped it. (Contrast signupsEnabled, which uses the same
// !== false idiom for the same reason.)
function featureEnabled(cfg, name) {
  const f = cfg && cfg.flags && cfg.flags.features;
  return !(f && f[name] === false);
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
  const src = input || {};
  const out = {};
  for (const name of NAMES) out[name] = src[name] !== false;
  return out;
}

// Merge a submitted map over the stored one with KEEP semantics: a switch the
// payload does not mention keeps its stored value.
//
// This is the difference between a working kill-switch and a booby trap. saveConfig
// is called from several places (the full Settings form, but also the instant
// maintenance/signups toggles), and any payload that omitted `features` would, under
// plain sanitizeFeatures, read every absent switch as ON — so flipping maintenance
// during an incident would silently re-enable the very feature you just killed.
// Same rule Firestore's {merge:true} already gives the rest of the config doc.
//
// BOTH arguments are feature MAPS ({marketData: false, …}) — not the enclosing
// `flags` object. Handing it `flags` finds no switch names at the top level and
// silently returns all-ON, which is the precise failure this function exists to
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
