/**
 * Crypto Idea — Cloud Functions (PayPal)
 * ========================================
 *
 * SETUP:
 * 1. cd functions && npm install
 * 2. Configuration (functions.config() was removed in firebase-functions v7):
 *    - PRIMARY: set PayPal/CoinGecko keys from the Admin dashboard → Settings,
 *      which writes the locked config/app Firestore doc (read at runtime).
 *    - FALLBACK / deploy-time: a functions/.env file (git-ignored) with
 *      PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_PLAN_ID, PAYPAL_PREMIUM_PLAN_ID,
 *      PAYPAL_WEBHOOK_ID, APP_URL, COINGECKO_DEMO_KEY. The PayPal plan IDs and
 *      APP_URL are env-only (not stored in the config doc).
 * 3. firebase deploy --only functions
 * 4. PayPal Developer Dashboard → Webhooks → Add URL:
 *    https://<REGION>-<PROJECT>.cloudfunctions.net/paypalWebhook   (e.g. us-central1-…)
 *    v1 functions are region-prefixed — copy the EXACT URL the deploy printed.
 *    A region-less URL registers fine at PayPal and silently receives nothing.
 *    Events: BILLING.SUBSCRIPTION.ACTIVATED, CANCELLED, SUSPENDED, PAYMENT.SALE.COMPLETED
 *    Then copy the Webhook ID into paypal.webhook_id above.
 *
 * SECURITY MODEL:
 * - createSubscription / cancelSubscription / getStats are onCall functions:
 *   Firebase verifies the caller's ID token automatically (context.auth).
 *   They act on the CALLER's own uid — never a uid taken from the request body.
 * - paypalWebhook is a public endpoint (PayPal posts to it), so every event is
 *   cryptographically verified with PayPal's verify-webhook-signature API before
 *   we trust it. Unverified events are rejected.
 */

// v1 API (onCall(data, context) + pubsub.schedule). functions.config() was
// removed in firebase-functions v7, so every secret now comes from either the
// locked config/app Firestore doc (primary, admin-managed via saveConfig) or an
// environment variable (fallback, from functions/.env or the deploy env).
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
// Sentinels via the modular subpath — `admin.firestore.FieldValue` is undefined inside the
// functions emulator (the namespace is proxied), so the namespace form throws there. See ERRORS.md C3.
const { FieldValue } = require("firebase-admin/firestore");
// BL-1a/BL-1b: shared security guards (per-uid limiter / cooldown / App Check gate)
// and the pure PayPal-billing decision logic — both dependency-injected + unit-tested.
const { checkCooldown, consumeDailyBudget } = require("./guards.js");
const guards = require("./guards.js");   // ADMIN-SEC role gates (requireOwner/requireFreshAuth/roleOf)
const billing = require("./billing.js");
// C-R2b (C14): trim the universe's lowest-rank tail instead of hitting the 1 MiB doc cap.
const { trimUniverse } = require("./universe-utils.js");
// API-SECURITY (2026-07-08): spoof-resistant client IP for the per-IP rate limiter.
// ADMIN-3: auditIp reuses the same derivation to stamp audit entries with an origin.
const { clientIp, auditIp } = require("./net-utils.js");
// ADMIN-3: pure before/after config diff for the saveConfig audit entry (secrets redacted).
const { diffConfig, formatConfigDiff, auditDetailsFor } = require("./config-diff.js");
// ADMIN-4: pure shape + UTC-day id for the daily growth snapshot (statsDaily/{date}).
const statsDaily = require("./stats-daily.js");
// ADMIN-2: per-feature kill-switches (config/app → flags.features) and server-side
// error reporting. `observability` is a no-op — and never loads its SDK — until a
// Sentry DSN is configured in admin Settings.
const featureFlags = require("./features.js");
const observability = require("./observability.js");
// ADMIN-0: the pure signups decision behind the Auth beforeCreate blocking function.
const signupGate = require("./signup-gate.js");
// ADMIN-5: the site announcement banner (sanitise/merge/publish) + the pure
// before/after formatter for per-user admin-action audit entries.
const announce = require("./announcement.js");
const { changeDetail } = require("./audit-diff.js");
// How many trusted proxy hops the platform appends on the RIGHT of X-Forwarded-For.
// Default 2 (common GCLB→Cloud Functions); confirm from a prod log + override if needed.
const RL_TRUSTED_HOPS = Number(process.env.RL_TRUSTED_HOPS) || 2;

admin.initializeApp();
const db = admin.firestore();

// PayPal fallbacks (env). The primary source for clientId/secret/webhookId is the
// config/app doc (read in getPayPalToken / verifyPayPalWebhook); the plan IDs are
// env-only. Never hard-code secrets — these stay server-side.
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
const PAYPAL_PLAN_ID = process.env.PAYPAL_PLAN_ID;
const PAYPAL_PREMIUM_PLAN_ID = process.env.PAYPAL_PREMIUM_PLAN_ID;
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID;
const PAYPAL_BASE = "https://api-m.paypal.com";

// Fixed, trusted app URL for PayPal redirects (never derived from request headers,
// which a caller can spoof — that would be an open-redirect).
const APP_URL = process.env.APP_URL || "https://crypto-idea.web.app";

// Admin is a verified Firebase custom claim, set via the Admin SDK. ADMIN-SEC adds a
// `role` to it: "owner" (script-only, protected) or "manager" (accounts only).
function isAdminToken(token) {
  return !!token && token.admin === true;
}

/* ─── ADMIN-SEC: role gates ───────────────────────────────────────────────────
 * The decision logic is pure + unit-tested in guards.js; these thin wrappers turn a
 * decision into the HttpsError the callable throws. Every admin callable goes through
 * exactly one of them — no callable re-implements the check, which is what stops a
 * future edit from quietly leaving one endpoint open.
 *
 *   assertAdmin   — any admin claim (incl. legacy role-less). Read surface.
 *   assertManager — account-management surface. Same floor, named for the matrix.
 *   assertOwner   — Settings, grant/revoke manager, permanent erasure.
 *   assertFreshOwner — assertOwner + a recent password re-auth (step-up).
 *
 * Returns the caller's role so the callable can apply owner-target protection.
 */
function denied(reason) {
  if (reason === "unauthenticated") return new functions.https.HttpsError("unauthenticated", "Sign in first.");
  if (reason === "owner-required") {
    return new functions.https.HttpsError("permission-denied", "Owners only. Your admin account doesn't have owner access.");
  }
  if (reason === "reauth-required") {
    // The client watches for this exact code to re-prompt for the password.
    return new functions.https.HttpsError("failed-precondition", "reauth-required: confirm your password to continue.");
  }
  if (reason === "mfa-required") {
    // ADMIN-0. Distinct from reauth-required: a password re-prompt cannot satisfy
    // this one, so the client must NOT offer the unlock modal — say what's actually
    // wrong instead of looping them through a control that can never succeed.
    return new functions.https.HttpsError("failed-precondition", "mfa-required: this admin account must sign in with two-factor authentication.");
  }
  return new functions.https.HttpsError("permission-denied", "Admins only.");
}

// ADMIN-0: two-factor gate for the WHOLE admin surface. It hangs off assertRole
// rather than each callable for the ADMIN-2 choke-point reason — a check repeated
// at 18 call sites is one a 19th call site forgets. Off unless config says exactly
// true (see guards.requireMfa for why the default is the strict one here).
async function assertMfa(context) {
  const cfg = await getConfig();
  const enforce = !!(cfg && cfg.flags && cfg.flags.requireAdminMfa === true);
  const d = guards.requireMfa(context, { enforce });
  if (!d.ok) throw denied(d.reason);
}

// The one place a role decision becomes an HttpsError. Every gate below is this
// function with a different pure decider, so MFA (and anything added later) can
// never be wired into two of the three and missed on the third.
//
// ⚠️ These are ASYNC as of ADMIN-0. A call site that forgets `await` gets a
// (truthy) Promise and NO throw — an open endpoint that still looks walled. That
// failure is invisible in review, so tests/unit/admin-0-guards.test.js fails the
// build if any assert* call site is missing its await.
async function assertRole(context, decide) {
  const d = decide(context);
  if (!d.ok) throw denied(d.reason);
  await assertMfa(context);
  return d.role;
}
async function assertAdmin(context) { return assertRole(context, guards.requireAdmin); }
async function assertManager(context) { return assertRole(context, guards.requireManager); }
async function assertOwner(context) { return assertRole(context, guards.requireOwner); }
// Step-up gate. `enforce` is read from config so it can be turned off from the
// Firebase console if it ever misfires — Settings is where the flag lives, so a
// self-locking gate would otherwise have no recovery path that doesn't need a deploy.
async function assertFreshOwner(context) {
  const role = await assertOwner(context);
  const cfg = await getConfig();
  const enforce = !(cfg && cfg.flags && cfg.flags.stepUpReauth === false);
  const d = guards.requireFreshAuth(context, { enforce });
  if (!d.ok) throw denied(d.reason);
  return role;
}

// Deny-by-default input shape: reject a callable whose `data` carries any top-level
// key the handler doesn't read. openapi.json documents every callable request as
// additionalProperties:false, but the handlers previously IGNORED unknown keys — so
// this enforces that contract (API-SECURITY §5 follow-up). Called AFTER the auth/role
// gate so an unauthorized caller still gets 401/403 first. A no-arg call passes;
// nested shapes stay each handler's own concern (e.g. saveConfig's merge + keep()).
// The message is deliberately generic — it never echoes the caller's field names.
function assertNoUnknownKeys(data, allowed) {
  if (guards.unknownKeys(data, allowed).length) {
    throw new functions.https.HttpsError("invalid-argument", "Unexpected field in the request.");
  }
}

// Resolves a TARGET account's role from its custom claims (not from the caller's
// token). Used for owner protection — owners are identified by identity, which is
// the whole fix for the "promote sock-puppets, then delete the real owners" bypass.
async function roleOfUid(uid) {
  try {
    const rec = await admin.auth().getUser(uid);
    return guards.roleOf((rec && rec.customClaims) || null);
  } catch (e) { return ""; }   // no auth record → not an owner
}

// Owner protection. Owners can never be demoted or deleted by anyone, and a MANAGER
// may not act on an owner at all — otherwise "accounts only" still allows suspending
// both owners (which disables their Auth accounts), locking the founders out by a
// different route while the admin count looks healthy.
async function assertTargetAllowed(uid, callerRole, what) {
  const targetRole = await roleOfUid(uid);
  if (targetRole !== guards.ROLE_OWNER) return targetRole;
  if (what === "protected") {
    throw new functions.https.HttpsError("failed-precondition", "Owner accounts are protected — they can't be deleted or demoted.");
  }
  if (callerRole !== guards.ROLE_OWNER) {
    throw new functions.https.HttpsError("permission-denied", "Owner accounts can only be managed by another owner.");
  }
  return targetRole;
}

// The app must always keep at least this many admins, so admin access can never
// become a single point of failure or be wiped out entirely.
const MIN_ADMINS = 2;

// Soft-delete grace period: a self-deleted account is kept (recoverable) for this
// long, then permanently purged. Visible in the admin "Trash" tab; the user can
// restore it themselves by logging back in within the window.
const TRASH_DAYS = 30;
const TRASH_MS = TRASH_DAYS * 24 * 60 * 60 * 1000;

// Counts accounts that currently hold the { admin: true } claim. Paginates through
// all users (fine at our scale) — used by the guard below before any action that
// would remove an admin (delete / demote / admin self-delete).
async function countAdmins() {
  let count = 0;
  let pageToken;
  do {
    const res = await admin.auth().listUsers(1000, pageToken);
    res.users.forEach((u) => { if (u.customClaims && u.customClaims.admin === true) count += 1; });
    pageToken = res.pageToken;
  } while (pageToken);
  return count;
}

// ADMIN-SEC: counts OWNERS who can actually sign in. `disabled` matters — a suspended
// owner still holds the claim, so a count that ignored it would report a healthy floor
// while nobody could actually get in. Used by the health check the panel surfaces.
async function countActiveOwners() {
  let count = 0;
  let pageToken;
  do {
    const res = await admin.auth().listUsers(1000, pageToken);
    res.users.forEach((u) => {
      if (!u.disabled && guards.roleOf(u.customClaims || null) === guards.ROLE_OWNER) count += 1;
    });
    pageToken = res.pageToken;
  } while (pageToken);
  return count;
}

// Append an admin action to the server-only `audit` collection. Best-effort:
// audit logging must NEVER break the action it's recording.
//
// ADMIN-3: entries also carry the caller's source `ip`, derived by the same
// spoof-resistant rule as the rate limiter (net-utils.auditIp) — a forgeable origin
// is worse than none. Founder decision 2026-07-24: record it on EVERY audited
// event, including the self-service/billing ones, not just admin actions. That is a
// deliberate PII trade-off — an IP is personal data and audit rows outlive the
// account they describe — and the control on it is the existing 365-day retention
// sweep (purgeOldAudit) plus the collection being server-only in firestore.rules.
async function writeAudit(context, action, info) {
  try {
    await db.collection("audit").add({
      actorUid: (context.auth && context.auth.uid) || "",
      actorEmail: (context.auth && context.auth.token && context.auth.token.email) || "",
      action,
      targetUid: (info && info.targetUid) || "",
      targetEmail: (info && info.targetEmail) || "",
      details: (info && info.details) || "",
      ip: auditIp(context && context.rawRequest, RL_TRUSTED_HOPS),
      at: Date.now(),   // server-side ms; avoids admin.firestore.FieldValue (undefined in the emulator)
    });
  } catch (e) { console.error("writeAudit failed:", e && e.message); }
}

/* ═══ ADMIN-0: hard server-side signups-off (Auth beforeCreate) ═════════════════
 * The "Allow new signups" toggle was a CLIENT gate only. Register greys out in the
 * UI, but createUserWithEmailAndPassword talks straight to Firebase Auth, so a
 * scripted client — or an honest one holding a stale ~60s /api/config — creates the
 * account anyway. This blocking function runs INSIDE account creation, which is the
 * only place the answer is authoritative.
 *
 * ⚠️ DEPLOY NOTE: blocking functions require **Identity Platform** on the project.
 * `firebase deploy` fails on a project without it — see the go-live runbook. The
 * Auth EMULATOR supports them, so this is verifiable locally today.
 *
 * Reads config/app FRESH rather than through getConfig()'s 5-minute cache: this is
 * an enforcement point, and ADMIN-2's lesson was that enforcement must not lag the
 * switch that drives it. Signups are low-volume, so the extra read is free.
 *
 * The whole body is defensive on purpose. If a blocking function throws for ANY
 * reason the signup fails, so an unrelated bug here becomes a total registration
 * outage. Only the deliberate "signups are paused" verdict is allowed to throw;
 * the decision itself is pure and unit-tested in functions/signup-gate.js.
 */
