import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Plan B PR-B (G4) — the /pro-success page renders the ACTUAL purchased tier (fixing
 * the old hardcoded "You're on Pro." even for a Premium buyer), and only claims the
 * upgrade once useProSuccess confirms it. We mock the hook to drive each visual state.
 */
const h = vi.hoisted(() => ({ state: { status: "waiting", tier: null } }));
vi.mock("../../src/hooks/useProSuccess.js", () => ({ useProSuccess: () => h.state }));

// CRYP-113: the page must read the public site config to know whether payments are on.
// Default to payments-ON so every PR-B/PR-C3b confirmation test below renders normally;
// the CRYP-113 test overrides it to payments-OFF to assert the redirect.
const cfg = vi.hoisted(() => ({ value: { paidPlansEnabled: true } }));
vi.mock("../../src/api/config.js", () => ({ fetchSiteConfig: vi.fn(() => Promise.resolve(cfg.value)) }));

import ProSuccess from "../../src/components/pro-success.jsx";

describe("ProSuccess page (PR-B G4)", () => {
  beforeEach(() => { h.state = { status: "waiting", tier: null }; cfg.value = { paidPlansEnabled: true }; });

  it("shows a 'confirming' state while the webhook is still pending — never a premature success", () => {
    h.state = { status: "waiting", tier: null };
    render(<ProSuccess />);
    expect(screen.getByText(/confirming/i)).toBeInTheDocument();
    expect(screen.queryByText(/You're on/i)).toBeNull();
  });

  it("renders PREMIUM benefits when a premium purchase is confirmed (not the hardcoded 'Pro')", () => {
    h.state = { status: "confirmed", tier: "premium" };
    render(<ProSuccess />);
    expect(screen.getByText(/Premium/)).toBeInTheDocument();
    expect(screen.queryByText(/You're on Pro\b/)).toBeNull();
    // the honest per-tier limits from the shared PLAN_BENEFITS source
    expect(screen.getByText(/15 portfolios/)).toBeInTheDocument();
    expect(screen.getByText(/200 coins per portfolio/)).toBeInTheDocument();
  });

  it("renders PRO benefits when a pro purchase is confirmed", () => {
    h.state = { status: "confirmed", tier: "pro" };
    render(<ProSuccess />);
    expect(screen.getByText(/Pro\b/)).toBeInTheDocument();
    expect(screen.getByText(/6 portfolios/)).toBeInTheDocument();
  });

  it("on timeout with a paid tier, still confirms that tier (fast-webhook path)", () => {
    h.state = { status: "timeout", tier: "premium" };
    render(<ProSuccess />);
    expect(screen.getByText(/Premium/)).toBeInTheDocument();
  });

  it("on timeout with no confirmed tier, shows an honest 'still processing' message (not a false upgrade)", () => {
    h.state = { status: "timeout", tier: null };
    render(<ProSuccess />);
    expect(screen.getByText(/still (processing|confirming)|taking a little longer|check back/i)).toBeInTheDocument();
    expect(screen.queryByText(/You're on (Pro|Premium)/)).toBeNull();
  });

  // ── Plan B PR-C3b-client — tier-aware scheduled confirmation copy ──
  // The scheduled state now carries the SCHEDULED tier: a Pro downgrade ("Pro starts when your
  // Premium period ends") vs a seamless Premium re-subscribe ("Premium continues…"). Today the
  // status==="scheduled" branch shows the Pro-downgrade copy regardless of tier.
  it("PR-C3b-client: a scheduled PRO downgrade shows the Pro-scheduled copy", () => {
    h.state = { status: "scheduled", tier: "pro" };
    render(<ProSuccess />);
    expect(screen.getByText(/pro starts when your premium period ends/i)).toBeInTheDocument();
  });

  it("PR-C3b-client: a scheduled PREMIUM re-subscribe shows a distinct 'Premium continues' copy, not the Pro downgrade copy", () => {
    h.state = { status: "scheduled", tier: "premium" };
    render(<ProSuccess />);
    expect(screen.getByText(/premium continues/i)).toBeInTheDocument();
    expect(screen.queryByText(/pro starts when your premium period ends/i)).toBeNull();
  });

  // ── CRYP-113 · payments OFF by default ──
  // /pro-success is a PayPal-return page — it has no reason to exist when payments are off.
  // With paidPlansEnabled false (the launch default), routing here must REDIRECT to /app
  // rather than render a purchase confirmation (even for a — impossible — "confirmed" state).
  // RED today: ProSuccess reads no config and never redirects, so it renders "You're on Pro."
  it("CRYP-113: with payments OFF, the pro-success page redirects to /app instead of confirming a purchase", async () => {
    h.state = { status: "confirmed", tier: "pro" };   // absent the gate this renders "You're on Pro."
    cfg.value = { maintenance: false, signupsEnabled: true, paidPlansEnabled: false, plans: null, features: { marketData: true, checkout: false, aiResearch: false } };
    const origLocation = window.location;
    const assignSpy = vi.fn(), replaceSpy = vi.fn();
    // jsdom's window.location.assign/replace aren't spyable (non-configurable), so swap the
    // whole location for a stub that records navigation (the PR-B/PR-C redirect test pattern).
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { assign: assignSpy, replace: replaceSpy, href: "http://localhost/pro-success", origin: "http://localhost" },
    });
    try {
      render(<ProSuccess />);
      // It must navigate away to /app (either assign or replace) once the config resolves…
      await waitFor(() => {
        const urls = [...assignSpy.mock.calls, ...replaceSpy.mock.calls].map((a) => String(a[0]));
        expect(urls.some((u) => /\/app$/.test(u)), "must redirect to /app when payments are off").toBe(true);
      });
      // …and must NOT claim the purchase.
      expect(screen.queryByText(/You're on/i)).toBeNull();
    } finally {
      Object.defineProperty(window, "location", { configurable: true, value: origLocation });
    }
  });
});
