import { useState, useEffect, useRef, useCallback } from "react";
import { onAuthChange } from "../api/firebase-auth.js";
import { getPortfolios, getCoins, getUserProfile, watchPortfolios, createPortfolio } from "../api/firebase-database.js";
import { DEFAULT_PORTFOLIOS } from "./usePortfolios.js";
import { db } from "../utils/storage.js";

// Owns the auth session lifecycle: watches Firebase auth, loads the signed-in
// user's portfolios from Firestore, auto-saves the (non-sensitive) profile, and
// drives login/logout navigation. Collaborators are injected so the hook stays
// focused on the session and doesn't reach into UI/portfolio internals:
//   setScreen, setPortfolios, setActivePortId  — stable state setters from the app
//   checkSubscriptionStatus(user) -> user      — applies expiry/grace-period downgrades
//   saveProfile(user)                          — persists the non-sensitive profile
//   onSignedOut()                              — tears down the plan/upgrade overlay (R31-1)
//   setPortfoliosError(bool)                   — surfaces a load failure so the app can
//                                                show a Retry screen instead of the phantom
//                                                "default" portfolio (DI-2)
// Returns { user, setUser, dataLoaded, reloadPortfolios }.
export function useAuthSession({ setScreen, setPortfolios, setActivePortId, checkSubscriptionStatus, saveProfile, onSignedOut, setPortfoliosError, onLiveSyncError }) {
  const [user, setUser] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Hold the latest collaborators in a ref so the auth listener (subscribed once)
  // always calls current versions without re-subscribing — and without tripping on
  // functions declared later in the component (no temporal-dead-zone reads here).
  const cb = useRef(null);
  cb.current = { setScreen, setPortfolios, setActivePortId, checkSubscriptionStatus, saveProfile, onSignedOut, setPortfoliosError, onLiveSyncError };
  const uidRef = useRef(null);   // DI-2: the current uid, for the Retry reload

  // Load portfolios (and their coins + transactions) from Firestore so data syncs
  // across devices. Counters live on these docs and are enforced by rules.
  // DI-2 self-heal:
  //  · a transient load failure surfaces a Retry state (never strands on the phantom default),
  //  · an account with ZERO portfolio docs recreates the default (registration parity — makes
  //    registerUser's "recoverable on next load" comment finally true).
  const loadPortfolios = useCallback(async (uid) => {
    if (!uid) return;
    const res = await getPortfolios(uid);
    if (!res.success) { cb.current.setPortfoliosError && cb.current.setPortfoliosError(true); return; }
    cb.current.setPortfoliosError && cb.current.setPortfoliosError(false);
    let ports = [];
    for (const p of res.portfolios) {
      const cr = await getCoins(uid, p.id);
      ports.push({ id: p.id, name: p.name, coins: cr.success ? cr.coins : [] });
    }
    if (ports.length === 0) {
      // G9/G30: zero portfolios (registration step-2 failed, or a delete race left none) →
      // recreate the default instead of leaving the phantom local "default" every write fails
      // against. Defensive: if the heal can't run/fails, leave state as-is (the reconcile
      // effect + Retry cover it) rather than crash.
      const created = await createPortfolio(uid, "My Portfolio", 0);
      if (created && created.success) ports = [{ id: created.id, name: "My Portfolio", coins: [] }];
    }
    if (ports.length > 0) {
      cb.current.setPortfolios(ports);
      // Restore last active portfolio if it still exists, else use the first one.
      const savedActive = await db.get("ci-active-port");
      cb.current.setActivePortId(ports.find(p => p.id === savedActive) ? savedActive : ports[0].id);
    }
  }, []);

  // Exposed so the load-error screen's Retry button can re-attempt for the current user.
  const reloadPortfolios = useCallback(() => loadPortfolios(uidRef.current), [loadPortfolios]);

  // ═══ Watch Firebase auth state + load saved data on startup ═══
  useEffect(() => {
    // Firebase is the source of truth for who is logged in. The password lives in
    // Firebase Auth and is never stored on the device.
    let unsubPorts = null;   // C-A3: the live portfolio-metas listener for this session
    const unsub = onAuthChange(async (fbUser) => {
      if (unsubPorts) { unsubPorts(); unsubPorts = null; }
      if (fbUser) {
        uidRef.current = fbUser.uid;
        // Local cache holds non-authoritative prefs (settings) + a last-known tier, keyed by uid.
        const profile = await db.get("ci-profile-" + fbUser.uid) || {};
        // Tier + subscription are server-authoritative (set by admin/PayPal/seed) — read them
        // from Firestore so they're correct on a fresh device and after an admin change. The
        // server wins over the local cache; if the doc is missing we fall back to the cache/default.
        const server = await getUserProfile(fbUser.uid);
        const baseUser = {
          tier: "free",
          joined: new Date().toISOString().split("T")[0],
          ...profile,
          // Take ONLY the authoritative fields from the server. Display/format fields like
          // `joined` stay from the local cache/default — Firestore returns `joined` as a
          // Timestamp object, and the Account screen renders it directly (would crash on an object).
          ...(server.success ? {
            tier: server.tier || "free",
            subscription: "subscription" in server ? server.subscription : (profile.subscription ?? null),
            // Soft-delete state is server-authoritative (numbers, safe to render). When
            // `deleted` is true the app shows the restore screen instead of the portfolio.
            deleted: server.deleted === true,
            deletedAt: server.deletedAt || null,
            // Preferences live in Firestore so they sync across devices; the server copy
            // wins over the local cache. The Notifications/Privacy toggles read these.
            settings: server.settings || profile.settings || {},
            // Admin-set per-user custom limits (premium overrides, S8) — server-only
            // (owners can't write them). Loaded so the client's caps match the rules.
            premiumLimits: server.premiumLimits || {},
          } : {}),
          uid: fbUser.uid,
          email: fbUser.email,
          name: fbUser.displayName || profile.name || (fbUser.email ? fbUser.email.split("@")[0] : ""),
          // Mailbox-ownership flag (fresh from Auth, not the cache) — drives the
          // "verify your email" nudge. Sensitive ops are gated server-side, not here.
          emailVerified: fbUser.emailVerified === true,
        };
        await loadPortfolios(fbUser.uid);
        // C-A3 (C12): keep the portfolio LIST live — a rename/add/delete made on a
        // second device merges in without a reload. Coins are preserved from the
        // current state (the active portfolio's coins have their own live watcher
        // in CryptoIdea; a portfolio new to this device starts empty until opened).
        unsubPorts = watchPortfolios(fbUser.uid, (metas) => {
          if (!metas.length) return;   // never blank the UI on a transient empty snapshot
          cb.current.setPortfolios((prev) => metas.map((m) => {
            const ex = prev.find((p) => p.id === m.id);
            return { id: m.id, name: m.name, coins: ex ? ex.coins : [] };
          }));
        }, () => { if (cb.current.onLiveSyncError) cb.current.onLiveSyncError(); });   // DI-5 (G33)
        // Apply any subscription expiry / payment-failure downgrade before showing.
        const checked = await cb.current.checkSubscriptionStatus(baseUser);
        setUser(checked);
        cb.current.setScreen("portfolio");
      } else {
        // Session ended (sign-out, token revoked, or — pre-R31-1 — an admin tab
        // killing it). DI-2 sign-out hygiene: reset the portfolio state and DROP this
        // device's active-portfolio id so the NEXT account to sign in on a shared device
        // never inherits the previous account's coins / writes to its portfolio id (G10).
        // Clearing the overlay too keeps a dead session from painting an empty "Welcome, ".
        uidRef.current = null;
        setUser(null);
        if (cb.current.onSignedOut) cb.current.onSignedOut();
        cb.current.setPortfolios(DEFAULT_PORTFOLIOS);
        cb.current.setActivePortId("default");
        cb.current.setPortfoliosError && cb.current.setPortfoliosError(false);
        db.del("ci-active-port");
        cb.current.setScreen("login");
      }
      setDataLoaded(true);
    });
    return () => { if (typeof unsub === "function") unsub(); if (unsubPorts) unsubPorts(); };
  }, [loadPortfolios]);

  // ═══ Auto-save user profile when it changes (never stores a password) ═══
  useEffect(() => {
    if (!dataLoaded) return;
    if (user && user.uid) cb.current.saveProfile(user);
  }, [user, dataLoaded]);

  return { user, setUser, dataLoaded, reloadPortfolios };
}
