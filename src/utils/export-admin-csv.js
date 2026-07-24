// ADMIN-3 — CSV builders for the admin panel's two exports.
//
//   buildAuditCsv  — the audit log, for keeping an off-platform copy of admin activity
//                    (the server sweep erases entries after 365 days) or handing a
//                    slice to an auditor.
//   buildUsersCsv  — the Users tab, for the reconciliation/analysis a table can't do.
//
// Both take the rows the panel is ALREADY showing, so an export always matches the
// filtered view on screen rather than silently dumping something else. Pure +
// unit-tested; the download plumbing lives in the component.
//
// PRIVACY: both files contain personal data (emails, and for the audit log source
// IPs). They are generated client-side from data the admin can already see — no new
// server surface — but once downloaded they leave the platform's retention and
// erasure controls, so the UI labels them as such.
import { row } from "./csv.js";

// ISO-8601 sorts correctly in a spreadsheet and is unambiguous across locales,
// unlike toLocaleString(). Blank for a missing/invalid timestamp — never "Invalid Date".
function iso(ms) {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return "";
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

const AUDIT_HEADERS = ["When (UTC)", "Action", "Actor", "Target", "Details", "Source IP"];

// `entries` = the listAudit rows as rendered (newest first).
export function buildAuditCsv(entries) {
  const list = entries || [];
  const out = [row(AUDIT_HEADERS)];
  for (const e of list) {
    out.push(row([
      iso(e.atMs),
      e.action || "",
      e.actorEmail || "",
      e.targetEmail || e.targetUid || "",
      e.details || "",
      e.ip || "",
    ]));
  }
  return out.join("\n");
}

const USER_HEADERS = ["Email", "Name", "Tier", "Billing status", "Role", "Status", "Portfolios", "Joined (UTC)", "UID"];

// `users` = the listUsers rows as rendered. Operational fields only — the admin API
// never returns holdings, and this must not become the place that leaks them.
export function buildUsersCsv(users) {
  const list = users || [];
  const out = [row(USER_HEADERS)];
  for (const u of list) {
    out.push(row([
      u.email || "",
      u.name || "",
      u.tier || "free",
      u.billingStatus || "none",
      u.role || (u.isAdmin ? "admin" : ""),
      u.disabled ? "suspended" : "active",
      u.portfolioCount || 0,
      iso(u.joinedMs),
      u.uid || "",
    ]));
  }
  return out.join("\n");
}