exports.beforeCreateUser = functions.auth.user().beforeCreate(async (user, context) => {
  let cfg = null;   // null = "could not read" ⇒ ALLOW (founder decision, see signup-gate.js)
  try {
    const snap = await db.doc("config/app").get();
    cfg = (snap.exists && snap.data()) || {};
  } catch (e) {
    console.error("beforeCreate: config read failed, allowing signup —", (e && e.message) || e);
  }
  const decision = signupGate.signupDecision(cfg);
  if (decision.allow) {
    // Log only the degraded path; a healthy allow is the common case and would be noise.
    if (decision.reason === "config-unavailable") console.warn("beforeCreate: allowed without a config read");
    return;
  }
  console.log("beforeCreate: blocked a signup — signups are paused");
  throw new functions.auth.HttpsError("permission-denied", signupGate.BLOCKED_MESSAGE);
});

// Default plan prices + tier limits. Editable from admin Settings (stored in
// config/app.plans); these are the fallback when nothing is configured and MUST
// match the limit defaults in firestore.rules (where the limit ceiling is enforced).
//   price          = monthly price (USD)
//   priceYear      = annual price (USD); default = 2 months free (~-17% vs 12×monthly)
//   aiMonthlyCents = live-AI monthly $-cost ceiling, in CENTS (decision #21). This is
//                    the margin guard: each live analysis costs ~1¢, so the ceiling
//                    bounds AI spend per user no matter how many calls they make.
//                    free=0 (offline only), pro=400 (~$4/mo), premium=2500 (~$25/mo).
const DEFAULT_PLANS = {
  free:    { price: 0,     priceYear: 0,      aiMonthlyCents: 0,    portfolios: 1,  coins: 10,   transactions: 50 },
  pro:     { price: 9.99,  priceYear: 99.99,  aiMonthlyCents: 400,  portfolios: 3,  coins: 50,   transactions: 2000 },
  premium: { price: 49.99, priceYear: 499.99, aiMonthlyCents: 2500, portfolios: 15, coins: 1000, transactions: 5000 },
};
// Validate + fill any missing plan fields from the defaults (never trust raw input).
// DI-6 (G41): a PRICE may be 0 (the free tier), but a LIMIT may never be — a blank field
// OR an explicit 0/negative falls back to the default so an admin can't accidentally lock
// an entire tier out with a 0 cap. `lim` enforces min-1 → default; `num` keeps 0 for prices.
function mergePlans(saved) {
  const s = saved || {};
  const num = (x, def) => (typeof x === "number" && isFinite(x) && x >= 0 ? x : def);
  const lim = (x, def, hard) => {
    const n = (typeof x === "number" && isFinite(x)) ? Math.round(x) : NaN;
    return n >= 1 ? Math.min(n, hard) : def;   // blank / 0 / negative → the tier default
  };
  const out = {};
  for (const t of ["free", "pro", "premium"]) {
    const d = DEFAULT_PLANS[t], v = s[t] || {};
    out[t] = {
      price: Math.min(num(v.price, d.price), 1e6),                              // monthly price; cap: no absurd prices
      priceYear: Math.min(num(v.priceYear, d.priceYear), 1e6),                  // annual price (default = 2 months free)
      aiMonthlyCents: Math.min(Math.round(num(v.aiMonthlyCents, d.aiMonthlyCents)), 1e9), // live-AI monthly $-cost ceiling, in cents (#21)
      portfolios: lim(v.portfolios, d.portfolios, 100000),
      coins: lim(v.coins, d.coins, 1000),     // hard ceiling #20: mirrors firestore.rules maxCoins clamp
      transactions: lim(v.transactions, d.transactions, 1000000),
    };
  }
  return out;
}

// SSRF guard: only allow fetching an EXTERNAL https URL (used for the admin-set
// email-provider API URL). Rejects non-https, IP literals, localhost, and
// internal/metadata hostnames so a misconfigured/compromised admin can't point
// the server at the cloud metadata service or an internal address. Returns the
// parsed URL's origin, or null if unsafe.
function safeProviderOrigin(raw) {
  let u;
  try { u = new URL(String(raw || "")); } catch (e) { return null; }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.toLowerCase();
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;        // IPv4 literal (incl. 169.254.169.254)
  if (host.includes(":") || host.startsWith("[")) return null;  // IPv6 literal
  if (host === "localhost" || host.endsWith(".localhost")) return null;
  if (host.endsWith(".internal") || host.endsWith(".local")) return null;
  if (host === "metadata") return null;
  return u.origin;
}

async function getPayPalToken() {
  const cfg = await getConfig();
  const clientId = (cfg.paypal && cfg.paypal.clientId) || PAYPAL_CLIENT_ID;
  const secret = (cfg.paypal && cfg.paypal.secret) || PAYPAL_SECRET;
  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new functions.https.HttpsError("internal", "PayPal auth failed");
  const data = await res.json();
  return data.access_token;
}

// ─── Create Subscription (signed-in user only) ───
exports.createSubscription = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be signed in.");
  }
  assertNoUnknownKeys(data, ["plan", "billing"]);
  // ADMIN-2: the checkout kill-switch, enforced HERE rather than by hiding the
  // button. Hiding a button stops honest users; this stops a scripted client too,
  // which is the whole point when PayPal is misconfigured or misbehaving and every
  // new subscription is a support ticket (or a refund) waiting to happen.
  if (!(await featureOn("checkout"))) {
    throw new functions.https.HttpsError("failed-precondition", "Checkout is temporarily unavailable. Please try again shortly.");
  }
  const userId = context.auth.uid;                 // the caller — NOT from the body
  const email = context.auth.token.email || undefined;
  const requestedTier = data && data.plan === "premium" ? "premium" : "pro";
  const plan = requestedTier === "premium" ? PAYPAL_PREMIUM_PLAN_ID : PAYPAL_PLAN_ID;

  // BL-1c (D5): already-paid guard — never open a second checkout for a tier the
  // caller already holds (unless that subscription is winding down, i.e. cancelled).
  const curSnap = await db.doc(`users/${userId}`).get();
  const cur = curSnap.exists ? curSnap.data() : {};
  if ((cur.tier || "free") === requestedTier && !(cur.subscription && cur.subscription.cancelled)) {
    throw new functions.https.HttpsError("failed-precondition", "You already have this plan.");
  }
  // BL-1c (D5): per-uid cooldown against double-click / scripted duplicate subs.
  const cd = await checkCooldown(db, { uid: userId, key: "createSub", cooldownMs: 60_000 });
  if (!cd.allowed) {
    throw new functions.https.HttpsError("resource-exhausted", "Please wait a minute before trying again.");
  }
  if (!plan) throw new functions.https.HttpsError("failed-precondition", "Plan not configured.");

  // BL-1b (D6): persist the billing cycle so getStats prices annual payers correctly.
  const billingCycle = data && data.billing === "yearly" ? "yearly" : "monthly";
  await db.doc(`users/${userId}`).set({ billingCycle }, { merge: true });
  await writeAudit(context, "createSubscription", { targetUid: userId, details: `plan=${requestedTier} billing=${billingCycle}` });

  const token = await getPayPalToken();
  const response = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      plan_id: plan,
      subscriber: email ? { email_address: email } : undefined,
      custom_id: userId,
      application_context: {
        brand_name: "Crypto Idea",
        return_url: `${APP_URL}/pro-success`,
        cancel_url: `${APP_URL}/pricing`,
        user_action: "SUBSCRIBE_NOW",
      },
    }),
  });
  const result = await response.json();
  const approvalUrl = result.links && result.links.find((l) => l.rel === "approve");
  return { approvalUrl: approvalUrl ? approvalUrl.href : null, subscriptionId: result.id };
});

// ─── Cancel Subscription (signed-in user cancels THEIR OWN) ───
exports.cancelSubscription = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be signed in.");
  }
  assertNoUnknownKeys(data, ["downgradeTo"]);
  const userId = context.auth.uid;                 // caller's own uid — fixes the IDOR
  const userDoc = await db.doc(`users/${userId}`).get();
  const cur = userDoc.exists ? userDoc.data() : {};
  const subscriptionId = cur.paypalSubscriptionId;
  if (!subscriptionId) {
    throw new functions.https.HttpsError("failed-precondition", "No active subscription.");
  }
  const token = await getPayPalToken();
  await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ reason: "User requested cancellation" }),
  });
  // BL-1f (B8): access continues until the paid period ends — mark the cancellation
  // (with the chosen R29 target; only premium may pick "pro") and leave `tier` alone.
  // The flip happens in enforceSubscriptionPeriods once endDate passes, and a "pro"
  // target routes through the app's re-checkout (a paid tier needs a payment).
  const patch = billing.cancelRequestPatch(cur, data && data.downgradeTo, Date.now());
  await db.doc(`users/${userId}`).set(patch, { merge: true });
  await writeAudit(context, "cancelSubscription", { targetUid: userId, details: "downgradeTo=" + patch.subscription.downgradeTo });
  return { success: true, downgradeTo: patch.subscription.downgradeTo, endDate: patch.subscription.endDate };
});

// ─── Verify a PayPal webhook signature ───
// Returns true only if PayPal confirms the event is authentic.
async function verifyPayPalWebhook(req) {
  const cfg = await getConfig();
  const webhookId = (cfg.paypal && cfg.paypal.webhookId) || PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false; // fail closed if not configured
  const token = await getPayPalToken();
  const res = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_algo: req.headers["paypal-auth-algo"],
      cert_url: req.headers["paypal-cert-url"],
      transmission_id: req.headers["paypal-transmission-id"],
      transmission_sig: req.headers["paypal-transmission-sig"],
      transmission_time: req.headers["paypal-transmission-time"],
      webhook_id: webhookId,
      webhook_event: req.body,
    }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.verification_status === "SUCCESS";
}

// ─── PayPal Webhook (public, but every event is signature-verified) ───
// Also publicly reachable, so it is capped too. A cap is safe here specifically
// because PayPal retries with backoff and the handler is idempotent — a throttled
// event comes back rather than being lost.
exports.paypalWebhook = functions
  .runWith({ maxInstances: 10, timeoutSeconds: 60 })
  .https.onRequest(async (req, res) => {
  // API-SECURITY (webhook integrity): the idempotency marker is written BEFORE the side effect,
  // so if the side effect later throws we must ROLL BACK the marker — otherwise PayPal's retry
  // sees the marker, is acknowledged as a duplicate, and the paid tier change is dropped forever
  // (webhookEvents is never purged). Track the key we marked THIS call and delete it on failure.
  let markedKey = null;
  try {
    const ok = await verifyPayPalWebhook(req);
    if (!ok) {
      console.warn("Rejected PayPal webhook: signature verification failed");
      res.status(401).json({ error: "Invalid webhook signature" });
      return;
    }

    const event = req.body;
    const resource = event.resource || {};

    // BL-1b (D6): idempotency — PayPal redelivers events; process each id ONCE.
    // A transactional create-if-absent marks it; a duplicate is acknowledged and skipped.
    const evKey = billing.webhookEventKey(event);
    if (evKey) {
      const duplicate = await db.runTransaction(async (t) => {
        const ref = db.doc(`webhookEvents/${evKey}`);
        const snap = await t.get(ref);
        if (snap.exists) return true;
        t.set(ref, { at: Date.now(), type: event.event_type || "" });   // Date.now(): serverTimestamp is undefined in the emulator + everything else here is ms
        return false;
      });
      if (duplicate) { res.json({ received: true, duplicate: true }); return; }
      markedKey = evKey;   // we just claimed it — roll back if processing below fails
    }

    const planIds = { proPlanId: PAYPAL_PLAN_ID, premiumPlanId: PAYPAL_PREMIUM_PLAN_ID };
    switch (event.event_type) {
      case "BILLING.SUBSCRIPTION.ACTIVATED": {
        // BL-1f (B8): tier comes from the PayPal plan_id — a Premium purchase lands
        // as premium (was hardcoded "pro"). Unknown plan → record the sub, keep tier.
        const userId = resource.custom_id;
        if (userId) {
          const { patch, unknownPlan } = billing.activationPatch(resource, planIds, Date.now());
          if (unknownPlan) console.warn("paypalWebhook: unknown plan_id on ACTIVATED — tier left unchanged:", resource.plan_id);
          await db.doc(`users/${userId}`).set(patch, { merge: true });
        }
        break;
      }
      case "PAYMENT.SALE.COMPLETED": {
        // A sale carries no plan_id, so it never sets a tier blindly (B8) — it stamps
        // lastPayment and only RESTORES tierBeforeFailure on a recovered account.
        const subId = resource.billing_agreement_id;
        if (subId) {
          const users = await db.collection("users").where("paypalSubscriptionId", "==", subId).get();
          await Promise.all(users.docs.map((doc) =>
            doc.ref.set(billing.salePatch(doc.data(), Date.now()), { merge: true })
          ));
        }
        break;
      }
      case "BILLING.SUBSCRIPTION.CANCELLED":
      case "BILLING.SUBSCRIPTION.SUSPENDED": {
        // BL-1f (B8): NO immediate tier drop — access continues until the period ends
        // (the shipped promise). This marks the subscription (cancelled, or paymentFailed
        // with the U12 7-day grace) + records tierBeforeFailure (S9); the daily
        // enforceSubscriptionPeriods sweep performs the actual flip.
        const kind = event.event_type === "BILLING.SUBSCRIPTION.SUSPENDED" ? "suspended" : "cancelled";
        const apply = async (ref) => {
          const snap = await ref.get();
          const patch = billing.cancellationPatch(snap.exists ? snap.data() : {}, resource, kind, Date.now());
          await ref.set(patch, { merge: true });
        };
        const userId = resource.custom_id;
        if (userId) {
          await apply(db.doc(`users/${userId}`));
        } else if (resource.id) {
          const users = await db.collection("users").where("paypalSubscriptionId", "==", resource.id).get();
          await Promise.all(users.docs.map((doc) => apply(doc.ref)));
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error("paypalWebhook error:", error);
    // API-SECURITY: roll back the idempotency marker so PayPal's retry genuinely REPROCESSES
    // this event (all patches are idempotent set-merges, so a rare double-process is harmless).
    // Without this the marker permanently suppresses a paid-tier change that failed transiently.
    if (markedKey) { try { await db.doc(`webhookEvents/${markedKey}`).delete(); } catch (e) { console.error("paypalWebhook: marker rollback failed:", e && e.message); } }
    // ADMIN-2: the single highest-value thing to be alerted about. A webhook that
    // starts failing does not break the app visibly — people just quietly stop
    // getting the tier they paid for, and the first signal is a support email.
    try { observability.captureError(await getConfig(), "paypalWebhook", error); } catch (e) { /* never mask the real error */ }
    res.status(400).json({ error: "Webhook processing failed" });
  }
});

// Payment-processor fees, subtracted from revenue so the admin sees NET, not gross.
// Default = PayPal standard (2.9% + $0.30 per charge). Edit to match your processor.
// NOTE: this is a MONTHLY-equivalent estimate — getStats counts each payer once per
// month (it does not yet read per-user billing cycle), so an annual payer's fees are
// over-counted (errs conservative: understates net). Exact per-cycle fees need the
// PayPal webhook to persist subscription.billing — see PRICING.md "Open items".
const PAYMENT_FEE_RATE = 0.029;
const PAYMENT_FEE_FIXED = 0.30;

// ─── Combined stats maths — ONE implementation (ADMIN-4) ───
// Extracted from getStats so the live Overview and the permanent daily growth
// snapshot read from the same code. A second copy would drift, and because the
// snapshot series is kept forever, drift would be baked into history and
// impossible to correct after the fact.
//
// Returns aggregate figures only — no uid, no email, nothing personal — which is
// what makes the stored snapshot safe to keep indefinitely with no erasure path.
async function gatherStats() {
  const usersSnap = await db.collection("users").get();
  let proUsers = 0, premiumUsers = 0, freeUsers = 0, totalPortfolios = 0, activeUsers = 0;
  // ADMIN-4: the forward-looking churn signal — subscriptions already cancelled or
  // failing that still HOLD a paid tier. They are what is *about* to churn, so they
  // are counted separately from the paid totals, never subtracted from them.
  let canceledSubs = 0, pastDueSubs = 0;
  const payerList = [];   // BL-1b (D6): [{tier, cycle}] so annual payers are priced by cycle
  usersSnap.forEach((doc) => {
    const d = doc.data();
    if (d.deleted === true) return; // soft-deleted accounts live in Trash, not the stats
    activeUsers++;
    if (d.tier === "pro") proUsers++;
    else if (d.tier === "premium") premiumUsers++;
    else freeUsers++;
    if (d.tier === "pro" || d.tier === "premium") {
      payerList.push({ tier: d.tier, cycle: d.billingCycle === "yearly" ? "yearly" : "monthly" });
    }
    // Reuses the ADMIN-1 derivation — no new storage, and no extra read since the
    // document is already in hand.
    const status = billing.billingStatusOf(d);
    if (status === "canceled") canceledSubs++;
    else if (status === "past_due") pastDueSubs++;
    totalPortfolios += d.portfolioCount || 0;
  });
  // Total coins tracked across everyone — a cheap collection-group COUNT
  // (counts index entries, does NOT read each coin document). Failsafe to 0.
  let totalCoins = 0;
  try {
    const coinsCount = await db.collectionGroup("coins").count().get();
    totalCoins = coinsCount.data().count;
  } catch (e) {
    totalCoins = 0;
  }
  const plans = mergePlans((await getConfig()).plans);
  // BL-1b (D6): revenue is priced per REAL billing cycle (an annual payer = priceYear/12
  // with its single yearly fee amortized) — pure math in billing.computeRevenue.
  const { grossRevenue, paymentFees, netRevenue } = billing.computeRevenue(payerList, plans, PAYMENT_FEE_RATE, PAYMENT_FEE_FIXED);
  return {
    totalUsers: activeUsers,
    proUsers,
    premiumUsers,
    freeUsers,
    canceledSubs,
    pastDueSubs,
    totalPortfolios,
    totalCoins,
    proPrice: plans.pro.price,
    premiumPrice: plans.premium.price,
    grossRevenue,
    paymentFees,
    netRevenue,
    estimatedRevenue: grossRevenue,   // kept (= gross) for backward compatibility
  };
}

// ─── Admin Stats (admins only) ───
exports.getStats = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);
  assertNoUnknownKeys(data, []);
  return {
    ...(await gatherStats()),
    // ADMIN-SEC: owner health. Owners can only be minted by scripts/set-admin.js, so
    // dropping to 1 (or 0) is a silent single-point-of-failure the panel should warn
    // about while it's still fixable. Counts only owners who can actually sign in.
    // Live-only: it is admin health, not a growth metric, so it stays out of the
    // snapshot (and off the daily job's critical path).
    activeOwners: await countActiveOwners(),
  };
});

