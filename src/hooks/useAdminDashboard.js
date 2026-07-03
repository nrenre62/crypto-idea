import { useState, useEffect } from "react";
import { getStats, listUsers, listAudit, lookupUser, setUserTier, setPremiumLimits, suspendUser, deleteUser, restoreUser, getAdminConfig, saveConfig as saveConfigFn, setAdminClaim, adminTrashUser, adminSignOutUser } from "../api/admin.js";

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

  // Settings forms (saved via the admin-only saveConfig Cloud Function).
  const [keys, setKeys] = useState({ coingecko: "", paypalClientId: "", paypalSecret: "", paypalWebhookId: "", anthropicKey: "" });
  const [mail, setMail] = useState({ provider: "none", apiKey: "", apiUrl: "", fromEmail: "", listId: "" });
  const [savedMsg, setSavedMsg] = useState("");
  // Which secrets are already saved (so the form shows "saved" without exposing them).
  const [setFlags, setSetFlags] = useState({ coingecko: false, paypalSecret: false, apiKey: false, anthropicKey: false });
  const [cfgAt, setCfgAt] = useState(null);
  // Public app controls (maintenance mode, signups on/off).
  const [controls, setControls] = useState({ maintenance: false, signupsEnabled: true });
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
      const d = await getAdminConfig();
      setKeys({ coingecko: "", paypalClientId: d.paypal?.clientId || "", paypalSecret: "", paypalWebhookId: d.paypal?.webhookId || "", anthropicKey: "" });
      setMail({ provider: d.email?.provider || "none", apiKey: "", apiUrl: d.email?.apiUrl || "", fromEmail: d.email?.fromEmail || "", listId: d.email?.listId || "" });
      setSetFlags({ coingecko: !!d.coingeckoSet, paypalSecret: !!(d.paypal && d.paypal.secretSet), apiKey: !!(d.email && d.email.apiKeySet), anthropicKey: !!(d.ai && d.ai.anthropicKeySet) });
      setControls({ maintenance: !!(d.flags && d.flags.maintenance), signupsEnabled: !(d.flags && d.flags.signupsEnabled === false) });
      setAnalytics({ ga4: d.analytics?.ga4 || "", plausible: d.analytics?.plausible || "" });
      setLegal({ termlyUuid: d.legal?.termlyUuid || "", termlyPrivacyId: d.legal?.termlyPrivacyId || "", termlyTermsId: d.legal?.termlyTermsId || "", cookieBanner: !!(d.legal && d.legal.cookieBanner) });
      if (d.plans) setPlans(d.plans);
      setCfgAt(d.updatedAt || null);
    } catch (e) { /* function not deployed yet (dev): leave the form empty */ }
  };
  const saveConfig = async () => {
    setSavedMsg("Saving…");
    try {
      await saveConfigFn({ keys, email: mail, flags: controls, analytics, legal, plans });
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
    try { await saveConfigFn({ keys, email: mail, flags: next }); setSavedMsg("Saved ✓"); }
    catch (e) { setSavedMsg("Save failed: " + ((e && e.message) || "error")); await loadConfig(); }
    setTimeout(() => setSavedMsg(""), 3000);
  };

  // Users tab — on-demand lookup of ONE user for support / moderation.
  const [lookupEmail, setLookupEmail] = useState("");
  const [found, setFound] = useState(null);
  const [lookupMsg, setLookupMsg] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  // BL-2 confirm states: grant/revoke admin is type-to-confirm (the target's email);
  // move-to-trash and empty-trash are two-tap confirms like delete.
  const [confirmAdmin, setConfirmAdmin] = useState(false);
  const [adminConfirmText, setAdminConfirmText] = useState("");
  const [confirmTrash, setConfirmTrash] = useState(false);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [busy, setBusy] = useState(false);
  // Users tab — full list, searched + paginated client-side; rows open the detail panel.
  const [userList, setUserList] = useState(null);
  const [listMsg, setListMsg] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;
  // Audit tab.
  const [audit, setAudit] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditMsg, setAuditMsg] = useState("");

  // Load combined usage + the saved config once on mount.
  useEffect(() => {
    getStats()
      .then(d => setStats(d))
      .catch(e => setStatsErr((e && e.message) || "Could not load stats"));
    loadConfig();
  }, []);
  const s = stats || EMPTY_STATS;

  const loadUserList = async () => {
    setListLoading(true); setListMsg("");
    try { setUserList(await listUsers()); }
    catch (e) { setListMsg((e && e.message) || "Could not load users"); setUserList([]); }
    setListLoading(false);
  };
  // Load the user list the first time the Users or Trash tab is opened (both read it).
  useEffect(() => { if ((tab === "users" || tab === "trash") && userList === null && !listLoading) loadUserList(); }, [tab]);

  const loadAudit = async () => {
    setAuditLoading(true); setAuditMsg("");
    try { setAudit(await listAudit(100)); }
    catch (e) { setAuditMsg((e && e.message) || "Could not load the audit log"); setAudit([]); }
    setAuditLoading(false);
  };
  useEffect(() => { if (tab === "audit" && audit === null && !auditLoading) loadAudit(); }, [tab]);

  const resetConfirms = () => { setConfirmDelete(false); setConfirmAdmin(false); setAdminConfirmText(""); setConfirmTrash(false); };
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
  // BL-2a (D7): grant/revoke the admin claim — the component gates this behind a
  // type-the-email confirm; the server keeps MIN_ADMINS enforced. (MFA at go-live.)
  const setAdmin = async (makeAdmin) => {
    setBusy(true); setActionMsg("");
    try {
      await setAdminClaim(found.email, makeAdmin);
      setFound({ ...found, isAdmin: makeAdmin });
      setUserList(l => l && l.map(x => x.uid === found.uid ? { ...x, isAdmin: makeAdmin } : x));
      setActionMsg(makeAdmin ? "Admin granted ✓" : "Admin revoked ✓");
    } catch (e) { setActionMsg((e && e.message) || "Failed"); }
    setConfirmAdmin(false); setAdminConfirmText("");
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
    setConfirmTrash(false);
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
    setConfirmEmpty(false);
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
    setBusy(false);
  };

  return {
    stats, setStats, statsErr, setStatsErr, tab, setTab,
    keys, setKeys, mail, setMail, savedMsg, setSavedMsg, setFlags, setSetFlags, cfgAt, setCfgAt,
    controls, setControls, analytics, setAnalytics, legal, setLegal, plans, setPlans,
    lookupEmail, setLookupEmail, found, setFound, lookupMsg, setLookupMsg, actionMsg, setActionMsg,
    confirmDelete, setConfirmDelete, busy, setBusy,
    confirmAdmin, setConfirmAdmin, adminConfirmText, setAdminConfirmText,
    confirmTrash, setConfirmTrash, confirmEmpty, setConfirmEmpty,
    setAdmin, trashUser, signOutUser, emptyTrash,
    userList, setUserList, listMsg, setListMsg, listLoading, setListLoading, q, setQ, page, setPage, PAGE_SIZE,
    audit, setAudit, auditLoading, setAuditLoading, auditMsg, setAuditMsg,
    s,
    loadConfig, saveConfig, saveControls, loadUserList, loadAudit, lookup, openUser, changeTier, changePremiumLimits, toggleSuspend, doDelete,
    restoreFromTrash, purgeFromTrash,
  };
}
