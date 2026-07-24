import { useState, useEffect } from "react";
import { isDismissed, dismiss } from "../utils/announcement.js";

// ADMIN-5: the site-wide announcement banner, shown at the top of the logged-in app.
// The server only sends `announcement` when it's ACTIVE (functions/announcement.js
// publicAnnouncement), so a non-null prop with text means "show it". Dismiss is
// remembered per-message (see utils/announcement.js) until the admin changes the text.
export default function AnnouncementBanner({ announcement }) {
  const text = announcement && announcement.text;
  const level = (announcement && announcement.level) || "info";
  // Start hidden and reveal after the dismiss check, so a previously-dismissed
  // banner never flashes on load.
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    if (!text) { setHidden(true); return; }
    setHidden(typeof localStorage !== "undefined" ? isDismissed(text, localStorage) : false);
  }, [text]);

  if (!text || hidden) return null;
  return (
    <div className={"ann-banner lvl-" + level} role="status">
      <span className="ann-text">{text}</span>
      <button
        type="button"
        className="ann-close"
        aria-label="Dismiss announcement"
        onClick={() => { if (typeof localStorage !== "undefined") dismiss(text, localStorage); setHidden(true); }}
      >×</button>
    </div>
  );
}