// ─── ADMIN-4 · Growth metrics — the daily snapshot ───
// Signups are counted from the Auth record's creationTime, which is the ONLY
// server-set signup date. `users/{uid}.joined` is written by the client at
// registration and firestore.rules validates only `name` on that document, so
// until the create rule pins `joined == request.time` a registering user can
// claim any signup date. An aggregate a user can move is not a metric.
const SIGNUP_WINDOW_MS = 24 * 3600 * 1000;
async function countSignupsSince(cutoffMs) {
  const CAP = 5000;                  // same ceiling as listUsers
  let signups = 0, seen = 0, pageToken;
  do {
    const res = await admin.auth().listUsers(1000, pageToken);
    for (const u of res.users) {
      seen++;
      const created = Date.parse((u.metadata && u.metadata.creationTime) || "");
      if (Number.isFinite(created) && created >= cutoffMs) signups++;
    }
    pageToken = res.pageToken;
  } while (pageToken && seen < CAP);
  return signups;
}

async function writeDailySnapshot(nowMs) {
  const stats = await gatherStats();
  const signups24h = await countSignupsSince(nowMs - SIGNUP_WINDOW_MS);
  const snapshot = statsDaily.buildSnapshot(stats, { atMs: nowMs, signups24h });
  // buildSnapshot returns null only for an unusable clock. Writing anyway would
  // file the reading under 1970-01-01 and permanently skew every later delta.
  if (!snapshot) throw new Error("writeDailySnapshot: unusable clock — refusing to write a snapshot");
  // REPLACE, not merge: re-running on the same UTC day corrects that day rather
  // than appending a second reading, which is what makes the manual "Capture now"
  // button safe to press after a missed scheduled run.
  await db.doc(`statsDaily/${snapshot.date}`).set(snapshot);
  return snapshot;
}

// (The nightly `captureDailyStats` job itself lives with the other schedulers
// below — it needs the SCHEDULED runtime config, which is declared down there.)

// ─── ADMIN-4: read the daily growth series (admins only) ───
// Same gate as getStats — which already returns revenue to any admin — so making
// the trend owner-only would be theatre, not a boundary.
exports.listDailyStats = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);
  assertNoUnknownKeys(data, ["limit"]);
  const DEFAULT_DAYS = 90, MAX_DAYS = 400;
  const raw = Number(data && data.limit);
  const limit = Number.isFinite(raw) ? Math.min(Math.max(Math.trunc(raw), 1), MAX_DAYS) : DEFAULT_DAYS;
  const snap = await db.collection("statsDaily").orderBy("date", "desc").limit(limit).get();
  // Returned OLDEST-FIRST: that is chart order, and it lets the pure maths in
  // src/utils/growth.js walk forwards without reversing anything.
  const series = snap.docs.map((d) => d.data()).reverse();
  return { series, capped: series.length >= limit };
});

// ─── ADMIN-4: capture today's snapshot on demand (owners only) ───
// Cloud Scheduler fires captureDailyStats nightly in production; this is the
// manual path for a missed run (and the only way to exercise the whole thing
// under the emulator, which never fires pubsub on a cron). Idempotent per UTC day.
exports.captureStatsSnapshot = functions.https.onCall(async (data, context) => {
  await assertOwner(context);
  assertNoUnknownKeys(data, []);
  const snapshot = await writeDailySnapshot(Date.now());
  await writeAudit(context, "captureStatsSnapshot", { details: `captured ${snapshot.date}` });
  return { snapshot };
});

// ─── Grant / revoke MANAGER (owners only, step-up re-auth) — ADMIN-SEC ───
// Replaces the old `setAdminClaim`, which any admin could call to promote anyone.
// That was the bypass: promote two throw-away accounts, then delete the two real
// owners while the admin COUNT stayed ≥ MIN_ADMINS. Owners are now protected by
// IDENTITY (the role claim) and can only be minted by scripts/set-admin.js.
//
// The panel can grant/revoke MANAGERS only, and only an owner with a fresh password
// re-auth can do it. Owner targets are refused outright.
exports.setManagerRole = functions.https.onCall(async (data, context) => {
  await assertFreshOwner(context);
  assertNoUnknownKeys(data, ["email", "grant"]);
  const email = String((data && data.email) || "").trim().toLowerCase();
  const grant = !!(data && data.grant);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    throw new functions.https.HttpsError("invalid-argument", "Enter a valid email.");
  }
  let userRecord;
  try { userRecord = await admin.auth().getUserByEmail(email); }
  catch (e) { throw new functions.https.HttpsError("not-found", "No user with that email."); }

  // Owners are never grantable or revocable from the panel — by design, in both
  // directions (you can't demote an owner, and you can't "re-grant" one either).
  await assertTargetAllowed(userRecord.uid, guards.ROLE_OWNER, "protected");
  if (userRecord.uid === context.auth.uid) {
    throw new functions.https.HttpsError("failed-precondition", "You can't change your own admin role.");
  }

  // ADMIN-5: the prior role (off the claims we already have — no extra read) so the
  // audit shows "role: (none)→manager" / "role: manager→(none)".
  const beforeRole = guards.roleOf(userRecord.customClaims || null);
  // setCustomUserClaims replaces the object wholesale — write the complete shape.
  // Revoking clears it entirely so the token carries no admin key at all, which is
  // what firestore.rules' .get('admin', false) default already assumes.
  await admin.auth().setCustomUserClaims(userRecord.uid, grant ? { admin: true, role: guards.ROLE_MANAGER } : null);
  // Without this the change wouldn't take effect until the target's ID token expired
  // (~1h) — unacceptable when REVOKING someone's access.
  await admin.auth().revokeRefreshTokens(userRecord.uid);
  await writeAudit(context, grant ? "grantManager" : "revokeManager", { targetUid: userRecord.uid, targetEmail: email, details: changeDetail("role", beforeRole, grant ? guards.ROLE_MANAGER : "") });
  return { success: true, uid: userRecord.uid, role: grant ? guards.ROLE_MANAGER : null };
});

// Retained ONLY to fail loudly: the old callable is still deployed until the next
// deploy, and a stale client (or anyone probing the API) must not get the old
// behaviour. Deleting the export outright would 404; this makes the refusal explicit.
exports.setAdminClaim = functions.https.onCall(async () => {
  throw new functions.https.HttpsError("permission-denied", "Removed — admin roles are managed from Admin access (owners only).");
});

// ─── Admin: look up ONE user for support / moderation (admins only) ───
// Returns operational data only (tier, status, usage counts) — NOT holdings.
exports.lookupUser = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);
  assertNoUnknownKeys(data, ["email"]);
  const email = String((data && data.email) || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    throw new functions.https.HttpsError("invalid-argument", "Enter a valid email.");
  }
  let rec;
  try { rec = await admin.auth().getUserByEmail(email); }
  catch (e) { throw new functions.https.HttpsError("not-found", "No user with that email."); }
  const snap = await db.collection("users").doc(rec.uid).get();
  const d = snap.exists ? snap.data() : {};
  let coinCount = 0;
  const ports = await db.collection("users").doc(rec.uid).collection("portfolios").get();
  ports.forEach((p) => { coinCount += (p.data().coinCount || 0); });
  return {
    uid: rec.uid,
    email: rec.email || "",
    name: d.name || rec.displayName || "",
    tier: d.tier || "free",
    disabled: !!rec.disabled,
    isAdmin: !!(rec.customClaims && rec.customClaims.admin),
    // ADMIN-SEC: "" for a plain user AND for a legacy role-less admin. The Admin
    // access tab keys off this to show owners as protected instead of offering a
    // grant flow the server would refuse anyway.
    role: guards.roleOf((rec.customClaims) || null),
    portfolioCount: d.portfolioCount || 0,
    coinCount,
    // BL-1e: the fields the admin panel's "last paid tier" note + limits-editor
    // pre-fill actually read (they rendered empty before).
    tierBeforeFailure: d.tierBeforeFailure || "",
    premiumLimits: d.premiumLimits || {},
    emailVerified: !!rec.emailVerified,
    billingCycle: d.billingCycle || "",
    // ADMIN-1 (billing-ops visibility): the PayPal subscription id + a status
    // DERIVED from already-persisted fields (no new storage), plus the period-end
    // date the cancellation marker carries. Read-only — cancels/refunds stay in
    // the PayPal dashboard. The card renders these; the list uses billingStatus only.
    billingStatus: billing.billingStatusOf(d),
    paypalSubscriptionId: d.paypalSubscriptionId || "",
    subEndDate: (d.subscription && d.subscription.endDate) || null,
    subDowngradeTo: (d.subscription && d.subscription.downgradeTo) || "",
    lastPayment: d.lastPayment || null,
  };
});

// ─── Admin: change a user's tier (admins only) ───
exports.setUserTier = functions.https.onCall(async (data, context) => {
  const callerRole = await assertManager(context);
  assertNoUnknownKeys(data, ["uid", "tier"]);
  const uid = data && data.uid;
  const tier = data && data.tier;
  if (!uid || !["free", "pro", "premium"].includes(tier)) {
    throw new functions.https.HttpsError("invalid-argument", "uid and a valid tier are required.");
  }
  // ADMIN-SEC: owners are protected — a manager may not act on one at all.
  await assertTargetAllowed(uid, callerRole, "manage");
  // ADMIN-5: read the prior tier so the audit records old→new (reversible by hand).
  const beforeSnap = await db.collection("users").doc(uid).get();
  const beforeTier = (beforeSnap.exists && beforeSnap.data().tier) || "free";
  await db.collection("users").doc(uid).update({ tier });
  await writeAudit(context, "setUserTier", { targetUid: uid, details: changeDetail("tier", beforeTier, tier) });
  return { success: true, uid, tier };
});

// ── DEV / EMULATOR ONLY — self-serve tier for local testing ──────────────────
// In local/demo there is NO PayPal webhook, so an in-app "upgrade" never reaches the
// DB (users can't write their own `tier` — firestore.rules blocks it, by design). The
// portfolio-cap rule then reads the DB tier (still `free`, cap 1) and denies the 2nd
// portfolio. This lets a signed-in user set their OWN tier so Pro/Premium caps become
// real WHILE DEVELOPING, and the in-app upgrade works end-to-end on the emulator.
//
// SECURITY: HARD-GATED to the emulator — in production `FUNCTIONS_EMULATOR` is unset, so
// this refuses with permission-denied. Tier therefore stays server-only (PayPal webhook /
// admin `setUserTier`) in prod and no user can ever self-upgrade. The gate IS the boundary;
// clients also gate the call behind `import.meta.env.DEV`. Do NOT remove the emulator check.
exports.devSetMyTier = functions.https.onCall(async (data, context) => {
  if (process.env.FUNCTIONS_EMULATOR !== "true") {
    throw new functions.https.HttpsError("permission-denied", "Not available.");
  }
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be signed in.");
  }
  assertNoUnknownKeys(data, ["tier"]);
  const tier = data && data.tier;
  if (!["free", "pro", "premium"].includes(tier)) {
    throw new functions.https.HttpsError("invalid-argument", "A valid tier is required.");
  }
  await db.collection("users").doc(context.auth.uid).update({ tier });
  return { success: true, tier };
});

