---
description: Security audit of the whole app against the secure-by-design checklist
---

Run a security audit of Crypto Idea. Apply the `secure-by-design` skill's checklist and report
findings grouped by severity (Critical / High / Medium / Low), each with the file:line and a fix.

Cover at least:
1. **Access control / rules** — `firestore.rules`: deny-by-default, owner-only, users can't change
   their own `tier`, `/config` is server-only, counter limits sound. Run `npm run test:rules`.
2. **Secrets** — no API keys or secrets in `src/`, the built `dist/`, or git history; keys only in
   `functions/` + the locked `config/app` doc. Confirm only `VITE_FIREBASE_*` (public) is in the bundle.
3. **Auth** — admin is the `{admin:true}` custom claim (not an email list); callables act on the
   caller's uid (no IDOR); password reset doesn't reveal account existence.
4. **Backend / functions** — `api` rate limit present; PayPal webhook signature verified; input
   validated; honeypot on public forms.
5. **Input/output** — server-side validation; React auto-escaping; landing uses `textContent` not
   `innerHTML` for API data.
6. **Transport/headers** — CSP, X-Frame-Options, nosniff, Referrer-Policy, HSTS in `firebase.json`.
7. **Dependencies** — `npm audit --omit=dev` (root + `functions/`).

End with a prioritized fix list. Fix anything Critical/High immediately, verify, and commit.
Do NOT introduce new secrets or weaken rules to make something "work".
