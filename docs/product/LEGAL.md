# Legal, privacy & disclaimer

**Canonical record of the project's legal posture.** CryptoIdea is an **open-source personal
project** released under the [MIT License](../../LICENSE). This doc states what that means for the
live site and for anyone who self-hosts it.

---

## Disclaimer (read this)

- **Not financial advice.** CryptoIdea is a research and record-keeping tool. It does not recommend
  buying, selling, or holding anything. Most crypto assets go to zero — do your own research.
- **Provided "as is".** Per the MIT License, the software comes with **no warranty** and the author
  is **not liable** for any loss, bug, data loss, or failure — whether you use the live site or run
  your own copy. If you self-host it, you run it entirely at your own risk.
- **This is a developing project, not a finished product.** The live deployment exists so the author
  can test a real application on a real domain. There may be bugs the author does not know about.

## Privacy & Terms (optional, off by default)

Privacy Policy and Terms pages (`privacy.html` / `terms.html`) ship as static pages that **auto-embed
[Termly](https://termly.io) documents by ID**. They are **optional and inactive by default** — the
same posture as billing and AI:

- The pages show a "being finalized" placeholder until Termly document IDs are set in **admin
  Settings → Analytics & legal** (the IDs persist to the `config/app` doc; never paste a snippet into
  the HTML).
- The live site is intended to run with a **free Termly** privacy policy + terms, purely so visitors
  to the public deployment have a basic notice. There is no intent to use Termly's paid plan.
- Consent capture at signup records the accepted Terms/Privacy versions on the user profile
  (`consent` field) when the documents are active.

## If you self-host

You get the same code under MIT. Change the branding and name, add your own privacy policy and terms,
and deploy to your own Firebase project. You are the operator of your instance and responsible for its
legal compliance — the author provides the code only, with no warranty and no support obligation.

## Related

- [MIT License](../../LICENSE)
- Analytics & legal config — admin **Settings → Analytics & legal** (Termly IDs, GA4 / Plausible,
  cookie banner)
- Data rights (GDPR/CCPA self-service: export / delete / restore) — see the README **Privacy & data
  rights** summary and the Account → "Privacy & your data" card.
