import { useEffect, useRef } from "react";
import { Ic } from "./ui.jsx";

// Round 15: the single popup for the whole app — a centered white rounded card on a
// dimmed scrim (a full-screen sheet on phones, via the @media in app.css). X-close
// top-right; the scrim closes on tap only when `dismissOnScrim` (off for text-entry
// forms so typed input isn't lost). Long content scrolls inside `.cm-body`.
//   size: "sm" (~360px, confirms) | "md" (~440px, forms/lessons)
//   hideClose (R27-3): suppress the X for uncloseable moments (a payment in flight).
//   trapFocus (ONBOARD-GATE): keep keyboard focus INSIDE the dialog — for a truly
//     non-dismissible gate, so Tab can't reach the app behind the scrim. Opt-in
//     (default off) so every other modal is unchanged.
export function Modal({ title, onClose, size = "md", dismissOnScrim = true, hideClose = false, trapFocus = false, children }) {
  const cardRef = useRef(null);
  useEffect(() => {
    if (!trapFocus) return;
    const card = cardRef.current;
    if (!card) return;
    const focusable = () => Array.from(
      card.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])')
    ).filter((el) => el.offsetParent !== null);
    // Move focus into the dialog on open so the first Tab stays inside.
    const first = focusable()[0];
    if (first) first.focus();
    const onKeyDown = (e) => {
      if (e.key !== "Tab") return;
      const els = focusable();
      if (!els.length) { e.preventDefault(); return; }
      const firstEl = els[0], lastEl = els[els.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
    };
    card.addEventListener("keydown", onKeyDown);
    return () => card.removeEventListener("keydown", onKeyDown);
  }, [trapFocus]);
  return (
    <div className={"ci-app cm-scrim cm-scrim-" + size} onClick={dismissOnScrim && !hideClose ? onClose : undefined}>
      <div
        ref={cardRef}
        className={"cm-card cm-" + size}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cm-head">
          {title ? <div className="cm-title">{title}</div> : <span />}
          {!hideClose && <div className="cm-close" onClick={onClose} role="button" aria-label="Close">{Ic.close}</div>}
        </div>
        <div className="cm-body">{children}</div>
      </div>
    </div>
  );
}
