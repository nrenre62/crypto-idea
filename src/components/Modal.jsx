import { Ic } from "./ui.jsx";

// Round 15: the single popup for the whole app — a centered white rounded card on a
// dimmed scrim (a full-screen sheet on phones, via the @media in app.css). X-close
// top-right; the scrim closes on tap only when `dismissOnScrim` (off for text-entry
// forms so typed input isn't lost). Long content scrolls inside `.cm-body`.
//   size: "sm" (~360px, confirms) | "md" (~440px, forms/lessons)
export function Modal({ title, onClose, size = "md", dismissOnScrim = true, children }) {
  return (
    <div className="ci-app cm-scrim" onClick={dismissOnScrim ? onClose : undefined}>
      <div
        className={"cm-card cm-" + size}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cm-head">
          {title ? <div className="cm-title">{title}</div> : <span />}
          <div className="cm-close" onClick={onClose} role="button" aria-label="Close">{Ic.close}</div>
        </div>
        <div className="cm-body">{children}</div>
      </div>
    </div>
  );
}
