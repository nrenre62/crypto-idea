// The three manual-research "funnel" findings (decision #27): dilution/unlocks,
// real trading volume vs wash-trading, and real yield. These checks stay
// PERMANENTLY MANUAL — automated signals can't verify them — so the journal lets
// the user record their own findings (here at add-time and later as research
// continues). This is the single source of truth for the field keys + copy, used
// by both the Search Buy-Journal prompt and the Journal detail overlay so the
// fields can't drift apart or be omitted on one surface (gap #26).
export const FUNNEL_FIELDS = [
  {
    key: "dilution",
    label: "Dilution & token unlocks",
    sub: "Is supply inflating? Any large unlocks ahead?",
    placeholder: "e.g. 12% of supply unlocks over the next year; team tokens vest into 2027…",
  },
  {
    key: "volume",
    label: "Real volume",
    sub: "Does the trading volume look organic, or wash-traded?",
    placeholder: "e.g. volume looks organic on the top exchanges; order book is thin elsewhere…",
  },
  {
    key: "yield",
    label: "Real yield",
    sub: "Does any yield come from real revenue, or just token emissions?",
    placeholder: "e.g. yield is paid from protocol fees, not inflationary emissions…",
  },
];

// The "bridge" line (#26) shown wherever the funnel fields render: it frames these
// as the manual half of the research, distinct from the (future) automated signals.
export const FUNNEL_BRIDGE =
  "Automated signals can't verify these — dilution, real volume, and real yield are checks you make by hand.";
