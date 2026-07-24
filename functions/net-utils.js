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
//
// ADMIN-3 fix (2026-07-24): the IPv6 branch used to be `/^[0-9a-fA-F:]+$/`, which has no
// place for the dots in an IPv4-MAPPED address (`::ffff:203.0.113.9`) — the exact form a
// dual-stack Node/Express server reports in req.ip and that appears in real XFF chains.
// Rejecting it made clientIp() fall through to "unknown", so every such caller collapsed
// into ONE shared rate-limit bucket. Now handled explicitly.
function isValidIp(s) {
  if (typeof s !== "string" || !s) return false;
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const m = v4.exec(s);
  if (m) return m.slice(1).every((o) => Number(o) <= 255);
  if (!s.includes(":") || s.length > 45) return false;
  const cut = s.lastIndexOf(":");
  const tail = s.slice(cut + 1);
  // IPv4-mapped/compatible IPv6: validate the dotted tail as IPv4 and the rest as hex+colons.
  if (tail.includes(".")) return isValidIp(tail) && isIpv6Prefix(s.slice(0, cut + 1));
  return isIpv6Prefix(s);
}

// Shape gate for the colon-separated part. Loose enough not to re-implement RFC 4291,
// strict enough that junk like ":::::" or "::::z" can't pass as an address and end up
// recorded as the origin of an admin action: at most one "::" run, no 3+ colon runs, and
// every group at most 4 hex digits.
function isIpv6Prefix(s) {
  if (!/^[0-9a-fA-F:]*$/.test(s)) return false;
  if (/:{3,}/.test(s)) return false;                 // ":::" is never valid
  if ((s.match(/::/g) || []).length > 1) return false; // only one compression run
  if (!/[0-9a-fA-F]/.test(s) && s !== "::") return false; // must carry at least one digit
  return s.split(":").every((g) => g.length <= 4);
}

// `::ffff:203.0.113.9` and `203.0.113.9` are the SAME client. Collapsing the mapped form
// to its IPv4 keeps one bucket per client (an XFF hop and req.ip often disagree on form)
// and keeps the audit log readable.
function normalizeIp(s) {
  const m = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i.exec(String(s || ""));
  return m ? m[1] : s;
}

// Derive a stable, hard-to-spoof client key. `hops` = how many trusted proxies the platform
// appends on the RIGHT (the client IP sits at length-hops). Falls back to reqIp, then the
// right-most valid IP, then "unknown".
function clientIp(xffHeader, reqIp, hops) {
  const n = Number.isFinite(hops) && hops >= 1 ? Math.floor(hops) : 2;
  const parts = String(xffHeader || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length >= n) {
    const cand = parts[parts.length - n];
    if (isValidIp(cand)) return normalizeIp(cand);
  }
  if (isValidIp(reqIp)) return normalizeIp(reqIp);
  // last resort: the right-most valid IP in the chain (still not the attacker-controlled left)
  for (let i = parts.length - 1; i >= 0; i--) if (isValidIp(parts[i])) return normalizeIp(parts[i]);
  return "unknown";
}

// ADMIN-3: the source IP recorded on an audit entry. Same spoof-resistant derivation
// as the rate limiter (see clientIp) — a caller-supplied left-most X-Forwarded-For
// token must never be able to forge the origin an action is logged against, or the
// log would actively mislead an investigation. Returns "" (rather than "unknown")
// when there is no HTTP request at all, so such a row simply carries no ip.
// `.ip` is an EXPRESS property. It is there in deployed Cloud Functions (and is what the
// rate limiter already relies on), but not on a bare Node request — and the functions
// EMULATOR passes a synthetic request with headers only: no ip, no socket, no
// X-Forwarded-For. So fall back to the socket address, and when there is genuinely no
// address, record nothing rather than a placeholder. Locally that means audit entries
// carry an empty ip, which is correct — there is no origin to record.
//
// ⚠️ TRUST BOUNDARY, unverified until deploy. `hops` is how many entries the platform
// appends to the RIGHT of X-Forwarded-For, and it is **per ingress path**. `/api/*`
// arrives via Firebase Hosting → Cloud Functions; a CALLABLE is invoked directly on
// cloudfunctions.net. Those chains can differ in length, and a single RL_TRUSTED_HOPS is
// applied to both. If the callable chain is SHORTER than `hops`, the value picked is the
// caller-supplied left-most token — i.e. forgeable. Until the real chain is read from a
// prod log for BOTH paths (go-live checklist) treat a recorded IP as **advisory
// corroboration, not evidence**. Getting this wrong is not fail-open for authorization —
// nothing is authorized on the IP — it only affects what the log attributes.
function auditIp(rawRequest, hops) {
  if (!rawRequest) return "";
  const sock = rawRequest.socket || rawRequest.connection || null;
  const reqIp = rawRequest.ip || (sock && sock.remoteAddress) || "";
  const ip = clientIp((rawRequest.headers || {})["x-forwarded-for"], reqIp, hops);
  return ip === "unknown" ? "" : ip;
}

module.exports = { isValidIp, clientIp, auditIp, normalizeIp };
