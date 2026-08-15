/**
 * CryptoIdea — React entry (served by app.html).
 * The marketing landing page at "/" is the static index.html.
 * This React bundle handles the app routes; which one renders is decided by the path:
 *   /app          → the CryptoIdea tracker
 *   /edge         → Education guide
 *   /pro-success  → PayPal return / upgrade confirmation
 * (In dev, Vite rewrites these paths to app.html; in prod, Firebase Hosting does.)
 */
import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import "./styles/app.css"; // app design system (scoped under .ci-app)
import { ErrorBoundary } from "./components/ErrorBoundary.jsx"; // H8: no white screen on a render throw
import { initClientSentry } from "./observability-client.js"; // client error reporting + measurement

// Install global error/rejection handlers + tracing early (fire-and-forget; the SDK
// streams as its own chunk and never blocks first paint). No-op if it can't load.
initClientSentry();

// Every route is code-split. The initial download is just this tiny entry + React,
// so the loading shell paints immediately; the heavy app code AND the Firebase SDK
// then stream in as a separate chunk. NOTE: this only changes how *our* code imports
// things — no Firebase/Google package file is modified, so npm updates stay clean.
const CryptoIdea = lazy(() => import("./CryptoIdea.jsx"));
const Education = lazy(() => import("./components/education-page.jsx"));
const ProSuccess = lazy(() => import("./components/pro-success.jsx"));

function Loading() {
  // LOGO-2: the tiny entry-chunk fallback uses the shared brand lockup, but INLINED
  // (not `import { Logo }`) so the deliberately-small entry chunk stays lean. The
  // .ci-app wrapper lets the app.css .ci-logo* styles apply.
  return (
    <div className="ci-app" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, fontFamily: "system-ui, -apple-system, sans-serif", color: "#1A1A2E" }}>
      <span className="ci-logo up" role="img" aria-label="CryptoIdea">
        <span className="ci-logo-mark" aria-hidden="true">C</span>
        <span className="ci-logo-word">CryptoIdea</span>
        <svg className="ci-turtle" viewBox="0 0 40 38" aria-hidden="true">
          <g transform="translate(19 20) rotate(-28) scale(0.85)"><g className="ci-t-life">
            <path className="ci-t-crest" d="M-19,11 L-3,11 L2,6.4 L7,11 L21,11"/>
            <path className="ci-t-ripple" d="M-13,15.5 L-4,15.5"/><path className="ci-t-ripple" d="M7,15.5 L17,15.5"/>
            <g transform="translate(-11 3)"><g className="ci-t-fb"><path className="ci-t-skin" d="M0,0 C-4,0 -4.6,5 -2.6,8.6 C-1,10.2 1,10.2 2.6,8.6 C4.6,5 4,0 0,0 Z"/></g></g>
            <path className="ci-t-skin" d="M-15,1 l-5,1.6 l4.4,3 z"/>
            <g className="ci-t-head"><g className="ci-t-bob">
              <path className="ci-t-skin" d="M5,-3.4 L19,-4.2 L19,3 L5,3 Z"/>
              <ellipse className="ci-t-skin" cx="20.5" cy="-2" rx="6.2" ry="5.2"/>
              <circle className="ci-t-eye" cx="22.6" cy="-4" r="1.3"/>
            </g></g>
            <ellipse className="ci-t-shell" cx="0" cy="-1" rx="16" ry="11"/>
            <path className="ci-t-seam" d="M-9,-6.5 C-3,-9.6 3,-9.6 9,-6.5"/>
            <path className="ci-t-seam" d="M-6,-8.4 C-8,-1 -8,4 -5,9.4"/>
            <path className="ci-t-seam" d="M6,-8.4 C8,-1 8,4 5,9.4"/>
            <g transform="translate(9 4)"><g className="ci-t-ff"><path className="ci-t-skin" d="M0,0 C-4,0 -4.6,5 -2.6,8.6 C-1,10.2 1,10.2 2.6,8.6 C4.6,5 4,0 0,0 Z"/></g></g>
          </g></g>
        </svg>
      </span>
      <div style={{ width: 26, height: 26, border: "3px solid #E8E8ED", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "ci-spin 0.7s linear infinite" }} />
      <div style={{ fontSize: 13, color: "#999" }}>Loading…</div>
      <style>{"@keyframes ci-spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );
}

function Router() {
  const path = (window.location.pathname || "/").replace(/\/+$/, "") || "/";
  if (path === "/edge") return <Education />;
  if (path === "/pro-success") return <ProSuccess />;
  return <CryptoIdea />; // "/app" and any other app route
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* H8: the boundary wraps Suspense so it catches BOTH a lazy-chunk load failure and a
        render throw in the loaded route — either way the user sees a recoverable screen. */}
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>
        <Router />
      </Suspense>
    </ErrorBoundary>
  </React.StrictMode>
);
