/**
 * Crypto Idea — Cloud Functions (PayPal)
 * ========================================
 *
 * SETUP:
 * 1. cd functions && npm install
 * 2. firebase functions:config:set \
 *      paypal.client_id="YOUR_ID" \
 *      paypal.secret="YOUR_SECRET" \
 *      paypal.plan_id="P-YOUR_PLAN_ID" \
 *      paypal.premium_plan_id="P-YOUR_PREMIUM_PLAN_ID" \
 *      paypal.webhook_id="YOUR_WEBHOOK_ID" \
 *      app.url="https://YOUR-PROJECT.web.app"
 * 3. firebase deploy --only functions
 * 4. PayPal Developer Dashboard → Webhooks → Add URL:
 *    https://YOUR-PROJECT.cloudfunctions.net/paypalWebhook
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

// v1 API (gives us functions.config() + onCall(data, context)).
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

const cfg = functions.config().paypal || {};
const PAYPAL_CLIENT_ID = cfg.client_id;
const PAYPAL_SECRET = cfg.secret;
const PAYPAL_PLAN_ID = cfg.plan_id;
const PAYPAL_PREMIUM_PLAN_ID = cfg.premium_plan_id;
const PAYPAL_WEBHOOK_ID = cfg.webhook_id;
const PAYPAL_BASE = "https://api-m.paypal.com";

// Fixed, trusted app URL for PayPal redirects (never derived from request headers,
// which a caller can spoof — that would be an open-redirect).
const APP_URL = (functions.config().app && functions.config().app.url) || "https://crypto-idea.web.app";

// Admin is a verified Firebase custom claim ({ admin: true }), set via the Admin SDK
// (setAdminClaim below, or functions/scripts/set-admin.js for the first admin).
function isAdminToken(token) {
  return !!token && token.admin === true;
}

// The app must always keep at least this many admins, so admin access can never
// become a single point of failure or be wiped out entirely.
const MIN_ADMINS = 2;

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

// Append an admin action to the server-only `audit` collection. Best-effort:
// audit logging must NEVER break the action it's recording.
async function writeAudit(context, action, info) {
  try {
    await db.collection("audit").add({
      actorUid: (context.auth && context.auth.uid) || "",
      actorEmail: (context.auth && context.auth.token && context.auth.token.email) || "",
      action,
      targetUid: (info && info.targetUid) || "",
      targetEmail: (info && info.targetEmail) || "",
      details: (info && info.details) || "",
      at: Date.now(),   // server-side ms; avoids admin.firestore.FieldValue (undefined in the emulator)
    });
  } catch (e) { console.error("writeAudit failed:", e && e.message); }
}

// Default plan prices + tier limits. Editable from admin Settings (stored in
// config/app.plans); these are the fallback when nothing is configured and MUST
// match the defaults in firestore.rules (where the limit ceiling is enforced).
const DEFAULT_PLANS = {
  free:    { price: 0,     portfolios: 1,  coins: 10,  transactions: 50 },
  pro:     { price: 9.99,  portfolios: 10, coins: 200, transactions: 2000 },
  premium: { price: 49.99, portfolios: 50, coins: 500, transactions: 5000 },
};
// Validate + fill any missing plan fields from the defaults (never trust raw input).
function mergePlans(saved) {
  const s = saved || {};
  const num = (x, def) => (typeof x === "number" && isFinite(x) && x >= 0 ? x : def);
  const out = {};
  for (const t of ["free", "pro", "premium"]) {
    const d = DEFAULT_PLANS[t], v = s[t] || {};
    out[t] = {
      price: Math.min(num(v.price, d.price), 1e6),                              // cap: no absurd prices
      portfolios: Math.min(Math.round(num(v.portfolios, d.portfolios)), 100000),
      coins: Math.min(Math.round(num(v.coins, d.coins)), 100000),
      transactions: Math.min(Math.round(num(v.transactions, d.transactions)), 1000000),
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
  const userId = context.auth.uid;                 // the caller — NOT from the body
  const email = context.auth.token.email || undefined;
  const plan = data && data.plan === "premium" ? PAYPAL_PREMIUM_PLAN_ID : PAYPAL_PLAN_ID;
  if (!plan) throw new functions.https.HttpsError("failed-precondition", "Plan not configured.");

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
  const userId = context.auth.uid;                 // caller's own uid — fixes the IDOR
  const userDoc = await db.doc(`users/${userId}`).get();
  const subscriptionId = userDoc.exists ? userDoc.data().paypalSubscriptionId : null;
  if (!subscriptionId) {
    throw new functions.https.HttpsError("failed-precondition", "No active subscription.");
  }
  const token = await getPayPalToken();
  await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ reason: "User requested cancellation" }),
  });
  await db.doc(`users/${userId}`).update({ tier: "free" });
  return { success: true };
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
exports.paypalWebhook = functions.https.onRequest(async (req, res) => {
  try {
    const ok = await verifyPayPalWebhook(req);
    if (!ok) {
      console.warn("Rejected PayPal webhook: signature verification failed");
      res.status(401).json({ error: "Invalid webhook signature" });
      return;
    }

    const event = req.body;
    const resource = event.resource || {};

    switch (event.event_type) {
      case "BILLING.SUBSCRIPTION.ACTIVATED": {
        const userId = resource.custom_id;
        if (userId) {
          await db.doc(`users/${userId}`).update({
            tier: "pro",
            paypalSubscriptionId: resource.id,
            upgradedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        break;
      }
      case "PAYMENT.SALE.COMPLETED": {
        const subId = resource.billing_agreement_id;
        if (subId) {
          const users = await db.collection("users").where("paypalSubscriptionId", "==", subId).get();
          await Promise.all(users.docs.map((doc) =>
            doc.ref.update({ tier: "pro", lastPayment: admin.firestore.FieldValue.serverTimestamp() })
          ));
        }
        break;
      }
      case "BILLING.SUBSCRIPTION.CANCELLED":
      case "BILLING.SUBSCRIPTION.SUSPENDED": {
        const userId = resource.custom_id;
        if (userId) {
          await db.doc(`users/${userId}`).update({ tier: "free" });
        } else if (resource.id) {
          const users = await db.collection("users").where("paypalSubscriptionId", "==", resource.id).get();
          await Promise.all(users.docs.map((doc) => doc.ref.update({ tier: "free" })));
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error("paypalWebhook error:", error);
    res.status(400).json({ error: "Webhook processing failed" });
  }
});

// ─── Admin Stats (admins only) ───
exports.getStats = functions.https.onCall(async (data, context) => {
  if (!context.auth || !isAdminToken(context.auth.token)) {
    throw new functions.https.HttpsError("permission-denied", "Admins only.");
  }
  const usersSnap = await db.collection("users").get();
  let proUsers = 0, premiumUsers = 0, freeUsers = 0, totalPortfolios = 0;
  usersSnap.forEach((doc) => {
    const d = doc.data();
    if (d.tier === "pro") proUsers++;
    else if (d.tier === "premium") premiumUsers++;
    else freeUsers++;
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
  return {
    totalUsers: usersSnap.size,
    proUsers,
    premiumUsers,
    freeUsers,
    totalPortfolios,
    totalCoins,
    proPrice: plans.pro.price,
    premiumPrice: plans.premium.price,
    estimatedRevenue: proUsers * plans.pro.price + premiumUsers * plans.premium.price,
  };
});

// ─── Grant / revoke admin (admins only) ───
// Sets the { admin: true|false } custom claim on another user by email.
// The FIRST admin must be bootstrapped with functions/scripts/set-admin.js
// (run locally with a service account), since this requires an existing admin.
exports.setAdminClaim = functions.https.onCall(async (data, context) => {
  if (!context.auth || !isAdminToken(context.auth.token)) {
    throw new functions.https.HttpsError("permission-denied", "Admins only.");
  }
  const email = data && data.email;
  const makeAdmin = !!(data && data.admin);
  if (!email) {
    throw new functions.https.HttpsError("invalid-argument", "email is required.");
  }
  const userRecord = await admin.auth().getUserByEmail(email);
  // Safety: don't let demoting an admin drop the app below MIN_ADMINS admins.
  if (!makeAdmin && userRecord.customClaims && userRecord.customClaims.admin === true) {
    if ((await countAdmins()) <= MIN_ADMINS) {
      throw new functions.https.HttpsError("failed-precondition", `Can't remove admin — the app must keep at least ${MIN_ADMINS} admins. Promote another admin first.`);
    }
  }
  await admin.auth().setCustomUserClaims(userRecord.uid, { admin: makeAdmin });
  await writeAudit(context, makeAdmin ? "grantAdmin" : "revokeAdmin", { targetUid: userRecord.uid, targetEmail: email });
  return { success: true, uid: userRecord.uid, admin: makeAdmin };
});

// ─── Admin: look up ONE user for support / moderation (admins only) ───
// Returns operational data only (tier, status, usage counts) — NOT holdings.
exports.lookupUser = functions.https.onCall(async (data, context) => {
  if (!context.auth || !isAdminToken(context.auth.token)) {
    throw new functions.https.HttpsError("permission-denied", "Admins only.");
  }
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
    portfolioCount: d.portfolioCount || 0,
    coinCount,
  };
});

// ─── Admin: change a user's tier (admins only) ───
exports.setUserTier = functions.https.onCall(async (data, context) => {
  if (!context.auth || !isAdminToken(context.auth.token)) {
    throw new functions.https.HttpsError("permission-denied", "Admins only.");
  }
  const uid = data && data.uid;
  const tier = data && data.tier;
  if (!uid || !["free", "pro", "premium"].includes(tier)) {
    throw new functions.https.HttpsError("invalid-argument", "uid and a valid tier are required.");
  }
  await db.collection("users").doc(uid).update({ tier });
  await writeAudit(context, "setUserTier", { targetUid: uid, details: "tier=" + tier });
  return { success: true, uid, tier };
});

// ─── Admin: suspend / un-suspend a user (admins only) — reversible ───
// Disables the Auth account so they can't sign in.
exports.suspendUser = functions.https.onCall(async (data, context) => {
  if (!context.auth || !isAdminToken(context.auth.token)) {
    throw new functions.https.HttpsError("permission-denied", "Admins only.");
  }
  const uid = data && data.uid;
  const disabled = !!(data && data.disabled);
  if (!uid) throw new functions.https.HttpsError("invalid-argument", "uid is required.");
  if (uid === context.auth.uid) {
    throw new functions.https.HttpsError("failed-precondition", "You cannot suspend your own admin account.");
  }
  await admin.auth().updateUser(uid, { disabled });
  await writeAudit(context, disabled ? "suspendUser" : "unsuspendUser", { targetUid: uid });
  return { success: true, uid, disabled };
});

// ─── Admin: delete a user + ALL their data (admins only) — GDPR/CCPA erasure ───
exports.deleteUser = functions.https.onCall(async (data, context) => {
  if (!context.auth || !isAdminToken(context.auth.token)) {
    throw new functions.https.HttpsError("permission-denied", "Admins only.");
  }
  const uid = data && data.uid;
  if (!uid) throw new functions.https.HttpsError("invalid-argument", "uid is required.");
  if (uid === context.auth.uid) {
    throw new functions.https.HttpsError("failed-precondition", "You cannot delete your own admin account.");
  }
  // Safety: never let deleting an admin drop the app below MIN_ADMINS admins.
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

// ─── Self-service: a user deletes THEIR OWN account (GDPR/CCPA erasure) ───
// Any signed-in user; acts only on their own uid (no IDOR).
exports.deleteMyAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in first.");
  }
  const uid = context.auth.uid;
  // Safety: an admin can't self-delete the app below MIN_ADMINS admins.
  if (context.auth.token.admin === true && (await countAdmins()) <= MIN_ADMINS) {
    throw new functions.https.HttpsError("failed-precondition", `As one of the last ${MIN_ADMINS} admins you can't delete your account yet — promote another admin first.`);
  }
  await db.recursiveDelete(db.collection("users").doc(uid));
  await admin.auth().deleteUser(uid);
  return { success: true };
});

// ─── Self-service: a user exports THEIR OWN data (GDPR/CCPA right to access) ───
exports.exportMyData = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in first.");
  }
  const uid = context.auth.uid;
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
  return {
    exportedAt: new Date().toISOString(),
    account: { uid, email: context.auth.token.email || "" },
    profile: userSnap.exists ? userSnap.data() : {},
    portfolios,
  };
});

// ─── Admin: full users list for the Users tab (operational data only) ───
// Merges the Auth record (email / name / disabled / admin) with the Firestore
// profile (tier, portfolioCount, joined). NEVER returns holdings. Capped; the
// dashboard paginates + searches client-side.
exports.listUsers = functions.https.onCall(async (data, context) => {
  if (!context.auth || !isAdminToken(context.auth.token)) {
    throw new functions.https.HttpsError("permission-denied", "Admins only.");
  }
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
        portfolioCount: p.portfolioCount || 0,
        joinedMs,
      });
    }
    pageToken = res.pageToken;
  } while (pageToken && users.length < CAP);
  users.sort((a, b) => (b.joinedMs || 0) - (a.joinedMs || 0)); // newest first
  return { users, total: users.length, capped: users.length >= CAP };
});

// ─── Admin: read the recent audit log (admins only) ───
exports.listAudit = functions.https.onCall(async (data, context) => {
  if (!context.auth || !isAdminToken(context.auth.token)) {
    throw new functions.https.HttpsError("permission-denied", "Admins only.");
  }
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
      details: x.details || "",
      atMs: typeof x.at === "number" ? x.at : (x.at && typeof x.at.toMillis === "function" ? x.at.toMillis() : null),
    };
  });
  return { entries };
});

// ─── Admin: read current saved config to pre-fill the Settings form ───
// Secrets are NOT returned in full — only whether each is set — so the admin can
// see what's configured and replace it without the secret reaching the client.
exports.getAdminConfig = functions.https.onCall(async (data, context) => {
  if (!context.auth || !isAdminToken(context.auth.token)) {
    throw new functions.https.HttpsError("permission-denied", "Admins only.");
  }
  let cfg = {};
  try { const s = await db.doc("config/app").get(); cfg = (s.exists && s.data()) || {}; } catch (e) { /* ignore */ }
  const pp = cfg.paypal || {}, em = cfg.email || {}, fl = cfg.flags || {}, an = cfg.analytics || {}, lg = cfg.legal || {};
  return {
    coingeckoSet: !!cfg.coingecko,
    paypal: { clientId: pp.clientId || "", secretSet: !!pp.secret, webhookId: pp.webhookId || "" },
    email: { provider: em.provider || "none", apiKeySet: !!em.apiKey, apiUrl: em.apiUrl || "", fromEmail: em.fromEmail || "", listId: em.listId || "" },
    flags: { maintenance: !!fl.maintenance, signupsEnabled: fl.signupsEnabled !== false },
    plans: mergePlans(cfg.plans),
    analytics: { ga4: an.ga4 || "", plausible: an.plausible || "" },
    legal: { termlyUuid: lg.termlyUuid || "", termlyPrivacyId: lg.termlyPrivacyId || "", termlyTermsId: lg.termlyTermsId || "", cookieBanner: !!lg.cookieBanner },
    updatedAt: cfg.updatedAt || null,
  };
});

