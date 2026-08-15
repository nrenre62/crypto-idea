import { useProSuccess } from "../hooks/useProSuccess.js";
import { PLAN_BENEFITS } from "../data/plan-benefits.js";
import { c } from "../utils/theme.js";

// Plan B PR-B (G4) — the PayPal return / upgrade confirmation page. It renders the
// ACTUAL purchased tier (fixing the old hardcoded "You're on Pro." shown even to a
// Premium buyer) and only claims the upgrade once useProSuccess sees the webhook write
// a paid tier. Tier is server-authoritative — this page never writes anything.

const TIER_LABEL = { pro: "Pro", premium: "Premium" };

const linkStyle = {
  display: "inline-block", fontSize: 15, fontWeight: 600, padding: "14px 40px",
  borderRadius: 100, background: c.txt, color: "#fff", textDecoration: "none",
};

function Shell({ children }) {
  return (
    <div style={{
      fontFamily: "system-ui, sans-serif",
      background: c.bg, color: c.txt, minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ textAlign: "center", padding: "40px 24px", maxWidth: 400 }}>{children}</div>
    </div>
  );
}

export default function ProSuccess() {
  const { status, tier } = useProSuccess();
  // A confirmed purchase, OR a fast-webhook timeout that already resolved to a paid tier.
  const paidTier = (status === "confirmed" || status === "timeout") && TIER_LABEL[tier] ? tier : null;

  if (paidTier) {
    const b = PLAN_BENEFITS[paidTier];
    return (
      <Shell>
        <div style={{
          width: 72, height: 72, borderRadius: 36, background: c.ac + "12", color: c.ac,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 28px",
        }}>✓</div>
        <h1 style={{ fontSize: 32, fontWeight: 200, letterSpacing: "-1px", marginBottom: 8 }}>
          You're on <span style={{ fontWeight: 700 }}>{TIER_LABEL[paidTier]}.</span>
        </h1>
        <p style={{ fontSize: 15, color: c.dim, lineHeight: 1.6, marginBottom: 14 }}>Your account has been upgraded.</p>
        <div style={{ fontSize: 14, color: c.dim, lineHeight: 1.9, marginBottom: 36 }}>
          {b.limits.map((l, i) => (<div key={i}>{l}</div>))}
          <div>{b.feature}</div>
        </div>
        <a href="/app" style={linkStyle}>Open CryptoIdea</a>
        <div style={{ marginTop: 20, fontSize: 12, color: c.dim }}>A receipt has been sent to your PayPal email.</div>
      </Shell>
    );
  }

  // PR-C2 / PR-C3b: a future-start subscription approval — the scheduled sub is booked but the
  // current tier stays premium until the period ends. Confirm the schedule honestly instead of
  // "confirming payment", and vary the copy by the SCHEDULED tier: a Pro downgrade vs a seamless
  // Premium re-subscribe (Premium access continues with no gap).
  if (status === "scheduled") {
    const isPrem = tier === "premium";
    return (
      <Shell>
        <div style={{
          width: 72, height: 72, borderRadius: 36, background: c.ac + "12", color: c.ac,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 28px",
        }}>✓</div>
        <h1 style={{ fontSize: 30, fontWeight: 200, letterSpacing: "-1px", marginBottom: 8 }}>
          {isPrem ? "Re-subscription scheduled" : "Downgrade scheduled"}
        </h1>
        <p style={{ fontSize: 15, color: c.dim, lineHeight: 1.6, marginBottom: 28 }}>
          {isPrem
            ? "Premium continues — your new subscription starts when the current period ends, so there's no gap in access. Nothing changes today."
            : "Pro starts when your Premium period ends. You'll keep full Premium access until then — nothing changes today."}
        </p>
        <a href="/app" style={linkStyle}>Open CryptoIdea</a>
      </Shell>
    );
  }

  if (status === "signedout") {
    return (
      <Shell>
        <h1 style={{ fontSize: 26, fontWeight: 300, marginBottom: 12 }}>Almost there</h1>
        <p style={{ fontSize: 15, color: c.dim, lineHeight: 1.6, marginBottom: 28 }}>
          Sign in to see your plan. If you just paid, your upgrade appears automatically once you're signed in.
        </p>
        <a href="/app" style={linkStyle}>Go to sign in</a>
      </Shell>
    );
  }

  if (status === "timeout") {   // no confirmed paid tier yet
    return (
      <Shell>
        <h1 style={{ fontSize: 26, fontWeight: 300, marginBottom: 12 }}>Still confirming your payment</h1>
        <p style={{ fontSize: 15, color: c.dim, lineHeight: 1.6, marginBottom: 28 }}>
          PayPal is taking a moment. Your upgrade applies automatically the instant it lands — open your account in a bit to see it.
        </p>
        <a href="/app" style={linkStyle}>Open CryptoIdea</a>
      </Shell>
    );
  }

  // waiting (the default) — never a premature success.
  return (
    <Shell>
      <div style={{
        width: 72, height: 72, borderRadius: 36, background: c.ac + "12", color: c.ac,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 28px",
      }}>⏳</div>
      <h1 style={{ fontSize: 26, fontWeight: 300, marginBottom: 12 }}>Confirming your payment…</h1>
      <p style={{ fontSize: 15, color: c.dim, lineHeight: 1.6 }}>
        Hang tight — we're finalizing your upgrade with PayPal. This only takes a moment.
      </p>
    </Shell>
  );
}
