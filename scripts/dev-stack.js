// Dev-only launcher for the local stack WITH persistent emulator data.
//
// `npm run start:all` runs this. It imports ./emulator-data (the seeded dev
// accounts + any data you added — created by `npm run seed`) if that folder
// exists, and ALWAYS exports back to it on exit, so your dev accounts survive
// emulator restarts instead of vanishing with the in-memory emulator.
//
// The ./emulator-data folder is git-ignored: it never leaves this machine and is
// never part of a deploy. The emulators (and this script) are dev-only.
//
// Why a launcher and not just flags in package.json: `firebase --import=<dir>`
// HARD-FAILS if <dir> doesn't exist yet (first run / fresh clone). We only add
// --import when the snapshot is present, and a cross-platform existence check
// can't live in a single portable npm-script line.
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const DATA_DIR = "./emulator-data";

// Pure + unit-tested (tests/unit/dev-stack.test.js): the firebase args for
// start:all. --import is included ONLY when a saved snapshot exists; the export
// is unconditional so the first run creates the baseline on exit.
export function buildStackArgs(dataDirExists) {
  const args = ["emulators:exec", "--project", "demo-crypto-idea"];
  if (dataDirExists) args.push(`--import=${DATA_DIR}`);
  args.push(`--export-on-exit=${DATA_DIR}`, "--ui", "npm run dev");
  return args;
}

// Quote only args that contain whitespace (e.g. the "npm run dev" child command).
function quoteArg(a) {
  return /\s/.test(a) ? `"${a}"` : a;
}

// Run firebase only when executed directly — importing this module (the test
// does) must NOT spawn anything.
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const exists = existsSync(join(root, "emulator-data"));
  console.log(
    exists
      ? "✔ start:all — importing ./emulator-data (persisted dev accounts); changes export on exit."
      : "ℹ ./emulator-data not found — starting EMPTY. Run `npm run seed` once to create the persistent baseline."
  );
  const command = `firebase ${buildStackArgs(exists).map(quoteArg).join(" ")}`;
  const result = spawnSync(command, { stdio: "inherit", shell: true, cwd: root });
  process.exit(result.status ?? (result.error ? 1 : 0));
}
