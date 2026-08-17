/**
 * ADMIN-6 PR2 — the outbound-email seam (pure CommonJS + LAZY nodemailer).
 *
 * `smtpConfigOf` extracts the SMTP settings from config/app.email, returning
 * null when any required field (host/user/pass/from) is missing or blank. `sendMail` is
 * a thin seam with three paths: under the functions emulator it LOGS the full message
 * (the reset link included) so a developer can complete the flow locally; in a deployed
 * env with SMTP configured it lazy-requires nodemailer and sends; in a deployed env with
 * NO SMTP configured it logs only a REDACTED marker (never the link/token — SEC-review #1)
 * and reports {notConfigured:true}. The dev/unconfigured paths never load nodemailer, so
 * this module carries no hard dependency on it and its unit test needs it neither installed
 * nor mocked.
 *
 * The SMTP password lives in the locked config/app doc (keep()-guarded in saveConfig,
 * returned to the client only as a boolean set-flag) — it is never logged here. And the
 * reset TOKEN (in the link) is only ever logged under the emulator, never in production.
 */

// Pull the SMTP transport config out of config/app.email. All four of host/user/pass/from
// are required (a partial config can't send), so any blank ⇒ null and the caller falls back
// to the log seam. Null-safe on a missing cfg / email block.
function smtpConfigOf(cfg) {
  const em = (cfg && cfg.email) || null;
  if (!em) return null;
  const host = String(em.smtpHost || "");
  const user = String(em.smtpUser || "");
  const pass = String(em.smtpPass || "");
  const from = String(em.fromEmail || "");
  if (!host || !user || !pass || !from) return null;
  const port = Number(em.smtpPort) || 587;
  // TLS on 465 (implicit) is a common SMTP setup; STARTTLS on 587 is `secure:false`.
  const secure = em.smtpSecure === true || port === 465;
  return { host, port, secure, user, pass, from };
}

// Send (or, in dev / when unconfigured, LOG) a message. The log path prints the link so a
// developer can complete the flow without a live SMTP server, and returns {logged:true};
// the real path lazy-requires nodemailer and returns {sent:true}.
async function sendMail({ to, subject, text, html }, cfg) {
  const smtp = smtpConfigOf(cfg);
  if (process.env.FUNCTIONS_EMULATOR === "true") {
    // Emulator/dev ONLY: log the full message (with the link) so the flow is completable
    // locally without a live SMTP server. Never require nodemailer here.
    console.log("[sendMail] to:", to, "| subject:", subject, "| text:", text);
    return { logged: true };
  }
  if (!smtp) {
    // Deployed but SMTP not configured. SEC-review #1: do NOT log the body — it may carry
    // a single-use reset TOKEN. Log a redacted marker so the misconfiguration is visible
    // without leaking the secret, and tell the caller nothing was sent.
    console.warn(`[sendMail] no SMTP configured — message to ${to} ("${subject}") NOT sent. Configure SMTP in admin Settings → Email.`);
    return { logged: true, notConfigured: true };
  }
  // Lazy require — only the real send path pays for (and depends on) nodemailer.
  const nodemailer = require("nodemailer");
  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  });
  await transport.sendMail({ from: smtp.from, to, subject, text, html });
  return { sent: true };
}

module.exports = { smtpConfigOf, sendMail };
