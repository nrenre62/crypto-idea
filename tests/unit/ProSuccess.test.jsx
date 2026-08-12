import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Plan B PR-B (G4) — the /pro-success page renders the ACTUAL purchased tier (fixing
 * the old hardcoded "You're on Pro." even for a Premium buyer), and only claims the
 * upgrade once useProSuccess confirms it. We mock the hook to drive each visual state.
 */
const h = vi.hoisted(() => ({ state: { status: "waiting", tier: null } }));
vi.mock("../../src/hooks/useProSuccess.js", () => ({ useProSuccess: () => h.state }));

import ProSuccess from "../../src/components/pro-success.jsx";

describe("ProSuccess page (PR-B G4)", () => {
  beforeEach(() => { h.state = { status: "waiting", tier: null }; });

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
});
