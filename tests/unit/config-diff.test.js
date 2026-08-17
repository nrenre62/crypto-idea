import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { diffConfig, formatConfigDiff, auditDetailsFor, SECRET_PATHS, DETAILS_MAX, REDACTED_DETAILS } from "../../functions/config-diff.js";

// ADMIN-3 (2026-07-24): saveConfig used to log "updated app config", which made a bad
// edit impossible to inspect or undo from the audit log. These helpers turn the
// before/after config into a field-level summary — and MUST never let a secret value
// through, because every admin can read the audit tab.

describe("config-diff.diffConfig", () => {
  it("returns [] when nothing changed", () => {
    const cfg = { flags: { maintenance: false }, plans: { pro: { price: 9.99 } } };
    expect(diffConfig(cfg, { flags: { maintenance: false }, plans: { pro: { price: 9.99 } } })).toEqual([]);
  });

  it("reports a changed scalar with its old and new value", () => {
    const out = diffConfig({ flags: { maintenance: false } }, { flags: { maintenance: true } });
    expect(out).toEqual(["flags.maintenance: false → true"]);
  });

  it("reports nested plan edits by full dotted path", () => {
    const before = { plans: { pro: { price: 9.99, coins: 50 } } };
    const after  = { plans: { pro: { price: 12.99, coins: 50 } } };
    expect(diffConfig(before, after)).toEqual(["plans.pro.price: 9.99 → 12.99"]);
  });

  it("renders an empty string as (empty) and a missing prior value as (unset)", () => {
    const out = diffConfig({ legal: {} }, { legal: { termlyPrivacyId: "abc123" } });
    expect(out).toEqual(["legal.termlyPrivacyId: (unset) → abc123"]);
    const cleared = diffConfig({ legal: { termlyPrivacyId: "abc123" } }, { legal: { termlyPrivacyId: "" } });
    expect(cleared).toEqual(["legal.termlyPrivacyId: abc123 → (empty)"]);
  });

  it("ignores the updatedAt bookkeeping field", () => {
    expect(diffConfig({ updatedAt: 1 }, { updatedAt: 2 })).toEqual([]);
  });

  // ── the security-critical cases ─────────────────────────────────────────────
  it("NEVER writes a secret value — a changed secret records only (changed)", () => {
    const before = { coingecko: "OLD-CG-KEY", paypal: { secret: "OLD-PP" }, email: { smtpPass: "OLD-MAIL" }, ai: { providerKey: "OLD-AI" } };
    const after  = { coingecko: "NEW-CG-KEY", paypal: { secret: "NEW-PP" }, email: { smtpPass: "NEW-MAIL" }, ai: { providerKey: "NEW-AI" } };
    const out = diffConfig(before, after);
    expect(out).toEqual([
      "coingecko: (changed)",
      "paypal.secret: (changed)",
      "email.smtpPass: (changed)",
      "ai.providerKey: (changed)",
    ]);
    const joined = out.join(" ");
    for (const v of ["OLD-CG-KEY", "NEW-CG-KEY", "OLD-PP", "NEW-PP", "OLD-MAIL", "NEW-MAIL", "OLD-AI", "NEW-AI"]) {
      expect(joined).not.toContain(v);
    }
  });

  it("every SECRET_PATH is redacted, not just the four spot-checked above", () => {
    for (const path of SECRET_PATHS) {
      const parts = path.split(".");
      const build = (v) => parts.reduceRight((acc, k) => ({ [k]: acc }), v);
      const out = diffConfig(build("before-value"), build("after-value"));
      expect(out).toEqual([path + ": (changed)"]);
      expect(out.join()).not.toContain("after-value");
    }
  });

  it("every keep()-guarded field in saveConfig is registered as a SECRET_PATH", () => {
    /* SECRET_PATHS is hand-maintained against saveConfig's keep() call sites, and the
       module header states the rule as mechanical ("keep()-guarded ⇒ secret") — but
       nothing enforced it, so adding a keep()-guarded field and forgetting this list
       would quietly start writing its VALUE into an audit log every admin can read.
       (ADMIN-1's listWebhookEvents went unlisted in the gate matrix for three months
       the same way.) This is a COUNT check: it catches the forgotten registration,
       not a wrong path — the per-path redaction test above covers behaviour. */
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(here, "../../functions/index.js"), "utf8");
    const save = src.slice(src.indexOf("exports.saveConfig = functions.https.onCall("));
    const body = save.slice(0, save.indexOf("\n});"));
    const guarded = [...body.matchAll(/[:=]\s*keep\(/g)].length;
    expect(guarded, `${guarded} keep()-guarded field(s) vs ${SECRET_PATHS.size} SECRET_PATHS — register the new one`)
      .toBe(SECRET_PATHS.size);
  });

  it("an UNCHANGED secret produces no entry at all (the keep() idiom re-saves it)", () => {
    // Re-saving the form without retyping a key means before === after — nothing to log.
    const cfg = { coingecko: "SAME-KEY", paypal: { secret: "SAME" } };
    expect(diffConfig(cfg, { coingecko: "SAME-KEY", paypal: { secret: "SAME" } })).toEqual([]);
  });

  it("does NOT report a phantom rotation for a secret that was never set", () => {
    // The first save writes "" for a key the stored doc doesn't have at all. undefined → ""
    // is not a rotation, and logging "(changed)" would raise a false security signal —
    // made worse by secrets sorting first. Observed for real on a first save 2026-07-24.
    expect(diffConfig({}, { coingecko: "", paypal: { secret: "" }, ai: { providerKey: "" } })).toEqual([]);
    expect(diffConfig({ coingecko: "" }, { coingecko: "" })).toEqual([]);
    expect(diffConfig({ email: {} }, { email: { smtpPass: "" } })).toEqual([]);
  });

  it("STILL reports a real rotation, and a real clearing", () => {
    // The blank-collapse must not swallow an actual change in either direction.
    expect(diffConfig({}, { coingecko: "NEW-KEY" })).toEqual(["coingecko: (changed)"]);
    expect(diffConfig({ coingecko: "OLD" }, { coingecko: "" })).toEqual(["coingecko: (changed)"]);
  });

  it("does not swallow false or 0, which are real values, not blanks", () => {
    expect(diffConfig({ flags: {} }, { flags: { maintenance: false } })).toEqual(["flags.maintenance: (unset) → false"]);
    expect(diffConfig({ plans: {} }, { plans: { free: { price: 0 } } })).toEqual(["plans.free.price: (unset) → 0"]);
  });

  // ── merge:true semantics ────────────────────────────────────────────────────
  it("does NOT report a phantom removal for a stored key the payload omits", () => {
    // saveConfig writes with {merge:true}, so a key absent from the payload is KEPT.
    // Walking the union of keys would log "legacyField: kept-value → (unset)" — a lie.
    const before = { legacyField: "still-there", flags: { maintenance: false } };
    const after  = { flags: { maintenance: true } };
    expect(diffConfig(before, after)).toEqual(["flags.maintenance: false → true"]);
  });

  it("survives null/undefined inputs", () => {
    expect(diffConfig(null, null)).toEqual([]);
    expect(diffConfig(undefined, { flags: { maintenance: true } })).toEqual(["flags.maintenance: (unset) → true"]);
  });

  it("truncates a very long string value instead of writing it whole", () => {
    const long = "x".repeat(200);
    const out = diffConfig({ legal: { termlyUuid: "" } }, { legal: { termlyUuid: long } });
    expect(out[0].length).toBeLessThan(120);
    expect(out[0]).toContain("…");
  });
});