// ─── Admin: set a user's per-user custom limits (premium overrides, S8) ───
// Writes users/{uid}.premiumLimits {portfolios?,coins?,transactions?}. Each value is
// clamped to the SAME hard ceiling as mergePlans / firestore.rules (#20: coins ≤ 1,000)
// so a custom limit can only raise WITHIN — never past — the product ceiling. Owners
// can't write this field (rules blocklist); only admins, here. An empty object clears
// the override (back to tier defaults).
exports.setPremiumLimits = functions.https.onCall(async (data, context) => {
  const callerRole = await assertManager(context);
  assertNoUnknownKeys(data, ["uid", "limits"]);
  const uid = data && data.uid;
  if (!uid) throw new functions.https.HttpsError("invalid-argument", "uid is required.");
  const raw = (data && data.limits) || {};
  // ADMIN-SEC: owners are protected — a manager may not act on one at all.
  await assertTargetAllowed(uid, callerRole, "manage");
  const num = (x) => (typeof x === "number" && isFinite(x) && x >= 0 ? Math.round(x) : null);
  const caps = { portfolios: 100000, coins: 1000, transactions: 1000000 };
  const out = {};
  for (const k of ["portfolios", "coins", "transactions"]) {
    const v = num(raw[k]);
    if (v !== null) out[k] = Math.min(v, caps[k]);
  }
  // ADMIN-5: capture the prior overrides so the audit shows old→new (an empty {}
  // means "no override / back to tier defaults" — see fmtVal's "(none)").
  const limSnap = await db.collection("users").doc(uid).get();
  const beforeLimits = (limSnap.exists && limSnap.data().premiumLimits) || {};
  await db.collection("users").doc(uid).set({ premiumLimits: out }, { merge: true });
  await writeAudit(context, "setPremiumLimits", { targetUid: uid, details: changeDetail("limits", beforeLimits, out) });
  return { success: true, uid, premiumLimits: out };
});

// ─── Admin: suspend / un-suspend a user (admins only) — reversible ───
// Disables the Auth account so they can't sign in.
exports.suspendUser = functions.https.onCall(async (data, context) => {
  const callerRole = await assertManager(context);
  assertNoUnknownKeys(data, ["uid", "disabled"]);
  const uid = data && data.uid;
  const disabled = !!(data && data.disabled);
  if (!uid) throw new functions.https.HttpsError("invalid-argument", "uid is required.");
  if (uid === context.auth.uid) {
    throw new functions.https.HttpsError("failed-precondition", "You cannot suspend your own admin account.");
  }
  // ADMIN-SEC: suspending disables the Auth account AND revokes tokens, so without
  // this a manager could lock both owners out of the panel while the admin count
  // still looked healthy — the un-deletable guarantee by another route.
  await assertTargetAllowed(uid, callerRole, "manage");
  // ADMIN-5: record the true prior state so a redundant (double-)suspend logs
  // "disabled: true→true", not a fabricated transition.
  let beforeDisabled = false;
  try { beforeDisabled = !!(await admin.auth().getUser(uid)).disabled; } catch (e) { /* ignore */ }
  await admin.auth().updateUser(uid, { disabled });
  const uref = db.collection("users").doc(uid);
  if (disabled) {
    // R31-6 freeze-the-clock: revoke tokens (a live session dies NOW — G40; disabling alone
    // leaves an existing ~1h token valid) and stamp suspendedAt so the daily sweep skips
    // this account (its paid clock is stopped). Go-live also suspends the PayPal subscription.
    await admin.auth().revokeRefreshTokens(uid);
    await uref.set({ suspendedAt: Date.now() }, { merge: true });
  } else {
    // R31-6 un-suspend: extend the subscription's endDate by the frozen duration so the user
    // loses none of their paid time, and clear suspendedAt (go-live reactivates PayPal).
    const snap = await uref.get();
    const d = snap.exists ? snap.data() : {};
    // FieldValue comes from the modular subpath, NOT admin.firestore.FieldValue: inside the
    // functions emulator the `admin.firestore` namespace is proxied and its static members are
    // undefined, so the namespace form threw a TypeError → INTERNAL and silently skipped the
    // paid-time extension below (the Auth account was already re-enabled). Same trap as C3.
    const patch = { suspendedAt: FieldValue.delete() };
    if (d.suspendedAt && d.subscription) patch.subscription = billing.extendForSuspension(d.subscription, d.suspendedAt, Date.now());
    await uref.set(patch, { merge: true });
  }
  await writeAudit(context, disabled ? "suspendUser" : "unsuspendUser", { targetUid: uid, details: changeDetail("disabled", beforeDisabled, disabled) });
  return { success: true, uid, disabled };
});

// ─── Admin: delete a user + ALL their data (admins only) — GDPR/CCPA erasure ───
exports.deleteUser = functions.https.onCall(async (data, context) => {
  const callerRole = await assertOwner(context);
  assertNoUnknownKeys(data, ["uid"]);
  const uid = data && data.uid;
  if (!uid) throw new functions.https.HttpsError("invalid-argument", "uid is required.");
  if (uid === context.auth.uid) {
    throw new functions.https.HttpsError("failed-precondition", "You cannot delete your own admin account.");
  }
  // ADMIN-SEC: owners are un-deletable, full stop — this is the primary fix for the
  // bypass. The MIN_ADMINS floor below is kept only as a secondary backstop; on its
  // own it protected the admin COUNT, which promoting sock-puppets trivially defeats.
  await assertTargetAllowed(uid, callerRole, "protected");
  let targetRec;
  try { targetRec = await admin.auth().getUser(uid); }
  catch (e) { throw new functions.https.HttpsError("not-found", "No such user."); }
  if (targetRec.customClaims && targetRec.customClaims.admin === true && (await countAdmins()) <= MIN_ADMINS) {
    throw new functions.https.HttpsError("failed-precondition", `Can't delete this admin — the app must keep at least ${MIN_ADMINS} admins. Promote another admin first.`);
  }
  // Wipe Firestore data (the user doc + all nested portfolios/coins/transactions),
  // then remove the Auth account.
  await db.recursiveDelete(db.collection("users").doc(uid));
  await admin.auth().deleteUser(uid);
  await writeAudit(context, "deleteUser", { targetUid: uid, targetEmail: (targetRec && targetRec.email) || "" });
  return { success: true, uid };
});

// ─── Admin: restore a soft-deleted user from the Trash (admins only) ───
exports.restoreUser = functions.https.onCall(async (data, context) => {
  const callerRole = await assertManager(context);
  assertNoUnknownKeys(data, ["uid"]);
  const uid = data && data.uid;
  if (!uid) throw new functions.https.HttpsError("invalid-argument", "uid is required.");
  // ADMIN-5: record the prior trashed state (restore is normally true→false).
  const rSnap = await db.collection("users").doc(uid).get();
  const wasDeleted = !!(rSnap.exists && rSnap.data().deleted);
  await db.collection("users").doc(uid).set({ deleted: false, deletedAt: null }, { merge: true });
  await writeAudit(context, "restoreUser", { targetUid: uid, details: changeDetail("deleted", wasDeleted, false) });
  return { success: true, uid };
});

// ─── BL-2b (D8): admin soft-delete — move a user to the 30-day trash ───
// Parity with the self-service deleteMyAccount: recoverable, purged by
// purgeExpiredTrash after TRASH_DAYS. Admin accounts are refused (a trashed
// admin would be hard-purged in 30 days and could drop the app below
// MIN_ADMINS) — demote them first via setAdminClaim.
exports.adminTrashUser = functions.https.onCall(async (data, context) => {
  const callerRole = await assertManager(context);
  assertNoUnknownKeys(data, ["uid"]);
  const uid = data && data.uid;
  if (!uid) throw new functions.https.HttpsError("invalid-argument", "uid is required.");
  // ADMIN-SEC: owners can never be trashed, by anyone (identity, not count).
  await assertTargetAllowed(uid, callerRole, "protected");
  let rec = null;
  try { rec = await admin.auth().getUser(uid); } catch (e) { /* no auth record is fine */ }
  if (rec && rec.customClaims && rec.customClaims.admin === true) {
    throw new functions.https.HttpsError("failed-precondition", "Can't trash an admin account — remove their admin role first.");
  }
  const uref = db.collection("users").doc(uid);
  const usnap = await uref.get();
  // ADMIN-5: prior trashed state (usnap is already read for the billing patch below).
  const wasTrashed = !!(usnap.exists && usnap.data().deleted);
  const patch = { deleted: true, deletedAt: Date.now() };
  // R31-6 (D4): trashing cancels billing immediately — mark the sub cancelled (go-live also
  // calls PayPal cancel). Also fixes the gap that hard-deleting a payer never cancelled billing.
  const sub = usnap.exists && usnap.data().subscription;
  if (sub && !sub.cancelled) patch.subscription = { ...sub, cancelled: true, cancelledAt: Date.now() };
  await uref.set(patch, { merge: true });
  await writeAudit(context, "adminTrashUser", { targetUid: uid, targetEmail: (rec && rec.email) || "", details: changeDetail("deleted", wasTrashed, true) });
  return { success: true, uid };
});

// ─── BL-2c (D9): admin "sign out of all devices" for a target user ───
// Revokes the target's refresh tokens (each device must re-authenticate) —
// the moderation counterpart of the self-service signOutEverywhere (U6).
exports.adminSignOutUser = functions.https.onCall(async (data, context) => {
  const callerRole = await assertManager(context);
  assertNoUnknownKeys(data, ["uid"]);
  const uid = data && data.uid;
  if (!uid) throw new functions.https.HttpsError("invalid-argument", "uid is required.");
  // ADMIN-SEC: repeated force-sign-out is a denial-of-access vector against an owner.
  await assertTargetAllowed(uid, callerRole, "manage");
  await admin.auth().revokeRefreshTokens(uid);
  await writeAudit(context, "adminSignOutUser", { targetUid: uid });
  return { success: true, uid };
});

/* ═══ ADMIN-5: read-only "view as" (impersonation, support) ═══════════════════
 * The founder's choice was READ-ONLY view-as, NOT a token-based session: this
 * assembles a snapshot of the target's data server-side and returns it for display.
 * It NEVER mints a custom token and NEVER acts on the user's behalf — so there is no
 * "act as them" surface, no way to trigger a payment/mutation, and no lockout risk.
 *
 * OWNER-ONLY on purpose: it reads another person's PRIVATE data (including their
 * journal theses, which are private-by-default), so it sits at the highest gate. A
 * REASON is required and stored in the audit entry — the accountability control the
 * founder chose over time-boxing (there is no session to expire on a read).
 *
 * Bounded reads: a rare owner action must never fan out into tens of thousands of
 * reads on a whale portfolio, so portfolios/coins/transactions are each capped and
 * the response says when it truncated (an honest "first N", never a silent cut).
 */
const VIEW_MAX_PORTFOLIOS = 20;
const VIEW_MAX_COINS = 150;        // total across all portfolios
const VIEW_MAX_TX_PER_COIN = 50;
exports.viewUserAsAdmin = functions.https.onCall(async (data, context) => {
  await assertOwner(context);
  assertNoUnknownKeys(data, ["uid", "reason"]);
  const uid = String((data && data.uid) || "").trim();
  const reason = String((data && data.reason) || "").trim().slice(0, 300);
  if (!uid) throw new functions.https.HttpsError("invalid-argument", "uid is required.");
  // A reason is REQUIRED — this is a read of someone's private data; the audit trail
  // is the control. Refusing without one is deliberate, not a validation nicety.
  if (!reason) throw new functions.https.HttpsError("invalid-argument", "A reason is required to view a user's data.");

  let rec = null;
  try { rec = await admin.auth().getUser(uid); } catch (e) { /* the auth record may be gone (trashed) */ }
  const uref = db.collection("users").doc(uid);
  const usnap = await uref.get();
  if (!usnap.exists && !rec) throw new functions.https.HttpsError("not-found", "No such user.");
  const d = usnap.exists ? usnap.data() : {};

  const portfolios = [];
  let coinsSeen = 0;
  const psnap = await uref.collection("portfolios").limit(VIEW_MAX_PORTFOLIOS).get();
  const portTruncated = psnap.size >= VIEW_MAX_PORTFOLIOS;
  for (const pdoc of psnap.docs) {
    const p = pdoc.data();
    const coins = [];
    if (coinsSeen < VIEW_MAX_COINS) {
      const csnap = await pdoc.ref.collection("coins").limit(VIEW_MAX_COINS - coinsSeen).get();
      for (const cdoc of csnap.docs) {
        coinsSeen++;
        const c = cdoc.data();
        const txSnap = await cdoc.ref.collection("transactions").limit(VIEW_MAX_TX_PER_COIN).get();
        coins.push({
          id: cdoc.id, symbol: c.symbol || "", name: c.name || "", txCount: c.txCount || 0,
          // The journal thesis is the point of support for a conviction tool — the
          // founder chose to include it (fully audited above/below).
          journal: c.journal || null,
          txTruncated: txSnap.size >= VIEW_MAX_TX_PER_COIN,
          transactions: txSnap.docs.map((t) => { const x = t.data(); return { type: x.type, amount: x.amount, priceAtBuy: x.priceAtBuy, date: x.date }; }),
        });
      }
    }
    portfolios.push({ id: pdoc.id, name: p.name || "", coinCount: p.coinCount || 0, coins });
  }

  // Learn = COUNTS only (xp/streak/completed), never the lesson list — minimal.
  let learn = null;
  try {
    const lsnap = await uref.collection("learn").doc("progress").get();
    if (lsnap.exists) { const l = lsnap.data(); learn = { xp: l.xp || 0, streak: l.streak || 0, completedLessons: ((l.completedLessons || []).length) || 0, lastActivity: l.lastActivity || "" }; }
  } catch (e) { /* ignore */ }

  await writeAudit(context, "viewUserAsAdmin", { targetUid: uid, targetEmail: (rec && rec.email) || d.email || "", details: "reason: " + reason });

  return {
    uid,
    email: (rec && rec.email) || d.email || "",
    name: d.name || (rec && rec.displayName) || "",
    tier: d.tier || "free",
    disabled: !!(rec && rec.disabled),
    role: guards.roleOf((rec && rec.customClaims) || null),
    deleted: !!d.deleted,
    billingStatus: billing.billingStatusOf(d),
    paypalSubscriptionId: d.paypalSubscriptionId || "",
    billingCycle: d.billingCycle || "",
    portfolios,
    learn,
    truncated: { portfolios: portTruncated, coins: coinsSeen >= VIEW_MAX_COINS },
  };
});

/* ═══ ADMIN-5: private admin notes (per-user) ═════════════════════════════════
 * A support-context note pinned to a user, in the server-only adminNotes/{uid} doc
 * (firestore.rules denies every client). Read by any admin; written by a manager or
 * owner. The note CONTENT never enters the audit log (it can hold sensitive support
 * context — the same "log that it changed, not the value" rule as the config diff's
 * secrets). */
const NOTE_MAX = 4000;
exports.getUserNote = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);
  assertNoUnknownKeys(data, ["uid"]);
  const uid = String((data && data.uid) || "").trim();
  if (!uid) throw new functions.https.HttpsError("invalid-argument", "uid is required.");
  let out = { note: "", updatedAt: null, updatedByEmail: "" };
  try {
    const s = await db.collection("adminNotes").doc(uid).get();
    if (s.exists) { const n = s.data(); out = { note: n.note || "", updatedAt: n.updatedAt || null, updatedByEmail: n.updatedByEmail || "" }; }
  } catch (e) { /* ignore */ }
  return out;
});
exports.saveUserNote = functions.https.onCall(async (data, context) => {
  await assertManager(context);
  assertNoUnknownKeys(data, ["uid", "note"]);
  const uid = String((data && data.uid) || "").trim();
  if (!uid) throw new functions.https.HttpsError("invalid-argument", "uid is required.");
  const note = String((data && data.note) || "").slice(0, NOTE_MAX);
  await db.collection("adminNotes").doc(uid).set({
    note,
    updatedAt: Date.now(),
    updatedBy: context.auth.uid,
    updatedByEmail: (context.auth.token && context.auth.token.email) || "",
  }, { merge: true });
  await writeAudit(context, "saveUserNote", { targetUid: uid, details: note ? "note updated" : "note cleared" });
  return { success: true, uid };
});

