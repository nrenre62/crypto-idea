import { useState, useEffect } from "react";
import { getStats, listUsers, listAudit, lookupUser, setUserTier, suspendUser, deleteUser, restoreUser, getAdminConfig, saveConfig as saveConfigFn } from "../api/admin.js";

// Combined real usage shown on the Overview before getStats resolves (no fake data).
const EMPTY_STATS = { totalUsers: 0, freeUsers: 0, proUsers: 0, premiumUsers: 0, totalPortfolios: 0, totalCoins: 0, estimatedRevenue: 0, proPrice: 9.99, premiumPrice: 49.99 };

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
  const [keys, setKeys] = useState({ coingecko: "", paypalClientId: "", paypalSecret: "", paypalWebhookId: "" });
  const [mail, setMail] = useState({ provider: "none", apiKey: "", apiUrl: "", fromEmail: "", listId: "" });
  const [savedMsg, setSavedMsg] = useState("");
  // Which secrets are already saved (so the form shows "saved" without exposing them).
  const [setFlags, setSetFlags] = useState({ coingecko: false, paypalSecret: false, apiKey: false });
  const [cfgAt, setCfgAt] = useState(null);
  // Public app controls (maintenance mode, signups on/off).
  const [controls, setControls] = useState({ maintenance: false, signupsEnabled: true });
  // Analytics + legal IDs (public, non-secret).
  const [analytics, setAnalytics] = useState({ ga4: "", plausible: "" });
  const [legal, setLegal] = useState({ termlyUuid: "", termlyPrivacyId: "", termlyTermsId: "", cookieBanner: false });
  // Editable plan prices + limits (mirrors functions DEFAULT_PLANS / firestore.rules).
  const DEFAULT_PLANS = {
    free:    { price: 0,     portfolios: 1,  coins: 10,  transactions: 50 },
    pro:     { price: 9.99,  portfolios: 10, coins: 200, transactions: 2000 },
    premium: { price: 49.99, portfolios: 50, coins: 500, transactions: 5000 },
  };
  const [plans, setPlans] = useState(DEFAULT_PLANS);

  // Pre-fill the Settings form from the saved config (secrets are never returned —
  // only whether they're set), so you can SEE what's configured and persisted.
  const loadConfig = async () => {
    try {
      const d = await getAdminConfig();
      setKeys({ coingecko: "", paypalClientId: d.paypal?.clientId || "", paypalSecret: "", paypalWebhookId: d.paypal?.webhookId || "" });
      setMail({ provider: d.email?.provider || "none", apiKey: "", apiUrl: d.email?.apiUrl || "", fromEmail: d.email?.fromEmail || "", listId: d.email?.listId || "" });
      setSetFlags({ coingecko: !!d.coingeckoSet, paypalSecret: !!(d.paypal && d.paypal.secretSet), apiKey: !!(d.email && d.email.apiKeySet) });
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

  const lookup = async () => {
    if (!lookupEmail.trim()) return;
    setBusy(true); setLookupMsg(""); setActionMsg(""); setConfirmDelete(false); setFound(null);
    try { setFound(await lookupUser(lookupEmail.trim())); }
    catch (e) { setLookupMsg((e && e.message) || "Lookup failed"); }
    setBusy(false);
  };
  // Open a row from the list → full detail (incl. coin count) via lookupUser.
  const openUser = async (email) => {
    setBusy(true); setActionMsg(""); setConfirmDelete(false); setFound(null); setLookupMsg("");
    try { setFound(await lookupUser(email)); }
    catch (e) { setLookupMsg((e && e.message) || "Lookup failed"); }
    setBusy(false);
  };
  const changeTier = async (tier) => {
    setBusy(true); setActionMsg("");
    try { await setUserTier(found.uid, tier); setFound({ ...found, tier });
      setUserList(l => l && l.map(x => x.uid === found.uid ? { ...x, tier } : x)); setActionMsg("Tier updated ✓"); }
    catch (e) { setActionMsg((e && e.message) || "Failed"); }
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
    userList, setUserList, listMsg, setListMsg, listLoading, setListLoading, q, setQ, page, setPage, PAGE_SIZE,
    audit, setAudit, auditLoading, setAuditLoading, auditMsg, setAuditMsg,
    s,
    loadConfig, saveConfig, saveControls, loadUserList, loadAudit, lookup, openUser, changeTier, toggleSuspend, doDelete,
    restoreFromTrash, purgeFromTrash,
  };
}
