import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * Runtime-safety guards for functions/index.js.
 *
 * Inside the functions emulator the `admin.firestore` namespace is proxied, and its
 * STATIC members (FieldValue, Timestamp, FieldPath, GeoPoint) come back `undefined`.
 * `admin.firestore()` as a call still works — only the namespace properties are lost —
 * so the broken form looks perfectly idiomatic and passes review.
 *
 * That is how `suspendUser` shipped with `admin.firestore.FieldValue.delete()` in its
 * un-suspend branch: it threw a TypeError -> INTERNAL *after* the Auth account had
 * already been re-enabled, so un-suspend half-succeeded (the user could sign in, but
 * `suspendedAt` was never cleared and the R31-6 paid-time extension never ran).
 *
 * Nothing caught it: `extendForSuspension` is pure and well covered in billing.test.js,
 * the gate is covered in admin-gate-coverage.test.js, and every callable test mocks
 * `httpsCallable`. This is a source-text assertion in the same spirit as
 * admin-gate-coverage.test.js — behaviour is covered by the un-suspend case in
 * tests/functions-callable.test.js (`npm run test:integration`).
 *
 * Correct form: `const { FieldValue } = require("firebase-admin/firestore")`, which
 * resolves identically in the emulator and in deployed functions. See ERRORS.md C3/C6.
 */
const here = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(resolve(here, "../../functions/index.js"), "utf8");

// Strip comments so the explanatory notes above the fixes don't trip the guard.
const CODE = SRC
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("functions/index.js — Firestore sentinel access", () => {
  it("never reads a static member off the admin.firestore namespace", () => {
    // e.g. admin.firestore.FieldValue / .Timestamp / .FieldPath — undefined in the emulator.
    const bad = [...CODE.matchAll(/admin\.firestore\.([A-Z]\w*)/g)].map((m) => m[0]);
    expect(
      bad,
      `Use the modular subpath instead: require("firebase-admin/firestore").\n` +
        `admin.firestore.<Static> is undefined inside the functions emulator.`,
    ).toEqual([]);
  });

  it("imports the sentinels it uses from firebase-admin/firestore", () => {
    // If a sentinel is referenced, it must be destructured from the modular subpath.
    const used = [...CODE.matchAll(/\b(FieldValue|Timestamp|FieldPath)\./g)].map((m) => m[1]);
    for (const name of new Set(used)) {
      expect(
        CODE,
        `${name} is used but not imported from "firebase-admin/firestore"`,
      ).toMatch(new RegExp(`require\\("firebase-admin/firestore"\\)`));
      expect(CODE).toMatch(new RegExp(`\\{[^}]*\\b${name}\\b[^}]*\\}\\s*=\\s*require\\("firebase-admin/firestore"\\)`));
    }
  });

  it("suspendUser clears suspendedAt with a real delete sentinel", () => {
    const start = CODE.indexOf("exports.suspendUser = functions.https.onCall(");
    const body = CODE.slice(start, CODE.indexOf("\n});", start));
    expect(start, "exports.suspendUser not found — renamed?").toBeGreaterThan(-1);
    expect(body).toContain("FieldValue.delete()");
    // The extension must still be wired to the same write.
    expect(body).toContain("billing.extendForSuspension(");
  });
});