// ─── Self-service: a user deletes THEIR OWN account (GDPR/CCPA erasure) ───
// Any signed-in user; acts only on their own uid (no IDOR).
exports.deleteMyAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in first.");
  }
  assertNoUnknownKeys(data, []);
  const uid = context.auth.uid;
  // ADMIN-SEC: an owner can't self-delete at all — owner accounts are the recovery
  // path for the whole panel, and there is no in-app way to mint a replacement.
  if (guards.isOwner(context.auth.token)) {
    throw new functions.https.HttpsError("failed-precondition", "Owner accounts can't be deleted. Transfer ownership with scripts/set-admin.js first.");
  }
  // Secondary floor: any other admin still can't self-delete below MIN_ADMINS.
  if (context.auth.token.admin === true && (await countAdmins()) <= MIN_ADMINS) {
    throw new functions.https.HttpsError("failed-precondition", `As one of the last ${MIN_ADMINS} admins you can't delete your account yet — promote another admin first.`);
  }
  // SOFT delete: mark the account as trashed and keep the data for TRASH_DAYS so it
  // can be recovered (by the user logging back in, or by an admin from the Trash tab).
  // A scheduled job (purgeExpiredTrash) permanently erases it after the window. We do
  // NOT disable the Auth account, so the user can sign in to restore it.
  const deletedAt = Date.now();
  const uref = db.collection("users").doc(uid);
  const usnap = await uref.get();
  const patch = { deleted: true, deletedAt };
  // R31-6 (D4): self-deleting cancels billing immediately too (go-live also calls PayPal cancel).
  const sub = usnap.exists && usnap.data().subscription;
  if (sub && !sub.cancelled) patch.subscription = { ...sub, cancelled: true, cancelledAt: Date.now() };
  await uref.set(patch, { merge: true });
  await writeAudit(context, "selfDeleteAccount", { targetUid: uid });   // BL-1d (D11)
  return { success: true, deletedAt, retrievableUntil: deletedAt + TRASH_MS, graceDays: TRASH_DAYS };
});

// ─── Self-service: restore your OWN soft-deleted account within the grace window ───
exports.restoreMyAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in first.");
  }
  assertNoUnknownKeys(data, []);
  const uid = context.auth.uid;
  const ref = db.collection("users").doc(uid);
  const snap = await ref.get();
  if (!snap.exists || snap.data().deleted !== true) return { success: true, restored: false };
  const deletedAt = snap.data().deletedAt || 0;
  if (Date.now() - deletedAt > TRASH_MS) {
    throw new functions.https.HttpsError("failed-precondition", "The 30-day window to restore this account has passed.");
  }
  await ref.set({ deleted: false, deletedAt: null }, { merge: true });
  await writeAudit(context, "selfRestoreAccount", { targetUid: uid });   // BL-1d (D11)
  return { success: true, restored: true };
});

// ─── Self-service: sign out of ALL sessions (revoke refresh tokens) ───
// Backs the Account "Sign out everywhere" button (USER-SETTINGS.md S7). Invalidates
// every device's refresh token, so each must re-authenticate. (Changing the password
// also auto-revokes other sessions; this is the explicit path that doesn't change it.)
// Acts only on the CALLER's own uid — no IDOR.
exports.signOutEverywhere = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in first.");
  }
  assertNoUnknownKeys(data, []);
  await admin.auth().revokeRefreshTokens(context.auth.uid);
  await writeAudit(context, "signOutEverywhere", { targetUid: context.auth.uid });   // BL-1d (D11)
  return { success: true };
});

// ─── Self-service: a user exports THEIR OWN data (GDPR/CCPA right to access) ───
exports.exportMyData = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in first.");
  }
  assertNoUnknownKeys(data, []);
  const uid = context.auth.uid;
  // API-SECURITY (read amplification): each call re-reads the caller's ENTIRE holdings tree.
  // A short cooldown stops a scripted loop from driving unbounded billed reads — exports are a
  // rare, user-initiated download, so this never impedes real use.
  const exCd = await checkCooldown(db, { uid, key: "exportMyData", cooldownMs: 10_000 });
  if (!exCd.allowed) throw new functions.https.HttpsError("resource-exhausted", "Please wait a few seconds before exporting again.");
  const userSnap = await db.collection("users").doc(uid).get();
  const portfolios = [];
  const pSnap = await db.collection("users").doc(uid).collection("portfolios").get();
  for (const p of pSnap.docs) {
    const coins = [];
    const cSnap = await p.ref.collection("coins").get();
    for (const co of cSnap.docs) {
      const txSnap = await co.ref.collection("transactions").get();
      coins.push({ id: co.id, ...co.data(), transactions: txSnap.docs.map((t) => ({ id: t.id, ...t.data() })) });
    }
    portfolios.push({ id: p.id, ...p.data(), coins });
  }
  await writeAudit(context, "exportMyData", { targetUid: uid });   // BL-1d (D11)
  return {
    exportedAt: new Date().toISOString(),
    account: { uid, email: context.auth.token.email || "" },
    profile: userSnap.exists ? userSnap.data() : {},
    portfolios,
  };
});

// ─── Self-service (DI-3): recompute the caller's OWN aggregate counters from real docs ───
// The counter fields (portfolioCount / coinCount / txCount) can drift from the actual doc
// counts — e.g. a re-add that took the rules UPDATE path inflated coinCount, or a stale/
// duplicate delete decremented it twice. Drift is PERMANENT and fires a FALSE "limit"
// before the real cap. This recomputes every counter in the caller's own tree from the
// source of truth (the docs) and writes the corrections via the Admin SDK (which bypasses
// the counterDeltaOk rule, so it can jump a counter straight to the true value). Acts only
// on context.auth.uid — no IDOR. The client calls it when a write is denied as 'limit'.
exports.reconcileMyCounters = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in first.");
  }
  assertNoUnknownKeys(data, []);
  const uid = context.auth.uid;
  // API-SECURITY (read amplification): recomputing the whole tree is bounded per UTC-day so a
  // scripted loop can't drive unbounded reads/writes. Generous ceiling — the app calls this only
  // after a delete or on a drift-corrected retry, never in a tight legitimate loop.
  const rcBudget = await consumeDailyBudget(db, { uid, key: "reconcile", limit: 500 });
  if (!rcBudget.allowed) throw new functions.https.HttpsError("resource-exhausted", "Too many account-sync attempts today — please try again tomorrow.");
  const userRef = db.collection("users").doc(uid);
  const pSnap = await userRef.collection("portfolios").get();
  const updates = [];   // {ref, data} — committed in ≤450-op chunks (batch limit is 500)
  for (const p of pSnap.docs) {
    const cSnap = await p.ref.collection("coins").get();
    for (const co of cSnap.docs) {
      const txSnap = await co.ref.collection("transactions").get();
      if ((co.data().txCount || 0) !== txSnap.size) updates.push({ ref: co.ref, data: { txCount: txSnap.size } });
    }
    if ((p.data().coinCount || 0) !== cSnap.size) updates.push({ ref: p.ref, data: { coinCount: cSnap.size } });
  }
  const userSnap = await userRef.get();
  if (userSnap.exists && (userSnap.data().portfolioCount || 0) !== pSnap.size) {
    updates.push({ ref: userRef, data: { portfolioCount: pSnap.size } });
  }
  for (let i = 0; i < updates.length; i += 450) {
    const batch = db.batch();
    updates.slice(i, i + 450).forEach((u) => batch.update(u.ref, u.data));
    await batch.commit();
  }
  await writeAudit(context, "reconcileMyCounters", { targetUid: uid, details: "fixed=" + updates.length });
  return { success: true, fixed: updates.length };
});

// ─── Self-service (DI-4/G23): resolve a pending Premium→Pro re-checkout decision ───
// After a lapsed Premium→Pro downgrade the server keeps the `subscription` marker (which
// is owner-immutable, so the client can't clear it itself). When the user picks "Continue
// with Starter" (or after they approve the Pro checkout), clear the marker server-side so
// the re-checkout prompt doesn't recur on every load and device. Acts on the caller's uid.
exports.resolveRecheckout = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Sign in first.");
  assertNoUnknownKeys(data, []);
  await db.collection("users").doc(context.auth.uid).set({ subscription: null }, { merge: true });
  await writeAudit(context, "resolveRecheckout", { targetUid: context.auth.uid });
  return { success: true };
});

// ─── Self-service (DI-4/R29): "Keep my plan" — un-cancel a pending downgrade ───
// Clears the cancellation marker so the paid tier simply continues (owners can't write
// `subscription` themselves — this is the server counterpart). At go-live this also
// reactivates the PayPal subscription before the period end.
exports.reactivateSubscription = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Sign in first.");
  assertNoUnknownKeys(data, []);
  const ref = db.collection("users").doc(context.auth.uid);
  const snap = await ref.get();
  const sub = (snap.exists && snap.data().subscription) || null;
  if (sub) {
    const { cancelled, downgradeTo, ...rest } = sub;
    await ref.set({ subscription: { ...rest, cancelled: false } }, { merge: true });
  }
  await writeAudit(context, "reactivateSubscription", { targetUid: context.auth.uid });
  return { success: true };
});

// ─── Admin: full users list for the Users tab (operational data only) ───
// Merges the Auth record (email / name / disabled / admin) with the Firestore
// profile (tier, portfolioCount, joined). NEVER returns holdings. Capped; the
// dashboard paginates + searches client-side.
exports.listUsers = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);
  assertNoUnknownKeys(data, []);
  const CAP = 5000;
  const prof = {};
  try { const snap = await db.collection("users").get(); snap.forEach((d) => { prof[d.id] = d.data(); }); } catch (e) { /* ignore */ }
  const users = [];
  let pageToken;
  do {
    const res = await admin.auth().listUsers(1000, pageToken);
    for (const u of res.users) {
      const p = prof[u.uid] || {};
      const joinedMs = p.joined && typeof p.joined.toMillis === "function" ? p.joined.toMillis() : null;
      users.push({
        uid: u.uid,
        email: u.email || "",
        name: p.name || u.displayName || "",
        tier: p.tier || "free",
        disabled: !!u.disabled,
        isAdmin: !!(u.customClaims && u.customClaims.admin),
        // ADMIN-SEC: "" for a plain user AND for a legacy role-less admin. The UI uses
        // this to badge owners and to hide controls that the server would refuse anyway.
        role: guards.roleOf(u.customClaims || null),
        portfolioCount: p.portfolioCount || 0,
        joinedMs,
        deleted: p.deleted === true,
        deletedAt: p.deletedAt || null,
        // ADMIN-1: derived subscription status for the Users-tab billing filter +
        // per-row status dot (active / past_due / canceled / none). The full doc is
        // already loaded into `p`, so this adds no read.
        billingStatus: billing.billingStatusOf(p),
      });
    }
    pageToken = res.pageToken;
  } while (pageToken && users.length < CAP);
  users.sort((a, b) => (b.joinedMs || 0) - (a.joinedMs || 0)); // newest first
  return { users, total: users.length, capped: users.length >= CAP };
});

// ─── Admin: read the recent audit log (admins only) ───
exports.listAudit = functions.https.onCall(async (data, context) => {
  // ADMIN-3: the audit log is readable by ANY admin, but the saveConfig diff added this
  // round contains Settings CONTENT — plan prices, analytics/legal IDs, the PayPal client
  // id — and Settings is owner-only behind a step-up re-auth (assertFreshOwner). Handing
  // those values to a manager through the Audit tab would route around that boundary, so
  // a non-owner sees that a config save happened, never what it changed.
  const callerIsOwner = (await assertAdmin(context)) === "owner";
  assertNoUnknownKeys(data, ["limit"]);
  const limit = Math.min(Math.max(parseInt((data && data.limit) || 100, 10) || 100, 1), 500);
  let snap;
  try { snap = await db.collection("audit").orderBy("at", "desc").limit(limit).get(); }
  catch (e) { return { entries: [] }; }
  const entries = snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      actorEmail: x.actorEmail || "",
      action: x.action || "",
      targetUid: x.targetUid || "",
      targetEmail: x.targetEmail || "",
      details: auditDetailsFor(x.action || "", x.details || "", callerIsOwner),
      ip: x.ip || "",   // ADMIN-3: source IP (blank on entries written before this shipped)
      atMs: typeof x.at === "number" ? x.at : (x.at && typeof x.at.toMillis === "function" ? x.at.toMillis() : null),
    };
  });
  return { entries };
});

// ─── ADMIN-1: read the recent PayPal webhook-processing ledger (admins only) ───
// The paypalWebhook function records every SUCCESSFULLY processed event as
// webhookEvents/{event.id} = { at, type } (the D6 idempotency ledger). Surfacing
// it read-only gives the panel a "webhook health" view — the last processed event,
// staleness, and the recent event mix — without any new storage. webhookEvents is
// server-only in firestore.rules; this callable reads it via the Admin SDK.
exports.listWebhookEvents = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);
  assertNoUnknownKeys(data, ["limit"]);
  const limit = Math.min(Math.max(parseInt((data && data.limit) || 50, 10) || 50, 1), 200);
  let snap;
  try { snap = await db.collection("webhookEvents").orderBy("at", "desc").limit(limit).get(); }
  catch (e) { return { events: [] }; }
  const events = snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      type: x.type || "",
      atMs: typeof x.at === "number" ? x.at : (x.at && typeof x.at.toMillis === "function" ? x.at.toMillis() : null),
    };
  });
  return { events };
});

// ─── ADMIN-2: operational status for the Overview strip (admins only) ───
//
// The expected schedule of every cron, declared HERE rather than inferred from
// whatever happens to be in health/jobs. A job that has never run once would
// otherwise simply be absent from the response, and the strip would render a clean
// six-of-six — the same "missing looks like fine" trap ADMIN-4 hit with an empty
// series. Enumerating from the registry makes "never ran" a visible state.
// (tests/unit/features.test.js asserts this list matches the runJob call sites.)
const SCHEDULED_JOBS = [
  { name: "refreshPrices", everyMs: 5 * 60 * 1000 },
  { name: "refreshUniverseDaily", everyMs: 24 * 3600 * 1000 },
  { name: "purgeOldAudit", everyMs: 24 * 3600 * 1000 },
  { name: "captureDailyStats", everyMs: 24 * 3600 * 1000 },
  { name: "purgeExpiredTrash", everyMs: 24 * 3600 * 1000 },
  { name: "enforceSubscriptionPeriods", everyMs: 24 * 3600 * 1000 },
];

