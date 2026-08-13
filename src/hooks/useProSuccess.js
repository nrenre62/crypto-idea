import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../api/firebase.config.js";
import { watchUserDoc } from "../api/firebase-database.js";

// Plan B PR-B (G4) — the honest /pro-success confirmation. After PayPal redirects the
// buyer back, watch THEIR OWN user doc and only report "confirmed" once the PayPal
// webhook has actually written the paid tier (tier is server-authoritative — the client
// never writes it). Read-only: this hook mutates nothing.
//
// Confirmation rule (a UX signal, not a security control):
//  - the first snapshot is the pre-confirmation BASELINE (recorded, never confirmed on);
//  - a later snapshot showing a paid, non-cancelled tier that CHANGED from the baseline
//    (free → pro/premium, or pro → premium) is a real upgrade → "confirmed";
//  - if the webhook had already landed before the first read (baseline is already the
//    paid tier and nothing changes), the timeout resolves to that paid tier so the page
//    still confirms instead of spinning forever;
//  - PR-C2: a future-start Pro DOWNGRADE approval doesn't set a paid tier immediately (tier
//    stays premium until the server sweep). If the synced doc carries subscription.scheduledPro,
//    finish as "scheduled" so the reused return page confirms "downgrade scheduled" instead of
//    timing out to "still confirming";
//  - no signed-in user → "signedout".
const PAID = new Set(["pro", "premium"]);

export function useProSuccess({ timeoutMs = 8000 } = {}) {
  const [state, setState] = useState({ status: "waiting", tier: null });

  useEffect(() => {
    let docUnsub = null, timer = null, done = false, baseline, lastTier = null;
    const finish = (s) => { if (done) return; done = true; setState(s); };

    const authUnsub = onAuthStateChanged(auth, (u) => {
      if (!u) { finish({ status: "signedout", tier: null }); return; }
      if (docUnsub) return;                      // already watching this session
      docUnsub = watchUserDoc(u.uid, (server) => {
        const tier = server.tier || "free";
        lastTier = tier;
        const base = baseline;
        if (baseline === undefined) baseline = tier;   // first snapshot = baseline
        // PR-C3b-client (tier-aware, supersedes PR-C2): a scheduled future-start sub — the current
        // tier stays premium until the sweep, so confirm the SCHEDULED tier, not server.tier. The
        // renamed subscription.scheduledNext{tier} carries it (Pro downgrade OR seamless Premium
        // re-subscribe); a legacy subscription.scheduledPro shims to tier "pro".
        if (server.subscription && (server.subscription.scheduledNext || server.subscription.scheduledPro)) {
          const sched = server.subscription.scheduledNext || { tier: "pro" };
          finish({ status: "scheduled", tier: sched.tier || "pro" });
          return;
        }
        const cancelled = !!(server.subscription && server.subscription.cancelled);
        const confirmed = PAID.has(tier) && !cancelled &&
          base !== undefined && (base === "free" || tier !== base);
        if (confirmed) finish({ status: "confirmed", tier });
      });
      timer = setTimeout(
        () => finish({ status: "timeout", tier: PAID.has(lastTier) ? lastTier : null }),
        timeoutMs,
      );
    });

    return () => { if (authUnsub) authUnsub(); if (docUnsub) docUnsub(); if (timer) clearTimeout(timer); };
  }, [timeoutMs]);

  return state;
}
