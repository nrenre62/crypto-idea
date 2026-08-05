import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import {
  findBrandViolations,
  listShippedFiles,
  BRAND_RULES,
  REPO_ROOT,
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

  it("enumerates all six brand rules as data", () => {
    expect(BRAND_RULES.map((r) => r.id)).toEqual([
      "purple",
      "split-wordmark",
      "two-word",
      "loading-admin",
      "loading-data",
      "loading-dots",
    ]);
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
