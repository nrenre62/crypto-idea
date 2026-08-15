# Legal, privacy & disclaimer

Canonical record of the project's legal posture. CryptoIdea is an open-source personal project released under the [MIT License](../../LICENSE). This doc states what that means for the live site and for anyone who self-hosts it.

## Disclaimer (read this)

- Not financial advice. CryptoIdea is a research and record-keeping tool. It does not recommend buying, selling, or holding anything. Most crypto assets go to zero — do your own research.
- Provided "as is". Per the MIT License, the software comes with no warranty and the author is not liable for any loss, bug, data loss, or failure — whether you use the live site or run your own copy. If you self-host it, you run it entirely at your own risk.
- This is a developing project, not a finished product. The live deployment exists so the author can test a real application on a real domain. There may be bugs the author does not know about.

## Privacy & Terms (optional, off by default)

Privacy Policy and Terms pages (`privacy.html` / `terms.html`) ship as static pages that carry a **basic hand-authored policy by default** and **auto-embed Termly documents by ID** when configured:

- Each page includes a self-contained, plain-language **default** policy/terms covering the real data practices (Firebase, PayPal, Sentry error monitoring + session replay, CoinGecko, optional analytics), with clearly-bracketed placeholders (`[OPERATOR NAME]`, `[CONTACT EMAIL]`, `[JURISDICTION]`) for the operator to fill in.
- Setting a Termly document ID in admin Settings → Analytics & legal (the IDs persist to the `config/app` doc; never paste a snippet into the HTML) makes `termly-embed.js` **replace** the default with the embedded Termly document. The default is the fallback; Termly is the override.
- Consent capture at signup records the accepted Terms/Privacy versions on the user profile (`consent` field).
- **Note:** if client-side session replay (Sentry) is enabled, the third-party recording is already disclosed in the default privacy policy — keep any replacement policy consistent with that.

## If you self-host

You get the same code under MIT. Change the branding and name, add your own privacy policy and terms, and deploy to your own Firebase project. You are the operator of your instance and responsible for its legal compliance — the author provides the code only, with no warranty and no support obligation.

## Related

- [MIT License](../../LICENSE)
- Analytics & legal config — admin Settings → Analytics & legal (Termly IDs, GA4 / Plausible, cookie banner).
- Data rights (GDPR/CCPA self-service: export / delete / restore) — see the README **Privacy & data rights** summary and the Account → "Privacy & your data" card.

## See also

- [Documentation index](../INDEX.md)
