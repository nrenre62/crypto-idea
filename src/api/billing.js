import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase.config.js";

// Plan B PR-B — the PayPal subscription callables. Kept in api/ so components never call
// httpsCallable directly (layer rule). All act on the CALLER's own uid server-side (no
// IDOR); the client sends only {plan, billing} and receives an approval URL — the tier is
// set by the PayPal webhook, never written client-side.

// Start a PayPal subscription checkout. The server selects the plan by tier × billing
// cycle (H6) and returns { approvalUrl, subscriptionId }; the caller redirects the
// browser to approvalUrl. Throws (failed-precondition / cooldown / auth) on refusal.
export async function createSubscription({ plan, billing } = {}) {
  const res = await httpsCallable(functions, "createSubscription")({ plan, billing });
  return res.data;
}

// Cancel/schedule a downgrade of the caller's OWN subscription. Sends only {downgradeTo}
// (server acts on context.auth.uid; the server writes the subscription marker — never the
// client). Returns { success, downgradeTo, endDate }. Throws on refusal (auth / precondition).
export async function cancelSubscription({ downgradeTo } = {}) {
  const res = await httpsCallable(functions, "cancelSubscription")({ downgradeTo });
  return res.data;
}

// Plan B PR-C2 — schedule a REAL future-start Pro subscription for a Premium→Pro downgrade.
// Acts on the caller's OWN uid server-side (no IDOR); the client sends only {billing} and the
// server writes the scheduled marker (subscription.scheduledPro) — never the client. Returns
// { approvalUrl, subscriptionId }; the caller redirects the browser to approvalUrl (PROD).
// Throws (failed-precondition / cooldown / auth) on refusal.
export async function scheduleProDowngrade({ billing } = {}) {
  const res = await httpsCallable(functions, "scheduleProDowngrade")({ billing });
  return res.data;
}

// Plan B PR-C3b-client — seamless Premium re-subscribe. From the plain-cancelled Premium
// state (the sub is terminally cancelled), start a REAL future-start Premium sub so access
// continues without a gap. Acts on the caller's OWN uid server-side (no IDOR); the client
// sends only {billing} and the server writes the scheduled marker (subscription.scheduledNext
// {tier:"premium"}) — never the client. Returns { approvalUrl, subscriptionId }; the caller
// redirects the browser to approvalUrl (PROD). Throws (failed-precondition / cooldown / auth)
// on refusal. Mirrors scheduleProDowngrade.
export async function resubscribePremium({ billing } = {}) {
  const res = await httpsCallable(functions, "resubscribePremium")({ billing });
  return res.data;
}
