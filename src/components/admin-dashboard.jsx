import { useState, useEffect, useRef } from "react";
import { useAdminDashboard } from "../hooks/useAdminDashboard.js";
import { trashDaysLeft, partitionUsers } from "../utils/trash.js";
// ADMIN-3: CSV export of the audit log + the users list (pure builders; the download
// plumbing is the saveCsv helper below).
import { buildAuditCsv, buildUsersCsv } from "../utils/export-admin-csv.js";
import { CSV_BOM } from "../utils/csv.js";
// ADMIN-4: pure growth maths for the Overview trend card (deltas, net churn,
// sparkline geometry). Every one of these returns null when the history is too
// short, which is what lets the card say "collecting" instead of a fake 0%.
import { seriesOf, deltaOver, netChurn, pendingCancels, historyDays, sparkPath, latest } from "../utils/growth.js";
// ADMIN-2: pure status derivations for the Overview strip. jobHealth is what turns a
// heartbeat into "late"/"never"/"failing" — the states a dead cron never announces.
import { agoLabel, jobHealth, worstHealth, featureSummary } from "../utils/status.js";

/* ═══ ADMIN-D2 — the whole panel is on the .ci-app paper design ═══
   Overview · Users · Trash · Audit were reskinned from the old grey inline-styled
   dashboard to the app's editorial/paper system (ADMIN-D already did Settings).
   The panel now renders inside ONE `.ci-app` wrapper, so every screen reads the
   same tokens (--paper / --ink / --accent …) and reuses the app's paper classes
   (card, detail-head, field-input, settings-row …). The handful of admin-only
   classes it needs (adm-*) live in src/styles/admin-settings.css, out of the user
   bundle. Design-only: every handler here is the hook's, unchanged. Admin renders
   LIGHT paper only (the admin app never sets html[data-theme]). */

// Tier metadata (labels + paper colours). `bar` is the solid fill for the tier
// breakdown bar; `ink`/`soft` colour the compact tier pill.
const TIERS = {
  free:    { label:"Starter", ink:"var(--amber)",      soft:"color-mix(in srgb, var(--amber) 14%, transparent)", bar:"#b8841f", limits:{ portfolios:3,  coins:30,   transactions:300 },  price:"$0" },
  pro:     { label:"Pro",     ink:"var(--accent-ink)", soft:"var(--accent-soft)",                                bar:"var(--accent-ink)", limits:{ portfolios:6,  coins:100,  transactions:1000 }, price:"$9.99/mo" },
  premium: { label:"Premium", ink:"#7d4bbf",           soft:"#f3ecfb",                                           bar:"#7d4bbf", limits:{ portfolios:15, coins:200,  transactions:2000 }, price:"$49.99/mo" },
};

// Friendly labels for audit-log action codes. Exported so tests/unit/audit-labels.test.js
// can assert it covers EVERY action functions/index.js actually writes — an unlabelled
// action silently degrades to a raw camelCase code in front of the operator, and it also
// disappears from the ADMIN-3 action filter's readable ordering.
export const ACTION_LABELS = { setUserTier: "Changed tier", setPremiumLimits: "Set custom limits", suspendUser: "Suspended user", unsuspendUser: "Un-suspended user", deleteUser: "Deleted account", restoreUser: "Restored account", saveConfig: "Saved settings",
  // ADMIN-SEC: the server writes grantManager/revokeManager. The old grantAdmin/revokeAdmin
  // codes were left behind by the setAdminClaim removal and never matched a real entry.
  grantManager: "Granted manager role", revokeManager: "Revoked manager role",
  // BL-2 admin actions + BL-1d self-service/billing events (all audited server-side)
  adminTrashUser: "Moved to trash", adminSignOutUser: "Signed user out everywhere",
  selfDeleteAccount: "User deleted own account", selfRestoreAccount: "User restored own account",
  signOutEverywhere: "User signed out everywhere", exportMyData: "User exported data",
  createSubscription: "Started subscription checkout", cancelSubscription: "Cancelled subscription",
  // PR-C2: a Premium→Pro downgrade schedules a real future-start Pro subscription.
  scheduleProDowngrade: "Scheduled Pro downgrade",
  // PR-C3b-server: a cancelled Premium re-subscribes via a real future-start Premium subscription.
  resubscribePremium: "Scheduled Premium re-subscribe",
  // DI/R29 self-service repair + billing recovery
  reconcileMyCounters: "User repaired their counters", resolveRecheckout: "User resolved a re-checkout",
  reactivateSubscription: "User reactivated subscription",
  // ONBOARD-GATE: the free plan-choice callable (records planChosen + creates the default portfolio)
  chooseFreePlan: "User chose the free plan",
  // ADMIN-4 growth metrics
  captureStatsSnapshot: "Captured a stats snapshot",
  // ADMIN-5 team-scale & support
  viewUserAsAdmin: "Viewed a user's data", saveUserNote: "Edited a private note",
  // ADMIN-6 Settings password (the password itself is NEVER audited — only the event)
  setSettingsPassword: "Set the Settings password", settingsUnlock: "Unlocked Settings", settingsUnlockFailed: "Failed Settings-password unlock",
  // ADMIN-6 PR2: emailed Settings-password reset (request a link + complete it via token)
  settingsPwResetRequested: "Requested a Settings-password reset", settingsPwResetCompleted: "Completed a Settings-password reset" };

/* ═══ ADMIN-JOBS — friendly labels + hover/focus tooltip for the Overview status strip ═══
   Each scheduled job appears by a human label instead of its raw JS name, with a custom
   tooltip describing what it does. A job's `name` is ALSO its health-doc heartbeat key
   (runJob("refreshPrices", …) → health/jobs.refreshPrices) and the getSystemStatus map key,
   so it is never renamed — JOB_META only ADDS a display layer, purely client-side (zero
   backend change, no data migration). Exported so tests/unit/admin-dashboard.test.jsx can
   assert it covers EVERY job in functions/index.js's SCHEDULED_JOBS: a 7th job added with no
   entry fails the build (same enumerate-from-source guard as ACTION_LABELS / features). */
export const JOB_META = {
  refreshPrices:              { label: "Prices",        description: "Refreshes market prices for the top ~1,300 coins. Runs every 5 minutes." },
  refreshUniverseDaily:       { label: "Coin list",     description: "Refreshes the full ~3,000-coin catalog and removes delisted coins. Runs once a day." },
  purgeOldAudit:              { label: "Audit cleanup", description: "Deletes admin audit-log entries older than 365 days. Runs once a day." },
  captureDailyStats:          { label: "Daily stats",   description: "Saves a daily snapshot of user and growth numbers. Runs once a day." },
  purgeExpiredTrash:          { label: "Trash cleanup", description: "Permanently deletes accounts left in trash past the 30-day window. Runs once a day." },
  enforceSubscriptionPeriods: { label: "Billing sync",  description: "Downgrades a user's tier when their paid subscription period ends. Runs once a day." },
};

// The browser's native `title` delay is not reliably ~2s and can't be styled, so the strip
// uses a small custom tooltip: hovering the name arms a 2s timer; resting the full 2s shows
// the box; leaving before then cancels it. Founder spec 2026-08-01.
const JOB_TOOLTIP_DELAY_MS = 2000;

/* One job row on the status strip. Owns its own hover timer + open state so each pill is
   independent (only the hovered/focused one shows). Removing the native `title` loses no
   info: the "what it does" description and the current status detail (a failure's last
   error, a note, or an overdue/never warning) fold into the same custom box. Keyboard-
   accessible: the name is focusable, reveals on focus, hides on blur/Esc. */
function JobPill({ job, health, healthText, healthDot, now }) {
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const meta = JOB_META[job.name];
  const label = (meta && meta.label) || job.name;

  const statusDetail =
    health === "failing" ? (job.error || healthText) :
    job.note ? job.note :
    health !== "ok" ? healthText : null;
  const description = [meta && meta.description, statusDetail].filter(Boolean).join(" — ") || healthText;

  const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  const armHover = () => { clear(); timer.current = setTimeout(() => setOpen(true), JOB_TOOLTIP_DELAY_MS); };
  const hide = () => { clear(); setOpen(false); };
  useEffect(() => clear, []);   // never leak a pending timer on unmount/re-render

  return (
    <div className={"adm-job " + health}>
      <span className={"dot " + healthDot} />
      <span
        className="j-name"
        tabIndex={0}
        role="button"
        aria-label={label + ": " + description}
        aria-expanded={open}
        onMouseEnter={armHover}
        onMouseLeave={hide}
        onFocus={() => setOpen(true)}
        onBlur={hide}
        onKeyDown={(e) => { if (e.key === "Escape") hide(); }}
      >
        {label}
      </span>
      {/* agoLabel returns null when nothing has ever completed — rendered as "never",
          never as a blank that could pass for a healthy run. */}
      <span className="j-when">{agoLabel(job.at, now) || "never"}</span>
      {open && <div className="adm-job-tip" role="tooltip">{description}</div>}
    </div>
  );
}

/* ═══ ADMIN-3 — CSV export ═══
   Both exports are built from the rows already on screen, so a download always
   matches the filtered view. They contain personal data (emails, and source IPs in
   the audit file): once saved they are outside the app's retention + erasure
   controls, which is why the UI says so next to the buttons. */
