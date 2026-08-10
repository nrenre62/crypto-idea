/**
 * Bootstrap / manage ADMIN ROLES — sets the custom claims on a user (ADMIN-SEC).
 * =============================================================================
 * Two roles, both carried as verified custom claims:
 *
 *   owner   { admin: true, role: "owner" }    ← ONLY this script can mint one.
 *                                               Un-deletable, un-demotable, can't
 *                                               self-delete. Keep exactly 2.
 *   manager { admin: true, role: "manager" }  ← normally granted by an owner from
 *                                               the panel's "Admin access" area;
 *                                               this script can do it too.
 *
 * The panel can NEVER create an owner. That is the whole point: promoting
 * sock-puppet admins no longer lets anyone delete the real owners, because
 * owner protection keys off identity (the role claim), not the admin count.
 *
 * SETUP (one time):
 * 1. Firebase Console → Project Settings → Service accounts → "Generate new
 *    private key". Save the JSON file somewhere OUTSIDE the repo (never commit it).
 * 2. Point Google credentials at it (PowerShell):
 *      $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\serviceAccountKey.json"
 * 3. Make sure the target user has already registered in the app (so the account
 *    exists in Firebase Auth).
 *
 * RUN:
 *   cd functions
 *   node scripts/set-admin.js you@example.com --role=owner     # mint an owner
 *   node scripts/set-admin.js her@example.com --role=manager   # grant manager
 *   node scripts/set-admin.js her@example.com --revoke         # remove all admin
 *   node scripts/set-admin.js you@example.com --show           # print current claims
 *
 * SAFETY: demoting or revoking an existing OWNER requires --force, so a stray
 * command can't quietly strip an owner. Minting a 3rd owner is likewise refused
 * without --force (CRYP-103b: keep exactly 2 — the un-deletable root of trust).
 * Refresh tokens are revoked on every change, so the new role takes effect on the
 * target's next request rather than up to an hour later.
 *
 * ⚠️ RECOVERY: owners exist only as claims set by this script. If you lose both
 * owner passwords AND this service-account key there is no in-app way back —
 * generate a fresh key from the Firebase console (link above) and re-run this.
 * Keep the key in your password manager and in the external-drive backup.
 */

const admin = require("firebase-admin");
// Modular subpath accessors — firebase-admin v13+ removed admin.auth() and the
// admin.credential.* namespace from the root export. These resolve on both v12 and v14.
const { getAuth } = require("firebase-admin/auth");
const { applicationDefault } = require("firebase-admin/app");
// CRYP-103b (C-2): the owner hard-cap decision is a pure, unit-tested helper (owner-cap.js);
// this script does the Auth I/O and applies the verdict.
const { ownerCapDecision, OWNER_CAP } = require("../owner-cap");

const ROLES = ["owner", "manager"];
const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith("--"));
const email = args.find((a) => !a.startsWith("--"));
const has = (name) => flags.includes(`--${name}`);
const roleArg = flags.find((a) => a.startsWith("--role="));
const role = roleArg ? roleArg.slice("--role=".length) : null;
const revoke = has("revoke");
const show = has("show");
const force = has("force");

function usage(msg) {
  if (msg) console.error(`Error: ${msg}\n`);
  console.error("Usage: node scripts/set-admin.js <email> --role=owner|manager");
  console.error("       node scripts/set-admin.js <email> --revoke [--force]");
  console.error("       node scripts/set-admin.js <email> --show");
  process.exit(1);
}

// Validate argv BEFORE touching Auth — the old script accepted `--revoke` as the
// email (argv[2]) and would then fail confusingly against a garbage address.
if (!email) usage("no email given");
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) usage(`"${email}" is not an email address`);
if (!show && !revoke && !role) usage("pass --role=owner, --role=manager, --revoke or --show");
if (role && !ROLES.includes(role)) usage(`--role must be one of: ${ROLES.join(", ")}`);
if (role && revoke) usage("--role and --revoke are mutually exclusive");

admin.initializeApp({ credential: applicationDefault() });
const auth = getAuth();

const describe = (c) =>
  (c && c.admin === true ? `admin, role=${c.role || "(none — legacy)"}` : "not an admin");

// CRYP-103b (C-2): count existing OWNER-claim holders. Counts the claim regardless of
// `disabled` — a suspended owner still holds an owner slot that can be re-enabled, so the
// hard cap on "how many owners can exist" must include it. Paginates all users (fine at
// this scale; owners are a handful).
async function countOwners() {
  let count = 0;
  let pageToken;
  do {
    const res = await auth.listUsers(1000, pageToken);
    res.users.forEach((u) => {
      const c = u.customClaims;
      if (c && c.admin === true && c.role === "owner") count += 1;
    });
    pageToken = res.pageToken;
  } while (pageToken);
  return count;
}

(async () => {
  try {
    const user = await auth.getUserByEmail(email);
    const current = user.customClaims || {};

    if (show) {
      console.log(`${email} (uid: ${user.uid}) → ${describe(current)}`);
      console.log(JSON.stringify(current, null, 2));
      process.exit(0);
    }

    // Owner protection at the bootstrap layer too — the panel already refuses this,
    // but the script is the one path that could otherwise strip the last owner.
    if (current.role === "owner" && (revoke || role === "manager") && !force) {
      console.error(`Refusing: ${email} is an OWNER. Owners are protected.`);
      console.error("Re-run with --force if you really mean to demote them, and make");
      console.error("sure the OTHER owner can still sign in first.");
      process.exit(1);
    }

    // CRYP-103b (C-2): hard-cap owners at OWNER_CAP. Owners are the un-deletable root of
    // trust — keep exactly two. Only a fresh owner mint is capped (re-setting an existing
    // owner, granting a manager, or revoking all pass); --force is the deliberate escape.
    if (role === "owner") {
      const cap = ownerCapDecision({ role, currentRole: current.role, ownerCount: await countOwners(), force });
      if (!cap.allowed) {
        console.error(`Refusing: there are already ${cap.ownerCount} owners (cap is ${cap.cap}).`);
        console.error("Owners are the un-deletable root of trust — keep exactly two.");
        console.error("Re-run with --force ONLY if you are deliberately changing the owner set");
        console.error("(e.g. rotating an owner) and the other owner can still sign in.");
        process.exit(1);
      }
    }

    // setCustomUserClaims REPLACES the object wholesale — always write the complete
    // shape. Revoking clears it entirely rather than leaving {admin:false} lying
    // around, so the token simply has no admin key (what firestore.rules assumes).
    const claims = revoke ? null : { admin: true, role };
    await auth.setCustomUserClaims(user.uid, claims);

    // Claims are baked into the ID token, so without this the change wouldn't apply
    // until the current token expired (~1h). Matters most when REMOVING access.
    await auth.revokeRefreshTokens(user.uid);

    console.log(`${email} (uid: ${user.uid}) → ${describe(claims || {})}`);
    console.log("Refresh tokens revoked — they must sign in again for it to apply.");
    process.exit(0);
  } catch (err) {
    console.error("Failed:", err.message);
    process.exit(1);
  }
})();
