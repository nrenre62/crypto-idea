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

// Admin allowlist — keep in sync with ADMIN_EMAILS in src/CryptoIdea.jsx and isAdmin() in firestore.rules.
// Robust alternative: set an { admin: true } custom claim via the Admin SDK and check token.admin here.
const ADMIN_EMAILS = ["nrenre62@gmail.com"];

function isAdminToken(token) {
  return !!token
    && token.email_verified === true
    && ADMIN_EMAILS.includes(String(token.email || "").toLowerCase());
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