function saveCsv(filename, text) {
  // BOM-prefixed so Excel on Windows reads it as UTF-8 rather than the local codepage.
  const blob = new Blob([CSV_BOM + text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  // Revoke on the next tick, not synchronously: some browsers have not finished reading
  // the blob when click() returns, and a revoked URL yields an empty download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
// UTC date stamp for export filenames (YYYY-MM-DD).
const stamp = () => new Date().toISOString().slice(0, 10);

/* ═══ ADMIN-4 — growth trend ═══ */

// The three metrics the Overview trends. `fmt` takes an absolute value — the row
// renders the sign itself, so a negative never prints as "$-12".
const GROWTH_METRICS = [
  { key: "netRevenue", label: "MRR (net)",   fmt: (v) => "$" + Math.round(v) },
  { key: "paidUsers",  label: "Paid subs",   fmt: (v) => String(Math.round(v)) },
  { key: "totalUsers", label: "Total users", fmt: (v) => String(Math.round(v)) },
];

// A hand-rolled sparkline: ~10 lines of SVG instead of a charting dependency for
// three 120x28 curves. aria-hidden because the delta text beside it carries the
// same information in words — the picture is decoration for a screen reader.
function Spark({ values }) {
  const d = sparkPath(values, 120, 28);
  if (!d) return null;
  return (
    <svg className="adm-spark" viewBox="0 0 120 28" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d={d} fill="none" stroke="var(--accent-ink)" strokeWidth="1.5"
            strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// One "vs N days ago" figure. Renders "collecting" — never a 0 — when the history
// doesn't reach back that far, so "no change" and "we don't know yet" can never be
// read as the same thing. The tooltip names the REAL baseline date, because a gap
// from a missed run means "30d" can quietly be measured from 34 days back.
function Delta({ d, days, fmt }) {
  if (!d) return <span className="g-delta none">{days}d collecting</span>;
  const flat = d.diff === 0;
  const up = d.diff > 0;
  const pct = d.pct != null && !flat ? ` (${up ? "+" : "-"}${Math.abs(d.pct).toFixed(0)}%)` : "";
  return (
    <span className={"g-delta " + (flat ? "flat" : up ? "up" : "down")} title={`${days} days: ${d.fromDate} → ${d.toDate}`}>
      {days}d {flat ? "no change" : (up ? "+" : "-") + fmt(Math.abs(d.diff)) + pct}
    </span>
  );
}

/* ═══ ADMIN-D + ADMIN-D3 — Settings paper drill-in primitives ═══
   Mirror Account.jsx's NavRow / CtrlRow / Switch; the inline SVGs come 1:1 from
   docs/mockups/admin-settings/index.html. Reused by the Settings tab (and DScreen
   by every drill-in). Design-only: every handler is the hook's, unchanged. */
const SVG = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props} />;
const SI = {
  back:        <SVG strokeWidth="2"><path d="M15 18l-6-6 6-6" /></SVG>,
  chev:        <SVG strokeWidth="2"><path d="M9 18l6-6-6-6" /></SVG>,
  maintenance: <SVG strokeWidth="1.8"><path d="M14.7 6.3a3.8 3.8 0 0 1-5 5L5 16v3h3l4.7-4.7a3.8 3.8 0 0 0 5-5l-2.3 2.3-2-2 2.3-2.3z" /></SVG>,
  signups:     <SVG strokeWidth="1.8"><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" /><path d="M18.5 8v6M15.5 11h6" /></SVG>,
  keys:        <SVG strokeWidth="1.8"><circle cx="8" cy="15" r="3.4" /><path d="M10.4 12.6 20 3M17 6l2.2 2M14.6 8.4l2 2" /></SVG>,
  email:       <SVG strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2.4" /><path d="m3.5 7.5 8.5 6 8.5-6" /></SVG>,
  plans:       <SVG strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2.4" /><path d="M3 10h18" /></SVG>,
  ai:          <SVG strokeWidth="1.8"><path d="M12 3.5l1.7 4.4 4.4 1.7-4.4 1.7L12 15.7l-1.7-4.4L5.9 9.6l4.4-1.7z" /><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" /></SVG>,
  analytics:   <SVG strokeWidth="1.8"><path d="M4 19h16" /><path d="M6 19v-6M11 19V6M16 19v-9" /></SVG>,
  access:      <SVG strokeWidth="1.8"><path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z" /><path d="M9 12l2 2 4-4" /></SVG>,
  announce:    <SVG strokeWidth="1.8"><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z" /><path d="M15.5 8.5a4 4 0 0 1 0 7" /></SVG>,
  lock:        <SVG strokeWidth="1.8"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></SVG>,
};
// A tappable category row (drills into a detail view).
function NavRow({ icon, label, value, muted, onClick }) {
  return (
    <button type="button" className="settings-row pressable" onClick={onClick}>
      <span className="sr-icon">{icon}</span>
      <span className="sr-label">{label}</span>
      {value != null && <span className={"sr-value" + (muted ? " muted" : "")}>{value}</span>}
      <span className="sr-chev">{SI.chev}</span>
    </button>
  );
}
// A control row: label + an inline control (a pill switch). ADMIN-2 added the optional
// `sub` line, because a kill-switch whose effect you have to guess is one you won't dare
// to use — each switch states what actually happens when you turn it off.
function CtrlRow({ icon, label, sub, children }) {
  return (
    <div className={"settings-row" + (sub ? " has-sub" : "")}>
      <span className="sr-icon">{icon}</span>
      <span className="sr-label">{label}{sub && <span className="sr-sub">{sub}</span>}</span>
      <span className="sr-ctrl">{children}</span>
    </div>
  );
}
// Pill switch (mirrors Account's home Switch). `warn` tints the ON state amber.
function Switch({ checked, warn, onChange }) {
  return (
    <label className={"switch" + (warn ? " warn" : "")}>
      <input type="checkbox" role="switch" checked={!!checked} onChange={e => onChange(e.target.checked)} />
      <span className="slider" />
    </label>
  );
}
// ADMIN-UI-4: a second-screen shell. The bordered ‹ back BOX + the centered title sit
// in a divided header at the top of ONE card, then the body — matching the admin-panel
// mockup. Replaces the old DHead (a bare borderless chevron floating above a separate
// card whose first line repeated the title). Used by every drill-in (Settings + the
// user detail). Design-only: onBack is the caller's existing handler.
function DScreen({ title, onBack, children }) {
  return (
    <div className="card adm-scr">
      <div className="adm-scr-head">
        <button className="icon-btn" aria-label="Back" onClick={onBack}>{SI.back}</button>
        <span className="dh-title">{title}</span>
        <span className="adm-scr-spacer" />
      </div>
      <div className="adm-scr-body">{children}</div>
    </div>
  );
}
// Compact tier pill for list rows + the user detail (paper colours).
function TierPill({ tier }) {
  const t = TIERS[tier] || TIERS.free;
  return <span className="adm-pill" style={{ background: t.soft, color: t.ink }}>{t.label.toUpperCase()}</span>;
}

/* ═══ ADMIN-1 — billing-ops visibility (read-only) ═══
   The subscription status is derived server-side (billing.billingStatusOf) from the
   already-persisted fields; here we just map it to a paper colour. Cancels/refunds
   stay in the PayPal dashboard — this surface is read-only. */
const BILL = {
  active:   { label:"Active",          dot:"var(--sg)",        soft:"var(--sg-s)",                                       ink:"var(--accent-ink)" },
  past_due: { label:"Past due",        dot:"var(--amber)",     soft:"color-mix(in srgb, var(--amber) 15%, transparent)", ink:"#8a6414" },
  canceled: { label:"Canceled",        dot:"var(--sr)",        soft:"var(--sr-s)",                                       ink:"var(--sr)" },
  none:     { label:"No subscription", dot:"var(--ink-faint)", soft:"var(--paper-3)",                                    ink:"var(--ink-faint)" },
};
function BillPill({ status }) {
  const b = BILL[status] || BILL.none;
  return <span className="adm-pill" style={{ background: b.soft, color: b.ink }}>{b.label.toUpperCase()}</span>;
}
// A small status dot for the Users-list rows (paid accounts only).
function BillDot({ status }) {
  const b = BILL[status] || BILL.none;
  return <span className="adm-bill-dot" style={{ background: b.dot }} title={b.label} />;
}
// Relative "time ago" for webhook + last-payment timestamps (ms epoch). Component
// context, so Date.now() is fine here (unlike the pure server/workflow code).
function relTime(ms) {
  if (!ms) return "—";
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60); if (h < 24) return h + "h ago";
  const d = Math.floor(h / 24); return d + "d ago";
}
// Friendly PayPal webhook event-type labels for the Overview billing card.
const WH_LABELS = {
  "BILLING.SUBSCRIPTION.ACTIVATED": "Subscription activated",
  "BILLING.SUBSCRIPTION.CANCELLED": "Subscription cancelled",
  "BILLING.SUBSCRIPTION.SUSPENDED": "Subscription suspended",
  "BILLING.SUBSCRIPTION.EXPIRED": "Subscription expired",
  "PAYMENT.SALE.COMPLETED": "Payment completed",
  "PAYMENT.SALE.REFUNDED": "Payment refunded",
};
const whLabel = (t) => WH_LABELS[t] || t || "Unknown event";

// Per-user custom-limits editor (Premium overrides, S8). Transient form state lives
// here (presentation only); the actual write goes through the hook's changePremiumLimits
// → setPremiumLimits callable. Blank field = tier default; the server clamps each value.
function PremiumLimitsEditor({ found, busy, onSave }) {
  const [pl, setPl] = useState({ portfolios: "", coins: "", transactions: "" });
  useEffect(() => {
    const x = found.premiumLimits || {};
    setPl({ portfolios: x.portfolios ?? "", coins: x.coins ?? "", transactions: x.transactions ?? "" });
  }, [found.uid]);
  const save = () => {
    const out = {};
    for (const k of ["portfolios", "coins", "transactions"]) {
      if (pl[k] !== "" && pl[k] != null) { const n = Number(pl[k]); if (isFinite(n) && n >= 0) out[k] = n; }
    }
    onSave(out);
  };
  const field = (k, label, max) => (
    <div className="mini-field">
      <label>{label}</label>
      <input type="number" min="0" max={max} value={pl[k]} disabled={busy} placeholder="default"
        onChange={e => setPl(p => ({ ...p, [k]: e.target.value }))} />
    </div>
  );
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="adm-label">Custom limits (Premium)</div>
      <div className="mini-grid" style={{ marginBottom: 8 }}>
        {field("portfolios", "Portfolios")}
        {field("coins", "Coins (≤1000)", "1000")}
        {field("transactions", "Transactions")}
      </div>
      <div className="adm-actions">
        <button className="adm-btn go sm" disabled={busy} onClick={save}>Save custom limits</button>
        <button className="adm-btn sm" disabled={busy} onClick={() => onSave({})}>Clear</button>
      </div>
      <div className="adm-hint">Blank = tier default. Server clamps to the product ceiling (coins ≤ 1,000).</div>
    </div>
  );
}

// Presentation only — all state, data-loading and admin actions live in the hook.
// ADMIN-UI-1: `email`/`onSignOut` come from admin-main.jsx so the whole persistent
// chrome (bar → H1 → tabs) lives in ONE component under one .ci-app paper wrapper —
// the old colliding outer <header> in admin-main is gone.
export default function AdminDashboard({ email, onSignOut } = {}) {
  const {
    stats, statsErr, tab, setTab,
    keys, setKeys, mail, setMail, savedMsg, setFlags,
    controls, analytics, setAnalytics, legal, setLegal, plans, setPlans,
    found, setFound, lookupMsg, actionMsg,
    confirmDelete, setConfirmDelete, busy,
    userList, listMsg, listLoading, q, setQ, page, setPage, PAGE_SIZE,
    billingFilter, setBillingFilter,
    tierFilter, setTierFilter,
    selected, toggleSelect, clearSelect, setSelectMany, bulkSetTier, bulkSuspend,
    views, saveView, deleteView, applyView,
    viewAs, viewAsLoading, viewAsErr, openViewAs, closeViewAs,
    note, saveNote, announcement, setAnnouncement,
    audit, auditLoading, auditMsg,
    auditQ, setAuditQ, auditAction, setAuditAction, auditPage, setAuditPage, auditLimit, AUDIT_MAX_LIMIT,
    webhookEvents, webhookLoading, webhookMsg, loadWebhookEvents,
    dupEmails, dupLoading, dupMsg, loadDupEmails,
    s,
    saveConfig, saveControls, loadUserList, loadAudit, openUser, changeTier, changePremiumLimits, toggleSuspend,
    restoreFromTrash, purgeFromTrash,
    confirmEmpty, setConfirmEmpty,
    delText, setDelText, purgeUid, setPurgeUid,
    trashUser, signOutUser, emptyTrash,
    role, roleLoaded, isOwner, unlocked,
    unlockPrompt, unlockPass, setUnlockPass, unlockErr, submitUnlock, cancelUnlock,
    // ADMIN-6 — the owner-only Settings password (set/change) + PR2 emailed reset.
    settingsPwSet, settingsPwAt, settingsPwMsg, setSettingsPwMsg, saveSettingsPassword, requestSettingsResetLink,
    grantEmail, setGrantEmail, grantEmail2, setGrantEmail2, grantFound,
    grantMsg, setGrantWarn, grantWarn, grantLookup, setManager,
    admins, adminsLoading, adminsMsg, loadAdmins,
    mfaWarn, setMfaWarn,
    daily, dailyLoading, dailyMsg, capturing, captureSnapshot,
    status, statusLoading, statusMsg, loadStatus, saveFeature,
  } = useAdminDashboard();

  // ADMIN-D: which Settings screen is showing — "home" or a detail drill-in.
  // Local to the component (no router), exactly like Account.jsx's `view`.
  const [settingsView, setSettingsView] = useState("home");
  // ADMIN-6: the Settings-password set/change form draft (never persisted anywhere but
  // this input; cleared on a successful save).
  const [spwForm, setSpwForm] = useState({ current: "", next: "", confirm: "" });
  // AUTH-DUP (Part B): whether the duplicate-email card's account list is expanded.
  const [dupOpen, setDupOpen] = useState(false);

  // ADMIN-5 — local UI state for the Users tab.
  // The view-as reason prompt (inline; a reason is required server-side).
  const [askView, setAskView] = useState(false);
  const [viewReason, setViewReason] = useState("");
  // The editable private-note draft, synced FROM the hook's loaded note (and after a
  // save) but NOT while the operator is typing (note.text only changes on load/save).
  const [noteDraft, setNoteDraft] = useState("");
  useEffect(() => { setNoteDraft(note.loaded ? (note.text || "") : ""); /* eslint-disable-next-line */ }, [note.loaded, note.updatedAt, found && found.uid]);
  // Reset the view-as prompt whenever the open user changes.
  useEffect(() => { setAskView(false); setViewReason(""); }, [found && found.uid]);
  // Close the reason form once the snapshot has loaded (the overlay takes over).
  useEffect(() => { if (viewAs) { setAskView(false); setViewReason(""); } }, [viewAs]);
  // ADMIN-SEP (CRYP-103): load the admin roster the first time the Admin-access drill-in
  // opens — lazily, the same way the Overview cards load on their tab. A manager never
  // reaches this screen (it's inside owner-only Settings), so the roster is owner-only.
  useEffect(() => { if (settingsView === "access") loadAdmins(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [settingsView]);

  /* ADMIN-D2 — one shared toast for every mutating action. It mirrors the hook's
     savedMsg (Settings saves) + actionMsg (Users/Trash actions) so those two
     inconsistent inline status fields are gone. kind is derived from the message
     text (the hook already encodes "✓" for success, "failed"/"Cancel…" for
     errors); pushToast(msg, kind) lets the component force a kind (owner-delete
     pre-empt). Clicking the toast dismisses it; otherwise it auto-clears. */
  const [toast, setToast] = useState(null); // { text, kind }
  // Fail-visible by DEFAULT: a "✓" is the only success case and "Saving…" the only
  // in-progress one, so ANY other message renders red — including bare Firebase
  // callable codes ("unavailable" / "internal" / "deadline-exceeded") that carry no
  // English keyword. This is simpler and safer than a keyword allowlist (a real
  // failure never gets dressed up as a neutral notice). The owner-delete pre-empt
  // passes an explicit "warn" kind, so it bypasses this.
  const kindOf = (t) => /✓/.test(t) ? "ok" : /^(saving|loading|checking)/i.test(t) ? "info" : "err";
  const pushToast = (text, kind) => { if (text) setToast({ text, kind: kind || kindOf(text) }); };
  useEffect(() => { pushToast(actionMsg); }, [actionMsg]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { pushToast(savedMsg); }, [savedMsg]);     // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); }, [toast]);

  const TABS = ["overview", "users", "trash", ...(isOwner ? ["settings"] : []), "audit"];
  const closeUser = () => { setFound(null); setConfirmDelete(false); setDelText(""); };

  return (
    <div className="ci-app adm-root">
      {/* ADMIN-UI-1: the ONE sticky bar — the only pinned element. Logo tile + brand
          (left), email + Log out (right). It replaces both the old inner .adm-head
          and the colliding outer <header> that admin-main.jsx used to render. */}
      <header className="adm-bar">
        <div className="adm-bar-inner">
          <div className="adm-brand">
            <span className="adm-logo" aria-hidden="true">C</span>
            <span className="adm-brand-txt">CryptoIdea <span className="adm-sub">· Admin</span></span>
          </div>
          <div className="adm-bar-right">
            {email && <span className="adm-email" title={email}>{email}</span>}
            <button type="button" className="adm-logout" onClick={onSignOut}>Log out</button>
          </div>
        </div>
      </header>

      <div className="adm-shell">

        {/* ADMIN-UI-1: persistent page title — CONSTANT across every tab AND every
            drill-in (it does not change to the section name) — with the relocated
            Live-Data pill (moved out of the retired .adm-head). Because the H1 is
            normal-flow content below a blurred/opaque bar, it can never render on
            top of the bar. */}
        <div className="adm-title-row">
          <h1 className="adm-h1">Admin dashboard</h1>
          <div className={"adm-live " + (statsErr ? "err" : stats ? "ok" : "")}>
            <span className="lv-dot" />{statsErr ? "Error" : stats ? "Live Data" : "Loading…"}
          </div>
        </div>

        {/* Tabs — ADMIN-SEC: Settings is owner-only. Hiding it is a convenience; the
            callables refuse a manager regardless, and firestore.rules refuses a
            manager's direct writes, so this is the third layer, not the first.
            ADMIN-D3: "Admin access" is no longer a tab — it lives inside Settings. */}
        <div className="adm-tabs">
          {TABS.map(tb => (
            <button key={tb} className={"adm-tab" + (tab === tb ? " active" : "")}
              onClick={() => { setTab(tb); if (tb !== "settings") setSettingsView("home"); }}>
              {tb.charAt(0).toUpperCase() + tb.slice(1)}
            </button>
          ))}
        </div>

        {/* ADMIN-SEC: make the caller's own role legible — a manager who can't find
            Settings should see WHY, and a legacy role-less admin needs to know they're
            mid-migration rather than assume the panel is broken. */}
        {roleLoaded && role !== "owner" && (
          <div className={"adm-note" + (role === "manager" ? "" : " warn")}>
            {role === "manager"
              ? <>Signed in as a <b>manager</b> — accounts only. Settings (including admin access) and permanent deletion are owner-only.</>
              : <>⚠ This admin account has <b>no role</b> yet (created before roles existed). Account actions work, but Settings (including admin access) stays locked until an owner runs <code>set-admin.js --role=…</code> and you sign in again.</>}
          </div>
        )}

        {/* ═══ OVERVIEW (real, combined, no personal data) ═══ */}
        {/* BL-1e: a getStats failure renders as an explicit error — never as a
            plausible all-zero / $0 dashboard (the zeros are EMPTY_STATS, not data). */}
        {tab === "overview" && statsErr && !stats && (
          <div className="adm-err-card">
            <div className="h">Couldn't load stats</div>
            <div className="p">{statsErr} — the dashboard numbers are unavailable (not zero). Reload the page to retry.</div>
          </div>
        )}
        {/* ADMIN-UI-5: the Overview grows to the mockup scale (bigger stat numbers +
            roomier 30px card padding). The .adm-ov-screen wrapper scopes those size
            bumps to Overview ONLY — .adm-mini is also used in the user-detail drill-in,
            which must stay at today's size. */}
        {tab === "overview" && !(statsErr && !stats) && (<div className="adm-ov-screen">
          {/* Headline user counts */}
          <div className="adm-stats">
            {[[s.totalUsers,"Total","var(--ink)"],[s.freeUsers,"Starter","var(--amber)"],[s.proUsers,"Pro","var(--accent-ink)"],[s.premiumUsers,"Premium","#7d4bbf"]].map(([val,label,color]) => (
              <div key={label} className="adm-stat">
                <div className="n" style={{ color }}>{val}</div>
                <div className="l">{label}</div>
              </div>
            ))}
          </div>

          {/* ADMIN-2: operational status strip. Deliberately ABOVE the business
              numbers — if a cron is dead or a feature is switched off, that changes
              how you should read every figure below it. */}
          <div className="adm-strip">
            {statusMsg && <div className="adm-inline-err">{statusMsg} — status unknown (not "all clear"). Reload to retry.</div>}
            {!statusMsg && statusLoading && !status && <div className="adm-loading">Checking…</div>}
            {!statusMsg && status && (() => {
              const now = status.now || Date.now();
              const jobs = status.jobs || [];
              const worst = worstHealth(jobs, now);
              const feat = featureSummary(status.features);
              const HEALTH_DOT = { ok: "ok", late: "warn", never: "warn", failing: "err" };
              const HEALTH_TEXT = { ok: "ran on schedule", late: "OVERDUE — the schedule may have stopped", never: "never run", failing: "last run FAILED" };
              return (<>
                <div className="adm-strip-head">
                  <span className={"dot " + HEALTH_DOT[worst]} />
                  <span className="s-title">
                    {worst === "ok" ? "All scheduled jobs healthy" : `Scheduled jobs: ${HEALTH_TEXT[worst]}`}
                  </span>
                  <span className={"s-feat" + (feat.off.length ? " off" : "")}>{feat.label}</span>
                  <button className="adm-btn sm ghost" disabled={statusLoading} onClick={loadStatus}>
                    {statusLoading ? "…" : "Refresh"}
                  </button>
                </div>
                <div className="adm-jobs">
                  {/* ADMIN-JOBS: each pill shows a friendly label + a custom hover/focus
                      tooltip (JobPill). The failing-error-vs-note logic and "never" fallback
                      moved into JobPill; the native `title` is gone so the two can't both pop. */}
                  {jobs.map((j) => {
                    const h = jobHealth(j, now);
                    return (
                      <JobPill
                        key={j.name}
                        job={j}
                        health={h}
                        healthText={HEALTH_TEXT[h]}
                        healthDot={HEALTH_DOT[h]}
                        now={now}
                      />
                    );
                  })}
                </div>
                <div className="adm-strip-foot">
                  <span>Market cache: {agoLabel(status.caches && status.caches.universeAt, now) || "never written"}</span>
                  <span> · Error reporting: {status.sentryConfigured ? "Sentry on" : "not configured"}</span>
                  {status.maintenance && <span className="warn"> · MAINTENANCE MODE ON</span>}
                  {status.signupsEnabled === false && <span className="warn"> · signups paused</span>}
                </div>
              </>);
            })()}
          </div>

          {/* On desktop these three sit side-by-side; on mobile grid-auto collapses to one
              column. `adm-ov` stretches them to EQUAL HEIGHT (admin-only; shared .grid-auto
              stays align-items:start for the user app's Research grid) — ADMIN-UI-3. */}
          <div className="grid-auto adm-ov" style={{ marginBottom: 4 }}>

            {/* Revenue — shown NET of payment-processor fees (gross − fees). Falls
                back to client-side fee math if getStats predates the net fields. */}
            {(() => {
              const gross = s.grossRevenue != null ? s.grossRevenue : s.estimatedRevenue;
              const fees  = s.paymentFees  != null ? s.paymentFees  : gross * 0.029 + (s.proUsers + s.premiumUsers) * 0.30;
              const net   = s.netRevenue   != null ? s.netRevenue   : Math.max(0, gross - fees);
              return (
                <div className="card">
                  <div className="adm-kv"><span className="k">Est. Monthly Revenue</span><span className="v">${net.toFixed(0)}</span></div>
                  <div className="adm-note-sm">Net after fees · gross ${gross.toFixed(0)} − fees ${fees.toFixed(2)} (PayPal ~2.9% + $0.30/charge)</div>
                  <div className="adm-note-sm">{s.proUsers} Pro × ${s.proPrice} = ${(s.proUsers*s.proPrice).toFixed(0)} · {s.premiumUsers} Premium × ${s.premiumPrice} = ${(s.premiumUsers*s.premiumPrice).toFixed(0)}</div>
                </div>
              );
            })()}

            {/* Combined usage — aggregate engagement, no personal data */}
            <div className="card">
              <div className="card-title">Combined Usage <span style={{ fontWeight:400, color:"var(--ink-faint)" }}>· no personal data</span></div>
              <div className="adm-minis">
                {[
                  [s.totalPortfolios, "Portfolios", (s.totalUsers ? s.totalPortfolios / s.totalUsers : 0).toFixed(1)],
                  [s.totalCoins, "Coins tracked", (s.totalUsers ? s.totalCoins / s.totalUsers : 0).toFixed(1)],
                ].map(([total, label, avg]) => (
                  <div key={label} className="adm-mini">
                    <div className="n">{total}</div>
                    <div className="l">{label}</div>
                    <div className="sub">avg {avg}/user</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tier Breakdown */}
            <div className="card">
              <div className="card-title">Tier Breakdown</div>
              <div className="adm-tierbar">
                {[[s.freeUsers,"free"],[s.proUsers,"pro"],[s.premiumUsers,"premium"]].map(([n,key]) => n > 0 && (
                  <div key={key} className="seg" style={{ width:`${s.totalUsers > 0 ? n/s.totalUsers*100 : 0}%`, background:TIERS[key].bar }}>{n}</div>
                ))}
              </div>
              {/* Legend colours are driven from the SAME per-tier `bar` colour as the
                  stacked-bar segments above — one source per tier, so a segment and its
                  label can never drift (ADMIN-UI-3). */}
              <div className="adm-legend">
                {[["free",s.freeUsers],["pro",s.proUsers],["premium",s.premiumUsers]].map(([key,n]) => (
                  <span key={key} style={{ color:TIERS[key].bar }}>{TIERS[key].label} ({n})</span>
                ))}
              </div>
            </div>

          </div>{/* end overview grid — Plan Limits spans full width below */}

          {/* ADMIN-4: Growth — trend over the daily statsDaily snapshots. The
              series starts EMPTY (nothing is backfilled: there is no record of
              what was true before the first capture) and fills one row per day,
              so every figure here degrades to "collecting" until the history is
              genuinely long enough to answer the question asked. */}
          <div className="card">
            <div className="adm-card-head">
              <div className="card-title" style={{ marginBottom:0 }}>Growth</div>
              {isOwner && (
                <button className="adm-btn sm" disabled={capturing}
                        onClick={async () => { const r = await captureSnapshot(); pushToast(r.msg, r.ok ? "ok" : "err"); }}>
                  {capturing ? "…" : "Capture now"}
                </button>
              )}
            </div>
            {dailyMsg && <div className="adm-inline-err" style={{ marginTop:10 }}>{dailyMsg}</div>}
            {(() => {
              if (dailyLoading && !daily) return <div className="adm-loading">Loading…</div>;
              const list = daily || [];
              // A failed load already rendered the red banner above; don't ALSO tell the
              // operator that an empty series is the normal pre-launch state (the same
              // error-vs-empty contradiction fixed for the ADMIN-1 webhook card).
              if (list.length === 0) return dailyMsg ? null : (
                <div className="adm-hint" style={{ marginTop:8 }}>
                  No snapshots recorded yet. One is captured automatically every 24 hours;
                  trends appear as days accumulate. Nothing is backfilled — history starts
                  at the first capture.
                </div>
              );
              const now = latest(list);
              const days = historyDays(list);
              const churn = netChurn(list, 30);
              const pending = pendingCancels(list);
              return (<>
                <div className="adm-growth">
                  {GROWTH_METRICS.map((m) => (
                    <div key={m.key} className="adm-growth-row">
                      <div className="g-head">
                        <span className="g-label">{m.label}</span>
                        <span className="g-now">{m.fmt(now[m.key] || 0)}</span>
                      </div>
                      <Spark values={seriesOf(list, m.key)} />
                      <div className="g-deltas">
                        <Delta d={deltaOver(list, m.key, 7)} days={7} fmt={m.fmt} />
                        <Delta d={deltaOver(list, m.key, 30)} days={30} fmt={m.fmt} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="adm-growth-foot">
                  <div className="adm-kv">
                    <span className="k">Net paid churn · 30d</span>
                    <span className="v">{churn ? (churn.pct == null ? "—" : churn.pct.toFixed(1) + "%") : "collecting"}</span>
                  </div>
                  {/* Saying "net" in the label is not pedantry: a month that lost 3
                      subscribers and won 3 reads as 0%. Gross churn needs per-event
                      tracking, which is deliberately not built (founder, 2026-07-24). */}
                  <div className="adm-note-sm">
                    Net of new subscribers — {churn ? `${churn.lost} lost from ${churn.start}` : "needs 30 days of history"}
                    {pending > 0 && <> · <b>{pending}</b> cancelled or past-due {pending === 1 ? "subscription has" : "subscriptions have"} not dropped yet</>}
                  </div>
                  <div className="adm-note-sm">
                    Signups yesterday: <b>{(now.signups24h || 0)}</b> · {days} {days === 1 ? "day" : "days"} of history
                    {list.length < days && <> ({list.length} snapshots — a scheduled run was missed)</>}
                  </div>
                </div>
              </>);
            })()}
          </div>

          {/* Tier Limits Reference */}
          <div className="card">
            <div className="card-title">Plan Limits</div>
            <div className="adm-plans">
              {["free","pro","premium"].map(tier => {
                const t = TIERS[tier];
                const p = plans[tier] || t.limits;   // live configured values
                const price = (plans[tier] && plans[tier].price != null) ? (plans[tier].price ? "$" + plans[tier].price + "/mo" : "$0") : t.price;
                return (
                  <div key={tier} className="adm-plan">
                    <div className="pn" style={{ color:t.ink }}>{t.label.toUpperCase()}</div>
                    <div className="pk">Portfolios</div><div className="pv">{p.portfolios}</div>
                    <div className="pk">Coins</div><div className="pv">{p.coins}</div>
                    <div className="pk">Tx/coin</div><div className="pv">{(p.transactions||0).toLocaleString()}</div>
                    <div className="pp">{price}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ADMIN-1: Billing & webhook health — a read-only view of the PayPal
              webhook ledger (webhookEvents). No new storage; events only appear
              once real subscriptions fire, so an empty list is NORMAL before launch
              (shown as an expected empty-state, never an error). */}
          <div className="card">
            <div className="adm-card-head">
              <div className="card-title" style={{ marginBottom:0 }}>Billing &amp; webhooks</div>
              <button className="adm-btn sm" onClick={loadWebhookEvents} disabled={webhookLoading}>{webhookLoading ? "…" : "Refresh"}</button>
            </div>
            {webhookMsg && <div className="adm-inline-err" style={{ marginTop:10 }}>{webhookMsg}</div>}
            {(() => {
              if (webhookLoading && !webhookEvents) return <div className="adm-loading">Loading…</div>;
              const events = webhookEvents || [];
              // On a load failure the hook sets webhookMsg AND events=[]; the red error
              // banner already rendered above, so suppress the "empty is expected" hint —
              // don't tell the admin a failure is the normal pre-launch state.
              if (events.length === 0) return webhookMsg ? null : <div className="adm-hint" style={{ marginTop:8 }}>No PayPal webhook events processed yet. They appear here once live subscriptions start firing — an empty list is expected before launch.</div>;
              const lastAt = events[0] && events[0].atMs;
              const fresh = lastAt && (Date.now() - lastAt) < 24 * 3600 * 1000;
              const byType = {};
              for (const e of events) byType[e.type] = (byType[e.type] || 0) + 1;
              return (<>
                <div className="adm-wh-summary">
                  <span className="lv-dot" style={{ background: fresh ? "var(--sg)" : "var(--ink-faint)" }} />
                  <span>{events.length} processed · last {relTime(lastAt)}</span>
                </div>
                <div className="adm-wh-types">
                  {Object.entries(byType).map(([t, n]) => (
                    <span key={t} className="adm-wh-chip">{whLabel(t)} · {n}</span>
                  ))}
                </div>
                <div className="adm-wh-list">
                  {events.slice(0, 8).map(e => (
                    <div key={e.id} className="adm-wh-row">
                      <span className="wh-t">{whLabel(e.type)}</span>
                      <span className="wh-when">{relTime(e.atMs)}</span>
                    </div>
                  ))}
                </div>
              </>);
            })()}
          </div>

          {/* AUTH-DUP (Part B): read-only duplicate-email detector. Flags any email shared
              by 2+ Auth accounts — a double-submit signup (dev), or a soft-delete +
              re-register (prod, before the 30-day purge). The owner resolves through the
              EXISTING Users-tab delete/trash flow; this card only READS. Admins only. */}
          <div className="card">
            <div className="adm-card-head">
              <div className="card-title" style={{ marginBottom:0 }}>Duplicate emails</div>
              <button className="adm-btn sm" onClick={() => { setDupOpen(false); loadDupEmails(); }} disabled={dupLoading}>{dupLoading ? "…" : "Refresh"}</button>
            </div>
            {dupMsg && <div className="adm-inline-err" style={{ marginTop:10 }}>{dupMsg}</div>}
            {(() => {
              if (dupLoading && !dupEmails) return <div className="adm-loading">Loading…</div>;
              const groups = (dupEmails && dupEmails.groups) || [];
              const n = (dupEmails && dupEmails.duplicateEmails) || 0;
              // On a load failure the hook sets dupMsg AND a zero result; the red banner
              // above already rendered, so don't also print a reassuring all-clear.
              if (n === 0) return dupMsg ? null : <div className="adm-hint" style={{ marginTop:8 }}>No duplicate emails — every account has a unique address. ✓</div>;
              return (<>
                <div className="adm-dup-summary">
                  <span className="lv-dot" style={{ background:"var(--amber)" }} />
                  <span>{n} email{n === 1 ? "" : "s"} shared by 2+ accounts</span>
                </div>
                <div className="adm-hint" style={{ marginTop:2, marginBottom:10 }}>Resolve from the Users tab — open the account and delete or trash the extra one. This card is read-only.</div>
                <button className="adm-btn sm" onClick={() => setDupOpen(o => !o)}>{dupOpen ? "Hide accounts" : "Show accounts"}</button>
                {dupOpen && (
                  <div className="adm-dup-list">
                    {groups.map(g => (
                      <div key={g.email} className="adm-dup-group">
                        <div className="adm-dup-email">{g.email} <span className="adm-dup-count">×{g.count}</span></div>
                        {g.accounts.map(a => (
                          <div key={a.uid} className="adm-dup-acct">
                            <span className="da-uid">{a.uid}</span>
                            <span className="da-meta">{(a.tier || "free")}{a.disabled ? " · disabled" : ""}{a.creationTime ? " · " + new Date(a.creationTime).toLocaleDateString() : ""}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                    {dupEmails && dupEmails.capped && <div className="adm-hint" style={{ marginTop:8 }}>Showing the first 5,000 accounts — more may exist.</div>}
                  </div>
                )}
              </>);
            })()}
          </div>
        </div>)}

        {/* ═══ USERS — full list + a per-user drill-in for support / moderation ═══ */}
        {tab === "users" && (found ? (
          /* ── Drill-in: one user's detail (ADMIN-D2 a11y — replaces the old inline
               clickable-div card; the list is hidden while a user is open). ── */
          <DScreen title={found.name || found.email} onBack={closeUser}>
                {/* The name is the header title now; keep the email + status badges. */}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10, marginBottom:14 }}>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:12.5, color:"var(--ink-faint)" }}>{found.email}</div>
                  </div>
                  <div className="adm-detail-badges">
                    <TierPill tier={found.tier} />
                    {found.disabled && <span className="adm-pill susp">SUSPENDED</span>}
                    {found.role === "owner" && <span className="adm-pill owner">OWNER</span>}
                    {found.role === "manager" && <span className="adm-pill mgr">MANAGER</span>}
                    {found.isAdmin && !found.role && <span className="adm-pill admin">ADMIN</span>}
                  </div>
                </div>

                {/* Usage (counts only — never holdings) */}
                <div className="adm-minis" style={{ marginBottom:14 }}>
                  {[[found.portfolioCount,"Portfolios"],[found.coinCount,"Coins"]].map(([v,l]) => (
                    <div key={l} className="adm-mini"><div className="n">{v}</div><div className="l">{l}</div></div>
                  ))}
                </div>

                {/* ADMIN-1: Billing — read-only PayPal subscription status + id, derived
                    from persisted fields. Cancels/refunds stay in the PayPal dashboard. */}
                <div className="adm-billing">
                  <div className="adm-billing-head">
                    <span className="adm-label" style={{ marginBottom:0 }}>Billing</span>
                    <BillPill status={found.billingStatus} />
                  </div>
                  {(found.billingStatus && found.billingStatus !== "none") ? (
                    <div className="adm-billing-body">
                      {/* A manual admin tier change (setUserTier writes only `tier`) reads as
                          "active" with no PayPal fields — say so instead of a blank body. */}
                      {found.billingStatus === "active" && !found.paypalSubscriptionId && <div className="adm-bl-row"><span className="k">Source</span><span className="v">Manual upgrade — no PayPal subscription on file</span></div>}
                      {found.paypalSubscriptionId && <div className="adm-bl-row"><span className="k">PayPal subscription</span><span className="v mono">{found.paypalSubscriptionId}</span></div>}
                      {found.billingCycle && <div className="adm-bl-row"><span className="k">Cycle</span><span className="v">{found.billingCycle === "yearly" ? "Annual" : "Monthly"}</span></div>}
                      {found.billingStatus === "canceled" && found.subEndDate && <div className="adm-bl-row"><span className="k">Access ends</span><span className="v">{new Date(found.subEndDate).toLocaleDateString()}{found.subDowngradeTo === "pro" ? " · then Pro" : ""}</span></div>}
                      {found.billingStatus === "past_due" && <div className="adm-bl-row"><span className="k">Status</span><span className="v" style={{ color:"#8a6414" }}>Payment failed — 7-day grace, then auto-downgrade</span></div>}
                      {found.lastPayment && <div className="adm-bl-row"><span className="k">Last payment</span><span className="v">{relTime(found.lastPayment)}</span></div>}
                    </div>
                  ) : (
                    <div className="adm-hint" style={{ marginTop:6 }}>No active subscription (free tier).</div>
                  )}
                  <div className="adm-hint" style={{ marginTop:8 }}>Read-only. Cancellations and refunds are handled in the PayPal dashboard.</div>
                </div>

                {/* Last paid tier — survives an auto-downgrade so "was Pro/Premium" isn't lost (S9) */}
                {found.tierBeforeFailure && found.tier === "free" && (
                  <div style={{ fontSize:11, color:"var(--ink-faint)", marginBottom:12 }}>
                    Last paid tier: <strong style={{ color: TIERS[found.tierBeforeFailure]?.ink || "var(--ink)" }}>{TIERS[found.tierBeforeFailure]?.label || found.tierBeforeFailure}</strong> · downgraded
                  </div>
                )}

                {/* Change tier (manual upgrade / refund) */}
                <div className="adm-label">CHANGE TIER</div>
                <div className="adm-seg" style={{ marginBottom:14 }}>
                  {["free","pro","premium"].map(t => (
                    <button key={t} className={"opt" + (found.tier === t ? " on" : "")} disabled={busy || found.tier === t} onClick={() => changeTier(t)}
                      style={found.tier === t ? { borderColor:TIERS[t].ink, background:TIERS[t].soft, color:TIERS[t].ink } : { color:TIERS[t].ink }}>
                      {TIERS[t].label.toUpperCase()}
                    </button>
                  ))}
                </div>

                {/* Custom limits (Premium per-user overrides, S8) */}
                {found.tier === "premium" && (
                  <PremiumLimitsEditor found={found} busy={busy} onSave={changePremiumLimits} />
                )}

                {/* Moderation. ADMIN-SEP (CRYP-103) Part A1: an admin is not a support
                    subject — Suspend is hidden for any admin (owner or manager). Sign-out
                    stays: revoking a compromised admin's sessions is a legitimate action. */}
                <div className="adm-actions">
                  {!found.isAdmin && <button className="adm-btn danger" disabled={busy} onClick={toggleSuspend}>{found.disabled ? "Un-suspend" : "Suspend"}</button>}
                  <button className="adm-btn" disabled={busy} onClick={signOutUser}>Sign out all devices</button>
                </div>

                {/* ADMIN-5: read-only "view as" (OWNER-only). A reason is required and is
                    stored in the audit entry — the server refuses without one. Opens a
                    read-only snapshot; it never authenticates as, or acts as, the user. */}
                {isOwner && (
                  <div className="adm-viewas-launch">
                    {askView ? (
                      <div className="adm-viewas-form">
                        <div className="adm-label">VIEW AS — READ ONLY</div>
                        <div className="adm-hint" style={{ marginBottom:6 }}>Opens a read-only copy of this user's data — portfolios, coins, journal theses and learn progress. Every view is logged with your reason. You can look, not act.</div>
                        <input className="field-input" value={viewReason} onChange={e => setViewReason(e.target.value)} placeholder="Reason (e.g. user reported a missing portfolio)" autoFocus style={{ marginBottom:8 }} />
                        <div className="adm-actions">
                          <button className="adm-btn" disabled={viewAsLoading} onClick={() => { setAskView(false); setViewReason(""); }}>Cancel</button>
                          <button className="adm-btn accent" disabled={viewAsLoading || !viewReason.trim()} onClick={() => openViewAs(found.uid, viewReason.trim())}>{viewAsLoading ? "Opening…" : "Open read-only view"}</button>
                        </div>
                        {viewAsErr && <div className="adm-inline-err" style={{ marginTop:6 }}>{viewAsErr}</div>}
                      </div>
                    ) : (
                      <button className="adm-btn" style={{ width:"100%", marginTop:10 }} disabled={busy} onClick={() => { setAskView(true); setViewReason(""); }}>View as — read-only</button>
                    )}
                  </div>
                )}

                {/* ADMIN-5: private admin note (server-only adminNotes/{uid}; the note
                    CONTENT never enters the audit log). Any admin may read; a manager/owner
                    may edit — the server enforces it. Not visible to the user. */}
                <div className="adm-usernote">
                  <div className="adm-label">PRIVATE ADMIN NOTE</div>
                  <textarea className="field-input" rows={3} maxLength={4000} value={noteDraft}
                    onChange={e => setNoteDraft(e.target.value)} placeholder="Support context — visible to admins only, never to the user…" />
                  <div className="adm-usernote-foot">
                    <span className="adm-hint">{note.updatedByEmail ? `Last edited by ${note.updatedByEmail}` : "Kept server-side. Not shown to the user."}</span>
                    <button className="adm-btn sm accent" disabled={busy || noteDraft === note.text} onClick={() => saveNote(found.uid, noteDraft)}>Save note</button>
                  </div>
                </div>

                {/* R31-5: ONE delete path — Delete → type DELETE → move to the 30-day trash.
                    Hard (permanent) deletion lives ONLY in the Trash tab. ADMIN-SEP (CRYP-103)
                    Part A1: the whole delete path is hidden for any admin (owner or manager) —
                    an admin can't be trashed from here; the server refuses it too. The
                    role==="owner" pre-empt below is a defensive belt for a legacy row whose
                    isAdmin flag is missing. */}
                {!found.isAdmin && (confirmDelete ? (
                  <div style={{ marginTop:10 }}>
                    <div style={{ fontSize:11, color:"var(--ink-soft)", marginBottom:6 }}>Type <b>DELETE</b> to move this account to the trash (recoverable for 30 days):</div>
                    <input className="field-input" value={delText} onChange={e => setDelText(e.target.value)} placeholder="DELETE" autoFocus style={{ marginBottom:8 }} />
                    <div className="adm-actions">
                      <button className="adm-btn" disabled={busy} onClick={() => { setConfirmDelete(false); setDelText(""); }}>Cancel</button>
                      <button className="adm-btn solid-danger" disabled={busy || delText !== "DELETE"} onClick={trashUser}>Move to trash</button>
                    </div>
                  </div>
                ) : (
                  <button className="adm-btn danger" style={{ width:"100%", marginTop:10 }} disabled={busy}
                    onClick={() => {
                      if (found.role === "owner") { pushToast("Owner accounts are protected — they can't be deleted.", "warn"); return; }
                      setConfirmDelete(true); setDelText("");
                    }}>
                    Delete account
                  </button>
                ))}
                <div className="adm-hint" style={{ marginTop:8 }}>Delete moves the account to the trash — recoverable for 30 days. Permanent erasure (GDPR/CCPA) happens only from the Trash tab. Admin accounts can never be deleted or demoted. Sign-out forces every device to re-authenticate.</div>

                {/* ADMIN-SEC: the per-user "Make admin" button lived here and is GONE.
                    It was the bypass — any admin could promote throw-away accounts and then
                    delete the real owners while the admin count still looked healthy. Roles
                    are now granted only from the owner-only Admin access area, and owners can
                    only ever be minted by functions/scripts/set-admin.js. */}
                {found.isAdmin && (
                  <div style={{ marginTop:12, paddingTop:12, borderTop:"1px solid var(--line-2)", fontSize:10.5, color:"var(--ink-faint)" }}>
                    🔒 This is an <b>admin</b> account — protected. It can't be suspended, trashed, deleted or demoted from the panel.{found.role === "owner" ? " Owners can only be changed with functions/scripts/set-admin.js." : found.role === "manager" ? " Manager access is removed from the Admin access area." : " This admin's access is managed from the Admin access area."}
                  </div>
                )}
          </DScreen>
        ) : (<>
          <div style={{ fontSize:11.5, color:"var(--ink-faint)", lineHeight:1.5, margin:"2px 2px 12px" }}>
            All users — search by email or name, click a row to manage. Operational data only (tier, status, usage) — never holdings.
          </div>
          <div className="adm-toolbar">
            <input className="field-input" value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Search email or name…" />
            <button className="adm-btn" onClick={loadUserList} disabled={listLoading}>{listLoading ? "…" : "Refresh"}</button>
          </div>

          {/* ADMIN-1: billing filter — narrow the list to the accounts that need
              attention (a failed payment or a pending cancellation). */}
          <div className="adm-billing-filter">
            <span className="adm-filter-label">Billing</span>
            {[["all","All"],["past_due","Past due"],["canceled","Canceled"]].map(([v,l]) => (
              <button key={v} type="button" className={"adm-chip" + (billingFilter===v ? " on" : "")} onClick={() => { setBillingFilter(v); setPage(1); }}>{l}</button>
            ))}
          </div>
          {/* ADMIN-5: per-field TIER filter (alongside billing). */}
          <div className="adm-billing-filter">
            <span className="adm-filter-label">Tier</span>
            {[["all","All"],["free","Starter"],["pro","Pro"],["premium","Premium"]].map(([v,l]) => (
              <button key={v} type="button" className={"adm-chip" + (tierFilter===v ? " on" : "")} onClick={() => { setTierFilter(v); setPage(1); }}>{l}</button>
            ))}
          </div>
          {/* ADMIN-5: saved views — store the current {search, tier, billing} combo as a
              named preset (per-operator, in this browser). Click a chip to apply it. */}
          <div className="adm-views">
            <button className="adm-btn sm" onClick={() => {
              const name = typeof window !== "undefined" && window.prompt ? window.prompt("Name this view (saves the current search + tier + billing filters):") : "";
              if (name && name.trim()) saveView(name, { q, tier: tierFilter, billing: billingFilter });
            }}>+ Save view</button>
            {views.map(v => (
              <span key={v.name} className="adm-view-chip">
                <button type="button" className="vc-apply" onClick={() => applyView(v)}>{v.name}</button>
                <button type="button" className="vc-del" aria-label={`Delete view ${v.name}`} title="Delete view" onClick={() => deleteView(v.name)}>×</button>
              </span>
            ))}
          </div>

          {lookupMsg && <div className="adm-inline-err">{lookupMsg}</div>}
          {listMsg && <div className="adm-inline-err">{listMsg}</div>}

          {/* Full list — searched + paginated (50/page) entirely client-side. */}
          {(() => {
            if (listLoading && !userList) return <div className="adm-loading">Loading users…</div>;
            if (!userList) return null;
            const needle = q.trim().toLowerCase();
            // ADMIN-SEP (CRYP-103) Part A backstop: listUsers now drops admins server-side,
            // but filter them client-side too so a stale/legacy list can never surface an
            // admin as a moderatable user. Count / CSV / bulk all derive from this `active`.
            const active = partitionUsers(userList).active.filter(u => !u.isAdmin); // trashed accounts live in the Trash tab
            const searched = needle ? active.filter(u => (u.email||"").toLowerCase().includes(needle) || (u.name||"").toLowerCase().includes(needle)) : active;
            // ADMIN-1: apply the billing filter (past_due / canceled) on top of the search.
            const billed = billingFilter === "all" ? searched : searched.filter(u => u.billingStatus === billingFilter);
            // ADMIN-5: then the tier filter. `filtered` keeps its name so the pager /
            // export / count below are unchanged.
            const filtered = tierFilter === "all" ? billed : billed.filter(u => (u.tier || "free") === tierFilter);
            const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
            const pg = Math.min(page, pages);
            const rows = filtered.slice((pg-1)*PAGE_SIZE, pg*PAGE_SIZE);
            // ADMIN-5: page-scoped select-all + the bulk-action bar.
            const pageUids = rows.map(u => u.uid);
            const allSel = pageUids.length > 0 && pageUids.every(id => selected.has(id));
            return (<>
              {/* ADMIN-3: export exactly the rows this filter is showing. */}
              <div className="adm-count-row">
                <span className="adm-count">{filtered.length.toLocaleString()} user{filtered.length===1?"":"s"}{needle?` matching “${q.trim()}”`:""}{userList.length>=5000?" · showing first 5,000":""}</span>
                <div className="adm-count-actions">
                  {/* ADMIN-5: select every row on this page (bulk). */}
                  <label className="adm-selall">
                    <input type="checkbox" checked={allSel} onChange={() => setSelectMany(pageUids, !allSel)} aria-label="Select all users on this page" />
                    Select page
                  </label>
                  <button className="adm-btn sm" disabled={filtered.length === 0}
                    onClick={() => saveCsv(`crypto-idea-users-${stamp()}.csv`, buildUsersCsv(filtered))}>Export CSV</button>
                </div>
              </div>
              {/* ADMIN-5: bulk-action bar — NON-DESTRUCTIVE only (set-tier / suspend /
                  un-suspend). Each selected uid runs through the same individually-gated,
                  individually-audited callable; an owner target is refused per-row. */}
              {selected.size > 0 && (
                <div className="adm-bulk-bar">
                  <span className="adm-bulk-count">{selected.size} selected</span>
                  <span className="adm-bulk-label">Set tier</span>
                  {["free","pro","premium"].map(t => (
                    <button key={t} className="adm-btn sm" disabled={busy} onClick={() => bulkSetTier([...selected], t)}>{TIERS[t].label}</button>
                  ))}
                  <button className="adm-btn sm danger" disabled={busy} onClick={() => bulkSuspend([...selected], true)}>Suspend</button>
                  <button className="adm-btn sm" disabled={busy} onClick={() => bulkSuspend([...selected], false)}>Un-suspend</button>
                  <button className="adm-btn sm ghost" disabled={busy} onClick={clearSelect}>Clear</button>
                </div>
              )}
              <div className="adm-list">
                {rows.length === 0 && <div className="adm-empty">No users found.</div>}
                {rows.map(u => (
                  <div key={u.uid} className={"adm-row-wrap" + (selected.has(u.uid) ? " sel" : "")}>
                    <input type="checkbox" className="adm-row-check" checked={selected.has(u.uid)} onChange={() => toggleSelect(u.uid)} aria-label={`Select ${u.email}`} />
                    <button type="button" className="adm-row" onClick={() => openUser(u.email)}>
                      <div className="who">
                        <div className="nm">{u.name || u.email}</div>
                        <div className="em">{u.email}</div>
                      </div>
                      <div className="cnt" title="Portfolios">{u.portfolioCount}</div>
                      {u.billingStatus && u.billingStatus !== "none" && <BillDot status={u.billingStatus} />}
                      <TierPill tier={u.tier} />
                      {u.disabled && <span className="adm-pill susp">SUSP</span>}
                      {/* ADMIN-SEP (CRYP-103): no ADMIN pill here — the Users list is
                          filtered to non-admins (server-side + the `!u.isAdmin` backstop
                          above), so no admin row ever reaches this render. */}
                    </button>
                  </div>
                ))}
              </div>
              {pages > 1 && (
                <div className="adm-pager">
                  {/* Step from the CLAMPED page — see the Audit pager note. */}
                  <button className="adm-btn sm" onClick={() => setPage(Math.max(1, pg-1))} disabled={pg<=1}>← Prev</button>
                  <span className="pg">Page {pg} of {pages}</span>
                  <button className="adm-btn sm" onClick={() => setPage(Math.min(pages, pg+1))} disabled={pg>=pages}>Next →</button>
                </div>
              )}
            </>);
          })()}
        </>))}

        {/* ═══ TRASH — soft-deleted accounts, recoverable for 30 days ═══ */}
        {tab === "trash" && (<>
          <div style={{ fontSize:11.5, color:"var(--ink-faint)", lineHeight:1.5, margin:"2px 2px 12px" }}>
            Accounts users have deleted. They're kept for <b>30 days</b> so they can be restored, then purged automatically. Restore brings the account fully back; Delete now erases it permanently.
          </div>
          <div className="adm-toolbar end">
            {/* BL-2b/N-2: bulk-purge everything in the trash now (typed-DELETE confirm). */}
            {(() => {
              const trashedNow = userList ? partitionUsers(userList).trashed : [];
              if (trashedNow.length === 0) return null;
              return confirmEmpty ? (
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <input className="field-input" style={{ width:120, padding:"9px 12px" }} value={delText} onChange={e => setDelText(e.target.value)} placeholder="Type DELETE" autoFocus />
                  <button className="adm-btn solid-danger sm" onClick={() => emptyTrash(trashedNow.map(u => u.uid))} disabled={busy || delText !== "DELETE"}>Delete {trashedNow.length}</button>
                  <button className="adm-btn sm" onClick={() => { setConfirmEmpty(false); setDelText(""); }}>Cancel</button>
                </div>
              ) : (
                <button className="adm-btn danger sm" onClick={() => { setConfirmEmpty(true); setDelText(""); }} disabled={busy}>Empty trash</button>
              );
            })()}
            <button className="adm-btn sm" onClick={loadUserList} disabled={listLoading}>{listLoading ? "…" : "Refresh"}</button>
          </div>
          {(() => {
            if (listLoading && !userList) return <div className="adm-loading">Loading…</div>;
            if (!userList) return null;
            const trashed = partitionUsers(userList).trashed.sort((a,b) => (a.deletedAt||0) - (b.deletedAt||0));
            if (trashed.length === 0) return <div className="adm-list"><div className="adm-empty">Trash is empty.</div></div>;
            return (
              <div className="adm-list">
                {trashed.map(u => {
                  const left = trashDaysLeft(u.deletedAt);
                  return (
                    <div key={u.uid} className="adm-row static">
                      <div className="who">
                        <div className="nm">{u.name || u.email}</div>
                        <div className="em">{u.email}</div>
                        <div className={"adm-left" + (left===0 ? " urgent" : "")}>{left===0 ? "Expired — will be purged" : `${left} day${left===1?"":"s"} left to restore`}</div>
                      </div>
                      <button className="adm-btn go sm" onClick={() => restoreFromTrash(u.uid)} disabled={busy}>Restore</button>
                      {/* R31-5: permanent single-account erasure is behind a typed DELETE. */}
                      {purgeUid === u.uid ? (
                        <div style={{ display:"flex", gap:4, alignItems:"center", flexShrink:0 }}>
                          <input className="field-input" style={{ width:78, padding:"8px 10px", fontSize:12 }} value={delText} onChange={e => setDelText(e.target.value)} placeholder="DELETE" autoFocus />
                          <button className="adm-btn solid-danger sm" onClick={() => purgeFromTrash(u.uid)} disabled={busy || delText !== "DELETE"}>OK</button>
                          <button className="adm-btn sm" onClick={() => { setPurgeUid(null); setDelText(""); }}>✕</button>
                        </div>
                      ) : (
                        <button className="adm-btn danger sm" onClick={() => { setPurgeUid(u.uid); setDelText(""); }} disabled={busy}>Delete now</button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </>)}

        {/* ═══ SETTINGS — paper drill-in (ADMIN-D + ADMIN-D3) ═══
            Home = a Configuration summary + the two global switches inline + a row per
            category; each row drills into a detail card. The owner-only Admin access
            grant/revoke flow is folded in as the last row (ADMIN-D3). Design-only:
            every handler here is the hook's, unchanged. */}
        {tab === "settings" && (() => {
          const providerLabel = (p) => p === "activecampaign" ? "ActiveCampaign" : p === "getresponse" ? "GetResponse" : "None";
          const anaSummary = [analytics.ga4 && "GA4", analytics.plausible && "Plausible", legal.termlyUuid && "Termly"].filter(Boolean).join(" · ");
          const keysSet = [setFlags.coingecko, !!keys.paypalClientId, setFlags.paypalSecret, !!keys.paypalWebhookId].filter(Boolean).length;
          const back = () => setSettingsView("home");
          const titles = { apiKeys:"API keys", email:"Email & integrations", plans:"Plans & pricing", ai:"AI", analytics:"Analytics & legal", access:"Admin access", announcement:"Announcement banner", password:"Settings password" };
          return (
          <div>
            {/* Home = the Configuration summary + the global switches + a row per
                category, in .pad. Each detail view drills in via a DScreen below. */}
            {settingsView === "home" && (
            <div className="pad">
              {/* ── HOME ── */}
              <>
                <div className="card">
                  <div className="card-title" style={{ marginBottom:12 }}>Configuration</div>
                  {[
                    ["Payments", !!setFlags.paypalSecret, setFlags.paypalSecret ? "PayPal connected" : "Not set"],
                    ["Market data", !!setFlags.coingecko, setFlags.coingecko ? "CoinGecko connected" : "Not set"],
                    ["Email", !!(mail.provider && mail.provider !== "none"), (mail.provider && mail.provider !== "none") ? providerLabel(mail.provider) : "Not connected"],
                    ["Analytics & legal", !!anaSummary, anaSummary || "Not set"],
                    ["AI", false, setFlags.anthropicKey ? "Key saved · starts at go-live" : "Not set"],
                  ].map(([label, ok, val]) => (
                    <div key={label} className="status-row">
                      <span className={"dot " + (ok ? "ok" : "idle")} />
                      <span className="st-label">{label}</span>
                      <span className="st-val">{val}</span>
                    </div>
                  ))}
                </div>

                <div className="card acct-list">
                  <CtrlRow icon={SI.maintenance} label="Maintenance mode">
                    <Switch checked={!!controls.maintenance} warn onChange={() => saveControls({ ...controls, maintenance: !controls.maintenance })} />
                  </CtrlRow>
                  <CtrlRow icon={SI.signups} label="Allow new signups">
                    <Switch checked={controls.signupsEnabled !== false} onChange={() => saveControls({ ...controls, signupsEnabled: !(controls.signupsEnabled !== false) })} />
                  </CtrlRow>
                  {/* ADMIN-2: per-feature kill-switches, alongside the two global ones
                      because in an incident you want every "turn something off" control
                      in the same place. Each is enforced SERVER-side — the switch is the
                      control, this row is just how you reach it. */}
                  <CtrlRow icon={SI.maintenance} label="Live market data" sub="CoinGecko prices, search & history. Off = serve the last cached prices, make no upstream calls.">
                    <Switch checked={controls.features.marketData !== false}
                            onChange={async () => { const r = await saveFeature("marketData", !(controls.features.marketData !== false)); pushToast(r.msg, r.ok ? "ok" : "err"); }} />
                  </CtrlRow>
                  <CtrlRow icon={SI.plans} label="New subscriptions" sub="Off = the checkout callable refuses and the paid plan cards read “Temporarily unavailable”.">
                    <Switch checked={controls.features.checkout !== false}
                            onChange={async () => { const r = await saveFeature("checkout", !(controls.features.checkout !== false)); pushToast(r.msg, r.ok ? "ok" : "err"); }} />
                  </CtrlRow>
                  {/* CRYP-93: the AI-research chat toggle MOVED to the AI settings screen —
                      App Controls is for the two incident switches that gate something live
                      TODAY; the AI chat switch gates a Wave-B surface and belongs by the key. */}
                  <NavRow icon={SI.keys} label="API keys" value={keysSet ? keysSet + " set" : "Not set"} onClick={() => setSettingsView("apiKeys")} />
                  <NavRow icon={SI.email} label="Email & integrations" value={providerLabel(mail.provider)} onClick={() => setSettingsView("email")} />
                  <NavRow icon={SI.plans} label="Plans & pricing" value="3 tiers" onClick={() => setSettingsView("plans")} />
                  <NavRow icon={SI.ai} label="AI" value={setFlags.anthropicKey ? "Key saved" : "Reserved"} muted={!setFlags.anthropicKey} onClick={() => setSettingsView("ai")} />
                  <NavRow icon={SI.analytics} label="Analytics & legal" value={anaSummary || "Off"} onClick={() => setSettingsView("analytics")} />
                  <NavRow icon={SI.announce} label="Announcement banner" value={announcement.active ? "On · " + announcement.level : (announcement.text ? "Draft" : "Off")} muted={!announcement.active} onClick={() => setSettingsView("announcement")} />
                  <NavRow icon={SI.lock} label="Settings password" value={settingsPwSet ? "Set" : "Not set"} muted={!settingsPwSet} onClick={() => { setSettingsPwMsg(""); setSettingsView("password"); }} />
                  <NavRow icon={SI.access} label="Admin access" onClick={() => setSettingsView("access")} />
                </div>

                <div className="set-foot">Saved to the locked <code>config/app</code> document — clients can never read it; the price proxy + PayPal functions read it server-side. Toggles go live within about a minute.</div>
              </>
            </div>
            )}

            {/* Every detail view is a DScreen (ADMIN-UI-4): a bordered ‹ back box + the
                title ONCE in a divided header, over a body at the tighter Settings
                padding (ADMIN-UI-5). The per-view .card wrapper + duplicate .card-title
                are dropped — DScreen owns the card + the title now. */}
            {settingsView !== "home" && (
            <DScreen title={titles[settingsView]} onBack={back}>

              {/* ── API KEYS ── */}
              {settingsView === "apiKeys" && (<>
                  <div className="card-sub">For the price / DCA calculator (CoinGecko) and payments (PayPal). Stored server-side — never sent to users.</div>
                  {[
                    ["CoinGecko Demo key","coingecko","cg-demo-…"],
                    ["PayPal Client ID","paypalClientId","A…"],
                    ["PayPal Secret","paypalSecret","E…"],
                    ["PayPal Webhook ID","paypalWebhookId","WH-…"],
                  ].map(([label,key,ph]) => (
                    <div key={key}>
                      <label className="acct-label">{label}</label>
                      <input className="field-input" type={(key.toLowerCase().includes("ecret")||key==="coingecko")?"password":"text"} value={keys[key]}
                        placeholder={((key==="coingecko"&&setFlags.coingecko)||(key==="paypalSecret"&&setFlags.paypalSecret)) ? "•••••••• saved — leave blank to keep" : ph}
                        onChange={e => setKeys({ ...keys, [key]: e.target.value })} />
                    </div>
                  ))}
                  {/* ADMIN-2: Sentry DSN. Functions-only reporting — nothing is added to
                      the user bundle, and with this blank the whole integration is a
                      no-op that never even loads the SDK. */}
                  <div>
                    <label className="acct-label">Sentry DSN <span className="adm-lbl-note">(server error reporting)</span></label>
                    <input className="field-input" type="password" value={keys.sentryDsn}
                      placeholder={setFlags.sentryDsn ? "•••••••• saved — leave blank to keep" : "https://…@…ingest.sentry.io/…"}
                      onChange={e => setKeys({ ...keys, sentryDsn: e.target.value })} />
                    <div className="adm-note-sm">
                      Optional. Errors from the Cloud Functions (webhook, schedulers, price proxy) are sent
                      to Sentry — with no uid, email, request body or headers attached. Leave blank for none.
                    </div>
                  </div>
                  <button className="acct-btn accent" onClick={saveConfig}>Save keys</button>
              </>)}

              {/* ── EMAIL & INTEGRATIONS ── */}
              {settingsView === "email" && (<>
                  <div className="card-sub">Connect an email service for the landing-page subscribe form and transactional emails.</div>
                  <label className="acct-label">Provider</label>
                  <select className="field-input" value={mail.provider} onChange={e => setMail({ ...mail, provider:e.target.value })}>
                    <option value="none">None</option>
                    <option value="activecampaign">ActiveCampaign</option>
                    <option value="getresponse">GetResponse</option>
                  </select>
                  {[
                    ["API key","apiKey","provider API key"],
                    ["API URL (ActiveCampaign only)","apiUrl","https://youracct.api-us1.com"],
                    ["List / Campaign ID","listId","list or campaign id"],
                    ["From email (also the SMTP sender for admin emails)","fromEmail","hello@yourdomain.com"],
                  ].map(([label,key,ph]) => (
                    <div key={key}>
                      <label className="acct-label">{label}</label>
                      <input className="field-input" type={key==="apiKey"?"password":"text"} value={mail[key]}
                        placeholder={(key==="apiKey"&&setFlags.apiKey) ? "•••••••• saved — leave blank to keep" : ph}
                        onChange={e => setMail({ ...mail, [key]: e.target.value })} />
                    </div>
                  ))}
                  {/* ── ADMIN-6 PR2: SMTP (DreamHost) — sends the Settings-password reset email.
                       smtpPass is a secret: blank keeps the saved value (mirrors the apiKey field
                       via setFlags.smtpPass). The From email above is the SMTP sender. ── */}
                  <div className="adm-scr-section">
                    <div className="card-sub">SMTP (transactional email) — sends the Settings-password reset link. DreamHost: host <code>smtp.dreamhost.com</code>, port 587 (or 465 with SSL on).</div>
                    <label className="acct-label">SMTP host</label>
                    <input className="field-input" type="text" value={mail.smtpHost} placeholder="smtp.dreamhost.com"
                      onChange={e => setMail({ ...mail, smtpHost: e.target.value })} />
                    <label className="acct-label">SMTP port</label>
                    <input className="field-input" type="number" min="0" value={mail.smtpPort}
                      onChange={e => setMail({ ...mail, smtpPort: e.target.value === "" ? "" : Number(e.target.value) })} />
                    <label className="acct-label">SMTP username</label>
                    <input className="field-input" type="text" value={mail.smtpUser} placeholder="you@cryptoidea.app"
                      onChange={e => setMail({ ...mail, smtpUser: e.target.value })} />
                    <label className="acct-label">SMTP password</label>
                    <input className="field-input" type="password" value={mail.smtpPass}
                      placeholder={setFlags.smtpPass ? "•••••••• saved — leave blank to keep" : "SMTP password"}
                      onChange={e => setMail({ ...mail, smtpPass: e.target.value })} />
                    <div className="ctrl-line" style={{ marginTop: 12 }}>
                      <div>
                        <div className="cl-label">Use SSL (port 465)</div>
                        <div className="cl-hint">Leave off for STARTTLS on port 587.</div>
                      </div>
                      <Switch checked={mail.smtpSecure} onChange={() => setMail({ ...mail, smtpSecure: !mail.smtpSecure })} />
                    </div>
                  </div>
                  <button className="acct-btn accent" onClick={saveConfig}>Save email settings</button>
              </>)}

              {/* ── PLANS & PRICING ── */}
              {settingsView === "plans" && (<>
                  <div className="card-sub">Prices drive the revenue estimate + what users see; limits are enforced server-side by Firestore rules. Mo $ = monthly · Yr $ = annual (2 months free) · AI ¢/mo = live-AI cost ceiling in cents.</div>
                  {/* CRYP-101 (LAUNCH-FREE Part B): the paidPlansEnabled master switch. OFF puts
                      the whole site in free-launch mode — Starter-only, no plan chooser and no
                      new subscriptions (server-enforced; the checkout switch stays as the finer
                      control). Rides the saveControls→saveConfig path so a flags save can't drop it. */}
                  <CtrlRow icon={SI.plans} label="Paid plans" sub="OFF = free launch · Starter-only · no new subscriptions">
                    <Switch checked={controls.paidPlansEnabled !== false}
                            onChange={() => saveControls({ ...controls, paidPlansEnabled: !(controls.paidPlansEnabled !== false) })} />
                  </CtrlRow>
                  {["free","pro","premium"].map(t => (
                    <div key={t} className="plan-block">
                      <div className={"plan-name " + (t==="free"?"starter":t==="pro"?"pro":"prem")}>{t==="free"?"Starter":t}</div>
                      <div className="mini-grid">
                        {[["price","Mo $"],["priceYear","Yr $"],["aiMonthlyCents","AI ¢/mo"],["portfolios","Portfolios"],["coins","Coins"],["transactions","Tx/coin"]].map(([k,lbl]) => (
                          <div key={k} className="mini-field">
                            <label>{lbl}</label>
                            <input type="number" min="0" step={(k==="price"||k==="priceYear")?"0.01":"1"} value={(plans[t] && plans[t][k] != null) ? plans[t][k] : ""}
                              onChange={e => setPlans({ ...plans, [t]: { ...plans[t], [k]: e.target.value === "" ? 0 : Number(e.target.value) } })} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button className="acct-btn accent" onClick={saveConfig}>Save plans</button>
              </>)}

              {/* ── AI (reserved — live AI ships at go-live) ── */}
              {settingsView === "ai" && (<>
                  <div className="card-sub">Reserved — live AI ships at go-live. The Anthropic API key powers the server-side <code>researchAsk</code> proxy (Claude only, validator-first — never called from the browser). Saving it now is safe: it stays in the locked config doc until the proxy ships. The AI-research chat switch below is live TODAY.</div>
                  {/* CRYP-93: the AI-research chat kill-switch lives here (moved from App Controls).
                      Off = hides the Research → Ask chat for all users now, via the same
                      saveFeature→saveConfig path the incident switches use. */}
                  <CtrlRow icon={SI.ai} label="AI research chat" sub="Off = hides the Research → Ask chat for all users now; when live AI ships it also stops the server AI proxy.">
                    <Switch checked={controls.features.aiResearch !== false}
                            onChange={async () => { const r = await saveFeature("aiResearch", !(controls.features.aiResearch !== false)); pushToast(r.msg, r.ok ? "ok" : "err"); }} />
                  </CtrlRow>
                  <label className="acct-label">Anthropic API key{setFlags.anthropicKey ? " · saved ✓" : ""}</label>
                  <input className="field-input" type="password" value={keys.anthropicKey}
                    placeholder={setFlags.anthropicKey ? "•••••••• (saved — type to replace)" : "sk-ant-…"}
                    onChange={e => setKeys({ ...keys, anthropicKey: e.target.value })} />
                  <button className="acct-btn accent" onClick={saveConfig}>Save AI settings</button>
                  <div className="mini-grid" style={{ gridTemplateColumns:"1fr 1fr", marginTop:14 }}>
                    <button disabled className="acct-btn ghost" style={{ marginTop:0, opacity:0.6 }} title="Available once the conviction engine ships (Wave B · B5)">Invalidate conviction cache</button>
                    <button disabled className="acct-btn ghost" style={{ marginTop:0, opacity:0.6 }} title="Available once the conviction engine ships (Wave B · B5)">Force-refresh a coin</button>
                  </div>
              </>)}

              {/* ── ANALYTICS & LEGAL ── */}
              {settingsView === "analytics" && (<>
                  <div className="card-sub">Public IDs injected on the landing + app. Leave blank to disable. Changes apply within ~1 min.</div>
                  {[
                    ["Google Analytics 4 ID","ga4","G-XXXXXXXXXX",analytics,setAnalytics],
                    ["Plausible domain","plausible","yourdomain.com",analytics,setAnalytics],
                    ["Termly website UUID","termlyUuid","xxxxxxxx-xxxx-xxxx-…",legal,setLegal],
                    ["Termly Privacy doc ID","termlyPrivacyId","privacy document id",legal,setLegal],
                    ["Termly Terms doc ID","termlyTermsId","terms document id",legal,setLegal],
                  ].map(([label,key,ph,obj,setter]) => (
                    <div key={key}>
                      <label className="acct-label">{label}</label>
                      <input className="field-input" type="text" value={obj[key]} placeholder={ph} onChange={e => setter({ ...obj, [key]: e.target.value })} />
                    </div>
                  ))}
                  <div className="ctrl-line">
                    <div>
                      <div className="cl-label">Cookie consent banner</div>
                      <div className="cl-hint">Needs the Termly UUID</div>
                    </div>
                    <Switch checked={legal.cookieBanner} onChange={() => setLegal({ ...legal, cookieBanner: !legal.cookieBanner })} />
                  </div>
                  <button className="acct-btn accent" onClick={saveConfig}>Save analytics &amp; legal</button>
              </>)}

              {/* ── ANNOUNCEMENT BANNER (ADMIN-5) — a config string → an app banner ── */}
              {settingsView === "announcement" && (<>
                  <div className="card-sub">A short notice shown at the top of the app for signed-in users. They can dismiss it; it reappears only if you change the wording. Off (or empty) shows nothing. Applies within ~1&nbsp;min.</div>
                  {announcement.text.trim() && (
                    <div className={"adm-ann-preview lvl-" + announcement.level}>
                      <span className="adm-ann-txt">{announcement.text}</span>
                      <span className="adm-ann-tag">{announcement.active ? "PREVIEW · live" : "PREVIEW · off"}</span>
                    </div>
                  )}
                  <label className="acct-label">Message</label>
                  <textarea className="field-input" rows={3} maxLength={300} value={announcement.text}
                    placeholder="e.g. Scheduled maintenance Sunday 02:00–03:00 UTC — the app may be briefly unavailable."
                    onChange={e => setAnnouncement({ ...announcement, text: e.target.value })} />
                  <div className="adm-hint" style={{ textAlign:"right", marginTop:2 }}>{announcement.text.length}/300</div>
                  <label className="acct-label">Level</label>
                  <div className="adm-seg" style={{ marginBottom:14 }}>
                    {[["info","Info"],["warning","Warning"],["critical","Critical"]].map(([v,l]) => (
                      <button key={v} type="button" className={"opt" + (announcement.level===v ? " on" : "")}
                        onClick={() => setAnnouncement({ ...announcement, level: v })}>{l}</button>
                    ))}
                  </div>
                  <div className="ctrl-line">
                    <div>
                      <div className="cl-label">Show the banner</div>
                      <div className="cl-hint">{announcement.text.trim() ? "Live for all signed-in users." : "Add a message first — an empty banner can’t be turned on."}</div>
                    </div>
                    {/* Guard the toggle: with no text there is nothing to show, and the
                        server forces active:false anyway (announcement.js) — mirror it here
                        so the switch can never look "on" over an empty message. */}
                    <Switch checked={announcement.active} onChange={() => { if (!announcement.text.trim()) return; setAnnouncement({ ...announcement, active: !announcement.active }); }} />
                  </div>
                  <button className="acct-btn accent" onClick={saveConfig}>Save announcement</button>
                  <div className="set-foot">The message is <b>public</b> once active. Turning it off (or clearing the text) removes it for everyone.</div>
              </>)}

              {/* ── SETTINGS PASSWORD (ADMIN-6, owner-only) — the SECOND lock on this
                   screen. Set it once, then unlock Settings with it (a live unlock lasts
                   ~10 min). Changing it needs the current password; setting the first one
                   needs a fresh login re-auth (the unlock modal handles that prompt). The
                   password is scrypt-hashed server-side and never leaves the server. ── */}
              {settingsView === "password" && (<>
                  <div className="card-sub">
                    A second password that guards this Settings screen — so even a stolen admin login can’t read or change your API keys without it. {settingsPwSet
                      ? <>It’s <b>set</b>{settingsPwAt ? <> · last changed {new Date(settingsPwAt).toLocaleDateString()}</> : null}.</>
                      : <>Not set yet — the screen falls back to a login re-auth until you set one.</>}
                  </div>
                  <form onSubmit={async e => { e.preventDefault(); const ok = await saveSettingsPassword(spwForm); if (ok) setSpwForm({ current: "", next: "", confirm: "" }); }}>
                    {settingsPwSet && (<>
                      <label className="acct-label">Current Settings password</label>
                      <input type="password" className="field-input" autoComplete="current-password" aria-label="Current Settings password" value={spwForm.current}
                        onChange={e => setSpwForm({ ...spwForm, current: e.target.value })} />
                    </>)}
                    <label className="acct-label">{settingsPwSet ? "New Settings password" : "Settings password"}</label>
                    <input type="password" className="field-input" autoComplete="new-password" aria-label={settingsPwSet ? "New Settings password" : "Settings password"} value={spwForm.next}
                      onChange={e => setSpwForm({ ...spwForm, next: e.target.value })} />
                    <label className="acct-label">Confirm new password</label>
                    <input type="password" className="field-input" autoComplete="new-password" aria-label="Confirm new password" value={spwForm.confirm}
                      onChange={e => setSpwForm({ ...spwForm, confirm: e.target.value })} />
                    <div className="adm-hint" style={{ marginTop: 4 }}>At least 12 characters, with an uppercase letter, a lowercase letter, and a number.</div>
                    {settingsPwMsg && <div className="adm-hint" style={{ marginTop: 8 }}>{settingsPwMsg}</div>}
                    <button type="submit" className="acct-btn accent" disabled={busy} style={{ marginTop: 12 }}>
                      {busy ? "Saving…" : (settingsPwSet ? "Change password" : "Set password")}
                    </button>
                  </form>
                  {/* ADMIN-6 PR2: forgot it? Email the owner a single-use reset link (to their
                      own account email). Only shown once a password is set — there's nothing to
                      reset until then, and the first set is a login re-auth. */}
                  {settingsPwSet && (
                    <button type="button" className="acct-btn" disabled={busy} onClick={requestSettingsResetLink} style={{ marginTop: 10 }}>
                      Email me a reset link
                    </button>
                  )}
                  <div className="set-foot">Forgot it? Use “Email me a reset link” above to get a single-use link at your admin email. Locked out of email too? An owner can clear this password with the <code>clear-settings-password</code> service-account script, reverting Settings to a login re-auth.</div>
              </>)}

              {/* ── ADMIN ACCESS (ADMIN-D3, owner-only) — folded in from the old top-level
                   tab. The grant flow (search → type email twice → warning → confirm) and
                   every handler are unchanged; only the styling moved to the paper card.
                   The server still enforces owner + fresh auth_time on setManagerRole, and
                   Settings itself is owner-gated, so this stays owner-only. ── */}
              {settingsView === "access" && (<>
                {/* ADMIN-0: admin 2FA. It lives HERE, not with the App Controls
                    kill-switches, because those are "turn something off in an
                    incident" and this is the opposite — turning it on is what's
                    dangerous. Off is one tap; on is armed first. */}
                <div className="adm-scr-section">
                  <CtrlRow icon={SI.access} label="Require two-factor sign-in"
                           sub="Applies to every admin callable, not just this screen — a stolen admin password alone stops being enough.">
                    <Switch checked={controls.requireAdminMfa === true}
                            onChange={() => {
                              if (controls.requireAdminMfa === true) {
                                setMfaWarn(false);
                                saveControls({ ...controls, requireAdminMfa: false });
                              } else setMfaWarn(true);
                            }} />
                  </CtrlRow>
                  {!controls.requireAdminMfa && !mfaWarn && (
                    <div className="cl-hint" style={{ marginTop:10 }}>
                      Needs <b>Identity Platform MFA</b> enabled on the Firebase project and at least one
                      enrolled admin. Until then nothing can satisfy this gate — leave it off.
                    </div>
                  )}
                  {mfaWarn && (
                    <div style={{ border:"1px solid var(--sr)", background:"var(--sr-s)", borderRadius:12, padding:14, marginTop:12 }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"var(--sr)", marginBottom:6 }}>⚠ This can lock you out</div>
                      <div style={{ fontSize:12, color:"var(--ink-soft)", lineHeight:1.55, marginBottom:12 }}>
                        Every admin callable will refuse any admin who did <b>not</b> sign in with a second
                        factor — including this Settings screen, which is the only place to switch it back off.
                        If nobody is enrolled yet, the panel becomes unreachable and the <b>only</b> way back is
                        editing <code>config/app → flags.requireAdminMfa</code> in the Firebase console.
                        Enrol first, then turn this on.
                      </div>
                      <div className="adm-actions">
                        <button className="acct-btn ghost" style={{ flex:1, marginTop:0 }} disabled={busy} onClick={() => setMfaWarn(false)}>Cancel</button>
                        <button className="acct-btn accent" style={{ flex:1, marginTop:0 }} disabled={busy}
                                onClick={() => { setMfaWarn(false); saveControls({ ...controls, requireAdminMfa: true }); }}>I'm enrolled — require 2FA</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ADMIN-SEP (CRYP-103) Part B: the admin roster — read-only, so an owner
                    can SEE who the admins are (owners + managers, keyed off the {admin:true}
                    claim). No per-row actions; grant/revoke stays the email-lookup flow below. */}
                <div className="adm-scr-section">
                  <div className="adm-label">ADMINS</div>
                  <div className="card-sub" style={{ marginBottom:14 }}>
                    Everyone with admin access. Read-only — use the search below to grant or remove a manager; owners can only be changed with <code>set-admin.js</code>.
                  </div>
                  {adminsMsg ? (
                    <div className="adm-inline-err">{adminsMsg}</div>
                  ) : adminsLoading && admins.length === 0 ? (
                    <div className="adm-loading">Loading roster…</div>
                  ) : admins.length === 0 ? (
                    <div className="adm-empty">No admins found.</div>
                  ) : (
                    <div className="adm-list">
                      {admins.map(a => (
                        <div key={a.uid} className="adm-row static">
                          <div className="who"><div className="nm">{a.email}</div></div>
                          {a.disabled && <span className="adm-pill susp">SUSPENDED</span>}
                          {a.role === "owner" && <span className="adm-pill owner">OWNER</span>}
                          {a.role === "manager" && <span className="adm-pill mgr">MANAGER</span>}
                          {!a.role && <span className="adm-pill norole">NO ROLE</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="adm-scr-section">
                  <div className="card-sub" style={{ marginBottom:14 }}>
                    Grant or remove <b>manager</b> access. Managers can manage accounts (tier, suspend, sign-out, custom limits, trash) but never see Settings or permanent deletion. <b>Owners</b> can only be created by running <code>functions/scripts/set-admin.js --role=owner</code> with a service-account key — never from here, which is what makes owner accounts impossible to remove from inside the panel.
                  </div>
                  <label className="acct-label">Find the account</label>
                  <div style={{ display:"flex", gap:8 }}>
                    <input className="field-input" value={grantEmail} onChange={e => { setGrantEmail(e.target.value); setGrantWarn(false); }}
                      onKeyDown={e => e.key === "Enter" && grantLookup()} placeholder="email@example.com" style={{ flex:1 }} />
                    <button className="acct-btn accent" style={{ width:"auto", marginTop:0, padding:"0 18px" }} disabled={busy} onClick={grantLookup}>Search</button>
                  </div>
                  <div className="cl-hint" style={{ marginTop:6 }}>Search by the exact email so you can confirm you have the right person before granting anything.</div>

                  {grantFound && (
                    <div style={{ marginTop:16, paddingTop:16, borderTop:"1px solid var(--line-2)" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
                        <div style={{ fontSize:15, fontWeight:600 }}>{grantFound.name || grantFound.email}</div>
                        {grantFound.role === "owner" && <span className="adm-pill owner">OWNER</span>}
                        {grantFound.role === "manager" && <span className="adm-pill mgr">MANAGER</span>}
                        {grantFound.isAdmin && !grantFound.role && <span className="adm-pill norole">NO ROLE</span>}
                      </div>
                      <div style={{ fontSize:12, color:"var(--ink-faint)", marginBottom:14 }}>{grantFound.email}</div>

                      {grantFound.role === "owner" ? (
                        <div style={{ fontSize:12, color:"var(--ink-soft)", background:"var(--paper-3)", padding:12, borderRadius:12 }}>
                          🔒 Owner accounts are protected — they can't be changed from the panel, by anyone. Use <code>set-admin.js</code>.
                        </div>
                      ) : grantFound.role === "manager" ? (
                        <button className="acct-btn" style={{ background:"var(--sr-s)", color:"var(--sr)", border:"1px solid color-mix(in srgb, var(--sr) 35%, transparent)" }} disabled={busy} onClick={() => setManager(false)}>Remove manager access</button>
                      ) : !grantWarn ? (
                        <>
                          <label className="acct-label">Re-type {grantFound.email} to confirm</label>
                          <input className="field-input" value={grantEmail2} onChange={e => setGrantEmail2(e.target.value)} placeholder={grantFound.email} />
                          <button className="acct-btn accent" disabled={busy || grantEmail2.trim().toLowerCase() !== (grantFound.email || "").toLowerCase()} onClick={() => setGrantWarn(true)}>Continue</button>
                        </>
                      ) : (
                        <div style={{ border:"1px solid var(--amber)", background:"color-mix(in srgb, var(--amber) 8%, transparent)", borderRadius:12, padding:14 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:"var(--amber)", marginBottom:6 }}>⚠ Grant manager access?</div>
                          <div style={{ fontSize:12, color:"var(--ink-soft)", lineHeight:1.55, marginBottom:12 }}>
                            <b>{grantFound.email}</b> will be able to see every account and change tiers, suspend, force sign-out, set custom limits and move accounts to the trash. They will <b>not</b> get Settings, admin access, or permanent deletion. You can remove this at any time.
                          </div>
                          <div className="adm-actions">
                            <button className="acct-btn ghost" style={{ flex:1, marginTop:0 }} disabled={busy} onClick={() => setGrantWarn(false)}>Cancel</button>
                            <button className="acct-btn accent" style={{ flex:1, marginTop:0 }} disabled={busy} onClick={() => setManager(true)}>Confirm — grant manager</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {grantMsg && <div className="priv-msg" style={{ color: grantMsg.includes("✓") ? "var(--sg)" : "var(--sr)" }}>{grantMsg}</div>}
                </div>

                {typeof s.activeOwners === "number" && s.activeOwners < 2 && (
                  <div style={{ border:"1px solid var(--sr)", background:"var(--sr-s)", borderRadius:12, padding:12, fontSize:12, color:"var(--sr)", lineHeight:1.55 }}>
                    ⚠ Only <b>{s.activeOwners}</b> active owner account. Owners can't be created from the panel, so if this one becomes inaccessible there is no in-app way back. Promote a second owner with <code>set-admin.js --role=owner</code> now.
                  </div>
                )}
              </>)}

            </DScreen>
            )}
          </div>
          );
        })()}

        {/* ═══ AUDIT LOG ═══
            ADMIN-3: search + action filter + 50/page pager + CSV export, all client-side
            over the fetched slice (the Users-tab pattern) — no composite indexes, no
            cursor API. "Load more" deepens the fetch toward listAudit's 500 clamp. */}
        {tab === "audit" && (() => {
          const list = audit || [];
          const needle = auditQ.trim().toLowerCase();
          const searched = needle
            ? list.filter(e => [e.actorEmail, e.targetEmail, e.targetUid, e.details, e.ip, ACTION_LABELS[e.action] || e.action]
                .some(v => String(v || "").toLowerCase().includes(needle)))
            : list;
          const filtered = auditAction === "all" ? searched : searched.filter(e => e.action === auditAction);
          const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
          const pg = Math.min(auditPage, pages);
          const rows = filtered.slice((pg-1)*PAGE_SIZE, pg*PAGE_SIZE);
          // Only offer filters for actions the loaded log actually contains — a dropdown
          // of 17 mostly-absent codes is noise, and picking one would show nothing. Keep
          // the CURRENT selection in the list even if a reload dropped it, or the <select>
          // would render blank while still filtering everything out.
          const present = new Set(list.map(e => e.action).filter(Boolean));
          if (auditAction !== "all") present.add(auditAction);
          const actions = Array.from(present)
            .sort((a, b) => (ACTION_LABELS[a] || a).localeCompare(ACTION_LABELS[b] || b));
          // At the server's clamp there may STILL be older entries, and nothing more to
          // load. Say so — a silent cap reads as "this is the whole log" when it isn't.
          const atServerCap = list.length >= AUDIT_MAX_LIMIT;
          // The fetch came back full, so there may be older entries the server didn't send.
          // `!atServerCap` is belt-and-braces: never offer to load deeper than the server
          // will ever return, whatever limit the last fetch happened to ask for.
          const canLoadMore = list.length >= auditLimit && auditLimit < AUDIT_MAX_LIMIT && !atServerCap;
          return (<>
            <div style={{ fontSize:11.5, color:"var(--ink-faint)", lineHeight:1.5, margin:"2px 2px 12px" }}>
              Admin actions and sensitive account events — tier changes, suspensions, deletes, admin grants and settings saves, plus each user's own delete / export / billing events. Entries are kept for <b>365 days</b>, then purged automatically.
            </div>
            <div className="adm-toolbar">
              <input className="field-input" value={auditQ} onChange={e => { setAuditQ(e.target.value); setAuditPage(1); }} placeholder="Search actor, target, details or IP…" />
              <select className="field-input adm-select" value={auditAction} onChange={e => { setAuditAction(e.target.value); setAuditPage(1); }} aria-label="Filter by action">
                <option value="all">All actions</option>
                {actions.map(a => <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>)}
              </select>
              <button className="adm-btn" onClick={() => loadAudit()} disabled={auditLoading}>{auditLoading ? "…" : "Refresh"}</button>
            </div>
            {auditMsg && <div className="adm-inline-err">{auditMsg}</div>}
            {auditLoading && !audit ? <div className="adm-loading">Loading…</div> : audit && (<>
              <div className="adm-count-row">
                <span className="adm-count">{filtered.length.toLocaleString()} entr{filtered.length===1?"y":"ies"}{filtered.length !== list.length ? ` of ${list.length.toLocaleString()} loaded` : ""}</span>
                <button className="adm-btn sm" disabled={filtered.length === 0}
                  onClick={() => saveCsv(`crypto-idea-audit-${stamp()}.csv`, buildAuditCsv(filtered))}>Export CSV</button>
              </div>
              {list.length === 0
                /* Only claim the log is empty when the load SUCCEEDED. On a failure the
                   error above already explains it; "No admin actions logged yet" next to
                   it would read as reassurance that nothing happened. */
                ? (auditMsg ? null : <div className="adm-list"><div className="adm-empty">No admin actions logged yet.</div></div>)
                : (<>
                  <div className="adm-list">
                    {rows.length === 0 && <div className="adm-empty">No entries match this filter.</div>}
                    {rows.map((e) => (
                      <div key={e.id} className="adm-aud">
                        <div style={{ flex:1, minWidth:0 }}>
                          <div className="act">{ACTION_LABELS[e.action] || e.action}</div>
                          <div className="meta">by {e.actorEmail || "—"}{(e.targetEmail || e.targetUid) ? " → " + (e.targetEmail || e.targetUid) : ""}{e.details ? " · " + e.details : ""}{e.ip ? " · from " + e.ip : ""}</div>
                        </div>
                        <div className="when">{e.atMs ? new Date(e.atMs).toLocaleString() : ""}</div>
                      </div>
                    ))}
                  </div>
                  {pages > 1 && (
                    /* Step from the CLAMPED page, not the raw state: after a reload
                       returns fewer entries, a stale high index would leave Prev enabled
                       but dead (12 → 11 is still past the last page). */
                    <div className="adm-pager">
                      <button className="adm-btn sm" onClick={() => setAuditPage(Math.max(1, pg-1))} disabled={pg<=1}>← Prev</button>
                      <span className="pg">Page {pg} of {pages}</span>
                      <button className="adm-btn sm" onClick={() => setAuditPage(Math.min(pages, pg+1))} disabled={pg>=pages}>Next →</button>
                    </div>
                  )}
                  {canLoadMore && (
                    <div className="adm-pager">
                      <button className="adm-btn sm" onClick={() => loadAudit(AUDIT_MAX_LIMIT)} disabled={auditLoading}>{auditLoading ? "Loading…" : `Load more (up to ${AUDIT_MAX_LIMIT})`}</button>
                    </div>
                  )}
                  <div className="adm-hint" style={{ marginTop:10 }}>
                    {atServerCap && <><b>Showing the most recent {AUDIT_MAX_LIMIT}</b> entries — that is the maximum this view can load, so older entries may exist in the log that are not shown here or included in the export.<br /></>}
                    The export contains what's shown above, including email addresses and source IPs. A downloaded copy leaves the app's 365-day retention and erasure controls — store it accordingly.
                  </div>
                </>)}
            </>)}
          </>);
        })()}

        <div className="adm-foot">
          CryptoIdea Admin · v4.3.0
          {roleLoaded && role && <> · signed in as <b>{role}</b>{isOwner && unlocked ? " · unlocked" : ""}</>}
        </div>
      </div>

      {/* ADMIN-SEC / ADMIN-6 step-up prompt. Raised only when the SERVER refuses a
          sensitive call — never on a client timer alone. The `mode` says WHICH factor
          the server asked for: "settings" = the Settings password (ADMIN-6), "login" =
          the account password (the bootstrap re-auth before a Settings password is set).
          That ordering is what makes tampering with the timer pointless. */}
      {unlockPrompt && (() => {
        const settingsMode = unlockPrompt.mode === "settings";
        return (
        <div className="adm-scrim">
          <form className="adm-modal" onSubmit={e => { e.preventDefault(); submitUnlock(); }}>
            <div className="adm-modal-head">
              <div className="mh">{settingsMode ? "Enter your Settings password" : "Confirm your password"}</div>
              <button type="button" className="adm-modal-x" aria-label="Close" onClick={cancelUnlock}>×</button>
            </div>
            <div className="mp">{settingsMode
              ? "This Settings screen is protected by your Settings password. Entering it unlocks Settings for about 10 minutes."
              : "Settings, API keys, plans and admin access need a recent password confirmation. This keeps them unlocked for about 10 minutes."}</div>
            <input className="field-input" type="password" value={unlockPass} onChange={e => setUnlockPass(e.target.value)} autoFocus
              placeholder={settingsMode ? "Settings password" : "Owner password"} autoComplete="current-password" style={unlockErr ? { borderColor:"var(--sr)" } : undefined} />
            {unlockErr && <div style={{ fontSize:11, color:"var(--sr)", marginTop:6 }}>{unlockErr}</div>}
            <div className="adm-actions" style={{ marginTop:14 }}>
              <button type="button" className="adm-btn" onClick={cancelUnlock}>Cancel</button>
              <button type="submit" className="adm-btn" style={{ background:"var(--ink)", borderColor:"var(--ink)", color:"var(--paper)" }} disabled={busy || !unlockPass}>{busy ? "Checking…" : "Unlock"}</button>
            </div>
          </form>
        </div>
        );
      })()}

      {/* ADMIN-5: read-only "view as" viewer. A support snapshot the server assembled —
          the panel never authenticated as the user, and NOTHING here can mutate data.
          The prominent READ-ONLY banner + the audit-trail note keep it honest. */}
      {viewAs && (
        <div className="adm-scrim" onClick={closeViewAs}>
          <div className="adm-viewas-modal" onClick={e => e.stopPropagation()}>
            {/* ADMIN-UI-1: the back/close ‹ sits on the LEFT, matching the drill-in pattern. */}
            <div className="adm-viewas-bar">
              <button className="icon-btn" aria-label="Close read-only view" onClick={closeViewAs}>{SI.back}</button>
              <span className="adm-viewas-flag">READ-ONLY</span>
              <span className="adm-viewas-who">Viewing {viewAs.name || viewAs.email}</span>
            </div>
            <div className="adm-viewas-body">
              <div className="adm-viewas-note">A read-only copy of this user's data — you can look, not change. This view was recorded in the audit log with your reason.</div>
              <div className="adm-vsec">
                <div className="adm-vrow"><span className="k">Email</span><span className="v">{viewAs.email}</span></div>
                <div className="adm-vrow"><span className="k">Tier</span><span className="v"><TierPill tier={viewAs.tier} /></span></div>
                {viewAs.disabled && <div className="adm-vrow"><span className="k">Account</span><span className="v">Suspended</span></div>}
                {viewAs.deleted && <div className="adm-vrow"><span className="k">Account</span><span className="v">In trash</span></div>}
                {viewAs.billingStatus && viewAs.billingStatus !== "none" && <div className="adm-vrow"><span className="k">Billing</span><span className="v"><BillPill status={viewAs.billingStatus} /></span></div>}
                {viewAs.learn && <div className="adm-vrow"><span className="k">Learn</span><span className="v">{viewAs.learn.xp} XP · {viewAs.learn.completedLessons} lesson{viewAs.learn.completedLessons===1?"":"s"} · {viewAs.learn.streak}-day streak</span></div>}
              </div>
              {viewAs.portfolios.length === 0 && <div className="adm-empty">No portfolios.</div>}
              {viewAs.portfolios.map(p => (
                <div key={p.id} className="adm-vport">
                  <div className="adm-vport-head">{p.name || "Untitled portfolio"} <span className="ct">{p.coinCount} coin{p.coinCount===1?"":"s"}</span></div>
                  {p.coins.length === 0 && <div className="adm-hint">No coins.</div>}
                  {p.coins.map(c => (
                    <div key={c.id} className="adm-vcoin">
                      <div className="adm-vcoin-head"><b>{c.symbol ? c.symbol.toUpperCase() : (c.name || "—")}</b> <span className="nm">{c.name}</span> <span className="tx">{c.txCount} tx</span></div>
                      {c.journal && c.journal.thesis && (
                        <div className="adm-vthesis">
                          <div className="lbl">Thesis</div>
                          <div className="txt">{c.journal.thesis}</div>
                          {c.journal.changeMyMind && (<><div className="lbl">What would change my mind</div><div className="txt">{c.journal.changeMyMind}</div></>)}
                          {c.journal.status && <div className="adm-hint" style={{ marginTop:4 }}>Status: {c.journal.status}</div>}
                        </div>
                      )}
                      {c.transactions && c.transactions.length > 0 && (
                        <div className="adm-vtx">
                          {c.transactions.map((t, i) => (
                            <div key={i} className="adm-vtx-row"><span className={"ty " + (t.type === "sell" ? "sell" : "buy")}>{t.type}</span><span className="am">{t.amount} @ ${t.priceAtBuy}</span><span className="dt">{t.date}</span></div>
                          ))}
                          {c.txTruncated && <div className="adm-hint">Showing the first {c.transactions.length} transactions.</div>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
              {viewAs.truncated && (viewAs.truncated.portfolios || viewAs.truncated.coins) && (
                <div className="adm-hint" style={{ marginTop:10 }}>Partial view — this user has more {viewAs.truncated.portfolios ? "portfolios" : "coins"} than shown here.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADMIN-D2 shared toast — one place for every mutating action's result. */}
      {toast && <div className={"adm-toast " + toast.kind} role="status" onClick={() => setToast(null)}>{toast.text}</div>}
    </div>
  );
}
