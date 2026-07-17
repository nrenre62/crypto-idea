/**
 * Pure network helpers (API-SECURITY review, 2026-07-08) — CommonJS, no firebase imports.
 *
 * clientIp() derives the rate-limit key from X-Forwarded-For SAFELY. The old code used
 * the LEFT-most XFF token, which is fully attacker-controlled behind Firebase Hosting →
 * Cloud Functions (Google APPENDS the real client IP on the right), so rotating that header
 * minted a fresh rate-limit bucket per request and defeated every /api limit. We instead
 * read a fixed number of trusted-proxy hops from the RIGHT (the entries Google appended),
 * validate the token is a well-formed IP, and fall back to req.ip — so a spoofed left-most
 * value is ignored.
 *
 * NOTE: the exact hop count is deployment-specific (a plain GCLB puts the client
 * second-from-right; a Fastly/Hosting layer adds hops). Default is 2 (the common GCLB→CF
 * value); override with RL_TRUSTED_HOPS once confirmed from a prod log. This is
 * defense-in-depth against trivial single-host bypass — App Check / reCAPTCHA on the public
 * endpoints is the durable control at go-live, and the real denial-of-wallet protection is
 * that the fan-out endpoints only ever fetch coins already in the shared universe.
 */

// Accept a well-formed IPv4 or (compressed/full) IPv6 literal. Deliberately strict so a
// spoofed non-IP token (or an empty hop) is rejected and we fall back to req.ip.
function isValidIp(s) {
  if (typeof s !== "string" || !s) return false;
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const m = v4.exec(s);
  if (m) return m.slice(1).every((o) => Number(o) <= 255);
  // IPv6: hex groups + ':' (covers '::' compression and IPv4-mapped tails) — good enough as a key gate.
  if (/^[0-9a-fA-F:]+$/.test(s) && s.includes(":") && s.length <= 45) return true;
  return false;
}

// Derive a stable, hard-to-spoof client key. `hops` = how many trusted proxies the platform
// appends on the RIGHT (the client IP sits at length-hops). Falls back to reqIp, then the
// right-most valid IP, then "unknown".
function clientIp(xffHeader, reqIp, hops) {
  const n = Number.isFinite(hops) && hops >= 1 ? Math.floor(hops) : 2;
  const parts = String(xffHeader || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length >= n) {
    const cand = parts[parts.length - n];
    if (isValidIp(cand)) return cand;
  }
  if (isValidIp(reqIp)) return reqIp;
  // last resort: the right-most valid IP in the chain (still not the attacker-controlled left)
  for (let i = parts.length - 1; i >= 0; i--) if (isValidIp(parts[i])) return parts[i];
  return "unknown";
}

module.exports = { isValidIp, clientIp };
