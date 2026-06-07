/**
 * Crypto Idea — React entry (served by app.html).
 * The marketing landing page at "/" is the static index.html.
 * This React bundle handles the app routes; which one renders is decided by the path:
 *   /app          → the Crypto Idea tracker
 *   /edge         → Education guide
 *   /pro-success  → PayPal return / upgrade confirmation
 * (In dev, Vite rewrites these paths to app.html; in prod, Firebase Hosting does.)
 */
import React from "react";
import ReactDOM from "react-dom/client";
import CryptoIdea from "./CryptoIdea.jsx";
import Education from "./education-page.jsx";
import ProSuccess from "./pro-success.jsx";

function Router() {
  const path = (window.location.pathname || "/").replace(/\/+$/, "") || "/";
  if (path === "/edge") return <Education />;
  if (path === "/pro-success") return <ProSuccess />;
  return <CryptoIdea />; // "/app" and any other app route
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);
