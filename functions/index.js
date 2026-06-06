/**
 * Crypto Idea — Cloud Functions (PayPal)
 * ========================================
 * 
 * SETUP:
 * 1. cd functions && npm install
 * 2. firebase functions:config:set paypal.client_id="YOUR_ID"
 *    firebase functions:config:set paypal.secret="YOUR_SECRET"
 *    firebase functions:config:set paypal.plan_id="P-YOUR_PLAN_ID"
 * 3. firebase deploy --only functions
 * 4. PayPal Developer Dashboard → Webhooks → Add URL:
 *    https://YOUR-PROJECT.cloudfunctions.net/paypalWebhook
 *    Events: BILLING.SUBSCRIPTION.ACTIVATED, CANCELLED, SUSPENDED, PAYMENT.SALE.COMPLETED
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

admin.initializeApp();
const db = admin.firestore();

const PAYPAL_CLIENT_ID = functions.config().paypal.client_id;
const PAYPAL_SECRET = functions.config().paypal.secret;
const PAYPAL_PLAN_ID = functions.config().paypal.plan_id;
const PAYPAL_BASE = "https://api-m.paypal.com";

async function getPayPalToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString("base64");
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  return data.access_token;
}

exports.createSubscription = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { userId, email } = req.body;
      const token = await getPayPalToken();
      const response = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: PAYPAL_PLAN_ID,
          subscriber: { email_address: email },
          custom_id: userId,
          application_context: {
            brand_name: "Crypto Idea",
            return_url: `${req.headers.origin}/pro-success`,
            cancel_url: `${req.headers.origin}/pricing`,
            user_action: "SUBSCRIBE_NOW",
          },
        }),
      });
      const data = await response.json();
      const approvalUrl = data.links?.find((l) => l.rel === "approve")?.href;
      res.json({ approvalUrl, subscriptionId: data.id });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
});

exports.paypalWebhook = functions.https.onRequest(async (req, res) => {
  const event = req.body;
  const eventType = event.event_type;
  const resource = event.resource;

  switch (eventType) {
    case "BILLING.SUBSCRIPTION.ACTIVATED": {
      const userId = resource.custom_id;
      if (userId) {
        await db.doc(`users/${userId}`).update({
          tier: "pro", paypalSubscriptionId: resource.id,
          upgradedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      break;
    }
    case "PAYMENT.SALE.COMPLETED": {
      const subId = resource.billing_agreement_id;
      const users = await db.collection("users").where("paypalSubscriptionId", "==", subId).get();
      users.forEach(async (doc) => {
        await doc.ref.update({ tier: "pro", lastPayment: admin.firestore.FieldValue.serverTimestamp() });
      });
      break;
    }
    case "BILLING.SUBSCRIPTION.CANCELLED":
    case "BILLING.SUBSCRIPTION.SUSPENDED": {
      const userId = resource.custom_id;
      if (userId) {
        await db.doc(`users/${userId}`).update({ tier: "free" });
      } else {
        const users = await db.collection("users").where("paypalSubscriptionId", "==", resource.id).get();
        users.forEach(async (doc) => { await doc.ref.update({ tier: "free" }); });
      }
      break;
    }
  }
  res.json({ received: true });
});

exports.cancelSubscription = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { userId } = req.body;
      const userDoc = await db.doc(`users/${userId}`).get();
      const subscriptionId = userDoc.data()?.paypalSubscriptionId;
      if (!subscriptionId) return res.status(400).json({ error: "No active subscription" });
      const token = await getPayPalToken();
      await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "User requested cancellation" }),
      });
      await db.doc(`users/${userId}`).update({ tier: "free" });
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
});

exports.getStats = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const usersSnap = await db.collection("users").get();
      let proUsers = 0, freeUsers = 0;
      usersSnap.forEach((doc) => { if (doc.data().tier === "pro") proUsers++; else freeUsers++; });
      res.json({ totalUsers: usersSnap.size, proUsers, freeUsers, estimatedRevenue: proUsers * 9.99 + (premiumUsers||0) * 49.99 });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});
