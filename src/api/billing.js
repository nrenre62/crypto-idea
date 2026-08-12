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
