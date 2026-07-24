// ADMIN-5: the site-wide announcement banner (config/app.announcement).
// Pure, dependency-free, unit-tested — the same "one place, enumerate from a
// declared list" discipline as features.js. saveConfig sanitises input through
// cleanAnnouncement; getAdminConfig echoes sanitise(); /api/config exposes
// publicAnnouncement (which HIDES a drafted-but-inactive message).
//
// Shape: { text, level, active }.
//   text   — the message (capped; a longer string is truncated, never rejected).
//   level  — "info" | "warning" | "critical" (drives the banner colour); anything
//            else falls back to "info".
//   active — whether the app shows it. FORCED false when text is empty, so an
//            "active" banner with nothing to say can never reach the client.

const LEVELS = ["info", "warning", "critical"];
const TEXT_MAX = 300;

// Coerce ANY input into a valid announcement object. Never throws.
function sanitize(a) {
  const o = a && typeof a === "object" ? a : {};
  const text = String(o.text == null ? "" : o.text).slice(0, TEXT_MAX).trim();
  const level = LEVELS.includes(o.level) ? o.level : "info";
  // A banner with no text is meaningless — it can never be "on".
  const active = !!o.active && text.length > 0;
  return { text, level, active };
}

// saveConfig merge rule: a payload that OMITS `announcement` must KEEP the stored
// one (the instant maintenance/signups/feature toggles post `flags` with no
// announcement — same per-key-keep reason as features.js/requireAdminMfa). Only an
// explicitly-provided value replaces it.
function cleanAnnouncement(raw, existing) {
  if (raw === undefined || raw === null) return sanitize(existing);
  return sanitize(raw);
}

// What /api/config publishes to the app: the message + level ONLY when active.
// An inactive (drafted) announcement returns null, so a half-written banner is
// never broadcast, and the text field never leaks before it's turned on.
function publicAnnouncement(cfg) {
  const a = sanitize(cfg && cfg.announcement);
  return a.active ? { text: a.text, level: a.level } : null;
}

module.exports = { LEVELS, TEXT_MAX, sanitize, cleanAnnouncement, publicAnnouncement };
