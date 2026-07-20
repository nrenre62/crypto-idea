/**
 * Deploy-time guard: FAIL before building if the production Firebase web config
 * is missing or still holds template placeholders.
 *
 * Why this exists: src/api/firebase.config.js falls back to the DEMO config and
 * only logs a console.warn when the VITE_FIREBASE_* vars are absent. That means a
 * deploy from a clean clone silently ships an app pointing at `demo-crypto-idea`
 * — it builds fine, deploys fine, and every login and read is dead on arrival.
 * A warning nobody reads is not a control, so this turns it into a hard stop.
 *
 * The nastier variant it also catches: `.env.example` ships
 * `VITE_FIREBASE_API_KEY=your_api_key_here`, which is TRUTHY. A copied-but-unfilled
 * .env therefore passes the `!!realConfig.apiKey` check in firebase.config.js and
 * initializes Firebase against a real project id with a garbage key.
 *
 * Wired into `npm run deploy` ONLY — never into `npm run build`, which must keep
 * working without a .env so the emulator/test workflow is unaffected.
 *
 * The pure matcher is exported so tests/unit/env-guard.test.js can exercise it
 * without a real .env file.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// The six values Firebase Console → Project Settings → Your apps → SDK config gives you.
export const REQUIRED_KEYS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
];

/** Parse a .env file body into a plain object. Ignores blanks and # comments. */
export function parseEnv(text) {
  const out = {};
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return out;
}

/**
 * Return a list of human-readable problems with the given env map.
 * Empty array === safe to deploy. Pure + exported for unit tests.
 */
export function findEnvProblems(vars) {
  const problems = [];
  for (const key of REQUIRED_KEYS) {
    const value = vars[key];
    if (value === undefined) { problems.push(`${key} is missing`); continue; }
    if (value === "") { problems.push(`${key} is empty`); continue; }
    // Template leftovers from .env.example — truthy, so the app would accept them.
    if (value.includes("_here") || value.startsWith("your_")) {
      problems.push(`${key} still holds the placeholder "${value}"`);
      continue;
    }
    // The emulator project must never be deployed to.
    if (value.includes("demo-crypto-idea")) {
      problems.push(`${key} points at the emulator project "demo-crypto-idea"`);
    }
  }
  return problems;
}

// --- CLI: check .env and block the deploy on any problem ---------------------
// Guarded so importing this module from a test never triggers the check/exit.
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const envPath = join(root, ".env");

  if (!existsSync(envPath)) {
    console.error("env-guard: no .env found — a deploy would silently ship the DEMO Firebase config.");
    console.error("  Fix: cp .env.example .env, then fill the six VITE_FIREBASE_* values from");
    console.error("       Firebase Console → Project Settings → Your apps → SDK setup and configuration.");
    process.exit(1);
  }

  const problems = findEnvProblems(parseEnv(readFileSync(envPath, "utf8")));
  if (problems.length) {
    console.error("env-guard: .env is not deploy-ready:");
    for (const p of problems) console.error(`  - ${p}`);
    console.error("Fill in the real values from the Firebase Console, then deploy again.");
    process.exit(1);
  }
  console.log("env-guard: .env looks deploy-ready (all VITE_FIREBASE_* set, no placeholders).");
}
