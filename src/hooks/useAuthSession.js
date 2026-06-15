import { useState, useEffect, useRef } from "react";
import { onAuthChange } from "../api/firebase-auth.js";
import { getPortfolios, getCoins } from "../api/firebase-database.js";
import { db } from "../utils/storage.js";

// Owns the auth session lifecycle: watches Firebase auth, loads the signed-in
// user's portfolios from Firestore, auto-saves the (non-sensitive) profile, and
// drives login/logout navigation. Collaborators are injected so the hook stays
// focused on the session and doesn't reach into UI/portfolio internals:
//   setScreen, setPortfolios, setActivePortId  — stable state setters from the app
//   checkSubscriptionStatus(user) -> user      — applies expiry/grace-period downgrades
//   saveProfile(user)                          — persists the non-sensitive profile
// Returns { user, setUser, dataLoaded }.
export function useAuthSession({ setScreen, setPortfolios, setActivePortId, checkSubscriptionStatus, saveProfile }) {
  const [user, setUser] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Hold the latest collaborators in a ref so the auth listener (subscribed once)
  // always calls current versions without re-subscribing — and without tripping on
  // functions declared later in the component (no temporal-dead-zone reads here).
  const cb = useRef(null);
  cb.current = { setScreen, setPortfolios, setActivePortId, checkSubscriptionStatus, saveProfile };

  // ═══ Watch Firebase auth state + load saved data on startup ═══
  useEffect(() => {
    // Load portfolios (and their coins + transactions) from Firestore so data
    // syncs across devices. Counters live on these docs and are enforced by rules.
    const loadPortfolios = async (uid) => {
      const res = await getPortfolios(uid);
      if (!res.success) return;
      const ports = [];
      for (const p of res.portfolios) {
        const cr = await getCoins(uid, p.id);
        ports.push({ id: p.id, name: p.name, coins: cr.success ? cr.coins : [] });
      }
      if (ports.length > 0) {
        cb.current.setPortfolios(ports);
        // Restore last active portfolio if it still exists, else use the first one.
        const savedActive = await db.get("ci-active-port");
        cb.current.setActivePortId(ports.find(p => p.id === savedActive) ? savedActive : ports[0].id);
      }
    };
    // Firebase is the source of truth for who is logged in. The password lives in
    // Firebase Auth and is never stored on the device.
    const unsub = onAuthChange(async (fbUser) => {
      if (fbUser) {
        // Non-sensitive profile (tier, subscription, settings) kept locally, keyed by uid.
        const profile = await db.get("ci-profile-" + fbUser.uid) || {};
        const baseUser = {
          tier: "free",
          joined: new Date().toISOString().split("T")[0],
          ...profile,
          uid: fbUser.uid,
          email: fbUser.email,
          name: fbUser.displayName || profile.name || (fbUser.email ? fbUser.email.split("@")[0] : ""),
        };
        await loadPortfolios(fbUser.uid);
        // Apply any subscription expiry / payment-failure downgrade before showing.
        const checked = await cb.current.checkSubscriptionStatus(baseUser);
        setUser(checked);
        cb.current.setScreen("portfolio");
      } else {
        setUser(null);
        cb.current.setScreen("login");
      }
      setDataLoaded(true);
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, []);

  // ═══ Auto-save user profile when it changes (never stores a password) ═══
  useEffect(() => {
    if (!dataLoaded) return;
    if (user && user.uid) cb.current.saveProfile(user);
  }, [user, dataLoaded]);

  return { user, setUser, dataLoaded };
}
