/**
 * C-R2b (C14): the whole coin universe lives in ONE Firestore doc, and a document
 * hard-caps at 1 MiB — at ~3,000 coins the doc already sits at ~67% of that. A
 * write past the limit THROWS and breaks BOTH front-ends (app + DCA calculator).
 * Guard: above a soft limit, trim the lowest-rank tail (the coins nobody holds)
 * instead of ever throwing. Pure + unit-tested (tests/unit/universe-utils.test.js).
 */

const UNIVERSE_SOFT_LIMIT = 850 * 1024;   // bytes — comfortably under the 1 MiB hard cap

// Serialized JSON length ≈ Firestore size for this ASCII-dominated payload.
function estimateSize(obj) {
  try { return JSON.stringify(obj).length; } catch (e) { return Infinity; }
}

// Returns { coins, trimmed, size }: the (possibly) trimmed map, how many coins were
// dropped, and the resulting estimated size. Drops WORST-ranked first (rank null =
// worst); never throws, never trims below the soft limit's worth of top coins.
function trimUniverse(coins, softLimit = UNIVERSE_SOFT_LIMIT) {
  let size = estimateSize(coins);
  if (size <= softLimit) return { coins, trimmed: 0, size };
  const ids = Object.keys(coins).sort((a, b) => ((coins[a] && coins[a].rank) ?? Infinity) - ((coins[b] && coins[b].rank) ?? Infinity));
  const out = { ...coins };
  let trimmed = 0;
  for (let i = ids.length - 1; i >= 0 && size > softLimit; i--) {
    const id = ids[i];
    size -= estimateSize(out[id]) + id.length + 4;   // entry + key + JSON overhead
    delete out[id];
    trimmed++;
  }
  return { coins: out, trimmed, size };
}

module.exports = { UNIVERSE_SOFT_LIMIT, estimateSize, trimUniverse };
