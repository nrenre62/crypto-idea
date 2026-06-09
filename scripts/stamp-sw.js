/**
 * Stamp the built service worker with a unique build id, so every deploy changes
 * the SW file → browsers detect the update → open tabs auto-refresh to the latest.
 * Runs automatically after `vite build` (see package.json "build").
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const file = join(__dirname, "..", "dist", "service-worker.js");

if (existsSync(file)) {
  const id = String(Date.now());
  const out = readFileSync(file, "utf8").replace(/__BUILD__/g, id);
  writeFileSync(file, out);
  console.log("Stamped service worker build id:", id);
} else {
  console.warn("dist/service-worker.js not found — skipped SW stamp");
}
