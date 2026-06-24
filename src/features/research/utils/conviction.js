// utils/conviction.js — the conviction rubric reducer (#8 / #9 / #11). Pure: no
// state, DOM, or fetch — fully unit-testable, and the same seam the live AI engine
// (Wave B) will feed instead of mock data.
//
// #8 Accuracy gate: an axis must corroborate across >= 2 sources before any verdict
//    shows — otherwise it is insufficient-data, NEVER a single-source guess.
// #9 Rubric: 4 states — healthy / mixed / problem / insufficient. "dead/abandoned"
//    grades `problem`; `insufficient` (⬛) is a caution FINDING shown with a per-axis
//    reason chip (no public repo / no coverage / anonymous team), never a silent blank.
// #11 Freshness: every signal carries its as-of date; dated catalysts auto-expire so
//    a past event is never shown as "upcoming".

// The four conviction axes (#23). `noData` is the reason chip shown on ⬛.
export const AXES = [
  { key: "dev", label: "Dev", noData: "no public repo" },
  { key: "founders", label: "Founders", noData: "no coverage" },
  { key: "team", label: "Team", noData: "anonymous team" },
  { key: "community", label: "Community", noData: "no coverage" },
];

// The 4 rubric states (#9): `cls` drives the pill style, `emoji` is the conceptual
// rubric marker, `label` is the human name.
export const STATES = {
  healthy: { cls: "healthy", emoji: "🟢", label: "Healthy" },
  mixed: { cls: "mixed", emoji: "🟡", label: "Mixed" },
  problem: { cls: "problem", emoji: "🔴", label: "Problem" },
  insufficient: { cls: "insufficient", emoji: "⬛", label: "Insufficient data" },
};

// #8 accuracy gate: minimum corroborating sources before a verdict may show.
export const MIN_SOURCES = 2;

const VALID_VERDICTS = new Set(["healthy", "problem", "mixed"]);

// Reduce one axis's source observations to { state, reason, sources }.
// observations: [{ source, verdict }] with verdict in 'healthy' | 'problem' | 'mixed'.
// Sources that found no verifiable data are simply absent from the list.
export function reduceAxis(axisMeta, observations) {
  const data = (observations || []).filter((o) => o && VALID_VERDICTS.has(o.verdict));
  const sources = data.map((o) => o.source).filter(Boolean);

  // #8: fewer than 2 corroborating sources -> insufficient-data (#9 ⬛) with a reason chip.
  if (data.length < MIN_SOURCES) {
    return { state: "insufficient", reason: axisMeta.noData, sources };
  }

  const has = (v) => data.some((o) => o.verdict === v);
  let state;
  if (!has("problem") && !has("mixed")) state = "healthy"; // all corroborate good
  else if (!has("healthy") && !has("mixed")) state = "problem"; // all corroborate bad (dead/abandoned -> 🔴)
  else state = "mixed"; // conflict, or any 'mixed' verdict -> 🟡
  return { state, reason: null, sources };
}

// #11: a dated catalyst is only "upcoming" while its date hasn't passed. Dates are
// YYYY-MM-DD strings (lexicographic compare); `today` is YYYY-MM-DD. With no `today`
// we can't expire anything, so all are kept.
export function activeCatalysts(catalysts, today) {
  return (catalysts || []).filter((c) => c && c.date && (!today || c.date >= today));
}

// Reduce a coin's raw conviction evidence into the displayable object the cards render.
// evidence = { asOf, axes: { dev:[obs], founders:[obs], team:[obs], community:[obs] },
//              catalysts: [{ label, date }] }
export function computeConviction(evidence, today) {
  const e = evidence || {};
  const axes = AXES.map((a) => {
    const r = reduceAxis(a, e.axes && e.axes[a.key]);
    return { key: a.key, label: a.label, ...r };
  });
  return {
    asOf: e.asOf || null,
    axes,
    catalysts: activeCatalysts(e.catalysts, today),
  };
}
