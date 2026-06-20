import React from "react";
import { useApp } from "../hooks/app-context.js";

/**
 * Journal tab — DESIGN SHELL for now (no persistence yet).
 *
 * Shows the empty state from the design. The Buy-Journal capture flow (write your
 * thesis when adding a coin) and the saved-entry list land in a later increment;
 * until then there are no entries, so the empty state is the real state.
 * Scoped under .ci-app so the design system applies without touching other screens.
 */
export function Journal() {
  const { setScreen } = useApp();
  return (
    <div className="ci-app screen-bg">
      <div className="apphead">
        <div>
          <div className="title" style={{ fontSize: 24 }}>Investment Journal <span className="beta">BETA</span></div>
          <div style={{ fontSize: 13, color: "var(--ink-faint)", marginTop: 2 }}>
            Every great investor writes before they act.
          </div>
        </div>
      </div>
      <div className="pad">
        <div className="empty-state">
          <div className="empty-ic">📓</div>
          <div className="empty-h">Your journal is empty</div>
          <div className="empty-p">
            The next time you add a coin, you'll be asked to write your thesis. Your decisions live here.
          </div>
          <button
            className="btn-primary"
            style={{ maxWidth: 240, margin: "0 auto" }}
            onClick={() => setScreen("search")}
          >
            Add your first coin →
          </button>
        </div>
        <div className="disclaimer">Your journal entries are private and stored on your device.</div>
      </div>
    </div>
  );
}
