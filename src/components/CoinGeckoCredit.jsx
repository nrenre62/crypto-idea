// CoinGeckoCredit — the attribution required by the CoinGecko API Terms (§4.3 +
// their attribution guide): the message "Data provided by CoinGecko" hyperlinked to
// the EXACT API URL they require (https://www.coingecko.com/en/api — not the general
// homepage). Kept in ONE place so the legally-required text + URL can never drift
// across the app's data surfaces; rendered inside each screen's footer disclaimer,
// next to where CoinGecko data is displayed.
//
// The link opens in a new tab with rel="noopener noreferrer" (no window.opener access,
// no referrer leak). Inline accent style so it renders correctly in every scope
// (.ci-app, .research-root, and the Modal overlays) without a scope-specific CSS rule.
export function CoinGeckoCredit() {
  return (
    <>
      Data provided by{" "}
      <a
        href="https://www.coingecko.com/en/api"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "var(--accent)", textDecoration: "underline", textUnderlineOffset: 2 }}
      >
        CoinGecko
      </a>
    </>
  );
}
