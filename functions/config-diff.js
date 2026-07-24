/**
 * ADMIN-3 — config change versioning / diff.  Pure CommonJS, no firebase imports.
 *
 * A `saveConfig` used to log the useless "updated app config", so a bad edit (a wrong
 * plan price, maintenance flipped on, a legal ID cleared) could not be inspected or
 * undone from the log. These helpers turn the before/after config docs into a
 * field-level, human-readable summary that goes into the audit entry's `details`.
 *
 * SECURITY: the config doc holds live secrets, and the audit log is read by every
 * admin in the panel — so a secret's VALUE must never reach it. The rule is exact
 * and mechanical: a field guarded by the `keep()` idiom in saveConfig (a blank form
 * field keeps the stored value, i.e. it is never echoed back to a client) is a
 * secret, and is recorded only as "(changed)". Everything else is operational
 * config an admin is entitled to see.
 */

// Dotted paths whose VALUES must never be written to the audit log. Must stay in
// sync with the keep()-guarded fields in saveConfig (functions/index.js).
const SECRET_PATHS = new Set([
  "coingecko",          // CoinGecko API key
  "paypal.secret",      // PayPal REST secret
  "email.apiKey",       // transactional-email provider key
  "ai.anthropicKey",    // Anthropic key for the Wave-B AI proxy
]);

// Bookkeeping fields that change on every save and say nothing about intent.
const IGNORED_PATHS = new Set(["updatedAt"]);

// Render one value for the log: short, unambiguous, and never multi-line.
function show(v) {
  if (v === undefined) return "(unset)";
  if (v === null) return "(none)";
  if (v === "") return "(empty)";
  if (typeof v === "string") return v.length > 60 ? v.slice(0, 57) + "…" : v;
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

const isPlainObject = (v) => !!v && typeof v === "object" && !Array.isArray(v);
// "not set" and "set to empty" are the same state to an operator reading the log.
const isBlank = (v) => v === undefined || v === null || v === "";

/**
 * Compare two config docs and return an array of "path: old → new" strings
 * (secrets collapse to "path: (changed)"). An unchanged config returns [].
 *
 * Walks the keys of `after` ONLY — never the union. saveConfig writes with
 * `{merge:true}`, so a key that exists in the stored doc but not in the payload is
 * KEPT, not deleted; walking the union would log phantom "value → (unset)" removals
 * for any legacy field. Reporting exactly what the save wrote is the honest diff.
 */
function diffConfig(before, after) {
  const out = [];
  const walk = (a, b, prefix) => {
    for (const k of Object.keys(b || {})) {
      const path = prefix ? prefix + "." + k : k;
      if (IGNORED_PATHS.has(path)) continue;
      const av = a ? a[k] : undefined;
      const bv = b ? b[k] : undefined;
      if (isPlainObject(av) || isPlainObject(bv)) {
        // Recurse when either side is an object; a scalar↔object swap is reported
        // by the recursion as its individual leaf changes, which is what an admin
        // actually needs to see.
        walk(isPlainObject(av) ? av : {}, isPlainObject(bv) ? bv : {}, path);
        continue;
      }
      if (av === bv) continue;
      // "absent" and "empty string" are the same state, and moving between them is NOT a
      // change. This matters most for secrets: on a first save the stored doc has no
      // `coingecko` key while the payload writes "", which would otherwise log
      // `coingecko: (changed)` — a phantom KEY ROTATION for a key that was never set.
      // (`false` and `0` are real values and must not be swallowed here.)
      if (isBlank(av) && isBlank(bv)) continue;
      out.push(SECRET_PATHS.has(path) ? path + ": (changed)" : path + ": " + show(av) + " → " + show(bv));
    }
  };
  walk(before || {}, after || {}, "");
  return out;
}

// The audit `details` field is a single bounded string — a first save, or a config with
// every plan rewritten, would otherwise write a huge document. 500 is not arbitrary: it
// is the maxLength the API contract declares for AuditEntry.details (openapi.json), so
// the two must move together. Keep WHOLE entries and say how many were dropped, rather
// than silently cutting one in half.
const DETAILS_MAX = 500;
// Room set aside for the " (+N more)" suffix so the FINAL string honours DETAILS_MAX —
// a bound that only applies before the suffix is not a bound.
const SUFFIX_RESERVE = 16;

function formatConfigDiff(changes) {
  const raw = changes || [];
  if (raw.length === 0) return "no changes";
  // Secret rotations first. They are the most security-relevant lines in the entry, and on
  // a FIRST save (where every plan field also shows up) they would otherwise be the ones
  // pushed past the cap — so the log would fail to record that an API key was set at all.
  const list = [
    ...raw.filter((c) => c.endsWith(": (changed)")),
    ...raw.filter((c) => !c.endsWith(": (changed)")),
  ];
  const joined = list.join(", ");
  if (joined.length <= DETAILS_MAX) return joined;

  const room = DETAILS_MAX - SUFFIX_RESERVE;
  const kept = [];
  let len = 0;
  for (const c of list) {
    const add = (kept.length ? 2 : 0) + c.length;   // ", " separator
    if (len + add > room) break;
    kept.push(c); len += add;
  }
  // One change longer than the entire budget: keep a truncated head rather than nothing.
  const head = kept.length ? kept.join(", ") : list[0].slice(0, room - 1) + "…";
  const dropped = list.length - kept.length;
  return `${head} (+${dropped} more)`.slice(0, DETAILS_MAX);
}

// Who may READ a config diff. Settings is owner-only behind a step-up re-auth
// (assertFreshOwner), but the audit log is readable by ANY admin — so echoing the diff
// to a manager through the Audit tab would route straight around that boundary. A
// non-owner still sees THAT a save happened (the trail is the point), never what it
// changed. Pure so it can be unit-tested without invoking the callable.
const OWNER_ONLY_DETAIL_ACTIONS = new Set(["saveConfig"]);
const REDACTED_DETAILS = "settings changed — details are visible to owners only";

function auditDetailsFor(action, details, callerIsOwner) {
  if (!callerIsOwner && OWNER_ONLY_DETAIL_ACTIONS.has(action)) return REDACTED_DETAILS;
  return details || "";
}

module.exports = {
  diffConfig, formatConfigDiff, auditDetailsFor,
  SECRET_PATHS, DETAILS_MAX, OWNER_ONLY_DETAIL_ACTIONS, REDACTED_DETAILS,
};
