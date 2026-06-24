// src/data/learn/risk.js — Learn module: Risk & Position Sizing
// No author names (#24). Each lesson quiz has one correctIdx (#25, quiz-gated).
// One of the ~9 modules composed by src/data/learn-content.js.
export const risk = {
  "id": "risk",
  "icon": "⚖️",
  "title": "Risk & Position Sizing",
  "sub": "Survival, sizing, asymmetry, drawdowns, leverage",
  "lessons": [
    {
      "id": "risk-1",
      "title": "Survival first: never bet the rent",
      "minutes": 2,
      "body": [
        "Rule one of investing is simple: do not get wiped out. Everything else — returns, conviction, being right about a coin — only matters if you are still in the game to collect.",
        "Ruin is permanent. A 100% loss can't be averaged down, waited out, or undone by a later great call. So only risk money you can afford to lose entirely: never the rent, the emergency fund, or borrowed cash.",
        "This reframes the whole game. The goal isn't to maximize this year's return — it's to make sure no single outcome can ever end your investing for good."
      ],
      "insight": "You can recover from a bad year, but not from zero. Staying in the game beats squeezing out the maximum return.",
      "quiz": {
        "q": "What is the single most important rule for a long-term investor?",
        "options": [
          "Maximize your return every single year",
          "Avoid being wiped out — survive to keep investing",
          "Always stay fully invested in the market",
          "Beat the average return of the crowd"
        ],
        "correctIdx": 1
      }
    },
    {
      "id": "risk-2",
      "title": "Position sizing: how much is too much",
      "minutes": 3,
      "body": [
        "Sizing is how you turn 'this could go to zero' into something survivable. The question isn't only 'do I believe in this coin' — it's 'how much of my money can vanish here without hurting me'.",
        "A speculative microcap should be small enough that a total loss is a shrug, not a catastrophe. If a coin going to zero would change your life, you're holding too much of it — no matter how strong the thesis feels.",
        "Conviction sets the size; caps protect you from your own conviction. Stronger, better-understood ideas can earn a bigger slice — but a hard ceiling on any single bet keeps one mistake from defining your results."
      ],
      "insight": "Size every position so its complete failure is survivable. Conviction earns size; a hard cap saves you when the conviction was wrong.",
      "quiz": {
        "q": "How should you size a small, speculative microcap position?",
        "options": [
          "Large, because high risk should mean high reward",
          "As big as your conviction in the thesis allows",
          "Small enough that losing all of it is survivable",
          "The same size as every other coin you own"
        ],
        "correctIdx": 2
      }
    },
    {
      "id": "risk-3",
      "title": "Asymmetric bets and expected value",
      "minutes": 3,
      "body": [
        "The best speculative bets are asymmetric: the most you can lose is capped and small, while the upside is many times larger. You risk a little to maybe make a lot — not the other way around.",
        "Pair that shape with small size. High-variance ideas often fail, so any single one should be tiny; what matters is the average outcome across many such bets, not whether this one happens to win.",
        "Think in expected value over a series, not in single results. A handful of capped bets where a few big winners more than pay for the many small losers can do well — even if most of them go to zero."
      ],
      "insight": "Hunt for bets where a small, capped loss buys a large upside — then keep each one small and judge the whole series, not any single result.",
      "quiz": {
        "q": "What is the best structure for a speculative bet?",
        "options": [
          "A small, capped downside with a much larger possible upside",
          "A large position so the win is meaningful if it works",
          "Roughly equal upside and downside to stay balanced",
          "A high probability of a small, reliable gain"
        ],
        "correctIdx": 0
      }
    },
    {
      "id": "risk-4",
      "title": "Drawdowns and the math of recovery",
      "minutes": 2,
      "body": [
        "Losses and the gains needed to undo them are not symmetric. Lose 50% and you need a 100% gain just to get back to even — because the gain is measured against the smaller pile you have left.",
        "It gets worse fast. An 80% drawdown — common in crypto — requires a 400% gain to recover. The deeper the hole, the more punishing the climb back out.",
        "This is why avoiding big losses beats chasing big gains. Protecting against the deep drawdown does more for your long-run result than any single home run can."
      ],
      "insight": "A 50% loss needs a 100% gain to recover — deep drawdowns are mathematically brutal, so dodging them matters more than chasing upside.",
      "quiz": {
        "q": "After a 50% loss, what gain do you need just to break even?",
        "options": [
          "A 50% gain",
          "A 75% gain",
          "A 200% gain",
          "A 100% gain"
        ],
        "correctIdx": 3
      }
    },
    {
      "id": "risk-5",
      "title": "Diversification without dilution of conviction",
      "minutes": 3,
      "body": [
        "Diversification is meant to stop one bad outcome from sinking you. A few well-understood positions that don't all move together do that job — if one fails, the others aren't dragged down with it.",
        "But more names isn't automatically safer. Spread across 50 coins you barely understand and you've built a closet index: you carry all the risk of the market with none of the edge that knowing your holdings was supposed to give you.",
        "The aim is uncorrelated, not just numerous. Hold few enough things that you can actually understand each one and explain why you own it — that understanding is the protection, not the headcount."
      ],
      "insight": "A few uncorrelated positions you truly understand beat fifty random ones — past a point, more names just dilutes your edge into a closet index.",
      "quiz": {
        "q": "Which is the better form of diversification?",
        "options": [
          "Fifty coins, so no single failure can hurt much",
          "A few uncorrelated positions you each understand well",
          "As many coins as possible to mirror the whole market",
          "Several coins that tend to rise and fall together"
        ],
        "correctIdx": 1
      }
    },
    {
      "id": "risk-6",
      "title": "Leverage: the fastest way to zero",
      "minutes": 2,
      "body": [
        "Leverage means investing with borrowed money to amplify your position. It cuts both ways: it multiplies your gains, and it multiplies your losses by exactly the same amount.",
        "In crypto, that second edge is lethal. Prices swing violently, and a sharp drop can trigger a liquidation — the position is force-closed at a loss — wiping you out before your thesis ever has a chance to play out.",
        "Being right eventually doesn't help if you're liquidated on the way there. Leverage turns ordinary volatility, which a patient holder can ride through, into an event that can end the position permanently."
      ],
      "insight": "Leverage amplifies both directions — and in volatile crypto a liquidation can zero you out before you're ever proven right.",
      "quiz": {
        "q": "What is the main danger of using leverage in volatile crypto?",
        "options": [
          "It charges interest that slowly eats your returns",
          "A price swing can liquidate you before your thesis plays out",
          "It makes your gains smaller than they would be",
          "It locks your funds for a fixed period of time"
        ],
        "correctIdx": 1
      }
    }
  ]
};
