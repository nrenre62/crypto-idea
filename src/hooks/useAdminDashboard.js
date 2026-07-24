import { useState, useEffect } from "react";
import { getStats, listUsers, listAudit, listWebhookEvents, listDailyStats, captureStatsSnapshot, getSystemStatus, lookupUser, setUserTier, setPremiumLimits, suspendUser, deleteUser, restoreUser, getAdminConfig, saveConfig as saveConfigFn, setManagerRole, adminTrashUser, adminSignOutUser } from "../api/admin.js";
import { getAdminRole, reauthAdmin } from "../api/admin-auth.js";

// ADMIN-SEC: how long one password confirmation keeps the sensitive areas unlocked.
// UX only — the server independently rejects a stale auth_time on every call.
const UNLOCK_MS = 10 * 60 * 1000;
// Returned by withUnlock when the owner dismisses the password prompt, so callers
// can tell "cancelled" apart from "succeeded".
const CANCELLED = Symbol("unlock-cancelled");

// ADMIN-3: how deep the audit fetch goes. The first load asks for AUDIT_PAGE_LIMIT;
// "Load more" re-fetches at AUDIT_MAX_LIMIT, which mirrors listAudit's server-side
// clamp — going past it needs a cursor API, so the UI stops offering it instead of
// pretending there is more to load.
const AUDIT_PAGE_LIMIT = 100;
const AUDIT_MAX_LIMIT = 500;

// ADMIN-4: how many daily snapshots the growth card asks for. 90 covers the 7- and
// 30-day comparisons it draws with plenty of headroom; listDailyStats clamps at 400.
const DAILY_LIMIT = 90;

// Combined real usage shown on the Overview before getStats resolves (no fake data).
const EMPTY_STATS = { totalUsers: 0, freeUsers: 0, proUsers: 0, premiumUsers: 0, totalPortfolios: 0, totalCoins: 0, estimatedRevenue: 0, grossRevenue: 0, paymentFees: 0, netRevenue: 0, proPrice: 9.99, premiumPrice: 49.99 };

