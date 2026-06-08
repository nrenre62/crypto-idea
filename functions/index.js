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

async function getPayPalToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString("base64");
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
  if (!PAYPAL_WEBHOOK_ID) return false; // fail closed if not configured
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
      webhook_id: PAYPAL_WEBHOOK_ID,
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
  let proUsers = 0, premiumUsers = 0, freeUsers = 0;
  usersSnap.forEach((doc) => {
    const tier = doc.data().tier;
    if (tier === "pro") proUsers++;
    else if (tier === "premium") premiumUsers++;
    else freeUsers++;
  });
  return {
    totalUsers: usersSnap.size,
    proUsers,
    premiumUsers,
    freeUsers,
    estimatedRevenue: proUsers * 9.99 + premiumUsers * 49.99,
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
  await admin.auth().setCustomUserClaims(userRecord.uid, { admin: makeAdmin });
  return { success: true, uid: userRecord.uid, admin: makeAdmin };
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
const cgHeaders = () => (CG_KEY ? { "x-cg-demo-api-key": CG_KEY } : {});

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
    const r = await fetch(`${CG_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}&price_change_percentage=24h`, { headers: cgHeaders() });
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
    const r = await fetch(`${CG_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}`, { headers: cgHeaders() });
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
            const r = await fetch(`${CG_BASE}/simple/price?ids=${encodeURIComponent(toFetch.join(","))}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`, { headers: cgHeaders() });
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
      const q = String(req.query.q || "").trim().toLowerCase();
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
          let r = await fetch(`${CG_BASE}/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}`, { headers: cgHeaders() });
          if (!r.ok && days !== "365") {
            r = await fetch(`${CG_BASE}/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=365`, { headers: cgHeaders() });
          }
          if (r.ok) { const d = await r.json(); data = { updatedAt: Date.now(), prices: d.prices || [] }; await ref.set(data); }
        } catch (e) { /* ignore */ }
      }
      res.set("Cache-Control", "public, max-age=86400");
      res.json({ prices: (data && data.prices) || [] });
      return;
    }
    res.status(404).json({ error: "unknown action — use /api/prices, /api/search, or /api/history" });
  } catch (e) {
    console.error("api error:", e);
    res.status(500).json({ error: "server error" });
  }
});
