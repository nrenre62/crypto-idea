import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import {
  findBrandViolations,
  listShippedFiles,
  BRAND_RULES,
  REPO_ROOT,
  REQUIRED_LOCKUPS,
  findMissingLockups,
  REQUIRED_FONTS,
  findMissingFonts,
  REQUIRED_SOURCE,
  findMissingSource,
} from "../../scripts/check-brand.js";

// LOGO-2 brand guard. Mirrors the dist-name guard (#24): a PURE matcher whose
// behaviour is pinned by unit cases, then a repo file-walk that must find ZERO
// stale-brand artefacts in shipped client code. The matcher cases lock the exact
// bad/good boundary; the walk is the enforcement that fails the suite while any
// #6C5CE7 / two-word "Crypto Idea" / legacy loading string still ships.
describe("brand guard — findBrandViolations matcher (LOGO-2)", () => {
  it("flags the off-brand purple #6C5CE7 (case-insensitive)", () => {
    expect(findBrandViolations("border-top-color: #6C5CE7;")).not.toEqual([]);
    expect(findBrandViolations("color:#6c5ce7")).not.toEqual([]);
  });

  it("flags the split two-word wordmark (Crypto <tag>Idea)", () => {
    expect(findBrandViolations("Crypto <b>Idea</b>")).not.toEqual([]);
    expect(findBrandViolations("Crypto <span>Idea</span>")).not.toEqual([]);
    expect(findBrandViolations("Crypto<b>Idea</b>")).not.toEqual([]);
  });

  it("flags the plain two-word 'Crypto Idea'", () => {
    expect(findBrandViolations("Welcome to Crypto Idea")).not.toEqual([]);
  });

  it("flags the UPPERCASE two-word 'CRYPTO IDEA' (the two-word rule is case-insensitive)", () => {
    // The old Pulse share-image drew the wordmark as the uppercase string
    // 'CRYPTO IDEA', which a case-sensitive rule silently let through.
    expect(findBrandViolations("tracked(x, 'CRYPTO IDEA', 7, P, 156)")).not.toEqual([]);
    expect(findBrandViolations("CRYPTO IDEA")).not.toEqual([]);
    expect(findBrandViolations("Crypto IDEA")).not.toEqual([]);
  });

  it("flags the legacy loading strings ('Loading admin', 'Loading your data', 'Loading...')", () => {
    expect(findBrandViolations("Loading admin…")).not.toEqual([]);
    expect(findBrandViolations("Loading your data...")).not.toEqual([]);
    expect(findBrandViolations("<p>Loading...</p>")).not.toEqual([]);
  });

  it("does NOT flag the one-word 'CryptoIdea' or the ellipsis 'Loading…'", () => {
    expect(findBrandViolations("CryptoIdea")).toEqual([]);
    expect(findBrandViolations("Loading…")).toEqual([]);
    expect(findBrandViolations("Welcome to CryptoIdea — Loading…")).toEqual([]);
  });

  it("index.html is the canonical wordmark source and is already clean", () => {
    const html = readFileSync(join(REPO_ROOT, "index.html"), "utf8");
    expect(findBrandViolations(html)).toEqual([]);
  });

  it("enumerates all six brand rules as data, and the two-word rule is case-insensitive", () => {
    expect(BRAND_RULES.map((r) => r.id)).toEqual([
      "purple",
      "split-wordmark",
      "two-word",
      "loading-admin",
      "loading-data",
      "loading-dots",
    ]);
    // The uppercase 'CRYPTO IDEA' form is only caught when this rule carries the
    // /i flag — pin it so a revert to case-sensitive fails the meta-test.
    const twoWord = BRAND_RULES.find((r) => r.id === "two-word");
    expect(twoWord.re.flags).toContain("i");
  });
});

// ── ALLOWLIST: the complete tile+wordmark lockup must be PRESENT on every surface
// that shows the logo (brand-lockup unification). These walks are RED until the
// legal pages, the /edge header, and the two logo stylesheets carry the full
// index.html lockup; they must never be weakened to pass.
describe("brand guard — required tile+wordmark lockup on the legal pages (AC1)", () => {
  it("terms.html & privacy.html render the full 'C' tile lockup, not a text-only wordmark", () => {
    expect(REQUIRED_LOCKUPS.map((r) => r.file)).toEqual(["terms.html", "privacy.html"]);
    expect(findMissingLockups(REPO_ROOT)).toEqual([]);
  });
});

describe("brand guard — brand fonts on the legal pages (AC2)", () => {
  it("terms.html & privacy.html load Fraunces + Hanken Grotesk from Google Fonts", () => {
    expect(REQUIRED_FONTS).toEqual(["terms.html", "privacy.html"]);
    expect(findMissingFonts(REPO_ROOT)).toEqual([]);
  });
});

describe("brand guard — required brand source markers (AC3 + AC6)", () => {
  it("/edge uses the shared <Logo>, and both logo stylesheets pin #0b6b4f + the hover-rotate", () => {
    // Enumerated as data so a dropped marker shows up in the diff, not just a count.
    expect(REQUIRED_SOURCE.map((r) => r.file)).toContain("src/components/education-page.jsx");
    expect(REQUIRED_SOURCE.map((r) => r.file)).toContain("src/styles/app.css");
    expect(REQUIRED_SOURCE.map((r) => r.file)).toContain("src/styles/admin-settings.css");
    expect(findMissingSource(REPO_ROOT)).toEqual([]);
  });
});

describe("brand guard — no stale brand in shipped client code (LOGO-2)", () => {
  it("has zero brand violations across the shipped HTML + src/**", () => {
    const offenders = [];
    for (const file of listShippedFiles(REPO_ROOT)) {
      const hits = findBrandViolations(readFileSync(file, "utf8"));
      if (hits.length) offenders.push(`${relative(REPO_ROOT, file)}: ${hits.join(", ")}`);
    }
    // Fail loudly WITH the offending files so the builder knows exactly what to purge.
    expect(offenders).toEqual([]);
  });
});