// All state, data-loading and admin actions for the dashboard. Extracted verbatim
// from admin-dashboard.jsx so that component is presentation-only (audit rule 1/2).
// The dashboard is self-contained (no shared/injected state), so this is a clean
// 1:1 hook — unlike the portfolio-CRUD case in NEXT-STEPS §1b which needed many
// injected deps.
export function useAdminDashboard() {
  const [stats, setStats] = useState(null);   // real combined usage from getStats (admin-only)
  const [statsErr, setStatsErr] = useState("");
  const [tab, setTab] = useState("overview");

  /* ADMIN-SEC — role + step-up unlock.
   * `role` is "owner" | "manager" | "" (a legacy role-less admin). It drives what the
   * UI RENDERS only; every sensitive callable re-checks it server-side, so hiding a
   * control is a convenience, never the security boundary.
   * `unlockedUntil` is the ~10-minute client-side unlock. Also pure UX: the real gate
   * is the auth_time inside the ID token, which the server checks on every call. */
  const [role, setRole] = useState("");
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [unlockedUntil, setUnlockedUntil] = useState(0);
  const [unlockNow, setUnlockNow] = useState(Date.now());
  const [unlockPrompt, setUnlockPrompt] = useState(null);  // { onDone } while asking for the password
  const [unlockPass, setUnlockPass] = useState("");
  const [unlockErr, setUnlockErr] = useState("");
  // Admin access tab (owner-only): grant/revoke a manager.
  const [grantEmail, setGrantEmail] = useState("");
  const [grantEmail2, setGrantEmail2] = useState("");
  const [grantFound, setGrantFound] = useState(null);
  const [grantMsg, setGrantMsg] = useState("");
  const [grantWarn, setGrantWarn] = useState(false);

  /* ADMIN-SEC — step-up unlock.
   * The client timer is a convenience so an owner isn't re-prompted for every field in
   * a Settings session. The ACTUAL control is server-side: sensitive callables reject a
   * token whose auth_time is stale. So this never assumes it's unlocked — it runs the
   * action, and if the server says reauth-required it prompts and retries once. That
   * ordering means a tampered timer gains nothing, and a clock drift can't lock you out.
   */
  const unlocked = unlockedUntil > unlockNow;
  // Re-render as the window expires so the padlock state is honest.
  useEffect(() => {
    if (!unlockedUntil) return;
    const t = setInterval(() => setUnlockNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, [unlockedUntil]);

  const askPassword = () => new Promise((resolve) => {
    setUnlockErr(""); setUnlockPass("");
    setUnlockPrompt({ onDone: resolve });
  });

  const submitUnlock = async () => {
    setBusy(true); setUnlockErr("");
    const res = await reauthAdmin(unlockPass);
    setBusy(false);
    if (!res.success) { setUnlockErr(res.error || "Incorrect password"); return; }
    setUnlockedUntil(Date.now() + UNLOCK_MS); setUnlockNow(Date.now());
    setUnlockPass("");
    const done = unlockPrompt && unlockPrompt.onDone;
    setUnlockPrompt(null);
    if (done) done(true);
  };

  const cancelUnlock = () => {
    const done = unlockPrompt && unlockPrompt.onDone;
    setUnlockPass(""); setUnlockErr(""); setUnlockPrompt(null);
    if (done) done(false);
  };

  const isReauthError = (e) => {
    const msg = (e && e.message) || "";
    return msg.includes("reauth-required");
  };

  // Run `fn`; if the server demands a fresh password, prompt and retry exactly once.
  // Returns CANCELLED if the owner dismissed the prompt, so callers don't report
  // success for something that never ran. `fn` must NOT swallow its own errors.
  const withUnlock = async (fn) => {
    try { return await fn(); }
    catch (e) {
      if (!isReauthError(e)) throw e;
      const ok = await askPassword();
      if (!ok) return CANCELLED;
      return await fn();
    }
  };


  // Settings forms (saved via the admin-only saveConfig Cloud Function).
  const [keys, setKeys] = useState({ coingecko: "", paypalClientId: "", paypalSecret: "", paypalWebhookId: "", anthropicKey: "", sentryDsn: "" });
  const [mail, setMail] = useState({ provider: "none", apiKey: "", apiUrl: "", fromEmail: "", listId: "" });
  const [savedMsg, setSavedMsg] = useState("");
  // Which secrets are already saved (so the form shows "saved" without exposing them).
  const [setFlags, setSetFlags] = useState({ coingecko: false, paypalSecret: false, apiKey: false, anthropicKey: false, sentryDsn: false });
  const [cfgAt, setCfgAt] = useState(null);
  // Public app controls (maintenance mode, signups on/off) + the ADMIN-2 per-feature
  // kill-switches. `features` lives INSIDE controls because every saveConfig call sends
  // `flags: controls` — keeping them together is what stops a maintenance toggle from
  // posting a flags object with no switches in it. (The server also merges per-key, so
  // both ends have to fail before a switch can silently flip back on.)
  const [controls, setControls] = useState({ maintenance: false, signupsEnabled: true, features: { marketData: true, checkout: true, aiResearch: true } });
  // Analytics + legal IDs (public, non-secret).
  const [analytics, setAnalytics] = useState({ ga4: "", plausible: "" });
  const [legal, setLegal] = useState({ termlyUuid: "", termlyPrivacyId: "", termlyTermsId: "", cookieBanner: false });
  // Editable plan prices + limits (mirrors functions DEFAULT_PLANS / firestore.rules).
  // priceYear = annual price (2 months free); aiMonthlyCents = live-AI $-cost ceiling (¢/mo).
  const DEFAULT_PLANS = {
    free:    { price: 0,     priceYear: 0,      aiMonthlyCents: 0,    portfolios: 1,  coins: 10,   transactions: 50 },
    pro:     { price: 9.99,  priceYear: 99.99,  aiMonthlyCents: 400,  portfolios: 3,  coins: 50,   transactions: 2000 },
    premium: { price: 49.99, priceYear: 499.99, aiMonthlyCents: 2500, portfolios: 15, coins: 1000, transactions: 5000 },
  };
  const [plans, setPlans] = useState(DEFAULT_PLANS);

  // Pre-fill the Settings form from the saved config (secrets are never returned —
  // only whether they're set), so you can SEE what's configured and persisted.
  const loadConfig = async () => {
    try {
      const d = await withUnlock(() => getAdminConfig());
      if (!d || d === CANCELLED) return;
      setKeys({ coingecko: "", paypalClientId: d.paypal?.clientId || "", paypalSecret: "", paypalWebhookId: d.paypal?.webhookId || "", anthropicKey: "", sentryDsn: "" });
      setMail({ provider: d.email?.provider || "none", apiKey: "", apiUrl: d.email?.apiUrl || "", fromEmail: d.email?.fromEmail || "", listId: d.email?.listId || "" });
      setSetFlags({ coingecko: !!d.coingeckoSet, paypalSecret: !!(d.paypal && d.paypal.secretSet), apiKey: !!(d.email && d.email.apiKeySet), anthropicKey: !!(d.ai && d.ai.anthropicKeySet), sentryDsn: !!(d.sentry && d.sentry.dsnSet) });
      const ff = (d.flags && d.flags.features) || {};
      setControls({ maintenance: !!(d.flags && d.flags.maintenance), signupsEnabled: !(d.flags && d.flags.signupsEnabled === false),
        // ON unless the server says exactly false — same rule as functions/features.js,
        // so a config that predates the switches doesn't render as "everything off".
        features: { marketData: ff.marketData !== false, checkout: ff.checkout !== false, aiResearch: ff.aiResearch !== false } });
      setAnalytics({ ga4: d.analytics?.ga4 || "", plausible: d.analytics?.plausible || "" });
      setLegal({ termlyUuid: d.legal?.termlyUuid || "", termlyPrivacyId: d.legal?.termlyPrivacyId || "", termlyTermsId: d.legal?.termlyTermsId || "", cookieBanner: !!(d.legal && d.legal.cookieBanner) });
      if (d.plans) setPlans(d.plans);
      setCfgAt(d.updatedAt || null);
    } catch (e) { /* function not deployed yet (dev): leave the form empty */ }
  };
  const saveConfig = async () => {
    setSavedMsg("Saving…");
    try {
      // ADMIN-SEC: owner + fresh password. withUnlock re-prompts and retries once if
      // the ~10-min window lapsed mid-session, so a long Settings edit is never lost.
      const r = await withUnlock(() => saveConfigFn({ keys, email: mail, flags: controls, analytics, legal, plans }));
      if (r === CANCELLED) { setSavedMsg("Cancelled — not saved"); setTimeout(() => setSavedMsg(""), 4000); return; }
      await loadConfig();             // re-read so the saved state is visible immediately
      setSavedMsg("Saved ✓");
    } catch (e) {
      setSavedMsg("Save failed: " + (e && e.message ? e.message : "error") + " (needs the deployed saveConfig function)");
    }
    setTimeout(() => setSavedMsg(""), 4000);
  };
  // Toggles save instantly (pass the next value so we don't save stale state).
  const saveControls = async (next) => {
    setControls(next);
    setSavedMsg("Saving…");
    try {
      const r = await withUnlock(() => saveConfigFn({ keys, email: mail, flags: next }));
      if (r === CANCELLED) { setControls(controls); setSavedMsg("Cancelled — not saved"); setTimeout(() => setSavedMsg(""), 3000); return; }
      setSavedMsg("Saved ✓");
    }
    catch (e) { setSavedMsg("Save failed: " + ((e && e.message) || "error")); await loadConfig(); }
    setTimeout(() => setSavedMsg(""), 3000);
  };

  // Users tab — on-demand lookup of ONE user for support / moderation.
  const [lookupEmail, setLookupEmail] = useState("");
  const [found, setFound] = useState(null);
  const [lookupMsg, setLookupMsg] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmTrash, setConfirmTrash] = useState(false);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  // R31-5: destructive actions are gated behind typing the word DELETE. `delText` is the
  // shared typed word (only one confirm is open at a time); `purgeUid` is the Trash-tab row
  // being permanently deleted.
  const [delText, setDelText] = useState("");
  const [purgeUid, setPurgeUid] = useState(null);
  const [busy, setBusy] = useState(false);
  // Users tab — full list, searched + paginated client-side; rows open the detail panel.
  const [userList, setUserList] = useState(null);
  const [listMsg, setListMsg] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;
  // ADMIN-1: Users-tab billing filter — "all" | "past_due" | "canceled". Filters
  // the loaded list client-side by each user's derived billingStatus.
  const [billingFilter, setBillingFilter] = useState("all");
  // Audit tab.
  const [audit, setAudit] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditMsg, setAuditMsg] = useState("");
  // ADMIN-3: audit search / action filter / pager — all client-side over the loaded
  // page, exactly like the Users tab. `auditLimit` is how many rows the last fetch
  // asked for; "Load more" raises it toward the server's 500 clamp, so a bigger log
  // stays reachable without composite indexes or a cursor API.
  const [auditQ, setAuditQ] = useState("");
  const [auditAction, setAuditAction] = useState("all");
  const [auditPage, setAuditPage] = useState(1);
  const [auditLimit, setAuditLimit] = useState(AUDIT_PAGE_LIMIT);
  // ADMIN-1: Overview billing/webhook-health card — recent processed PayPal events.
  const [webhookEvents, setWebhookEvents] = useState(null);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookMsg, setWebhookMsg] = useState("");
  // ADMIN-4: Overview growth card — the daily snapshot series, oldest-first.
  const [daily, setDaily] = useState(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyMsg, setDailyMsg] = useState("");
  const [capturing, setCapturing] = useState(false);
  // ADMIN-2: Overview status strip — kill-switches, cron heartbeats, cache ages.
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // Load combined usage on mount. ADMIN-SEC: the config is OWNER-only, so it's loaded
  // from the role effect below instead — asking for it as a manager would just produce
  // a permission error on every page load.
  useEffect(() => {
    getStats()
      .then(d => setStats(d))
      .catch(e => setStatsErr((e && e.message) || "Could not load stats"));
  }, []);

  // ADMIN-SEC: resolve our own role once, forcing a token refresh so a just-granted
  // (or just-revoked) role is picked up without making the admin sign out and back in.
  useEffect(() => {
    let alive = true;
    getAdminRole({ force: true }).then((r) => {
      if (!alive) return;
      setRole(r); setRoleLoaded(true);
      // Sign-in itself sets a fresh auth_time, so an owner opening the panel is already
      // inside the step-up window — no password prompt just to view Settings.
      if (r === "owner") { setUnlockedUntil(Date.now() + UNLOCK_MS); loadConfig(); }
    });
    return () => { alive = false; };
  }, []);
  const s = stats || EMPTY_STATS;
  const isOwner = role === "owner";

  const loadUserList = async () => {
    setListLoading(true); setListMsg("");
    try { setUserList(await listUsers()); }
    catch (e) { setListMsg((e && e.message) || "Could not load users"); setUserList([]); }
    setListLoading(false);
  };
  // Load the user list the first time the Users or Trash tab is opened (both read it).
  useEffect(() => { if ((tab === "users" || tab === "trash") && userList === null && !listLoading) loadUserList(); }, [tab]);

  // ADMIN-3: `limit` is explicit so "Load more" can re-fetch a deeper slice. The
  // server clamps it to 500, and AUDIT_MAX_LIMIT mirrors that so the button can
  // disappear once there is nothing deeper to ask for.
  const loadAudit = async (limit = AUDIT_PAGE_LIMIT) => {
    const want = Math.min(Math.max(Number(limit) || AUDIT_PAGE_LIMIT, 1), AUDIT_MAX_LIMIT);
    setAuditLoading(true); setAuditMsg("");
    try { setAudit(await listAudit(want)); setAuditLimit(want); }
    catch (e) { setAuditMsg((e && e.message) || "Could not load the audit log"); setAudit([]); }
    setAuditLoading(false);
  };
  useEffect(() => { if (tab === "audit" && audit === null && !auditLoading) loadAudit(); }, [tab]);

  // ADMIN-1: load the webhook-health ledger the first time the Overview is shown.
  const loadWebhookEvents = async () => {
    setWebhookLoading(true); setWebhookMsg("");
    try { setWebhookEvents(await listWebhookEvents(50)); }
    catch (e) { setWebhookMsg((e && e.message) || "Could not load webhook events"); setWebhookEvents([]); }
    setWebhookLoading(false);
  };
  useEffect(() => { if (tab === "overview" && webhookEvents === null && !webhookLoading) loadWebhookEvents(); }, [tab]);

  // ADMIN-4: load the daily growth series the first time the Overview is shown.
  // On failure the series is set to [] AND dailyMsg is set — the card renders the
  // error and suppresses its "still collecting" hint, so a failed load can never
  // read as "you have no history yet" (the ADMIN-1/ADMIN-3 error-vs-empty rule).
  const loadDaily = async () => {
    setDailyLoading(true); setDailyMsg("");
    try { setDaily(await listDailyStats(DAILY_LIMIT)); }
    catch (e) { setDailyMsg((e && e.message) || "Could not load growth history"); setDaily([]); }
    setDailyLoading(false);
  };
  useEffect(() => { if (tab === "overview" && daily === null && !dailyLoading) loadDaily(); }, [tab]);

  // ADMIN-4 (owners only): capture today's snapshot now, then re-read the series so
  // the card reflects the write. DI-1 verify-then-toast — the caller only reports
  // success after both the write AND the re-read have actually succeeded.
  const captureSnapshot = async () => {
    setCapturing(true);
    try {
      const snap = await captureStatsSnapshot();
      await loadDaily();
      setCapturing(false);
      return { ok: true, msg: `Snapshot captured for ${(snap && snap.date) || "today"}` };
    } catch (e) {
      setCapturing(false);
      return { ok: false, msg: (e && e.message) || "Could not capture a snapshot" };
    }
  };

  // ADMIN-2: load the operational status the first time the Overview is shown. Same
  // error-vs-empty rule as the growth card — on failure statusMsg is set and `status`
  // stays null, so the strip shows the error instead of a reassuring all-green row it
  // has no evidence for. "We couldn't check" must never render as "everything is fine".
  const loadStatus = async () => {
    setStatusLoading(true); setStatusMsg("");
    try { setStatus(await getSystemStatus()); }
    catch (e) { setStatusMsg((e && e.message) || "Could not load system status"); setStatus(null); }
    setStatusLoading(false);
  };
  useEffect(() => { if (tab === "overview" && status === null && !statusLoading && !statusMsg) loadStatus(); }, [tab]);

  // ADMIN-2: flip one kill-switch. Sends the WHOLE controls object (features included)
  // so the save can't drop the other switches, then re-reads the status strip so the
  // Overview reflects what the server actually stored — DI-1 verify-then-toast, and the
  // reason this returns a result instead of optimistically declaring success.
  const saveFeature = async (name, on) => {
    const prev = controls;
    const next = { ...controls, features: { ...controls.features, [name]: on } };
    setControls(next);
    try {
      const r = await withUnlock(() => saveConfigFn({ keys, email: mail, flags: next }));
      if (r === CANCELLED) { setControls(prev); return { ok: false, msg: "Cancelled — not saved" }; }
      await loadStatus();
      return { ok: true, msg: `${name} ${on ? "enabled" : "DISABLED"}` };
    } catch (e) {
      setControls(prev);
      return { ok: false, msg: "Save failed: " + ((e && e.message) || "error") };
    }
  };

  const resetConfirms = () => { setConfirmDelete(false); setConfirmTrash(false); setDelText(""); setPurgeUid(null); };
  const lookup = async () => {
    if (!lookupEmail.trim()) return;
    setBusy(true); setLookupMsg(""); setActionMsg(""); resetConfirms(); setFound(null);
    try { setFound(await lookupUser(lookupEmail.trim())); }
    catch (e) { setLookupMsg((e && e.message) || "Lookup failed"); }
    setBusy(false);
  };
  // Open a row from the list → full detail (incl. coin count) via lookupUser.
  const openUser = async (email) => {
    setBusy(true); setActionMsg(""); resetConfirms(); setFound(null); setLookupMsg("");
    try { setFound(await lookupUser(email)); }
    catch (e) { setLookupMsg((e && e.message) || "Lookup failed"); }
    setBusy(false);
  };
  /* ADMIN-SEC: grant/revoke a MANAGER (owner-only, from the Admin access tab).
   * Deliberately NOT reachable from the Users tab any more — a per-user "Make admin"
   * button is what made the owner-deletion bypass a two-click operation.
   * Flow: search by email → type the email twice → warning → owner password. */
  const grantLookup = async () => {
    const email = grantEmail.trim().toLowerCase();
    if (!email) return;
    setBusy(true); setGrantMsg(""); setGrantFound(null); setGrantWarn(false);
    try { setGrantFound(await lookupUser(email)); }
    catch (e) { setGrantMsg((e && e.message) || "No user with that email."); }
    setBusy(false);
  };

  const setManager = async (grant) => {
    if (!grantFound) return;
    // Belt: the server refuses an owner target regardless, but don't even offer it.
    if (grantFound.role === "owner") { setGrantMsg("Owner accounts are protected — use scripts/set-admin.js."); return; }
    setBusy(true); setGrantMsg("");
    try {
      const r = await withUnlock(() => setManagerRole(grantFound.email, grant));
      if (r === CANCELLED) { setBusy(false); return; }
      setGrantFound({ ...grantFound, isAdmin: grant, role: grant ? "manager" : "" });
      setUserList(l => l && l.map(x => x.uid === grantFound.uid ? { ...x, isAdmin: grant, role: grant ? "manager" : "" } : x));
      setGrantMsg(grant ? "Manager access granted ✓" : "Manager access removed ✓");
      setGrantEmail2(""); setGrantWarn(false);
      loadAudit();
    } catch (e) { setGrantMsg((e && e.message) || "Failed"); }
    setBusy(false);
  };
  // BL-2b (D8): move the open user to the 30-day trash (server refuses admins).
  const trashUser = async () => {
    setBusy(true); setActionMsg("");
    try {
      await adminTrashUser(found.uid);
      setUserList(l => l && l.map(x => x.uid === found.uid ? { ...x, deleted: true, deletedAt: Date.now() } : x));
      setActionMsg("Moved to trash ✓"); setFound(null);
    } catch (e) { setActionMsg((e && e.message) || "Failed"); }
    setConfirmTrash(false); setConfirmDelete(false); setDelText("");   // R31-5: reset the typed-DELETE flow
    setBusy(false);
  };
  // BL-2c (D9): sign the target out of every device (refresh tokens revoked).
  const signOutUser = async () => {
    setBusy(true); setActionMsg("");
    try { await adminSignOutUser(found.uid); setActionMsg("Signed out of all devices ✓"); }
    catch (e) { setActionMsg((e && e.message) || "Failed"); }
    setBusy(false);
  };
  // BL-2b/N-2: empty the trash — permanently purge every trashed account now.
  const emptyTrash = async (uids) => {
    setBusy(true); setActionMsg("");
    let ok = 0, failed = 0;
    for (const uid of uids) {
      try { await deleteUser(uid); ok++; setUserList(l => l && l.filter(x => x.uid !== uid)); }
      catch (e) { failed++; }
    }
    setActionMsg(failed ? `Emptied ${ok} — ${failed} failed` : `Trash emptied (${ok}) ✓`);
    setConfirmEmpty(false); setDelText("");
    setBusy(false);
  };
  const changeTier = async (tier) => {
    setBusy(true); setActionMsg("");
    try { await setUserTier(found.uid, tier); setFound({ ...found, tier });
      setUserList(l => l && l.map(x => x.uid === found.uid ? { ...x, tier } : x)); setActionMsg("Tier updated ✓"); }
    catch (e) { setActionMsg((e && e.message) || "Failed"); }
    setBusy(false);
  };
  // Set/clear a premium user's per-user custom limits (S8). `limits` =
  // { portfolios?, coins?, transactions? } ({} clears it). The server clamps + persists.
  const changePremiumLimits = async (limits) => {
    setBusy(true); setActionMsg("");
    try {
      const r = await setPremiumLimits(found.uid, limits);
      const premiumLimits = (r && r.premiumLimits) || {};
      setFound({ ...found, premiumLimits });
      setUserList(l => l && l.map(x => x.uid === found.uid ? { ...x, premiumLimits } : x));
      setActionMsg("Custom limits updated ✓");
    } catch (e) { setActionMsg((e && e.message) || "Failed"); }
    setBusy(false);
  };
  const toggleSuspend = async () => {
    setBusy(true); setActionMsg("");
    try { const d = !found.disabled; await suspendUser(found.uid, d); setFound({ ...found, disabled: d });
      setUserList(l => l && l.map(x => x.uid === found.uid ? { ...x, disabled: d } : x)); setActionMsg(d ? "Suspended ✓" : "Un-suspended ✓"); }
    catch (e) { setActionMsg((e && e.message) || "Failed"); }
    setBusy(false);
  };
  const doDelete = async () => {
    setBusy(true); setActionMsg("");
    try { await deleteUser(found.uid);
      setUserList(l => l && l.filter(x => x.uid !== found.uid)); setActionMsg("Account deleted ✓"); setFound(null); setConfirmDelete(false); setLookupEmail(""); }
    catch (e) { setActionMsg((e && e.message) || "Failed"); }
    setBusy(false);
  };
  // Trash tab: restore a soft-deleted account, or purge it permanently now.
  const restoreFromTrash = async (uid) => {
    setBusy(true); setActionMsg("");
    try { await restoreUser(uid);
      setUserList(l => l && l.map(x => x.uid === uid ? { ...x, deleted: false, deletedAt: null } : x)); setActionMsg("Account restored ✓"); }
    catch (e) { setActionMsg((e && e.message) || "Restore failed"); }
    setBusy(false);
  };
  const purgeFromTrash = async (uid) => {
    setBusy(true); setActionMsg("");
    try { await deleteUser(uid);
      setUserList(l => l && l.filter(x => x.uid !== uid)); setActionMsg("Permanently deleted ✓"); }
    catch (e) { setActionMsg((e && e.message) || "Failed"); }
    setPurgeUid(null); setDelText("");   // R31-5: reset the typed-DELETE flow
    setBusy(false);
  };

  return {
    stats, setStats, statsErr, setStatsErr, tab, setTab,
    keys, setKeys, mail, setMail, savedMsg, setSavedMsg, setFlags, setSetFlags, cfgAt, setCfgAt,
    controls, setControls, analytics, setAnalytics, legal, setLegal, plans, setPlans,
    lookupEmail, setLookupEmail, found, setFound, lookupMsg, setLookupMsg, actionMsg, setActionMsg,
    confirmDelete, setConfirmDelete, busy, setBusy,
    confirmTrash, setConfirmTrash, confirmEmpty, setConfirmEmpty,
    delText, setDelText, purgeUid, setPurgeUid,
    trashUser, signOutUser, emptyTrash,
    // ADMIN-SEC — role, step-up unlock and the owner-only Admin access tab.
    role, roleLoaded, isOwner, unlocked,
    unlockPrompt, unlockPass, setUnlockPass, unlockErr, submitUnlock, cancelUnlock,
    grantEmail, setGrantEmail, grantEmail2, setGrantEmail2, grantFound, setGrantFound,
    grantMsg, setGrantMsg, grantWarn, setGrantWarn, grantLookup, setManager,
    userList, setUserList, listMsg, setListMsg, listLoading, setListLoading, q, setQ, page, setPage, PAGE_SIZE,
    billingFilter, setBillingFilter,
    audit, setAudit, auditLoading, setAuditLoading, auditMsg, setAuditMsg,
    // ADMIN-3 — audit search / action filter / pager / fetch depth.
    auditQ, setAuditQ, auditAction, setAuditAction, auditPage, setAuditPage,
    auditLimit, AUDIT_MAX_LIMIT,
    webhookEvents, webhookLoading, webhookMsg, loadWebhookEvents,
    // ADMIN-4 — the daily growth series + the owner-only manual capture.
    daily, dailyLoading, dailyMsg, loadDaily, capturing, captureSnapshot,
    // ADMIN-2 — operational status strip + the per-feature kill-switches.
    status, statusLoading, statusMsg, loadStatus, saveFeature,
    s,
    loadConfig, saveConfig, saveControls, loadUserList, loadAudit, lookup, openUser, changeTier, changePremiumLimits, toggleSuspend, doDelete,
    restoreFromTrash, purgeFromTrash,
  };
}