// ─── Save app config / API keys (admins only) ───
// Writes the admin dashboard's Settings (CoinGecko + PayPal keys, email provider)
// to the LOCKED config/app Firestore doc that the proxy + PayPal functions read.
// Clients can never read this doc (firestore.rules deny all access to /config).
exports.saveConfig = functions.https.onCall(async (data, context) => {
  if (!context.auth || !isAdminToken(context.auth.token)) {
    throw new functions.https.HttpsError("permission-denied", "Admins only.");
  }
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
  const flags = { maintenance: !!f.maintenance, signupsEnabled: f.signupsEnabled !== false };
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
    analytics: { ga4: String(an.ga4 || ""), plausible: String(an.plausible || "") },
    legal: {
      termlyUuid: String(lg.termlyUuid || ""),
      termlyPrivacyId: String(lg.termlyPrivacyId || ""),
      termlyTermsId: String(lg.termlyTermsId || ""),
      cookieBanner: !!lg.cookieBanner,
    },
    updatedAt: Date.now(),
  };
  await db.doc("config/app").set(cfg, { merge: true });
  _cfg = null; // invalidate cache so the new values are used immediately
  await writeAudit(context, "saveConfig", { details: "updated app config" });
  return { success: true };
});

// ═════════════════════════════════════════════════════════════
// CoinGecko proxy  (prices / search / history)
// ═════════════════════════════════════════════════════════════
// Cost model: upstream calls are SHARED across all users and do NOT scale with
// the number of users. One refresh of the top-N coin list (1 call per 250 coins)
// serves everyone's prices AND search. Each coin's full history is fetched once
// and reused for every DCA calc by every user. See README "CoinGecko proxy".
//
// API key lives server-side only:
//   firebase functions:config:set coingecko.demo_key="YOUR_DEMO_KEY"
//   (or COINGECKO_DEMO_KEY env var for the emulator)
// Without a key it uses the public endpoint (lower limits, history limited to
// the last 365 days — the app then falls back to its built-in estimates).
const CG_BASE = "https://api.coingecko.com/api/v3";
const CG_KEY = (functions.config().coingecko && functions.config().coingecko.demo_key) || process.env.COINGECKO_DEMO_KEY || "";
// Admin-managed config (API keys / email) lives in a LOCKED Firestore doc
// (config/app) written by the saveConfig function. Falls back to
// functions.config()/env. Cached 5 min. Clients can never read it (rules).
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
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip || "unknown";
  const now = Date.now();
  if (Object.keys(store).length > 10000) { for (const k in store) delete store[k]; } // guard against unbounded growth
  let e = store[ip];
  if (!e || now > e.resetAt) { e = { count: 0, resetAt: now + RATE_WINDOW }; store[ip] = e; }
  e.count++;
  return e.count > limit;
}

