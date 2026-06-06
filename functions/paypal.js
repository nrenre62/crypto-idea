/**
 * Crypto Idea — PayPal Integration
 * ==================================
 * 
 * SETUP:
 * 1. Go to developer.paypal.com
 * 2. Create a Business account
 * 3. Go to Dashboard → Apps & Credentials → Create App
 * 4. Copy Client ID and Secret
 * 5. Go to Subscriptions → Create Plan:
 *    - Product: "Crypto Idea Pro"
 *    - Billing cycle: Monthly
 *    - Price: $9.99 USD
 *    - Copy the Plan ID (starts with P-)
 * 6. Replace the values below
 *
 * FLOW:
 * User taps "Go Pro" →
 *   Your server creates a PayPal subscription →
 *     User is redirected to PayPal to pay →
 *       PayPal redirects back to your success page →
 *         Webhook confirms payment →
 *           User tier updated to "pro" in Firebase
 *
 * FEES: ~2.9% + $0.30 per transaction
 * On $9.99: you keep about $4.55
 */

// ═══════════════════════════════════════════
// REPLACE WITH YOUR PAYPAL CREDENTIALS
// ═══════════════════════════════════════════
const PAYPAL_CLIENT_ID = "YOUR_CLIENT_ID";
const PAYPAL_SECRET = "YOUR_SECRET";
const PAYPAL_PLAN_ID = "P-YOUR_PLAN_ID";
const PAYPAL_MODE = "sandbox"; // Change to "live" for production

const PAYPAL_BASE = PAYPAL_MODE === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";


// ─── Get PayPal Access Token ───
async function getAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString("base64");
  const response = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await response.json();
  return data.access_token;
}


// ─── Create Subscription (called when user taps "Go Pro") ───
// Returns a PayPal approval URL to redirect the user to
async function createSubscription(userId, userEmail) {
  const token = await getAccessToken();

  const response = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plan_id: PAYPAL_PLAN_ID,
      subscriber: {
        email_address: userEmail,
      },
      custom_id: userId, // Links PayPal subscription to your user
      application_context: {
        brand_name: "Crypto Idea",
        return_url: "https://cryptoidea.com/pro-success",
        cancel_url: "https://cryptoidea.com/pricing",
        user_action: "SUBSCRIBE_NOW",
      },
    }),
  });

  const data = await response.json();

  // Find the approval URL
  const approvalLink = data.links.find((l) => l.rel === "approve");

  return {
    subscriptionId: data.id,
    approvalUrl: approvalLink?.href,
  };
}


// ─── Cancel Subscription ───
async function cancelSubscription(subscriptionId, reason) {
  const token = await getAccessToken();

  await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reason: reason || "User requested cancellation",
    }),
  });

  return { success: true };
}


// ─── Get Subscription Status ───
async function getSubscriptionStatus(subscriptionId) {
  const token = await getAccessToken();

  const response = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${subscriptionId}`, {
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  const data = await response.json();

  return {
    status: data.status, // ACTIVE, CANCELLED, SUSPENDED
    nextBilling: data.billing_info?.next_billing_time,
    subscriber: data.subscriber?.email_address,
  };
}


module.exports = {
  createSubscription,
  cancelSubscription,
  getSubscriptionStatus,
};
