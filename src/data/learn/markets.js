// src/data/learn/markets.js — Learn module: How Markets Really Work
// No author names (#24). Each lesson quiz has one correctIdx (#25, quiz-gated).
// One of the ~9 modules composed by src/data/learn-content.js.
export const markets = {
  "id": "markets",
  "icon": "📈",
  "title": "How Markets Really Work",
  "sub": "Cycles, hype, psychology — and what actually drives prices",
  "lessons": [
    {
      "id": "markets-1",
      "title": "Price is a vote, not a verdict",
      "minutes": 2,
      "body": [
        "A price is just the last number two people agreed on. In the short run it measures how people feel about a coin right now — not whether the project behind it is any good.",
        "That gap matters. A token can double because a popular account mentioned it, then halve a week later when attention moves on. Nothing about the actual project changed — only the crowd's mood did.",
        "Treat price as one piece of evidence about sentiment, never as proof of quality. The work of an investor is to ask what the price is NOT telling you."
      ],
      "insight": "A rising price tells you others are buying — not that the project is sound.",
      "quiz": {
        "q": "A coin jumps 30% in a week. What does that most reliably tell you?",
        "options": [
          "The team shipped a major product",
          "More people are buying it right now",
          "The token is now undervalued",
          "The project's fundamentals improved"
        ],
        "correctIdx": 1
      }
    },
    {
      "id": "markets-2",
      "title": "Why bull markets feel like skill",
      "minutes": 2,
      "body": [
        "When everything is going up, almost every choice looks smart. Buy at random in a bull market and you'll probably be up — which feels like skill but is really just the tide lifting every boat.",
        "The danger is that the tide goes out. Strategies that only worked because the whole market was rising stop working, and the confidence built during the easy phase leads to bigger bets at exactly the wrong time.",
        "Judge your decisions by the reasoning behind them, not by whether the number went up. A good decision can lose money and a bad one can make money — over many cycles, only the reasoning compounds."
      ],
      "insight": "In a rising market, profit is not proof your process is good.",
      "quiz": {
        "q": "You made money on every trade last month. What's the safest conclusion?",
        "options": [
          "Your strategy is proven and you should size up",
          "You have an edge the market hasn't noticed",
          "A rising market may be doing the work, not your process",
          "It's time to take on more risk"
        ],
        "correctIdx": 2
      }
    },
    {
      "id": "markets-3",
      "title": "Cycles: euphoria, capitulation, and the long middle",
      "minutes": 3,
      "body": [
        "Markets tend to move through four moods: quiet accumulation, a rising markup, a toppy distribution, and a falling markdown. The same loop repeats because the players change but human nature doesn't.",
        "Most of the time lives in the boring middle — slow grinds, sideways chop, and stretches where almost nothing seems to happen. The loud moments are rare: euphoria clusters near tops, despair clusters near bottoms.",
        "You can learn to read the mood, but you can't reliably time the turn. Knowing you're in greed or fear is useful information about the crowd; treating it as a precise buy or sell signal is how people get hurt."
      ],
      "insight": "Cycles are mostly the boring middle — euphoria and despair are the brief edges, and you can read the mood without being able to time it.",
      "quiz": {
        "q": "Across a full market cycle, where is the most time actually spent?",
        "options": [
          "In the euphoric top, where prices peak",
          "In the capitulation bottom, where prices crash",
          "In the long, boring middle of grinds and sideways chop",
          "In sharp, fast moves that make up most of the cycle"
        ],
        "correctIdx": 2
      }
    },
    {
      "id": "markets-4",
      "title": "Narratives move money before fundamentals do",
      "minutes": 3,
      "body": [
        "Crypto runs on stories. A theme catches on — AI tokens, real-world assets, memes — and money rotates toward it far faster than any project could actually ship the thing the story promises.",
        "A hot narrative is a reliable signal of one thing only: attention is rotating in. It does NOT tell you the underlying tech works, the team can deliver, or the token is worth more. Flows and fundamentals are different questions.",
        "When the narrative cools, the attention leaves with it. What's left holding the price is whatever was actually real underneath — revenue, users, working product. That's the part worth checking before the story moves on."
      ],
      "insight": "A hot narrative reliably tells you attention is rotating in — not that the technology is sound. When the story fades, only fundamentals hold the price.",
      "quiz": {
        "q": "A coin is part of a red-hot narrative everyone is talking about. What does that most reliably tell you?",
        "options": [
          "Attention and money are rotating into the theme right now",
          "The underlying technology has been proven to work",
          "The token is fundamentally undervalued",
          "The team is shipping faster than competitors"
        ],
        "correctIdx": 0
      }
    },
    {
      "id": "markets-5",
      "title": "Liquidity is the tide under every price",
      "minutes": 2,
      "body": [
        "Liquidity is how much can be bought or sold without moving the price. When it's thin, a small order swings the quote hard — which is exactly why microcaps can post huge percentage gains on almost no real money.",
        "The trouble is the same thinness works against you on the way out. The price you see is for a tiny trade. Try to sell a real position and you walk the price down through every buyer below you, getting far less than the quote.",
        "So a big green number on a low-liquidity coin is fragile by design. The gain is real only for someone who can actually exit at that price — and on a thin book, that someone usually isn't you."
      ],
      "insight": "A microcap pump is fragile because thin liquidity can't absorb your exit — the quoted price isn't the price you can sell size at.",
      "quiz": {
        "q": "Why is a big percentage gain on a thinly-traded microcap fragile?",
        "options": [
          "Small coins are always overvalued by the market",
          "Thin liquidity can't absorb a real sell order, so you can't exit at that price",
          "Microcaps are taxed more heavily when you sell",
          "The exchange will freeze the price once it pumps"
        ],
        "correctIdx": 1
      }
    },
    {
      "id": "markets-6",
      "title": "Why most 'news' is already in the price",
      "minutes": 3,
      "body": [
        "By the time a headline reaches you, faster participants have already seen it, traded it, and moved the price. The information was valuable for about a minute — and that minute was not yours.",
        "This is why a coin can fall on genuinely good news. The market spent weeks pricing in the expected event, buyers positioned ahead of it, and when it finally lands those holders sell into the excitement. 'Buy the rumor, sell the news' describes exactly this.",
        "The lesson isn't to chase faster headlines. It's to stop reacting to news as if it's fresh, and instead ask what the market already expected — because the surprise, not the event, is what actually moves price."
      ],
      "insight": "By the time news reaches you it's usually already priced in — which is why a coin can dump on good news as positioned holders sell the event.",
      "quiz": {
        "q": "A project ships clearly good news, and the coin immediately drops. What's the best explanation?",
        "options": [
          "Good news always causes a coin to fall",
          "The news was fake and traders saw through it",
          "The event was already priced in, so positioned holders sold into it",
          "The market misunderstood the announcement"
        ],
        "correctIdx": 2
      }
    }
  ]
};
