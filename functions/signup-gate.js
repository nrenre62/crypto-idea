/**
 * ADMIN-0 — server-side signups gate (the Auth `beforeCreate` decision).
 *
 * `signupsEnabled` has always been a CLIENT gate: the Register tab greys out, but
 * `createUserWithEmailAndPassword` talks straight to Firebase Auth, so a scripted
 * client (or a stale ~60s CDN copy of /api/config) walks right past it. A blocking
 * function is the only place the answer is authoritative, because it runs inside
 * account creation itself.
 *
 * Pure + injected like the rest of the guard logic, for one specific reason: a
 * blocking function that throws for ANY reason blocks the signup. Keeping the
 * decision in a dependency-free function means the whole truth table is unit-tested
 * with no emulator, and the wrapper in index.js only has to not throw.
 *
 * FAIL OPEN — deliberately. `null` means "we could not read the config", and that
 * must read as ALLOW, never as BLOCK. It mirrors ADMIN-2's default-ON kill-switch
 * rule and the `!== false` idiom signupsEnabled already uses everywhere else: a
 * Firestore blip must never silently kill the signup funnel with no error, no alert
 * and no visible cause. The exposure it accepts is narrow and self-healing — the
 * window where signups are DELIBERATELY paused *and* the config is unreadable.
 */

// The single rule. A signup is allowed unless config says EXACTLY false, so a
// config doc that predates this flag (or lacks `flags` entirely) still allows.
function signupsEnabled(cfg) {
  const flags = cfg && cfg.flags;
  return !(flags && flags.signupsEnabled === false);
}

/**
 * Decide one signup attempt.
 * @param cfg the `config/app` document, or **null/undefined when the read FAILED**.
 *            Note the asymmetry that matters: `{}` is a successfully-read empty
 *            config (allow, "enabled"), while `null` is an unknown one (allow,
 *            "config-unavailable"). Same verdict, different reason — the reason is
 *            what gets logged, so a degraded read is distinguishable from a healthy
 *            one instead of both looking like business as usual.
 */
function signupDecision(cfg) {
  if (cfg === null || cfg === undefined) return { allow: true, reason: "config-unavailable" };
  if (!signupsEnabled(cfg)) return { allow: false, reason: "signups-paused" };
  return { allow: true, reason: "enabled" };
}

// What a blocked caller is told. Deliberately the SAME sentence the client shows
// when it knows signups are off (CryptoIdea.jsx) — a user who slips through the
// ~60s config cache must not get a different, scarier story than one who doesn't.
const BLOCKED_MESSAGE = "New signups are currently paused. Please check back soon.";

module.exports = { signupsEnabled, signupDecision, BLOCKED_MESSAGE };
