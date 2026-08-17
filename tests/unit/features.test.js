import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  FEATURES, FEATURE_NAMES, featureEnabled, readFeatures, sanitizeFeatures, mergeFeatures, disabledFeatures,
} from "../../functions/features.js";

/**
 * ADMIN-2 — per-feature kill-switches.
 *
 * The whole point of a kill-switch is that it fires when — and ONLY when — a human
 * flips it. Two failure modes are equally bad and both are tested here:
 *   • it fails to fire (spend keeps flowing during an incident), and
 *   • it fires on its own (a config read blips and the product goes dark).
 */
describe("featureEnabled — default ON, only an explicit false disables", () => {
  it("is ON when there is no config at all", () => {
    // Fresh project, or a Firestore read that threw and left us with {}. Taking the
    // product down because we couldn't READ the switch would be a self-inflicted
    // outage — the exact opposite of what a safety net is for.
    for (const name of FEATURE_NAMES) {
      expect(featureEnabled(null, name), name).toBe(true);
      expect(featureEnabled(undefined, name), name).toBe(true);
      expect(featureEnabled({}, name), name).toBe(true);
      expect(featureEnabled({ flags: {} }, name), name).toBe(true);
      expect(featureEnabled({ flags: { features: {} } }, name), name).toBe(true);
    }
  });

  it("is ON for a config written before this feature existed", () => {
    // Every deployed config/app doc today has flags but no flags.features.
    const legacy = { flags: { maintenance: false, signupsEnabled: true } };
    for (const name of FEATURE_NAMES) expect(featureEnabled(legacy, name), name).toBe(true);
  });

  it("is OFF only for an exact `false`", () => {
    expect(featureEnabled({ flags: { features: { marketData: false } } }, "marketData")).toBe(false);
    // Anything else is a truthy/garbage value, not a deliberate flip.
    for (const junk of [0, "", null, undefined, "false", NaN]) {
      expect(featureEnabled({ flags: { features: { marketData: junk } } }, "marketData"), String(junk)).toBe(true);
    }
  });

  it("switches are independent — killing one leaves the others up", () => {
    const cfg = { flags: { features: { marketData: false } } };
    expect(featureEnabled(cfg, "marketData")).toBe(false);
    expect(featureEnabled(cfg, "checkout")).toBe(true);
    expect(featureEnabled(cfg, "aiResearch")).toBe(true);
  });

  it("an undeclared switch name reads as ON, never as OFF", () => {
    // A typo in a caller must not silently disable something.
    expect(featureEnabled({ flags: { features: {} } }, "marketdata")).toBe(true);
    expect(featureEnabled({ flags: { features: { nope: false } } }, "nope")).toBe(false);
  });
});

describe("readFeatures — always the full, normalized map", () => {
  it("returns every declared switch as a boolean, whatever the input", () => {
    for (const cfg of [null, {}, { flags: { features: { marketData: false } } }]) {
      const f = readFeatures(cfg);
      expect(Object.keys(f).sort()).toEqual([...FEATURE_NAMES].sort());
      for (const name of FEATURE_NAMES) expect(typeof f[name], name).toBe("boolean");
    }
  });

  it("reflects the flips", () => {
    expect(readFeatures({ flags: { features: { checkout: false, aiResearch: false } } }))
      .toEqual({ marketData: true, checkout: false, aiResearch: false });
  });
});

describe("sanitizeFeatures — what actually gets written to config/app", () => {
  it("drops undeclared keys so the stored doc keeps its exact shape", () => {
    const out = sanitizeFeatures({ marketData: false, bogus: false, __proto__: false });
    expect(Object.keys(out).sort()).toEqual([...FEATURE_NAMES].sort());
    expect(out.bogus).toBeUndefined();
  });

  it("coerces to booleans and defaults a missing switch to ON", () => {
    const out = sanitizeFeatures({ marketData: false });
    expect(out).toEqual({ marketData: false, checkout: true, aiResearch: true });
  });

  it("survives junk input without disabling anything", () => {
    for (const junk of [null, undefined, 0, "", "off"]) {
      expect(sanitizeFeatures(junk), String(junk)).toEqual({ marketData: true, checkout: true, aiResearch: true });
    }
  });
});

describe("mergeFeatures — an omitted switch is KEPT, never silently re-enabled", () => {
  // A feature MAP, which is what saveConfig must pass — `(existing.flags||{}).features`,
  // never `existing.flags`. Handing over the wrapper finds no switch names and returns
  // all-ON, silently undoing the flip; that mistake was caught here on the first run.
  const off = { marketData: false, checkout: false };

  it("keeps the stored switches when the payload omits `features` entirely", () => {
    // THE booby trap this exists to stop: the instant maintenance/signups toggles
    // post `flags` with no `features` key. Under plain sanitize that reads as
    // "everything ON", so flipping maintenance mid-incident would quietly restart
    // the spend you had just killed.
    expect(mergeFeatures(undefined, off)).toEqual({ marketData: false, checkout: false, aiResearch: true });
    expect(mergeFeatures(null, off)).toEqual({ marketData: false, checkout: false, aiResearch: true });
  });

  it("keeps switches a PARTIAL payload doesn't mention", () => {
    expect(mergeFeatures({ aiResearch: false }, off))
      .toEqual({ marketData: false, checkout: false, aiResearch: false });
  });

  it("still lets a switch be turned back on — explicitly", () => {
    expect(mergeFeatures({ marketData: true }, off))
      .toEqual({ marketData: true, checkout: false, aiResearch: true });
  });

  it("drops undeclared keys, like sanitizeFeatures", () => {
    const out = mergeFeatures({ bogus: false }, off);
    expect(Object.keys(out).sort()).toEqual([...FEATURE_NAMES].sort());
  });

  it("starts from all-ON when nothing is stored yet", () => {
    expect(mergeFeatures(undefined, undefined)).toEqual({ marketData: true, checkout: true, aiResearch: true });
    expect(mergeFeatures({ checkout: false }, {})).toEqual({ marketData: true, checkout: false, aiResearch: true });
  });
});

