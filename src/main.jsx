/**
 * Crypto Idea — React entry (served by app.html).
 * The marketing landing page at "/" is the static index.html.
 * This React bundle handles the app routes; which one renders is decided by the path:
 *   /app          → the Crypto Idea tracker
 *   /edge         → Education guide
 *   /pro-success  → PayPal return / upgrade confirmation
 * (In dev, Vite rewrites these paths to app.html; in prod, Firebase Hosting does.)
 */
import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";

// Every route is code-split. The initial download is just this tiny entry + React,
// so the loading shell paints immediately; the heavy app code AND the Firebase SDK
// then stream in as a separate chunk. NOTE: this only changes how *our* code imports
// things — no Firebase/Google package file is modified, so npm updates stay clean.
const CryptoIdea = lazy(() => import("./CryptoIdea.jsx"));
const Education = lazy(() => import("./education-page.jsx"));
const ProSuccess = lazy(() => import("./pro-success.jsx"));

function Loading() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, fontFamily: "system-ui, -apple-system, sans-serif", color: "#1A1A2E" }}>
      <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>Crypto Idea</div>
      <div style={{ width: 26, height: 26, border: "3px solid #E8E8ED", borderTopColor: "#6C5CE7", borderRadius: "50%", animation: "ci-spin 0.7s linear infinite" }} />
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