// assertAdmin, not assertOwner: everything here is either already public on
// /api/config (the switches) or operational timing. Deliberately NO secrets — the
// Sentry DSN is reported only as a boolean. Settings stays owner-only; this is the
// read-only "is anything on fire" view, which a manager on support duty needs.
exports.getSystemStatus = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);
  assertNoUnknownKeys(data, []);
  // Read config FRESH rather than through getConfig()'s 5-minute cache. The strip's
  // entire job is to report what is currently switched off, and enforcement runs on
  // the 60-second featuresNow() clock — so a cached read here could show
  // "All features on" for minutes after market data was actually killed. Observed
  // live 2026-07-24. One extra read on an admin-only call is a fair price for a
  // status view that cannot contradict the thing it is reporting on.
  let cfg = {};
  try { const s = await db.doc("config/app").get(); cfg = (s.exists && s.data()) || {}; } catch (e) { /* defaults below */ }
  let health = {};
  try { const s = await db.doc(HEALTH_DOC).get(); health = (s.exists && s.data()) || {}; } catch (e) { /* ignore */ }
  const docAge = async (path) => {
    try { const s = await db.doc(path).get(); return (s.exists && s.data() && s.data().updatedAt) || null; }
    catch (e) { return null; }
  };
  return {
    features: featureFlags.readFeatures(cfg),
    maintenance: !!(cfg.flags && cfg.flags.maintenance),
    signupsEnabled: !(cfg.flags && cfg.flags.signupsEnabled === false),
    // `at: null` is the honest reading for a job that has never completed — the
    // client renders "never", never a reassuring blank.
    jobs: SCHEDULED_JOBS.map(({ name, everyMs }) => {
      const h = health[name] || {};
      return {
        name, everyMs,
        at: typeof h.at === "number" ? h.at : null,
        note: h.note || null,
        errorAt: typeof h.errorAt === "number" ? h.errorAt : null,
        error: h.error || null,
      };
    }),
    caches: { universeAt: await docAge(UNIVERSE_DOC), trendingAt: await docAge(TRENDING_DOC) },
    // Configured AND well-formed — dsnOf rejects a malformed paste, so "on" here
    // means reporting can actually work, not merely that the field is non-empty.
    sentryConfigured: !!observability.dsnOf(cfg),
    now: Date.now(),
  };
});

// ─── Admin: read current saved config to pre-fill the Settings form ───
// Secrets are NOT returned in full — only whether each is set — so the admin can
// see what's configured and replace it without the secret reaching the client.
exports.getAdminConfig = functions.https.onCall(async (data, context) => {
  const callerRole = await assertFreshOwner(context);
  assertNoUnknownKeys(data, []);
  let cfg = {};
  try { const s = await db.doc("config/app").get(); cfg = (s.exists && s.data()) || {}; } catch (e) { /* ignore */ }
  const pp = cfg.paypal || {}, em = cfg.email || {}, fl = cfg.flags || {}, an = cfg.analytics || {}, lg = cfg.legal || {};
  return {
    coingeckoSet: !!cfg.coingecko,
    paypal: { clientId: pp.clientId || "", secretSet: !!pp.secret, webhookId: pp.webhookId || "" },
    email: { provider: em.provider || "none", apiKeySet: !!em.apiKey, apiUrl: em.apiUrl || "", fromEmail: em.fromEmail || "", listId: em.listId || "" },
    // ADMIN-0: requireAdminMfa is OFF unless config says exactly true — nothing can
    // satisfy the gate until Identity Platform MFA is enabled, so an absent flag
    // must not read as "on".
    flags: { maintenance: !!fl.maintenance, signupsEnabled: fl.signupsEnabled !== false, requireAdminMfa: fl.requireAdminMfa === true, features: featureFlags.readFeatures(cfg) },
    plans: mergePlans(cfg.plans),
    // ADMIN-2: the DSN itself is a secret-ish endpoint URL, so it follows the same
    // rule as every other key — the form learns only whether one is configured.
    sentry: { dsnSet: !!observability.dsnOf(cfg) },
    analytics: { ga4: an.ga4 || "", plausible: an.plausible || "" },
    legal: { termlyUuid: lg.termlyUuid || "", termlyPrivacyId: lg.termlyPrivacyId || "", termlyTermsId: lg.termlyTermsId || "", cookieBanner: !!lg.cookieBanner },
    // BL-2d (D10): the reserved AI section — the key itself never leaves the server.
    ai: { anthropicKeySet: !!(cfg.ai && cfg.ai.anthropicKey) },
    // ADMIN-5: the announcement-banner draft so the Settings form pre-fills. Unlike
    // /api/config (which hides an inactive one), the owner form always sees it.
    announcement: announce.sanitize(cfg.announcement),
    updatedAt: cfg.updatedAt || null,
  };
});

// ─── Save app config / API keys (admins only) ───
// Writes the admin dashboard's Settings (CoinGecko + PayPal keys, email provider)
// to the LOCKED config/app Firestore doc that the proxy + PayPal functions read.
// Clients can never read this doc (firestore.rules deny all access to /config).
exports.saveConfig = functions.https.onCall(async (data, context) => {
  const callerRole = await assertFreshOwner(context);
  assertNoUnknownKeys(data, ["keys", "email", "flags", "analytics", "legal", "plans", "announcement"]);
  const k = (data && data.keys) || {};
  const m = (data && data.email) || {};
  // Read existing so a blank SECRET field means "keep the saved value" — the form
  // never shows secrets back, so re-saving without re-typing them must not wipe them.
  let existing = {};
  try { const s = await db.doc("config/app").get(); existing = (s.exists && s.data()) || {}; } catch (e) { /* ignore */ }
  const exPp = existing.paypal || {}, exEm = existing.email || {};
  const keep = (incoming, current) => { const v = String(incoming || ""); return v ? v : String(current || ""); };
  // Public flags + non-secret analytics/legal IDs (exposed via /api/config).
  const f = (data && data.flags) || existing.flags || {};
  // ADMIN-2: mergeFeatures enumerates from the declared switch list (so an unknown
  // key can never be stored) AND keeps any switch the payload doesn't mention — the
  // instant maintenance/signups toggles post `flags` without `features`, and must not
  // silently re-enable a feature someone just killed.
  // ADMIN-0: same per-key rule as `features`, for the same reason — the instant
  // maintenance/signups toggles post `flags` WITHOUT this key, and re-defaulting an
  // omitted field would silently switch admin 2FA back off. Absent ⇒ KEEP the stored
  // value; stored-absent ⇒ false.
  const exFlags = existing.flags || {};
  const requireAdminMfa = "requireAdminMfa" in f ? f.requireAdminMfa === true : exFlags.requireAdminMfa === true;
  const flags = { maintenance: !!f.maintenance, signupsEnabled: f.signupsEnabled !== false, requireAdminMfa, features: featureFlags.mergeFeatures(f.features, exFlags.features) };
  const an = (data && data.analytics) || existing.analytics || {};
  const lg = (data && data.legal) || existing.legal || {};
  const cfg = {
    coingecko: keep(k.coingecko, existing.coingecko),
    paypal: {
      clientId: String(k.paypalClientId || ""),
      secret: keep(k.paypalSecret, exPp.secret),
      webhookId: String(k.paypalWebhookId || ""),
    },
    email: {
      provider: String(m.provider || "none"),
      apiKey: keep(m.apiKey, exEm.apiKey),
      apiUrl: String(m.apiUrl || ""),
      fromEmail: String(m.fromEmail || ""),
      listId: String(m.listId || ""),
    },
    flags,
    plans: mergePlans((data && data.plans) || existing.plans),
    // BL-2d (D10): Anthropic key for the Wave-B AI proxy — same keep() idiom as the
    // other secrets (a blank field keeps the saved value; the key is never echoed back).
    ai: { anthropicKey: keep(k.anthropicKey, (existing.ai || {}).anthropicKey) },
    // ADMIN-2: the Sentry DSN — same keep() idiom as the secrets, so re-saving the
    // form without re-typing it doesn't silently switch error reporting off.
    sentry: { dsn: keep(k.sentryDsn, (existing.sentry || {}).dsn) },
    analytics: { ga4: String(an.ga4 || ""), plausible: String(an.plausible || "") },
    legal: {
      termlyUuid: String(lg.termlyUuid || ""),
      termlyPrivacyId: String(lg.termlyPrivacyId || ""),
      termlyTermsId: String(lg.termlyTermsId || ""),
      cookieBanner: !!lg.cookieBanner,
    },
    // ADMIN-5: the announcement banner. Same per-key-KEEP rule as flags.features —
    // the instant maintenance/signups toggles post `flags` WITHOUT `announcement`,
    // so an omitted value must preserve the stored banner, not blank it out.
    announcement: announce.cleanAnnouncement(data && data.announcement, existing.announcement),
    updatedAt: Date.now(),
  };
  // ADMIN-3: record WHAT changed, not just that a save happened, so a bad edit can be
  // inspected (and reversed by hand) from the audit log. `existing` was already read
  // above for the keep() idiom, so this costs no extra read. Secret VALUES never reach
  // the log — a keep()-guarded field records only "(changed)" (see config-diff.js).
  const changeSummary = formatConfigDiff(diffConfig(existing, cfg));
  await db.doc("config/app").set(cfg, { merge: true });
  _cfg = null; // invalidate cache so the new values are used immediately
  _features = null; // ADMIN-2: ditto for the switches — a flip must not wait out its own TTL
  await writeAudit(context, "saveConfig", { details: changeSummary });
  return { success: true };
});

// ═════════════════════════════════════════════════════════════
// CoinGecko proxy  (prices / search / history)
// ═════════════════════════════════════════════════════════════
// Cost model: upstream calls are SHARED across all users and do NOT scale with
// the number of users. One refresh of the shared coin universe (1 call per 250
// coins) serves everyone's prices AND search — for the DCA calculator and the
// app alike. Each coin's full history is fetched once and reused for every DCA
// calc by every user. See README "CoinGecko proxy".
//
// API key lives server-side only — set it from the Admin dashboard (config/app
// doc, the primary source read by cgHeaders) or via the COINGECKO_DEMO_KEY env
// var (functions/.env) as a fallback. Without a key it uses the public endpoint
// (lower limits, history limited to the last 365 days — the app then falls back
// to its built-in estimates).
const CG_BASE = "https://api.coingecko.com/api/v3";
const CG_KEY = process.env.COINGECKO_DEMO_KEY || "";
// Admin-managed config (API keys / email) lives in a LOCKED Firestore doc
// (config/app) written by the saveConfig function. Falls back to env vars.
// Cached 5 min. Clients can never read it (rules).
let _cfg = null, _cfgAt = 0;
async function getConfig() {
  if (_cfg && (Date.now() - _cfgAt) < 5 * 60 * 1000) return _cfg;
  try { const s = await db.doc("config/app").get(); _cfg = s.exists ? (s.data() || {}) : {}; }
  catch (e) { _cfg = _cfg || {}; }
  _cfgAt = Date.now();
  return _cfg;
}
async function cgHeaders() {
  const cfg = await getConfig();
  const key = (cfg && cfg.coingecko) || CG_KEY;
  return key ? { "x-cg-demo-api-key": key } : {};
}

// ─── ADMIN-2: per-feature kill-switches ───
// Read on a SHORTER clock than getConfig()'s 5 minutes. A kill-switch you flip
// during an incident and then wait five minutes for is not a kill-switch; 60s
// matches the CDN cache on /api/config, so the server and the client stop within
// the same window. saveConfig clears both caches for the instance that served it.
const FEATURES_TTL = 60 * 1000;
let _features = null, _featuresAt = 0;
async function featuresNow() {
  if (_features && (Date.now() - _featuresAt) < FEATURES_TTL) return _features;
  let cfg = {};
  try { const s = await db.doc("config/app").get(); cfg = (s.exists && s.data()) || {}; }
  // A failed read must NOT read as "everything off" — featureFlags defaults every
  // switch to ON precisely so a Firestore blip can't take the product down.
  catch (e) { return _features || featureFlags.readFeatures({}); }
  _features = featureFlags.readFeatures(cfg);
  _featuresAt = Date.now();
  return _features;
}
async function featureOn(name) { return (await featuresNow())[name] !== false; }

// Thrown by cgFetch when market data is switched off. Every caller already treats
// an upstream failure as "serve what we cached", so the switch reuses those paths
// instead of adding a second set of branches to keep in step.
class MarketDataOffError extends Error {
  constructor() { super("market data is switched off (ADMIN-2 kill-switch)"); this.name = "MarketDataOffError"; }
}

// THE choke point for CoinGecko. Every upstream call goes through here — the
// universe refresh, the on-demand price top-up, trending, and history — so the
// marketData switch is enforced in ONE place that a new call site cannot miss.
// (tests/unit/features.test.js fails the build if a direct `fetch(`${CG_BASE}…`)`
// ever reappears.) Off means ZERO upstream calls: the cost stops immediately and
// the caches keep serving, which is what makes the switch safe enough to actually
// use during an incident.
async function cgFetch(path) {
  if (!(await featureOn("marketData"))) throw new MarketDataOffError();
  return fetch(`${CG_BASE}${path}`, { headers: await cgHeaders() });
}

// ─── Bot/abuse protection: per-IP rate limit on the public API ───
// In-memory sliding window per function instance. Caps how fast any single
// visitor (incl. the public DCA calculator) can hit the API. Heavy upstream
// work is already cached, so this mainly stops scraping/DoS-style bursts.
const RATE_LIMIT = 60;            // max requests (cheap, cached READ endpoints) per window, per IP
const SUBSCRIBE_LIMIT = 5;        // far stricter cap for the public WRITE endpoint (subscribe)
const RATE_WINDOW = 60 * 1000;   // per 60 seconds, per IP
const _rl = {};                   // sliding-window store for general (read) traffic
const _rlSub = {};                // SEPARATE store so the write endpoint has its own tight budget
function rateLimited(req, store = _rl, limit = RATE_LIMIT) {
  // API-SECURITY: key on a spoof-resistant client IP (right-anchored XFF, NOT the
  // attacker-controlled left-most token) so rotating X-Forwarded-For can't mint a fresh
  // bucket per request. See net-utils.clientIp.
  const ip = clientIp(req.headers["x-forwarded-for"], req.ip, RL_TRUSTED_HOPS);
  const now = Date.now();
  // Overflow guard: prune only EXPIRED buckets (never a full wipe — a spoofed-IP flood used
  // to reset every legitimate user's window when the map hit the cap).
  if (Object.keys(store).length > 10000) { for (const k in store) if (now > store[k].resetAt) delete store[k]; }
  let e = store[ip];
  if (!e || now > e.resetAt) { e = { count: 0, resetAt: now + RATE_WINDOW }; store[ip] = e; }
  e.count++;
  return e.count > limit;
}