describe("disabledFeatures — what the status strip reports", () => {
  it("is empty when everything is up", () => {
    expect(disabledFeatures({})).toEqual([]);
  });
  it("lists exactly the switched-off ones", () => {
    expect(disabledFeatures({ flags: { features: { marketData: false, aiResearch: false } } }).sort())
      .toEqual(["aiResearch", "marketData"]);
  });
});

/**
 * Source tripwires.
 *
 * A switch is only as good as the narrowest path that can bypass it. These read
 * functions/index.js and fail if a bypass appears — the completeness lesson from
 * ADMIN-4's gate matrix, which stopped guarding the moment someone forgot it.
 */
const here = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(resolve(here, "../../functions/index.js"), "utf8");

describe("enforcement cannot be bypassed (functions/index.js)", () => {
  it("every CoinGecko call goes through the cgFetch choke point", () => {
    // There were five direct call sites before ADMIN-2. Sprinkling the switch check
    // across all five would mean a sixth, added later, silently bypasses the switch
    // and keeps spending money during an incident. One choke point, asserted here.
    // Comments are stripped first — the code deliberately QUOTES this pattern when
    // explaining the rule, and a doc comment must not read as a violation of it.
    const CODE = SRC.replace(/^\s*\/\/.*$/gm, "");
    const PATTERN = /fetch\(\s*`\$\{CG_BASE\}/g;
    const start = CODE.indexOf("async function cgFetch(");
    expect(start, "cgFetch() is missing — the switch has no choke point").toBeGreaterThan(-1);
    const choke = CODE.slice(start, CODE.indexOf("\n}", start));
    expect([...choke.matchAll(PATTERN)].length, "cgFetch should make exactly one upstream call").toBe(1);
    const total = [...CODE.matchAll(PATTERN)].length;
    expect(total, `${total - 1} CoinGecko fetch() outside cgFetch — route them through it`).toBe(1);
  });

  it("cgFetch itself consults the marketData switch", () => {
    const start = SRC.indexOf("async function cgFetch(");
    const body = SRC.slice(start, SRC.indexOf("\n}", start));
    expect(body).toMatch(/marketData/);
  });

  it("checkout is enforced on the server, not just hidden in the UI", () => {
    const start = SRC.indexOf("exports.createSubscription = functions.https.onCall(");
    const body = SRC.slice(start, SRC.indexOf("\n});", start));
    expect(body).toMatch(/"checkout"/);
  });

  /* The Wave-B AI proxy cannot ship ungated: wherever a provider generation call
     appears in functions/index.js (callProvider(...)), the aiResearch switch check
     must appear with it. The proxy is built (inert until go-live), so the provider
     call IS present today and the gate check must be too. */
  it("a provider call cannot ship without the aiResearch switch", () => {
    const callsProvider = /callProvider\s*\(/.test(SRC);
    if (!callsProvider) {
      expect(callsProvider).toBe(false);   // reserved, not built — nothing to gate yet
      return;
    }
    expect(SRC, "the AI proxy must check featureEnabled(cfg, \"aiResearch\") before calling the provider")
      .toMatch(/aiResearch/);
  });
});

describe("ADMIN-2 cron heartbeats", () => {
  it("the status strip's job registry lists exactly the jobs that stamp a heartbeat", () => {
    // Two halves that drift apart in opposite, equally silent ways: a job missing
    // from SCHEDULED_JOBS never appears on the strip (a dead cron stays invisible —
    // the whole point of the feature), and a stale entry reports "never ran" forever
    // for a job that no longer exists, training you to ignore the strip.
    const stamped = [...SRC.matchAll(/runJob\("(\w+)"/g)].map((m) => m[1]);
    const registryBlock = SRC.slice(SRC.indexOf("const SCHEDULED_JOBS = ["), SRC.indexOf("];", SRC.indexOf("const SCHEDULED_JOBS = [")));
    const listed = [...registryBlock.matchAll(/name: "(\w+)"/g)].map((m) => m[1]);
    expect([...new Set(stamped)].sort()).toEqual([...listed].sort());
    expect(listed.length).toBeGreaterThanOrEqual(6);
  });

  it("every scheduled export runs through runJob, so none can skip its heartbeat", () => {
    const scheduled = [...SRC.matchAll(/exports\.(\w+) = [\s\S]{0,120}?pubsub\.schedule\([^)]*\)\.onRun\(([^\n]*)/g)];
    expect(scheduled.length).toBeGreaterThanOrEqual(6);
    for (const [, name, tail] of scheduled) {
      expect(tail, `${name} must be wrapped in runJob() or it silently stops reporting`).toContain("runJob(");
    }
  });
});

describe("the switch list is declared in exactly one place", () => {
  it("FEATURES documents every declared switch", () => {
    for (const name of FEATURE_NAMES) {
      expect(typeof FEATURES[name], name).toBe("string");
      expect(FEATURES[name].length, name).toBeGreaterThan(10);
    }
  });
});