describe("config-diff.formatConfigDiff", () => {
  it("says 'no changes' for an empty diff", () => {
    expect(formatConfigDiff([])).toBe("no changes");
    expect(formatConfigDiff(null)).toBe("no changes");
  });

  it("joins changes with commas", () => {
    expect(formatConfigDiff(["a: 1 → 2", "b: 3 → 4"])).toBe("a: 1 → 2, b: 3 → 4");
  });

  it("bounds the details string INCLUDING the suffix, and says how many it dropped", () => {
    const many = Array.from({ length: 60 }, (_, i) => `plans.pro.field${i}: 0 → ${i}`);
    const out = formatConfigDiff(many);
    // The bound must hold for the FINAL string — it is the maxLength the API contract
    // declares for AuditEntry.details, so an over-long value would break the spec.
    expect(out.length).toBeLessThanOrEqual(DETAILS_MAX);
    expect(out).toMatch(/\(\+\d+ more\)$/);
    // Never cuts an entry in half — the last kept change is whole.
    expect(out.split(" (+")[0].endsWith("…")).toBe(false);
  });

  it("still honours the bound when a SINGLE change is longer than the whole budget", () => {
    const huge = "legal.termlyUuid: " + "y".repeat(2000);
    const out = formatConfigDiff([huge, "flags.maintenance: false → true"]);
    expect(out.length).toBeLessThanOrEqual(DETAILS_MAX);
    expect(out).toMatch(/\(\+\d+ more\)$/);
    expect(out.length).toBeGreaterThan(20);   // keeps a useful head, not just the suffix
  });

  it("keeps everything when it fits", () => {
    const few = ["flags.maintenance: false → true"];
    expect(formatConfigDiff(few)).toBe("flags.maintenance: false → true");
    expect(formatConfigDiff(few)).not.toContain("more)");
  });

  it("puts SECRET rotations first so the cap can never drop them", () => {
    // A first save writes every plan field too. If ordering were preserved, the
    // security-relevant "an API key was set" lines would be the ones truncated away —
    // the log would then be silent about exactly the change that matters most.
    const noise = Array.from({ length: 60 }, (_, i) => `plans.pro.field${i}: 0 → ${i}`);
    const out = formatConfigDiff([...noise, "ai.providerKey: (changed)", "coingecko: (changed)"]);
    expect(out.startsWith("ai.providerKey: (changed), coingecko: (changed)")).toBe(true);
    expect(out).toContain("ai.providerKey: (changed)");
    expect(out).toContain("coingecko: (changed)");
    expect(out.length).toBeLessThanOrEqual(DETAILS_MAX);
  });

  it("still reads naturally when there is nothing to reorder", () => {
    const out = formatConfigDiff(["flags.maintenance: false → true", "plans.pro.price: 9.99 → 12.99"]);
    expect(out).toBe("flags.maintenance: false → true, plans.pro.price: 9.99 → 12.99");
  });
});