// ─── ONE shared coin universe (metadata + price for ~3,000 coins) ───
// A single Firestore doc powers BOTH the public DCA calculator and the user app
// (each reads it through its own endpoint, so the two front-ends stay decoupled).
// HYBRID price model (keeps upstream cost down without hurting UX):
//   • refreshPrices (every 5 min) — refreshes only the HOT set (top ~HOT_PAGES×250
//     coins), which is what people actually hold/trade. Always MERGES.
//   • refreshUniverseDaily (24h) — refreshes ALL ~3,000 (metadata + price) and
//     PRUNES coins that dropped off the list. Cheap (≤12 calls), reliable on free tier.
//   • /api/prices fetches a held coin in the long tail ON DEMAND (per-coin freshness
//     check below) and folds it back in — so cost is flat by distinct coins held,
//     not by user count. The DCA calculator reads the cache only — 0 user-triggered calls.
// Covering even the hot ~1,250 every 5 min needs a paid CoinGecko plan; on the free
// tier it degrades gracefully — rate-limited (429) pages are skipped, last-good kept.
const UNIVERSE_PAGES = 12;                        // 12 × 250 = ~3,000 coins (full universe)
const HOT_PAGES = 5;                              // 5 × 250 = top ~1,250 coins kept 5-min-fresh
const UNIVERSE_TTL = 5 * 60 * 1000;              // lazy full-refresh window (when no scheduler runs)
const HOT_TTL = 5 * 60 * 1000;                   // per-coin price freshness for the app (long tail refetched past this)
const HISTORY_TTL = 30 * 24 * 60 * 60 * 1000;    // per-coin history: 30 days (past data never changes)
const HISTORY_NEG_TTL = 60 * 60 * 1000;          // API-SECURITY: negative-cache a failed history fetch for 1h so a real-but-unavailable coin isn't re-fetched (denial-of-wallet) on every request
const UNIVERSE_DOC = "cache/universe";
const TRENDING_DOC = "cache/trending";
const TRENDING_TTL = 30 * 60 * 1000;            // trending refreshes lazily every 30 min (volatile, but cheap)

// Fetch up to `pages` pages of /coins/markets (metadata + price in one call) into
// the shared universe doc. REPLACES the doc (pruning delisted coins) only on a
// `prune` refresh that fully succeeded; otherwise MERGES, so a hot/partial refresh
// never drops the coins it didn't fetch. Returns the fetched coins map.
async function refreshUniverse({ pages = UNIVERSE_PAGES, prune = false } = {}) {
  const coins = {};
  let complete = true;
  for (let page = 1; page <= pages; page++) {
    let r;
    try {
      r = await cgFetch(`/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}&price_change_percentage=24h`);
    } catch (e) { complete = false; break; }
    // First page failing with nothing collected = hard error (caller falls back
    // to cache). Any later failure: keep what we have, mark partial, stop.
    if (!r.ok) {
      if (page === 1 && !Object.keys(coins).length) throw new Error("universe " + r.status);
      complete = false; break;
    }
    const arr = await r.json();
    if (!arr.length) break;                        // ran past the last page of coins
    for (const c of arr) {
      coins[c.id] = {
        s: String(c.symbol || "").toUpperCase(), n: c.name, img: c.image || "",
        rank: c.market_cap_rank || null, p: c.current_price,
        ch: c.price_change_percentage_24h, mc: c.market_cap,
        v: c.total_volume, cs: c.circulating_supply, at: Date.now(),
      };
    }
  }
  const replace = prune && complete;               // only a complete daily refresh prunes
  // C-R2b (C14): a >1 MiB write would THROW and break both front-ends. Above the
  // ~850 KiB soft limit, drop the lowest-rank tail and log it — never throw.
  const guard = trimUniverse(coins);
  if (guard.trimmed) console.warn(`refreshUniverse: universe ~${Math.round(guard.size / 1024)}KiB — trimmed ${guard.trimmed} lowest-rank coins to stay under the doc cap (C14)`);
  await db.doc(UNIVERSE_DOC).set({ updatedAt: Date.now(), coins: guard.coins }, replace ? undefined : { merge: true });
  return guard.coins;
}

// C-R2f: coalesce concurrent long-tail /simple/price fetches — a burst of requests
// for the same cold coins triggers ONE upstream call, not one per request. Keyed by
// the sorted id set (identical portfolios produce identical batches — the actual
// stampede shape); the entry clears when the fetch settles.
const _inflightPrice = new Map();
// Review fix: returns { data, fetchedAt } where fetchedAt is captured when the
// UPSTREAM FETCH starts — coalesced followers must stamp the shared data with the
// fetch's own time, never their (later) arrival time, or a follower's fold-back
// could claim fake-newer freshness and overwrite a genuinely newer refresh.
async function coalescedSimplePrice(ids) {
  const key = [...ids].sort().join(",");
  const hit = _inflightPrice.get(key);
  if (hit) return hit;
  const fetchedAt = Date.now();
  const p = (async () => {
    try {
      const r = await cgFetch(`/simple/price?ids=${encodeURIComponent(ids.join(","))}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`);
      return { data: r.ok ? await r.json() : null, fetchedAt };
    } finally { _inflightPrice.delete(key); }
  })();
  _inflightPrice.set(key, p);
  return p;
}

// Read the shared universe; lazily refresh the FULL list on demand if missing/stale
// (so it works even without the scheduled jobs, e.g. in the emulator).
async function getUniverse() {
  let data = null;
  try { const snap = await db.doc(UNIVERSE_DOC).get(); data = snap.exists ? snap.data() : null; } catch (e) { /* ignore */ }
  // ADMIN-2: with marketData switched off, serve the last-known cache and skip the
  // lazy refresh entirely. cgFetch would refuse anyway, but refreshUniverse treats a
  // failed first page as "partial" and still writes `updatedAt: now` — which would
  // stamp the cache FRESH while having fetched nothing, hiding exactly the staleness
  // the admin needs to see on the status strip.
  if (!(await featureOn("marketData"))) return (data && data.coins) || {};
  if (!data || (Date.now() - (data.updatedAt || 0)) > UNIVERSE_TTL) {
    try { return await refreshUniverse({ pages: UNIVERSE_PAGES }); } catch (e) { if (data) return data.coins; throw e; }
  }
  return data.coins;
}

// Trending coins from CoinGecko's /search/trending (a different endpoint than the
// universe), cached in its own small doc. Each refresh REPLACES the doc — trending
// is the current snapshot, not an accumulating list. Returns a normalized array
// [{id, symbol, name, thumb, rank}]; never throws here (caller handles failure).
async function refreshTrending() {
  const r = await cgFetch("/search/trending");
  if (!r.ok) throw new Error("trending " + r.status);
  const d = await r.json();
  const coins = (Array.isArray(d.coins) ? d.coins : [])
    .map((x) => {
      const it = x.item || x;                      // /search/trending wraps each coin in `.item`
      return { id: it.id, symbol: String(it.symbol || "").toUpperCase(), name: it.name, thumb: it.thumb || it.small || "", rank: it.market_cap_rank || null };
    })
    .filter((c) => c.id && c.name);
  await db.doc(TRENDING_DOC).set({ updatedAt: Date.now(), coins });
  return coins;
}

// Read the shared trending list; lazily refresh on demand if missing/stale (works
// without a scheduler). Falls back to the last-good cache if a refresh fails.
async function getTrending() {
  let data = null;
  try { const snap = await db.doc(TRENDING_DOC).get(); data = snap.exists ? snap.data() : null; } catch (e) { /* ignore */ }
  // ADMIN-2: same as getUniverse — off means serve the cache, make no upstream call.
  if (!(await featureOn("marketData"))) return (data && data.coins) || [];
  if (!data || (Date.now() - (data.updatedAt || 0)) > TRENDING_TTL) {
    try { return await refreshTrending(); } catch (e) { if (data) return data.coins; throw e; }
  }
  return data.coins;
}

// ─── Runtime caps (go-live) ───
// Blaze has NO hard spend cap and gen-1 functions scale to 3,000 instances by
// default, so every export is bounded explicitly.
//
// DAILY sweeps only — they walk every user/coin, so they get the long ceiling.
// Do NOT reuse this for a job that runs more often than 540s: a timeout longer
// than the schedule interval makes overlapping invocations possible, which the
// gen-1 default (60s) quietly prevented.
const SCHEDULED = functions.runWith({ maxInstances: 5, timeoutSeconds: 540 });

// ─── ADMIN-2: cron heartbeat ───
// A scheduled job that FAILS is visible (it throws, the platform records an error).
// A scheduled job that simply STOPS BEING CALLED is invisible — nothing errors,
// there is just quietly no new data, and for captureDailyStats that means days of
// history lost for good. So every run stamps a tiny record and the admin status
// strip reads the age. Two timestamps answer the two different questions:
//   at       — last run that COMPLETED (success, or a deliberate kill-switch skip).
//              Old ⇒ the schedule itself is dead.
//   errorAt  — last run that threw. Newer than `at` ⇒ it is running but failing.
// Server-only (firestore.rules denies /health to everyone, admins included).
const HEALTH_DOC = "health/jobs";
async function stampJob(name, patch) {
  // The heartbeat must never be able to fail the job it is recording.
  try { await db.doc(HEALTH_DOC).set({ [name]: patch }, { merge: true }); }
  catch (e) { console.error("stampJob:", name, e); }
}

// Run a scheduled job: record the heartbeat either way, report the failure, and
// STILL rethrow so the invocation is marked FAILED (H3 — a swallowed error returns
// success, so the platform's built-in alert never fires). `fn` may return a short
// note (e.g. "skipped — marketData off") that is stored alongside the heartbeat,
// so an unchanged data set has a stated reason instead of looking like a fault.
async function runJob(name, fn) {
  try {
    const note = await fn();
    await stampJob(name, { at: Date.now(), note: note || null });
  } catch (e) {
    console.error(name + ":", e);
    await stampJob(name, { errorAt: Date.now(), error: String((e && e.message) || e).slice(0, 300) });
    try { observability.captureError(await getConfig(), "scheduler:" + name, e); } catch (e2) { /* never mask the real error */ }
    throw e;
  }
  return null;
}

// Keep the HOT set fresh (every 5 min) — top ~1,250 coins, always merged so the
// long tail (refreshed daily) is preserved. The tail is priced on demand by /api/prices.
// NOT on SCHEDULED: this runs every 5 min (300s), so it needs its own shorter
// ceiling. timeoutSeconds must stay BELOW the interval, and maxInstances:1 makes
// an overlap structurally impossible even if that ever stops holding — two
// concurrent runs would merge-write the universe doc over each other and leave
// `updatedAt` falsely fresh, suppressing the lazy full refresh.
exports.refreshPrices = functions
  .runWith({ maxInstances: 1, timeoutSeconds: 120 })
  .pubsub.schedule("every 5 minutes").onRun(() => runJob("refreshPrices", async () => {
  // ADMIN-2: a deliberately switched-off feature must not page you. Skipping here
  // (rather than letting cgFetch throw) keeps the run GREEN and records why, so a
  // frozen price cache reads as "you turned this off", not "the refresh is broken".
  if (!(await featureOn("marketData"))) return "skipped — marketData off";
  await refreshUniverse({ pages: HOT_PAGES });
  return null;
}));

// Daily FULL refresh — guarantees the complete ~3,000-coin list and prunes coins
// that dropped off the market-cap list. Cheap and reliable even on the free tier.
// C-R2f: also prunes historyCache docs past HISTORY_TTL (they only re-fill on demand,
// so expired ones are dead weight).
exports.refreshUniverseDaily = SCHEDULED.pubsub.schedule("every 24 hours").onRun(() => runJob("refreshUniverseDaily", async () => {
  // Both halves always run (a failed refresh shouldn't skip the prune), but the
  // first error is remembered and rethrown so the invocation is marked FAILED.
  let failure = null;
  let note = null;
  // ADMIN-2: the refresh half is the upstream spend; the prune half is local
  // housekeeping and keeps running regardless, so switching market data off does
  // not quietly let expired history pile up.
  if (!(await featureOn("marketData"))) note = "refresh skipped — marketData off";
  else {
    try { await refreshUniverse({ pages: UNIVERSE_PAGES, prune: true }); }
    catch (e) { console.error("refreshUniverseDaily:", e); failure = e; }
  }
  try {
    const cutoff = Date.now() - HISTORY_TTL;
    const stale = await db.collection("historyCache").where("updatedAt", "<", cutoff).get();
    for (const d of stale.docs) await d.ref.delete();
    if (stale.size) console.log("refreshUniverseDaily: pruned", stale.size, "expired historyCache docs");
  } catch (e) { console.error("historyCache prune:", e); failure = failure || e; }
  if (failure) throw failure;
  return note;
}));

// ─── C-R2c (C15): audit-log retention ───
// Audit entries are kept on legitimate interest but AGE OUT after a fixed window,
// regardless of account deletion (no per-account scrub). Disclosure: privacy.html.
const AUDIT_RETENTION_MS = 365 * 24 * 3600 * 1000;   // 12 months
exports.purgeOldAudit = SCHEDULED.pubsub.schedule("every 24 hours").onRun(() => runJob("purgeOldAudit", async () => {
  const cutoff = Date.now() - AUDIT_RETENTION_MS;
  const old = await db.collection("audit").where("at", "<", cutoff).limit(500).get();
  for (const d of old.docs) await d.ref.delete();
  if (old.size) console.log("purgeOldAudit: removed", old.size, "expired audit entries");
  return null;
}));

// ─── ADMIN-4: the daily growth snapshot ───
// Aggregate-only (no uid, no email), so the series is kept INDEFINITELY (founder,
// 2026-07-24) — there is deliberately NO purge sweep paired with this, unlike
// audit and trash. `writeDailySnapshot` is defined up with getStats, next to the
// gatherStats() maths it shares with the live Overview.
exports.captureDailyStats = SCHEDULED.pubsub.schedule("every 24 hours").onRun(() => runJob("captureDailyStats", async () => {
  // H3: this must fail LOUDLY. A silently-skipped run loses a day of history that
  // cannot be reconstructed later — the counts it would have recorded are gone.
  // ADMIN-2: which is exactly why this job gets a heartbeat. A schedule that stops
  // FIRING never throws, so nothing alerts — the only symptom is a gap in a series
  // that can never be backfilled. The status strip makes that gap visible in hours
  // instead of whenever someone next opens the growth card.
  const snapshot = await writeDailySnapshot(Date.now());
  console.log("captureDailyStats: wrote", snapshot.date, JSON.stringify(snapshot));
  return null;
}));

// Daily: permanently erase accounts whose 30-day trash window has elapsed.
// (Cloud Scheduler fires this in prod; trigger it from the emulator UI in dev.)
exports.purgeExpiredTrash = SCHEDULED.pubsub.schedule("every 24 hours").onRun(() => runJob("purgeExpiredTrash", async () => {
  // Per-user isolation: one undeletable account must not stop the sweep for
  // everyone else. Errors are remembered and rethrown after the loop so the
  // invocation still reports FAILED (see refreshPrices for why).
  const cutoff = Date.now() - TRASH_MS;
  let failure = null;
  const snap = await db.collection("users").where("deleted", "==", true).get();
  for (const d of snap.docs) {
    try {
      if ((d.data().deletedAt || 0) <= cutoff) {
        await db.recursiveDelete(d.ref);
        try { await admin.auth().deleteUser(d.id); } catch (e) { /* already gone */ }
        console.log("purgeExpiredTrash: permanently deleted", d.id);
      }
    } catch (e) { console.error("purgeExpiredTrash:", d.id, e); failure = failure || e; }
  }
  if (failure) throw failure;
  return null;
}));

