import { describe, it, expect } from "vitest";
import { sortTx, txCreatedMillis, pageWindow, appendUnique, dedupeById } from "../../src/utils/tx.js";

describe("tx utils (R19-4/R19-5)", () => {
  describe("txCreatedMillis normalizes every createdAt shape", () => {
    it("number passes through; ISO string parses; missing → 0", () => {
      expect(txCreatedMillis({ createdAt: 1700000000000 })).toBe(1700000000000);
      expect(txCreatedMillis({ createdAt: "2024-01-01T00:00:00.000Z" })).toBe(Date.parse("2024-01-01T00:00:00.000Z"));
      expect(txCreatedMillis({})).toBe(0);
      expect(txCreatedMillis(null)).toBe(0);
    });
    it("Firestore Timestamp (.toMillis) and serialized {seconds}/{_seconds}", () => {
      expect(txCreatedMillis({ createdAt: { toMillis: () => 42000 } })).toBe(42000);
      expect(txCreatedMillis({ createdAt: { seconds: 5 } })).toBe(5000);
      expect(txCreatedMillis({ createdAt: { _seconds: 7 } })).toBe(7000);
    });
  });

  describe("sortTx — newest first, same-minute tie-break by createdAt", () => {
    it("orders by transaction date descending", () => {
      const out = sortTx([
        { id: "old", date: "2024-01-01T10:00", createdAt: 1 },
        { id: "new", date: "2024-03-01T10:00", createdAt: 1 },
        { id: "mid", date: "2024-02-01T10:00", createdAt: 1 },
      ]);
      expect(out.map(e => e.id)).toEqual(["new", "mid", "old"]);
    });
    it("breaks a same-minute tie by createdAt (most-recently-added on top)", () => {
      const out = sortTx([
        { id: "first", date: "2024-01-01T10:00", createdAt: 100 },
        { id: "second", date: "2024-01-01T10:00", createdAt: 200 }, // added later
      ]);
      expect(out.map(e => e.id)).toEqual(["second", "first"]);
    });
    it("a backdated tx sorts to its real date, not the top", () => {
      const out = sortTx([
        { id: "today", date: "2024-05-01T09:00", createdAt: 100 },
        { id: "backdated", date: "2020-01-01T09:00", createdAt: 999 }, // newest add, oldest date
      ]);
      expect(out.map(e => e.id)).toEqual(["today", "backdated"]);
    });
    it("missing createdAt sorts last within its date group; input not mutated", () => {
      const input = [
        { id: "a", date: "2024-01-01T10:00" },              // no createdAt → 0
        { id: "b", date: "2024-01-01T10:00", createdAt: 5 },
      ];
      const out = sortTx(input);
      expect(out.map(e => e.id)).toEqual(["b", "a"]);
      expect(input[0].id).toBe("a"); // original order untouched (returns a copy)
    });
    it("empty / null input → []", () => {
      expect(sortTx([])).toEqual([]);
      expect(sortTx(null)).toEqual([]);
    });
  });

  describe("pageWindow", () => {
    it("small counts list every page (no ellipsis)", () => {
      expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
      expect(pageWindow(2, 2)).toEqual([1, 2]);
    });
    it("windows a large count with ellipses around the current page", () => {
      expect(pageWindow(6, 20)).toEqual([1, "…", 5, 6, 7, "…", 20]);
      expect(pageWindow(1, 20)).toEqual([1, 2, "…", 20]);
      expect(pageWindow(20, 20)).toEqual([1, "…", 19, 20]);
    });
  });

  // TX-SAFE (Part B): the optimistic-append + render dedupe that stop one delete from
  // removing two rows (a duplicate id => a duplicate React key).
  describe("TX-SAFE appendUnique — idempotent optimistic append", () => {
    it("TX-SAFE: appends a row whose id is new", () => {
      expect(appendUnique([{ id: "a" }], { id: "b" }).map(e => e.id)).toEqual(["a", "b"]);
    });
    it("TX-SAFE: is a no-op when the id already exists (the watcher already delivered it)", () => {
      const arr = [{ id: "a" }];
      expect(appendUnique(arr, { id: "a" })).toBe(arr); // same reference, not doubled
    });
    it("TX-SAFE: tolerates a null/undefined list", () => {
      expect(appendUnique(null, { id: "a" }).map(e => e.id)).toEqual(["a"]);
      expect(appendUnique(undefined, { id: "a" }).map(e => e.id)).toEqual(["a"]);
    });
  });

  describe("TX-SAFE dedupeById — defensive render dedupe", () => {
    it("TX-SAFE: keeps the first occurrence of each id", () => {
      const out = dedupeById([{ id: "a", n: 1 }, { id: "a", n: 2 }, { id: "b", n: 3 }]);
      expect(out.map(e => e.id)).toEqual(["a", "b"]);
      expect(out[0].n).toBe(1); // first wins
    });
    it("TX-SAFE: leaves an already-unique list unchanged", () => {
      expect(dedupeById([{ id: "a" }, { id: "b" }]).map(e => e.id)).toEqual(["a", "b"]);
    });
    it("TX-SAFE: empty / null -> []", () => {
      expect(dedupeById([])).toEqual([]);
      expect(dedupeById(null)).toEqual([]);
    });
  });
});
