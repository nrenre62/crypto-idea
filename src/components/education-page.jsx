import { useState } from "react";

export default function EduDesign3() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const c = { bg: "#FFFFFF", text: "#1A1A1A", sub: "#888", light: "#F5F5F5", border: "#EAEAEA", green: "#34C759" };

  const chapters = [
    {
      n: "01",
      title: "Build your portfolio around conviction, not hype",
      body: "Every coin in your portfolio should be there for a reason. Not because someone on Twitter mentioned it — because you understand what it does, why it has value, and how it fits your strategy.",
    },
    {
      n: "02",
      title: "Size your positions by risk, not by excitement",
      body: "The amount you put into a coin should match how much you can afford to lose. Your top conviction? Maybe 20-30% of your portfolio. A small-cap bet? Keep it under 5%. Position sizing is the edge most investors ignore.",
    },
    {
      n: "03",
      title: "Know your risk before you know your upside",
      body: "Before every buy, ask: if this drops 50%, how does it affect my total portfolio? If the answer is painful, your position is too big. Great investors protect their downside first.",
    },
    {
      n: "04",
      title: "Measure returns against the risk you took",
      body: "A 2x gain that required surviving a 70% drawdown is not a good investment — it's a lucky one. Risk-adjusted returns separate real skill from gambling. Track both your gains and your worst drawdowns.",
    },
    {
      n: "05",
      title: "Avoid the five mistakes that cost the most",
      body: "Putting too much into one coin. Buying after a pump. No exit strategy. Trading on emotions. Ignoring fees and taxes. These aren't rare mistakes — they're the most common. Avoid them and you're already ahead.",
    },
    {
      n: "06",
      title: "Your edge is your system — build one",
      body: "Alpha isn't about finding the next 100x. It's about having rules: when you buy, how much, when you take profit, when you cut losses. The investors who win long-term are the ones with a system they follow.",
    },
  ];

  return (
    <div style={{ fontFamily: "-apple-system, 'Helvetica Neue', sans-serif", background: c.bg, color: c.text, minHeight: "100vh" }}>

      {/* HEADER */}
      <div style={{ padding: "48px 24px 0", maxWidth: 600, margin: "0 auto" }}>
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <a href="/" style={{ fontSize: 15, fontWeight: 200, textDecoration: "none", color: c.text }}>Crypto <span style={{ fontWeight: 700 }}>Idea</span></a>
            <span style={{ color: c.border }}>·</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: c.green }}>The Edge</span>
          </div>
          <a href="/app" style={{ fontSize: 12, fontWeight: 600, padding: "8px 20px", borderRadius: 100, background: c.text, color: "#fff", textDecoration: "none" }}>Open App</a>
        </nav>
        <h1 style={{ fontSize: "clamp(32px, 6vw, 42px)", fontWeight: 200, letterSpacing: "-1.2px", lineHeight: 1.2, marginBottom: 16 }}>
          A guide to building
          <br />
          <span style={{ fontWeight: 800 }}>a better crypto portfolio.</span>
        </h1>
        <p style={{ fontSize: 16, color: c.sub, lineHeight: 1.6, marginBottom: 12 }}>
          Six principles that separate smart investors from the rest. Read in 10 minutes.
        </p>
        <div style={{ width: 40, height: 2, background: c.green, marginBottom: 48 }} />
      </div>

      {/* CHAPTERS */}
      <section style={{ padding: "0 24px 60px", maxWidth: 600, margin: "0 auto" }}>
        {chapters.map((ch, i) => (
          <div key={i} style={{ marginBottom: 48 }}>
            <div style={{ display: "flex", gap: 20 }}>
              <div style={{
                fontSize: 32, fontWeight: 900, color: c.light, lineHeight: 1, minWidth: 44,
                paddingTop: 2,
              }}>
                {ch.n}
              </div>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.5px", lineHeight: 1.3, marginBottom: 12 }}>
                  {ch.title}
                </h2>
                <p style={{ fontSize: 15, color: c.sub, lineHeight: 1.7 }}>
                  {ch.body}
                </p>
              </div>
            </div>
            {i < chapters.length - 1 && (
              <div style={{ borderBottom: `1px solid ${c.border}`, marginTop: 48, marginLeft: 64 }} />
            )}
          </div>
        ))}
      </section>

      {/* KEY TAKEAWAY */}
      <section style={{ padding: "0 24px 60px", maxWidth: 600, margin: "0 auto" }}>
        <div style={{ background: c.light, borderRadius: 20, padding: "32px 28px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: c.green, letterSpacing: 1.5, marginBottom: 12 }}>KEY TAKEAWAY</div>
          <p style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.5, letterSpacing: "-0.2px" }}>
            The best crypto portfolio isn't the one with the most coins — it's the one built with clear rules, proper sizing, and a plan for every outcome.
          </p>
        </div>
      </section>

      {/* EMAIL SUBSCRIBE */}
      <footer style={{ borderTop: `1px solid ${c.border}`, background: c.bg }}>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "60px 24px" }}>
          <div style={{ textAlign: "center" }}>
              <h3 style={{ fontSize: 20, fontWeight: 200, letterSpacing: "-0.3px", marginBottom: 4 }}>
                Get the <span style={{ fontWeight: 700 }}>weekly edge.</span>
              </h3>
              <p style={{ fontSize: 13, color: c.sub, lineHeight: 1.55, marginBottom: 24 }}>
                Portfolio strategy, risk management, and the investing lessons that compound over time.
              </p>
              {!submitted ? (
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    style={{
                      padding: "12px 16px", borderRadius: 10, border: `1px solid ${c.border}`,
                      fontSize: 13, outline: "none", width: 220,
                    }}
                  />
                  <button
                    onClick={() => { if (email.includes("@")) setSubmitted(true); }}
                    style={{
                      padding: "12px 20px", borderRadius: 10, border: "none",
                      background: c.text, color: "#fff", fontSize: 13, fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Subscribe
                  </button>
                </div>
              ) : (
                <div style={{ padding: "12px 20px", borderRadius: 10, background: c.green + "12", color: c.green, fontSize: 13, fontWeight: 600, display: "inline-block" }}>
                  You're in ✓
                </div>
              )}
              <div style={{ fontSize: 11, color: c.sub, marginTop: 12 }}>No spam. Unsubscribe anytime.</div>
          </div>
        </div>

        <div style={{ textAlign: "center", padding: "16px 24px", fontSize: 12, color: c.sub, borderTop: `1px solid ${c.border}` }}>
          <a href="/" style={{ color: c.sub, textDecoration: "none" }}>Crypto Idea</a> · © 2026
        </div>
      </footer>
    </div>
  );
}
