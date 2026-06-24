// src/data/learn/yield.js — Learn module: Real Yield & Sustainability
// No author names (#24). Each lesson quiz has one correctIdx (#25, quiz-gated).
// One of the ~9 modules composed by src/data/learn-content.js.
export const yieldModule = {
  "id": "yield",
  "icon": "🌱",
  "title": "Real Yield & Sustainability",
  "sub": "Where yield comes from, ponzi tells, sustainable revenue",
  "lessons": [
    {
      "id": "yield-1",
      "title": "Where does the yield actually come from?",
      "minutes": 3,
      "body": [
        "Every yield has a source. Before you trust a number, trace the money back to where it starts: real fees that users pay, freshly minted tokens the protocol prints, or simply the deposits of people who arrived after you.",
        "Those three sources are not equal. Fees are real income from outside the system. Emissions are dilution dressed up as a reward. And yield funded by new deposits is the dangerous one: the only way old depositors get paid is if newer depositors keep showing up.",
        "When a return only survives while fresh money flows in, that is a ponzi-like dynamic, no matter how slick the app looks. This is the yield check the app prompts you to run by hand: name the source before you name the number."
      ],
      "insight": "Yield that only lasts while new depositors arrive isn't yield — it's a queue, and someone is always last in line.",
      "quiz": {
        "q": "A pool pays existing depositors only as long as new depositors keep joining. What kind of yield is that?",
        "options": [
          "Sustainable yield backed by protocol fees",
          "A ponzi-like dynamic that depends on new money",
          "Normal compounding interest",
          "A temporary discount that will correct itself"
        ],
        "correctIdx": 1
      }
    },
    {
      "id": "yield-2",
      "title": "Real revenue vs. token emissions, revisited",
      "minutes": 3,
      "body": [
        "The cleanest test for a yield is direction: does the money come from OUTSIDE the system or from INSIDE it? Revenue from outside means real users paid real fees for something they wanted. That money can be shared with you without anyone being diluted.",
        "Emissions come from inside. The protocol mints its own token and hands it out as 'rewards,' which sounds generous but quietly shrinks the slice every existing holder owns. The pool of value didn't grow — it was just sliced thinner and relabeled.",
        "Sustainable yield is paid from protocol fees, not from the printer. So when you read a project's dashboard, separate the two: how much of this payout is fees users chose to pay, and how much is new supply created out of thin air?"
      ],
      "insight": "Sustainable yield is paid from fees earned outside the system; emissions just redistribute the dilution inside it.",
      "quiz": {
        "q": "Which yield is the sustainable one?",
        "options": [
          "Yield paid from fees that real users pay to the protocol",
          "Yield paid in newly minted tokens the protocol prints",
          "Yield that rises whenever more people deposit",
          "Yield with the highest advertised APY"
        ],
        "correctIdx": 0
      }
    },
    {
      "id": "yield-3",
      "title": "The Ponzi tell: rewards that need new buyers",
      "minutes": 2,
      "body": [
        "Here is the simplest tell. If a return can only be paid by bringing in constant new money, it is unsustainable — full stop. The math doesn't care how professional the website is.",
        "Picture a protocol promising a high fixed APY with no fee revenue behind it, funded by selling its own token. The only way to pay yesterday's depositors is to find new buyers today. Old returns are paid out of new deposits, which is the definition of the trap.",
        "A fixed, guaranteed-sounding number on top of no real income is the loudest warning sign there is. Real cash flows wobble with usage; a suspiciously smooth promise usually means the payout is coming from the line of people behind you."
      ],
      "insight": "A high fixed APY with no fee revenue is the classic ponzi tell — old depositors get paid only by new buyers.",
      "quiz": {
        "q": "A protocol offers a guaranteed 100% fixed APY but earns no real fees and funds payouts by selling its own token. What is this?",
        "options": [
          "A great opportunity before the market notices",
          "A normal high-growth staking reward",
          "A ponzi tell: old returns are paid by new buyers",
          "Sustainable because the APY is fixed and predictable"
        ],
        "correctIdx": 2
      }
    },
    {
      "id": "yield-4",
      "title": "Sustainable protocols pay you from fees",
      "minutes": 2,
      "body": [
        "A healthy protocol works like a real business. Users pay fees, some of those fees are shared with the people who provide capital or secure the network, and a treasury grows over time because the thing is actually used.",
        "That kind of yield has a ceiling. When the money comes from genuine cash flows instead of a printer, sustainable real yield is usually modest — think low single to low double digits, not triple digits. Boring numbers are often the honest ones.",
        "So flip the usual instinct. A sky-high advertised yield should raise your suspicion, not your excitement, while a steady payout backed by visible fee revenue is the kind of thing conviction can actually rest on."
      ],
      "insight": "Real yield from fees is usually modest — triple-digit returns are a red flag, not a feature.",
      "quiz": {
        "q": "For yield that is genuinely paid from a protocol's fee revenue, what is a realistic expectation?",
        "options": [
          "Triple-digit APYs that hold steady for years",
          "A modest return, often low single to low double digits",
          "Whatever number the protocol advertises on its homepage",
          "Higher returns than any emissions-based pool"
        ],
        "correctIdx": 1
      }
    },
    {
      "id": "yield-5",
      "title": "APY vs. APR vs. reality",
      "minutes": 3,
      "body": [
        "APR is a plain annual rate. APY assumes you compound it, and a quoted APY quietly assumes more: that the reward token holds its price and that the emissions paying you keep flowing. Strip those assumptions away and the headline number can dissolve.",
        "Your real return is simpler and harsher: nominal yield, minus dilution from new supply, minus any drop in the reward token's price. The percentage on the banner is the best case before reality takes its cut.",
        "So a '50% APY' paid in a token that falls 60% over the same year is not a 50% gain — it is a loss. Always price the reward in something you trust, and judge the yield after the token's own price move, not before."
      ],
      "insight": "Real return = nominal yield − dilution − price change; a 50% APY in a token that drops 60% is a negative return.",
      "quiz": {
        "q": "You earn a 50% APY paid in a reward token, but that token's price falls 60% over the year. What is your real return?",
        "options": [
          "A positive 50% gain, because that's the APY",
          "Roughly break-even, since 50% offsets the drop",
          "Negative — the price crash more than wipes out the yield",
          "Unknowable, since APY can't be compared to price"
        ],
        "correctIdx": 2
      }
    }
  ]
};
