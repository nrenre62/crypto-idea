import { useApp } from "../hooks/app-context.js";

// R4-4: shared header pills for the `.ci-app` main tabs (Journal / Learn / Search).
// Portfolio renders its own inline copy; Research uses a `.research-root`-scoped copy.
//   • ● LIVE — shown when live prices are flowing (api === "live").
//   • plan pill — STARTER / PRO / PREMIUM, taps through to the Account screen.
// Mirrors Portfolio's markup exactly so every tab header reads the same.
export function HeaderTags() {
  const { api, isPro, isPremium, setScreen } = useApp();
  const plan = isPremium ? "PREMIUM" : isPro ? "PRO" : "STARTER";
  return (
    <>
      {api === "live" && <span className="badge badge-live">● LIVE</span>}
      <span className="badge badge-plan" onClick={() => setScreen("account")} style={{ cursor: "pointer" }}>{plan}</span>
    </>
  );
}