// Tunables (raise pages for more coins, raise TTLs for fewer upstream calls).
const MARKET_PAGES = 1;                          // 1 page = top 250 coins (1 call/refresh)
const MARKETS_TTL = 5 * 60 * 1000;               // prices/list freshness: 5 minutes
const HISTORY_TTL = 7 * 24 * 60 * 60 * 1000;     // per-coin history refresh: 7 days
const LONGTAIL_TTL = 20 * 60 * 1000;             // held coins outside the top-N: refresh every 20 min
const MARKETS_DOC = "cache/markets";
const LONGTAIL_DOC = "cache/longtail";

// Fetch the top-N coins (list + price + image + rank, all in one endpoint) and
// store them in one shared Firestore doc. This single dataset powers prices AND
// search for ALL users. Only coins big enough to be in the top-N appear — which
// naturally excludes brand-new micro-cap coins.
async function refreshMarkets() {
  const coins = {};
  for (let page = 1; page <= MARKET_PAGES; page++) {
    const r = await fetch(`${CG_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}&price_change_percentage=24h`, { headers: await cgHeaders() });
    if (!r.ok) throw new Error("markets " + r.status);
    const arr = await r.json();
    for (const c of arr) {
      coins[c.id] = {
        s: String(c.symbol || "").toUpperCase(), n: c.name, img: c.image || "",
        rank: c.market_cap_rank || null, p: c.current_price,
        ch: c.price_change_percentage_24h, mc: c.market_cap,
      };
    }
  }
  await db.doc(MARKETS_DOC).set({ updatedAt: Date.now(), coins });
  return coins;
}

