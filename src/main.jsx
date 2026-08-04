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
      <span className="ci-logo lg" role="img" aria-label="CryptoIdea">
        <span className="ci-logo-mark" aria-hidden="true">C</span>
        <span className="ci-logo-word">CryptoIdea</span>
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
    <Suspense fallback={<Loading />}>
      <Router />
    </Suspense>
  </React.StrictMode>
);
