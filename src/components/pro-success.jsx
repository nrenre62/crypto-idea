import { useState, useEffect } from "react";
import { c } from "../utils/theme.js";

export default function ProSuccess() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setTimeout(() => setShow(true), 300);
  }, []);

  return (
    <div style={{
      fontFamily: "-apple-system, 'Helvetica Neue', sans-serif",
      background: c.bg, color: c.txt, minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        textAlign: "center", padding: "40px 24px", maxWidth: 400,
        opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(20px)",
        transition: "all 0.6s ease",
      }}>
        {/* Checkmark */}
        <div style={{
          width: 72, height: 72, borderRadius: 36,
          background: c.ac + "12", color: c.ac,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 32, margin: "0 auto 28px",
        }}>
          ✓
        </div>

        <h1 style={{ fontSize: 32, fontWeight: 200, letterSpacing: "-1px", marginBottom: 8 }}>
          You're on <span style={{ fontWeight: 700 }}>Pro.</span>
        </h1>

        <p style={{ fontSize: 15, color: c.dim, lineHeight: 1.6, marginBottom: 36 }}>
          Your account has been upgraded.
          <br /><br />
          10 portfolios. 200 coins each. 2,000 transactions per coin. Unlimited DCA calculations. Live prices. Full P/L tracking.
        </p>

        <a href="/app" style={{
          display: "inline-block", fontSize: 15, fontWeight: 600,
          padding: "14px 40px", borderRadius: 100,
          background: c.txt, color: "#fff", textDecoration: "none",
        }}>
          Open Crypto Idea
        </a>

        <div style={{ marginTop: 20, fontSize: 12, color: c.dim }}>
          A receipt has been sent to your PayPal email.
        </div>
      </div>
    </div>
  );
}