// Read the shared market cache; refresh it on demand if missing/stale (so it
// works even without the scheduled function, e.g. in the emulator).
async function getMarkets() {
  let data = null;
  try { const snap = await db.doc(MARKETS_DOC).get(); data = snap.exists ? snap.data() : null; } catch (e) { /* ignore */ }
  if (!data || (Date.now() - (data.updatedAt || 0)) > MARKETS_TTL) {
    try { return await refreshMarkets(); } catch (e) { if (data) return data.coins; throw e; }
  }
  return data.coins;
}

// Scheduled keep-warm (production only; needs the Blaze plan). The on-demand
// refresh in getMarkets() covers everything if this isn't running.
exports.refreshMarkets = functions.pubsub.schedule("every 5 minutes").onRun(async () => {
  try { await refreshMarkets(); } catch (e) { console.error("refreshMarkets:", e); }
  return null;
});

// ─── Larger coin list for SEARCH (covers ~3,000 coins) ───
// The list (names/symbols/icons/rank) changes slowly, so it's refreshed daily —
// cheap (LIST_PAGES calls/day) and independent of user count. Live prices for a
// held coin still come from /api/prices (top-N cache or on-demand), so this only
// needs to be fresh enough for search/discovery.
const LIST_PAGES = 12;                          // 12 × 250 = ~3,000 coins
const LIST_TTL = 24 * 60 * 60 * 1000;           // refresh daily
const COINLIST_DOC = "cache/coinlist";

