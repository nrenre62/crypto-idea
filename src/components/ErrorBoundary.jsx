import React from "react";

// H8 (GO-LIVE-AUDIT): without this, a render throw anywhere below the boundary gives the
// user a blank white page and no signal reaches us. This catches it, shows a recoverable
// message with a MANUAL reload, and logs to the console (never swallowed).
//
// Deliberately self-contained — no app context, no design-system classes, inline styles —
// because the subtree it wraps may be the very thing that just failed, so it must not
// depend on anything that could also be broken. NOT an auto-reload: sw-register.js already
// reloads on a service-worker update, and a blind reload loop on a deterministic render
// bug would trap the user in a refresh cycle.
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Console for now; a production error sink (Sentry) is functions-side + a deploy-time
    // decision (GO-LIVE-AUDIT). The point is that it is never silently swallowed.
    // eslint-disable-next-line no-console
    console.error("Unhandled render error:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center", fontFamily: "system-ui, -apple-system, sans-serif", background: "#F6F5F0", color: "#1A1A2E" }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Something went wrong</div>
        <div style={{ fontSize: 14, color: "#6b6b6b", maxWidth: 420, lineHeight: 1.5 }}>
          The app hit an unexpected error. Your data is safe — reloading usually fixes it.
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{ fontSize: 14, fontWeight: 600, padding: "12px 28px", borderRadius: 100, border: "none", background: "#0a6b4d", color: "#fff", cursor: "pointer" }}
        >
          Reload
        </button>
      </div>
    );
  }
}