// ─── BL-1f (B8): the server-side at-period-end subscription flip ───
// Cancelled subscriptions past their endDate drop to Starter (a "pro" target keeps
// its marker so the app's R29 re-checkout popup decides the landing — an approved
// Pro payment arrives as a fresh ACTIVATED webhook); payment failures drop after
// the 7-day grace (U12). Pure decision per user in billing.subscriptionSweepPatch.
exports.enforceSubscriptionPeriods = SCHEDULED.pubsub.schedule("every 24 hours").onRun(() => runJob("enforceSubscriptionPeriods", async () => {
  // This is the money one: if it silently fails, cancelled subscribers keep a
  // paid tier forever. Per-user isolation + rethrow so a real failure alerts.
  let failure = null;
  const snap = await db.collection("users").get();
  for (const d of snap.docs) {
    try {
      const patch = billing.subscriptionSweepPatch(d.data(), Date.now());
      if (patch) {
        await d.ref.set(patch, { merge: true });
        console.log("enforceSubscriptionPeriods:", d.id, JSON.stringify(patch));
      }
    } catch (e) { console.error("enforceSubscriptionPeriods:", d.id, e); failure = failure || e; }
  }
  if (failure) throw failure;
  return null;
}));

// PUBLIC + unauthenticated + CORS-*, so this is the one endpoint a flood can
// reach for free. maxInstances is the real spend ceiling (a billing budget only
// ALERTS, it never stops spend). 20 is deliberate, not minimal: gen-1 serves one
// request per instance and this backs BOTH the landing calculator and every
// in-app price read, so a tighter cap would 429 real users.
exports.api = functions
  .runWith({ maxInstances: 20, timeoutSeconds: 120 })
  .https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).send("");
    return;
  }
  if (rateLimited(req)) { res.status(429).json({ error: "Too many requests — please slow down." }); return; }
  const action = String(req.path || "").split("/").filter(Boolean).pop();
  try {
    if (action === "prices") {
      const ids = String(req.query.ids || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 500);
      if (!ids.length) { res.status(400).json({ error: "ids required" }); return; }
      const universe = await getUniverse();
      const now = Date.now();
      const out = {};
      const stale = [];
      for (const id of ids) {
        const m = universe[id];
        // Serve from cache only if the coin's price is fresh (hot coins, refreshed
        // every 5 min). A long-tail coin (refreshed only daily) goes "stale" after
        // HOT_TTL → refetched on demand below. Missing coins are stale too.
        // R23-1: surface the already-cached CoinGecko rank (universe `rank`, from
        // /coins/markets) so the client risk model can use it — no new upstream call.
        if (m && (now - (m.at || 0)) < HOT_TTL) {
          out[id] = { usd: m.p, usd_24h_change: m.ch, usd_market_cap: m.mc, usd_24h_vol: m.v, circulating: m.cs, usd_market_cap_rank: m.rank ?? null };
        } else if (m) {
          out[id] = { usd: m.p, usd_24h_change: m.ch, usd_market_cap: m.mc, usd_24h_vol: m.v, circulating: m.cs, usd_market_cap_rank: m.rank ?? null }; // last-known, refreshed just below
          stale.push(id);
        }
        // API-SECURITY (denial-of-wallet): an id NOT in the shared universe is IGNORED — never
        // pushed to `stale`, so a novel/garbage id can never trigger an upstream /simple/price
        // call. Only real, already-known coins are refreshed on demand (they cache after the
        // first hit), so the fan-out is bounded by the ~3,000-coin universe, not by request count.
      }
      // Refresh stale/missing held coins ON DEMAND and fold the fresh price back
      // into the shared universe doc, so the next request — for ANY user — is served
      // from cache. Cost stays flat (driven by distinct coins held across ALL users,
      // not request count). Price-only entries for off-list coins carry no name, so
      // search / coinlist skip them; the daily full refresh prunes them.
      // C-R2f: (a) concurrent requests for the SAME stale coins coalesce behind one
      // in-flight upstream fetch (no thundering herd on a cold burst); (b) the
      // fold-back runs in a transaction with a per-coin `at` freshness check, so a
      // scheduled refresh that landed mid-flight is never overwritten by older data.
      if (stale.length) {
        try {
          const { data: d, fetchedAt } = await coalescedSimplePrice(stale);
          if (d) {
            const upd = {};
            for (const id of stale) {
              if (d[id]) {
                // R23-1: simple/price carries no rank — keep the cached universe rank on
                // the response so a stale-but-known coin doesn't lose it mid-refresh.
                out[id] = { ...d[id], usd_market_cap_rank: (universe[id] || {}).rank ?? null };
                // preserve metadata if we already had it; only update price fields.
                // `at: fetchedAt` — the SHARED fetch's start time, not this request's
                // arrival, so a coalesced follower can't claim fake-newer freshness.
                // API-SECURITY (denial-of-wallet): only fold back coins ALREADY in the universe —
                // never create a net-new off-list entry from user-supplied ids (that would grow the
                // shared 1 MiB doc unbounded and, past the cap, silently break the 5-min refresh for
                // everyone). The stale-gate above already ensures universe[id] is set here; this makes
                // the invariant explicit on the write itself.
                if (universe[id]) upd[id] = { ...universe[id], p: d[id].usd, ch: d[id].usd_24h_change, mc: d[id].usd_market_cap, at: fetchedAt };
              }
            }
            if (Object.keys(upd).length) {
              try {
                await db.runTransaction(async (t) => {
                  const snap = await t.get(db.doc(UNIVERSE_DOC));
                  const cur = (snap.exists && snap.data().coins) || {};
                  const fresh = {};
                  for (const id in upd) {
                    // Skip any coin already stamped NEWER than the fetch itself —
                    // never overwrite fresher data with older.
                    if (((cur[id] || {}).at || 0) < fetchedAt) fresh[id] = upd[id];
                  }
                  if (Object.keys(fresh).length) t.set(db.doc(UNIVERSE_DOC), { coins: fresh }, { merge: true });
                });
              } catch (e) { /* ignore */ }
            }
          }
        } catch (e) { /* ignore */ }
      }
      res.set("Cache-Control", "public, max-age=120");
      res.json(out);
      return;
    }
    if (action === "search") {
      const q = String(req.query.q || "").trim().toLowerCase().slice(0, 100);  // cap length (DoS guard)
      if (!q) { res.json({ coins: [] }); return; }
      const list = await getUniverse();   // ~3,000 coins, no per-search upstream call
      const matches = [];
      for (const id in list) {
        const m = list[id];
        if (!m || !m.n) continue;         // skip price-only off-list entries (no metadata)
        if (id.includes(q) || String(m.n).toLowerCase().includes(q) || String(m.s || "").toLowerCase().includes(q)) {
          matches.push({ id, symbol: m.s, name: m.n, thumb: m.img, rank: m.rank });
        }
      }
      matches.sort((a, b) => (a.rank || 99999) - (b.rank || 99999));
      res.set("Cache-Control", "public, max-age=300");
      res.json({ coins: matches.slice(0, 25) });
      return;
    }
    if (action === "coinlist") {
      // Full ~3,000-coin list (names/symbols/icons/rank + last price) for the
      // landing DCA calculator's CLIENT-SIDE search. The page fetches this ONCE
      // and is served from Firebase's CDN for a day, so thousands of visitors add
      // ~0 function calls. Price is included so the calculator can show a current
      // value straight from storage, with no per-visitor price call.
      const list = await getUniverse();
      const coins = [];
      for (const id in list) {
        const m = list[id];
        if (!m || !m.n) continue;         // skip price-only off-list entries (no metadata)
        coins.push({ id, symbol: m.s, name: m.n, thumb: m.img, rank: m.rank, price: m.p, change: m.ch });
      }
      coins.sort((a, b) => (a.rank || 99999) - (b.rank || 99999));
      res.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
      res.json({ coins });
      return;
    }
    if (action === "trending") {
      // Currently-trending coins (CoinGecko /search/trending) for the Search tab's
      // empty state. Cached in cache/trending + on the CDN, so it's ~free per visitor.
      let coins = [];
      try { coins = await getTrending(); } catch (e) { coins = []; }   // empty → client falls back to its built-in list
      res.set("Cache-Control", "public, max-age=300, s-maxage=300");
      res.json({ coins });
      return;
    }
    if (action === "config") {
      // PUBLIC, non-secret app config the client reads on load (maintenance banner,
      // signups on/off, and later analytics/legal IDs). Never includes API keys.
      // Read fresh (not the 5-min getConfig cache) so toggles apply promptly; the
      // short CDN cache below still caps invocations to ~1/min in production.
      let d = {};
      try { const s = await db.doc("config/app").get(); d = (s.exists && s.data()) || {}; } catch (e) { /* ignore */ }
      const fl = d.flags || {}, an = d.analytics || {}, lg = d.legal || {};
      res.set("Cache-Control", "public, max-age=60, s-maxage=60");
      res.json({
        maintenance: !!fl.maintenance,
        signupsEnabled: fl.signupsEnabled !== false,
        // ADMIN-2: the per-feature switches. Published so the UI can be HONEST about
        // what is off (frozen prices say "paused", not a stale "● LIVE" badge) — the
        // server enforces them regardless, so this is presentation, never the control.
        features: featureFlags.readFeatures(d),
        plans: mergePlans(d.plans),
        analytics: { ga4: an.ga4 || "", plausible: an.plausible || "" },
        legal: { termlyUuid: lg.termlyUuid || "", termlyPrivacyId: lg.termlyPrivacyId || "", termlyTermsId: lg.termlyTermsId || "", cookieBanner: !!lg.cookieBanner },
        // ADMIN-5: the site announcement — {text, level} only while ACTIVE, else null.
        // A drafted-but-off banner is never broadcast (publicAnnouncement hides it).
        announcement: announce.publicAnnouncement(d),
      });
      return;
    }
    if (action === "history") {
      const id = String(req.query.id || "").slice(0, 100);
      if (!id) { res.status(400).json({ error: "id required" }); return; }
      // API-SECURITY (denial-of-wallet): only fetch history for a coin that's ACTUALLY in the
      // shared universe. market_chart is one of CoinGecko's heaviest endpoints and a garbage id
      // returns 404 (never caches), so without this gate a loop of novel ids forces one (or two)
      // uncached upstream calls per request. Every legitimate history request is for a coin the
      // client already got FROM the universe (DCA coinlist / Research prices), so gating here
      // never breaks a real request; it just refuses to fan out on ids we don't recognise.
      const universe = await getUniverse();
      if (!universe[id]) { res.set("Cache-Control", "public, max-age=86400"); res.json({ prices: [] }); return; }
      const ref = db.doc("historyCache/" + id.replace(/[^a-zA-Z0-9_-]/g, "_"));
      let data = null;
      try { const snap = await ref.get(); data = snap.exists ? snap.data() : null; } catch (e) { /* ignore */ }
      // Fresh cache: 30 days for real data, but only 1h for a negative (miss) marker so a
      // temporarily-unavailable coin retries sooner without hammering upstream every request.
      const ttl = (data && data.miss) ? HISTORY_NEG_TTL : HISTORY_TTL;
      if (!data || (Date.now() - (data.updatedAt || 0)) > ttl) {
        // Daily history in ONE call; reused for every date range + every user.
        // Public API allows only the last 365 days; a Demo/paid key extends it.
        // (Don't pass interval=daily — that's Enterprise-only; granularity is
        // automatically daily for ranges > 90 days.)
        try {
          const days = CG_KEY ? "max" : "365";
          let r = await cgFetch(`/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}`);
          if (!r.ok && days !== "365") {
            r = await cgFetch(`/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=365`);
          }
          if (r.ok) { const d = await r.json(); data = { updatedAt: Date.now(), prices: d.prices || [] }; await ref.set(data); }
          // API-SECURITY: negative-cache a real-but-failed lookup so repeats don't re-fetch for 1h.
          else { data = { updatedAt: Date.now(), prices: [], miss: true }; try { await ref.set(data); } catch (e2) { /* ignore */ } }
        } catch (e) { /* ignore */ }
      }
      res.set("Cache-Control", "public, max-age=86400");
      res.json({ prices: (data && data.prices) || [] });
      return;
    }
    if (action === "subscribe") {
      // This is the only public, UNAUTHENTICATED write — the main bot-abuse
      // surface. Give it its own far stricter per-IP budget (separate from the
      // 60/min read limit) so a single IP can't spam the email provider even
      // while staying under the general limit. Defense-in-depth alongside the
      // honeypot below; App Check / reCAPTCHA is the deploy-time complement.
      if (rateLimited(req, _rlSub, SUBSCRIBE_LIMIT)) { res.status(429).json({ error: "Too many requests — please slow down." }); return; }
      // Public email capture from the landing form → forward to the configured
      // email provider (ActiveCampaign / GetResponse). Key stays server-side.
      const email = String((req.body && req.body.email) || req.query.email || "").trim().toLowerCase();
      const hp = String((req.body && req.body.hp) || "");
      if (hp) { res.json({ success: true }); return; }                 // honeypot: accept + drop
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
        res.status(400).json({ error: "invalid email" }); return;
      }
      const cfg = await getConfig();
      const e = (cfg && cfg.email) || {};
      if (!e.provider || e.provider === "none" || !e.apiKey) {
        res.status(503).json({ error: "email not configured" }); return;
      }
      try {
        let ok = false;
        if (e.provider === "getresponse") {
          const r = await fetch("https://api.getresponse.com/v3/contacts", {
            method: "POST",
            headers: { "X-Auth-Token": "api-key " + e.apiKey, "Content-Type": "application/json" },
            body: JSON.stringify(e.listId ? { email, campaign: { campaignId: e.listId } } : { email }),
          });
          ok = r.ok || r.status === 202 || r.status === 409; // 409 = already on the list
        } else if (e.provider === "activecampaign") {
          const base = safeProviderOrigin(e.apiUrl);
          if (!base) { res.status(503).json({ error: "invalid ActiveCampaign API URL (must be an external https URL)" }); return; }
          const cr = await fetch(base + "/api/3/contact/sync", {
            method: "POST",
            headers: { "Api-Token": e.apiKey, "Content-Type": "application/json" },
            body: JSON.stringify({ contact: { email } }),
          });
          if (cr.ok) {
            const cd = await cr.json().catch(() => ({}));
            const contactId = cd && cd.contact && cd.contact.id;
            if (contactId && e.listId) {
              await fetch(base + "/api/3/contactLists", {
                method: "POST",
                headers: { "Api-Token": e.apiKey, "Content-Type": "application/json" },
                body: JSON.stringify({ contactList: { list: e.listId, contact: contactId, status: 1 } }),
              });
            }
            ok = true;
          }
        } else {
          res.status(501).json({ error: "provider not implemented" }); return;
        }
        if (ok) res.json({ success: true });
        else res.status(502).json({ error: "subscribe failed" });
      } catch (err) {
        console.error("subscribe error:", err);
        res.status(500).json({ error: "server error" });
      }
      return;
    }
    res.status(404).json({ error: "unknown action — use /api/prices, /api/search, /api/trending, /api/history, or /api/subscribe" });
  } catch (e) {
    console.error("api error:", e);
    // ADMIN-2: report to Sentry when a DSN is configured. The label is the coarse
    // action only — never the query, which can carry coin ids and, on /api/subscribe,
    // an email address. No-op (and no SDK load) until a DSN exists.
    try { observability.captureError(await getConfig(), "api:" + action, e); } catch (e2) { /* never mask the real error */ }
    res.status(500).json({ error: "server error" });
  }
});
