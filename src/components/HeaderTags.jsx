import { useApp } from "../hooks/app-context.js";

// ADMIN-2: the live/paused price pill, in ONE place.
//
// It is rendered from three separate headers (this module, Portfolio's inline copy,
// and Research's `.research-root`-scoped copy). Teaching each of them about the
// marketData kill-switch separately is how you end up with Portfolio still boasting
// "● LIVE" while the other two admit prices are frozen — so the decision lives here
// and the three call sites just pass their inputs.
//
// Purely presentational: `paused` reflects an admin switch that the SERVER already
// enforces, so this is honesty, never access control.
export function LivePill({ api, paused }) {
  if (paused) {
    return (
      <span className="badge badge-paused" title="An admin has paused live market data — prices shown are the last known values.">
        ● PAUSED
      </span>
    );
  }
  return api === "live" ? <span className="badge badge-live">● LIVE</span> : null;
}

// Whether live market data is switched off, from the public /api/config payload.
// Defaults to "not paused" for a missing/failed config — a fetch failure must not
// make a perfectly healthy app claim it was switched off.
export function usePricesPaused() {
  const { site } = useApp();
  return !!(site && site.features && site.features.marketData === false);
}

// R4-4: shared header pills for the `.ci-app` main tabs (Journal / Learn / Search).
// Portfolio renders its own inline copy; Research uses a `.research-root`-scoped copy.
//   • ● LIVE / ● PAUSED — live prices flowing, or switched off by an admin.
//   • plan pill — STARTER / PRO / PREMIUM, taps through to the Account screen.
// Mirrors Portfolio's markup exactly so every tab header reads the same.
export function HeaderTags() {
  const { api, isPro, isPremium, setScreen } = useApp();
  const paused = usePricesPaused();
  const plan = isPremium ? "PREMIUM" : isPro ? "PRO" : "STARTER";
  return (
    <>
      <LivePill api={api} paused={paused} />
      <span className="badge badge-plan" onClick={() => setScreen("account")} style={{ cursor: "pointer" }}>{plan}</span>
    </>
  );
}
