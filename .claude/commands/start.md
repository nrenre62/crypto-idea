---
description: Start the full local stack (emulators + dev server) and verify it works
---

Start the whole Crypto Idea stack together by running `npm run start:all` in the background
(this launches the Firestore/Auth/Functions/Pub-Sub emulators AND the Vite dev server in one
lifecycle). Then verify:

1. The dev server is up at http://localhost:3000 (app shell returns HTTP 200).
2. `/api/search?q=bitcoin` returns coin data through the proxy → functions emulator.

Report the URLs (app at :3000, Emulator UI at :4000) and flag anything that failed.
Do NOT run `npm run dev` alone — `/api/*` needs the functions emulator on :5001.
