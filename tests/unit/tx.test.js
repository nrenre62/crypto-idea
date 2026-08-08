import { describe, it, expect } from "vitest";
import { sortTx, txCreatedMillis, pageWindow, appendUnique, dedupeById, firstOverSoldSell, isFutureTx } from "../../src/utils/tx.js";

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

  // CRYP-94 (Group B, findings 9+10 — the sell invariant). firstOverSoldSell replays the
  // coin's timeline in date order and returns the FIRST sell whose running balance drops
  // below 0 (epsilon -1e-8), else null. It is the single source of truth the add-sell guard,
  // the edit guard, and remEntry all route through. Date-aware, so a buy dated AFTER a sell
  // does not cover it.
  describe("firstOverSoldSell — the oversell invariant", () => {
    const buy = (amount, date, extra = {}) => ({ type: "buy", amount, date, ...extra });
    const sell = (amount, date, extra = {}) => ({ type: "sell", amount, date, ...extra });

    it("CRYP-94: a valid book (buy 0.3 then sell 0.2) has no over-sold sell → null", () => {
      expect(firstOverSoldSell([buy(0.3, "2024-01-01T00:00"), sell(0.2, "2024-02-01T00:00")])).toBeNull();
    });

    it("CRYP-94: the founder exploit — buy 2, sell 2, then the buy projected down to 0.2 returns the sell", () => {
      // the projected timeline the edit path builds when a buy is edited below what a sell needs
      const offending = firstOverSoldSell([buy(0.2, "2024-01-01T00:00"), sell(2, "2024-02-01T00:00", { id: "s1" })]);
      expect(offending).not.toBeNull();
      expect(offending.type).toBe("sell");
      expect(offending.id).toBe("s1");
    });

    it("CRYP-94: date-aware — a buy dated AFTER a sell does not cover it", () => {
      // holdings at the sell's date are 0 even though the net over all time is >= 0
      const offending = firstOverSoldSell([sell(1, "2024-01-01T00:00", { id: "s1" }), buy(5, "2024-06-01T00:00")]);
      expect(offending?.id).toBe("s1");
    });

    it("CRYP-94: a backdated sell inserted between existing dates breaks a later sell (finding 9)", () => {
      // buy 10 @d1, sell 10 @d5, then a backdated sell 5 @d3 → the d5 sell now over-sells
      const entries = [
        buy(10, "2024-01-01T00:00"),
        sell(5, "2024-01-03T00:00", { id: "mid" }),
        sell(10, "2024-01-05T00:00", { id: "late" }),
      ];
      // the mid sell (d3) still has 10 held; the late sell (d5) drops the balance to -5
      expect(firstOverSoldSell(entries)?.id).toBe("late");
    });

    it("CRYP-94: a buy→sell flip that over-sells is caught", () => {
      const offending = firstOverSoldSell([buy(1, "2024-01-01T00:00"), sell(1, "2024-02-01T00:00"), sell(1, "2024-02-01T00:00", { id: "flip" })]);
      expect(offending?.id).toBe("flip");
    });

    it("CRYP-94: the -1e-8 epsilon boundary — an exact sell-all is not over-sold", () => {
      expect(firstOverSoldSell([buy(1, "2024-01-01T00:00"), sell(1, "2024-02-01T00:00")])).toBeNull();
      // a float dust overshoot beyond epsilon IS caught
      expect(firstOverSoldSell([buy(1, "2024-01-01T00:00"), sell(1.0001, "2024-02-01T00:00", { id: "over" })])?.id).toBe("over");
    });

    it("CRYP-94: empty / null input → null (nothing to over-sell)", () => {
      expect(firstOverSoldSell([])).toBeNull();
      expect(firstOverSoldSell(null)).toBeNull();
    });
  });

  // CRYP-94 (Group B, finding 12 — future-dated transactions). Pure day-granularity check so
  // a transaction can't be dated after "today"; the caller passes today's date for determinism.
  describe("isFutureTx — reject future-dated transactions", () => {
    const TODAY = "2024-06-15";
    it("CRYP-94: a far-future date (2099) is future", () => {
      expect(isFutureTx("2099-01-01T00:00", TODAY)).toBe(true);
    });
    it("CRYP-94: a past date is not future", () => {
      expect(isFutureTx("2020-01-01T00:00", TODAY)).toBe(false);
    });
    it("CRYP-94: same day (any time today) is allowed", () => {
      expect(isFutureTx("2024-06-15T23:59", TODAY)).toBe(false);
    });
    it("CRYP-94: tomorrow is future", () => {
      expect(isFutureTx("2024-06-16T00:00", TODAY)).toBe(true);
    });
    it("CRYP-94: empty / missing date is not treated as future", () => {
      expect(isFutureTx("", TODAY)).toBe(false);
      expect(isFutureTx(null, TODAY)).toBe(false);
    });
  });
});
