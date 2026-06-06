import { useState } from "react";

const PORTFOLIO = [
  { s: "BTC", name: "Bitcoin", amount: 1.2, price: 84000, avg: 68000, color: "#F7931A" },
  { s: "ETH", name: "Ethereum", amount: 8.5, price: 1900, avg: 1650, color: "#627EEA" },
  { s: "SOL", name: "Solana", amount: 63, price: 125, avg: 95, color: "#9945FF" },
  { s: "ADA", name: "Cardano", amount: 5000, price: 0.45, avg: 0.32, color: "#0033AD" },
];

const fmt = (n) => {
  if (n >= 1000) return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (n >= 1) return "$" + n.toFixed(2);
  return "$" + n.toFixed(4);
};

export default function Landing() {
  const [expandedCoin, setExpandedCoin] = useState(null);
  const [billing, setBilling] = useState("monthly");
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const totalValue = PORTFOLIO.reduce((s, c) => s + c.amount * c.price, 0);
  const totalCost = PORTFOLIO.reduce((s, c) => s + c.amount * c.avg, 0);
  const totalPnl = totalValue - totalCost;
  const totalPct = ((totalPnl / totalCost) * 100).toFixed(1);

  const c = {
    bg: "#FFFFFF",
    text: "#1A1A1A",
    sub: "#888",
    light: "#F5F5F5",
    border: "#EAEAEA",
    green: "#34C759",
    red: "#FF3B30",
  };

  return (
    <div style={{ fontFamily: "-apple-system, 'Helvetica Neue', sans-serif", background: c.bg, color: c.text, minHeight: "100vh" }}>

      {/* NAV */}
      <nav style={{ padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ fontSize: 18, fontWeight: 200, letterSpacing: "-0.3px" }}>
          Crypto <span style={{ fontWeight: 700 }}>Idea</span>
        </div>
        <a href="/app" style={{ fontSize: 13, fontWeight: 600, padding: "9px 22px", borderRadius: 100, background: c.text, color: "#fff", textDecoration: "none" }}>
          Open App
        </a>
      </nav>

      {/* HERO */}
      <section style={{ textAlign: "center", padding: "100px 24px 70px", maxWidth: 700, margin: "0 auto" }}>
        <h1 style={{ fontSize: "clamp(38px, 8vw, 56px)", fontWeight: 200, letterSpacing: "-2px", lineHeight: 1.1, marginBottom: 28 }}>
          Build your portfolio.
          <br />
          <span style={{ fontWeight: 800 }}>Own your edge.</span>
        </h1>
        <p style={{ fontSize: 20, color: c.sub, lineHeight: 1.7, maxWidth: 540, margin: "0 auto 44px", textAlign: "center", letterSpacing: "-0.3px" }}>
          Track every coin, see every position, plan every move. The investors who win are the ones who know where they stand.
        </p>
        <a href="/app" style={{ display: "inline-block", fontSize: 15, fontWeight: 600, padding: "15px 40px", borderRadius: 100, background: c.text, color: "#fff", textDecoration: "none" }}>
          Get Started
        </a>
      </section>

      {/* LIVE APP PREVIEW */}
      <section style={{ maxWidth: 420, margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{ background: c.bg, borderRadius: 24, border: `1px solid ${c.border}`, overflow: "hidden", boxShadow: "0 12px 48px rgba(0,0,0,0.06)" }}>

          <div style={{ padding: "20px 20px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 200 }}>Crypto <span style={{ fontWeight: 700 }}>Idea</span></div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: c.green }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: c.sub }}>Live</span>
              </div>
            </div>
          </div>

          <div style={{ padding: "16px 20px 20px" }}>
            <div style={{ fontSize: 11, color: c.sub, fontWeight: 500 }}>Portfolio</div>
            <div style={{ fontSize: 36, fontWeight: 200, letterSpacing: "-1px", marginTop: 2 }}>
              {fmt(totalValue)}
            </div>
            <div style={{ marginTop: 6 }}>
              <span style={{
                display: "inline-block", padding: "4px 12px", borderRadius: 100, fontSize: 12, fontWeight: 600,
                background: totalPnl >= 0 ? c.green + "12" : c.red + "12",
                color: totalPnl >= 0 ? c.green : c.red
              }}>
                {totalPnl >= 0 ? "+" : ""}{fmt(totalPnl)} ({totalPnl >= 0 ? "+" : ""}{totalPct}%)
              </span>
            </div>
          </div>

          <div style={{ padding: "0 20px 8px" }}>
            {PORTFOLIO.map((coin) => {
              const val = coin.amount * coin.price;
              const cost = coin.amount * coin.avg;
              const pnl = val - cost;
              const pct = ((pnl / cost) * 100).toFixed(1);
              const isOpen = expandedCoin === coin.s;

              return (
                <div key={coin.s}>
                  <div
                    onClick={() => setExpandedCoin(isOpen ? null : coin.s)}
                    style={{
                      display: "flex", alignItems: "center", padding: "14px 0", gap: 12,
                      borderTop: `1px solid ${c.border}`, cursor: "pointer",
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 12,
                      background: coin.color + "12", color: coin.color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 800, flexShrink: 0,
                    }}>
                      {coin.s}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{coin.name}</div>
                      <div style={{ fontSize: 11, color: c.sub }}>{coin.amount} {coin.s}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{fmt(val)}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: pnl >= 0 ? c.green : c.red }}>
                        {pnl >= 0 ? "+" : ""}{pct}%
                      </div>
                    </div>
                  </div>

                  <div style={{
                    maxHeight: isOpen ? 160 : 0, overflow: "hidden",
                    transition: "max-height 0.35s ease",
                  }}>
                    <div style={{ padding: "0 0 14px 48px" }}>
                      {[
                        ["Avg. buy price", fmt(coin.avg)],
                        ["Current price", fmt(coin.price)],
                        ["Total invested", fmt(cost)],
                        ["Current value", fmt(val)],
                        ["Profit / Loss", (pnl >= 0 ? "+" : "") + fmt(Math.abs(pnl))],
                      ].map(([label, value]) => (
                        <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 12 }}>
                          <span style={{ color: c.sub }}>{label}</span>
                          <span style={{ fontWeight: 600, color: label === "Profit / Loss" ? (pnl >= 0 ? c.green : c.red) : c.text }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ padding: "8px 20px 16px", textAlign: "center", fontSize: 11, color: c.sub }}>
            Tap any coin to see details
          </div>
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section style={{ padding: "60px 24px 80px", maxWidth: 700, margin: "0 auto" }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.8px", marginBottom: 40, textAlign: "center" }}>
          What you get.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px 48px" }}>
          {[
            ["All your coins", "See everything you hold in one view. Sorted by size."],
            ["What you paid", "Average buy price for every coin. Your cost basis, always visible."],
            ["Up or down", "Total P/L across your entire portfolio. Per coin, per position."],
            ["Buy & sell history", "Record every transaction. Date, amount, price. All tracked."],
            ["DCA calculator", "See what investing regularly would return for any coin."],
            ["Private", "No wallet connections. No keys. We never touch your crypto."],
          ].map(([title, desc], i) => (
            <div key={i}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{title}</h3>
              <p style={{ fontSize: 14, color: c.sub, lineHeight: 1.55 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section style={{ padding: "60px 24px 80px", maxWidth: 700, margin: "0 auto", borderTop: `1px solid ${c.border}` }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.8px", marginBottom: 40, textAlign: "center" }}>
          Plans.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "stretch" }}>
          <div style={{ padding: "32px 24px", borderRadius: 20, background: c.light, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: c.sub, marginBottom: 4 }}>Starter</div>
            <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-1px", marginBottom: 4 }}>$0</div>
            <div style={{ fontSize: 13, color: c.sub, marginBottom: 24 }}>per month</div>
            {["10 coins", "1 portfolio", "Buy & sell tracking", "Live prices", "DCA calculator"].map((f) => (
              <div key={f} style={{ padding: "8px 0", fontSize: 13, color: c.sub, display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${c.border}` }}>
                <span style={{ color: c.green, fontWeight: 700 }}>✓</span> {f}
              </div>
            ))}
            <div style={{ flex: 1 }} />
            <a href="/app" style={{ display: "block", marginTop: 24, padding: 13, borderRadius: 12, border: `1px solid ${c.border}`, textAlign: "center", fontSize: 14, fontWeight: 600, color: c.text, textDecoration: "none", background: c.bg }}>
              Get Started
            </a>
          </div>
          <div style={{ padding: "32px 24px", borderRadius: 20, background: c.text, color: "#fff", display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: c.green, marginBottom: 12 }}>Pro</div>
            {/* Monthly / Yearly toggle */}
            <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#2A2A2A", borderRadius: 10, padding: 3 }}>
              <button onClick={() => setBilling("monthly")} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", background: billing === "monthly" ? "#444" : "transparent", color: billing === "monthly" ? "#fff" : "#666" }}>Monthly</button>
              <button onClick={() => setBilling("yearly")} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", background: billing === "yearly" ? "#444" : "transparent", color: billing === "yearly" ? "#fff" : "#666" }}>
                Yearly <span style={{ color: c.green, fontSize: 10, fontWeight: 700 }}>Save 33%</span>
              </button>
            </div>
            <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-1px", marginBottom: 4 }}>
              {billing === "monthly" ? "$9.99" : "$79.99"}
            </div>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 24 }}>
              {billing === "monthly" ? "per month" : "per year · $6.67/mo"}
            </div>
            {["200 coins", "10 portfolios", "2,000 transactions per coin", "Unlimited DCA", "Live prices"].map((f) => (
              <div key={f} style={{ padding: "8px 0", fontSize: 13, color: "#999", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #2A2A2A" }}>
                <span style={{ color: c.green, fontWeight: 700 }}>✓</span> {f}
              </div>
            ))}
            <div style={{ flex: 1 }} />
            <a href="/app?plan=pro" style={{ display: "block", marginTop: 24, padding: 13, borderRadius: 12, background: c.green, textAlign: "center", fontSize: 14, fontWeight: 600, color: "#fff", textDecoration: "none" }}>
              Go Pro
            </a>
          </div>
        </div>
      </section>

      {/* BOTTOM */}
      <section style={{ textAlign: "center", padding: "60px 24px 80px", borderTop: `1px solid ${c.border}` }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.8px", marginBottom: 12 }}>
          See your portfolio clearly.
        </h2>
        <p style={{ fontSize: 15, color: c.sub, marginBottom: 32 }}>
          Works on iPhone, Android, and desktop.
        </p>
        <a href="/app" style={{ display: "inline-block", fontSize: 15, fontWeight: 600, padding: "14px 36px", borderRadius: 100, background: c.text, color: "#fff", textDecoration: "none" }}>
          Open Crypto Idea
        </a>
      </section>

      {/* EMAIL SUBSCRIBE */}
      <div style={{ borderTop: `1px solid ${c.border}`, padding: "60px 24px", maxWidth: 600, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 32, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h3 style={{ fontSize: 20, fontWeight: 200, letterSpacing: "-0.3px", marginBottom: 4 }}>
              Get the <a href="/edge" style={{ fontWeight: 700, color: c.text, textDecoration: "none" }}>weekly edge.</a>
            </h3>
            <p style={{ fontSize: 13, color: c.sub, lineHeight: 1.55 }}>
              Portfolio strategy, risk management, and the investing lessons that compound over time.
            </p>
          </div>
          <div style={{ flexShrink: 0 }}>
            {!subscribed ? (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  style={{ padding: "12px 16px", borderRadius: 10, border: `1px solid ${c.border}`, fontSize: 13, outline: "none", width: 200 }}
                />
                <button
                  onClick={() => { if (email.includes("@")) setSubscribed(true); }}
                  style={{ padding: "12px 20px", borderRadius: 10, border: "none", background: c.text, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  Subscribe
                </button>
              </div>
            ) : (
              <div style={{ padding: "12px 20px", borderRadius: 10, background: c.green + "12", color: c.green, fontSize: 13, fontWeight: 600 }}>
                You're in ✓
              </div>
            )}
          </div>
        </div>
        <div style={{ fontSize: 11, color: c.sub, marginTop: 8 }}>No spam. Unsubscribe anytime.</div>
      </div>

      <footer style={{ padding: "24px", textAlign: "center", fontSize: 12, color: c.sub, borderTop: `1px solid ${c.border}` }}>
        Crypto Idea · © 2026
      </footer>
    </div>
  );
}