async function refreshCoinList() {
  const coins = {};
  for (let page = 1; page <= LIST_PAGES; page++) {
    const r = await fetch(`${CG_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}`, { headers: await cgHeaders() });
    if (!r.ok) { if (page === 1) throw new Error("coinlist " + r.status); break; }
    const arr = await r.json();
    if (!arr.length) break;
    for (const c of arr) {
      coins[c.id] = { s: String(c.symbol || "").toUpperCase(), n: c.name, img: c.image || "", rank: c.market_cap_rank || null };
    }
  }
  await db.doc(COINLIST_DOC).set({ updatedAt: Date.now(), coins });
  return coins;
}

async function getCoinList() {
  let data = null;
  try { const snap = await db.doc(COINLIST_DOC).get(); data = snap.exists ? snap.data() : null; } catch (e) { /* ignore */ }
  if (!data || (Date.now() - (data.updatedAt || 0)) > LIST_TTL) {
    try { return await refreshCoinList(); } catch (e) { if (data) return data.coins; throw e; }
  }
  return data.coins;
}

exports.refreshCoinList = functions.pubsub.schedule("every 24 hours").onRun(async () => {
  try { await refreshCoinList(); } catch (e) { console.error("refreshCoinList:", e); }
  return null;
});

exports.api = functions.https.onRequest(async (req, res) => {
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
      const markets = await getMarkets();
      const out = {};
      const missing = [];
      for (const id of ids) {
        const m = markets[id];
        if (m) out[id] = { usd: m.p, usd_24h_change: m.ch, usd_market_cap: m.mc };
        else missing.push(id);
      }
      // Coins outside the top-N ("long tail"): served from a SHARED Firestore
      // cache refreshed at most every LONGTAIL_TTL (20 min) per coin — so the
      // cost is flat (driven by how many distinct obscure coins are held across
      // ALL users, not by user/request count).
      if (missing.length) {
        const now = Date.now();
        let lt = {};
        try { const s = await db.doc(LONGTAIL_DOC).get(); lt = (s.exists && s.data().coins) || {}; } catch (e) { /* ignore */ }
        const toFetch = [];
        for (const id of missing) {
          const c = lt[id];
          if (c && (now - (c.at || 0)) < LONGTAIL_TTL) {
            out[id] = { usd: c.p, usd_24h_change: c.ch, usd_market_cap: c.mc };
          } else {
            toFetch.push(id);
          }
        }
        if (toFetch.length) {
          try {
            const r = await fetch(`${CG_BASE}/simple/price?ids=${encodeURIComponent(toFetch.join(","))}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`, { headers: await cgHeaders() });
            if (r.ok) {
              const d = await r.json();
              const upd = { coins: {} };
              for (const id of toFetch) {
                if (d[id]) {
                  out[id] = d[id];
                  upd.coins[id] = { p: d[id].usd, ch: d[id].usd_24h_change, mc: d[id].usd_market_cap, at: now };
                }
              }
              if (Object.keys(upd.coins).length) {
                try { await db.doc(LONGTAIL_DOC).set(upd, { merge: true }); } catch (e) { /* ignore */ }
              }
            }
          } catch (e) { /* ignore */ }
        }
      }
      res.set("Cache-Control", "public, max-age=120");
      res.json(out);
      return;
    }
    if (action === "search") {
      const q = String(req.query.q || "").trim().toLowerCase().slice(0, 100);  // cap length (DoS guard)
      if (!q) { res.json({ coins: [] }); return; }
      const list = await getCoinList();   // ~3,000 coins, no per-search upstream call
      const matches = [];
      for (const id in list) {
        const m = list[id];
        if (id.includes(q) || String(m.n || "").toLowerCase().includes(q) || String(m.s || "").toLowerCase().includes(q)) {
          matches.push({ id, symbol: m.s, name: m.n, thumb: m.img, rank: m.rank });
        }
      }
      matches.sort((a, b) => (a.rank || 99999) - (b.rank || 99999));
      res.set("Cache-Control", "public, max-age=300");
      res.json({ coins: matches.slice(0, 25) });
      return;
    }
    if (action === "coinlist") {
      // Full ~3,000-coin list (names/symbols/icons/rank — NO prices) for the landing
      // DCA calculator's CLIENT-SIDE search. The page fetches this ONCE and is served
      // from Firebase's CDN for a day, so thousands of visitors add ~0 function calls.
      const list = await getCoinList();
      const coins = [];
      for (const id in list) { const m = list[id]; coins.push({ id, symbol: m.s, name: m.n, thumb: m.img, rank: m.rank }); }
      coins.sort((a, b) => (a.rank || 99999) - (b.rank || 99999));
      res.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
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
        plans: mergePlans(d.plans),
        analytics: { ga4: an.ga4 || "", plausible: an.plausible || "" },
        legal: { termlyUuid: lg.termlyUuid || "", termlyPrivacyId: lg.termlyPrivacyId || "", termlyTermsId: lg.termlyTermsId || "", cookieBanner: !!lg.cookieBanner },
      });
      return;
    }
    if (action === "history") {
      const id = String(req.query.id || "").slice(0, 100);
      if (!id) { res.status(400).json({ error: "id required" }); return; }
      const ref = db.doc("historyCache/" + id.replace(/[^a-zA-Z0-9_-]/g, "_"));
      let data = null;
      try { const snap = await ref.get(); data = snap.exists ? snap.data() : null; } catch (e) { /* ignore */ }
      if (!data || (Date.now() - (data.updatedAt || 0)) > HISTORY_TTL) {
        // Daily history in ONE call; reused for every date range + every user.
        // Public API allows only the last 365 days; a Demo/paid key extends it.
        // (Don't pass interval=daily — that's Enterprise-only; granularity is
        // automatically daily for ranges > 90 days.)
        try {
          const days = CG_KEY ? "max" : "365";
          let r = await fetch(`${CG_BASE}/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}`, { headers: await cgHeaders() });
          if (!r.ok && days !== "365") {
            r = await fetch(`${CG_BASE}/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=365`, { headers: await cgHeaders() });
          }
          if (r.ok) { const d = await r.json(); data = { updatedAt: Date.now(), prices: d.prices || [] }; await ref.set(data); }
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
    res.status(404).json({ error: "unknown action — use /api/prices, /api/search, /api/history, or /api/subscribe" });
  } catch (e) {
    console.error("api error:", e);
    res.status(500).json({ error: "server error" });
  }
});
