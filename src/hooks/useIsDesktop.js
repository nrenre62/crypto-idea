import { useState, useEffect } from "react";

// R19-9: true on a desktop-width viewport (wider than the 560px mobile breakpoint the app
// already uses for modals). Drives the desktop-only "drill-in as a centered popup" behavior;
// on mobile the drill-ins (CoinInfo / Detail / Buy-Sell) stay full-screen screens. Mirrors
// the theme matchMedia guard in CryptoIdea. When matchMedia is unavailable (jsdom/SSR) it
// defaults to FALSE (mobile), so the app + existing tests render the drill-ins full-screen.
export function useIsDesktop() {
  const query = "(min-width: 561px)";
  const read = () =>
    (typeof window !== "undefined" && window.matchMedia) ? window.matchMedia(query).matches : false;
  const [isDesktop, setIsDesktop] = useState(read);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(query);
    const on = () => setIsDesktop(mq.matches);
    on();
    mq.addEventListener ? mq.addEventListener("change", on) : mq.addListener(on);
    return () => { mq.removeEventListener ? mq.removeEventListener("change", on) : mq.removeListener(on); };
  }, []);
  return isDesktop;
}