// The audit log is readable by ANY admin (listAudit is assertAdmin), but Settings is
// owner-only behind a step-up re-auth. Echoing the diff to a manager would route around
// that boundary — a privilege leak introduced BY the diff feature itself.
describe("config-diff.auditDetailsFor (owner-only config detail)", () => {
  const DIFF = "plans.pro.price: 9.99 → 12.99, legal.termlyUuid: (unset) → abc";

  it("gives an OWNER the full config diff", () => {
    expect(auditDetailsFor("saveConfig", DIFF, true)).toBe(DIFF);
  });

  it("withholds the config diff from a NON-owner (manager / legacy admin)", () => {
    expect(auditDetailsFor("saveConfig", DIFF, false)).toBe(REDACTED_DETAILS);
    // The trail itself is not hidden — only the content.
    expect(auditDetailsFor("saveConfig", DIFF, false)).toMatch(/settings changed/i);
    // and none of the owner-only values leak through it
    expect(auditDetailsFor("saveConfig", DIFF, false)).not.toContain("12.99");
    expect(auditDetailsFor("saveConfig", DIFF, false)).not.toContain("abc");
  });

  it("does NOT touch other actions — a manager still sees what they did", () => {
    expect(auditDetailsFor("setUserTier", "tier=pro", false)).toBe("tier=pro");
    expect(auditDetailsFor("suspendUser", "", false)).toBe("");
    expect(auditDetailsFor("adminTrashUser", "x", false)).toBe("x");
  });

  it("is safe on missing/empty input", () => {
    expect(auditDetailsFor("", "", false)).toBe("");
    expect(auditDetailsFor("saveConfig", "", false)).toBe(REDACTED_DETAILS);
    expect(auditDetailsFor("setUserTier", undefined, true)).toBe("");
  });
});
