// src/data/learn/demand.js — Learn module: Spotting Real Demand
// No author names (#24). Each lesson quiz has one correctIdx (#25, quiz-gated).
// One of the ~9 modules composed by src/data/learn-content.js.
export const demand = {
  "id": "demand",
  "icon": "📊",
  "title": "Spotting Real Demand",
  "sub": "Real volume vs. wash trading, liquidity, holders, real usage",
  "lessons": [
    {
      "id": "demand-1",
      "title": "Volume can be faked — here's how to tell",
      "minutes": 3,
      "body": [
        "Reported trading volume is one of the easiest numbers to fake. A trader can buy and sell to themselves all day, racking up huge volume while no real demand exists. This is called wash trading, and it makes a dead coin look busy.",
        "The tells are mechanical. Volume that dwarfs the liquidity in the order book, activity crammed onto one obscure venue, and prices that barely move despite 'millions' changing hands all point the same way: most of that trading is the same coins going in circles.",
        "Cross-check the headline against reality. Compare reported volume to on-chain transfers and to how deep the order book actually is — that is the volume check the app walks you through. Real trading leaves real footprints; faked trading is loud but hollow."
      ],
      "insight": "Volume is the easiest metric to fake. When it dwarfs liquidity and barely moves price, you're looking at noise, not demand.",
      "quiz": {
        "q": "A token shows enormous daily volume, but the order book is thin and the price barely moves. What does that combination most likely mean?",
        "options": [
          "Strong, healthy demand from many buyers",
          "Much of the volume is wash trading, not real demand",
          "The token is about to break out",
          "Big institutions are quietly accumulating"
        ],
        "correctIdx": 1
      }
    },
    {
      "id": "demand-2",
      "title": "Liquidity depth and slippage",
      "minutes": 3,
      "body": [
        "Depth is how much you can trade before your own order moves the price. A coin might quote a clean number on the screen, but if the book is thin, selling any real size drags the price down as you go — that gap is called slippage.",
        "So the quoted price is a promise that only holds for tiny trades. A coin you cannot exit near the quoted price is not actually worth that price to you; it's worth whatever you can realistically get out at.",
        "Depth matters more than the headline price, and it matters most for a large holder. A small position can slip through unnoticed; a big one tests how real the market behind the quote actually is."
      ],
      "insight": "The quoted price only holds for small trades. If you can't exit a large position near it, that price isn't really yours.",
      "quiz": {
        "q": "Why does liquidity depth matter more than the headline price for someone holding a large position?",
        "options": [
          "Deep markets always have lower fees",
          "A large sell in a thin market moves the price against you, so you can't exit near the quote",
          "Depth determines the coin's long-term value",
          "Headline price is usually wrong on exchanges"
        ],
        "correctIdx": 1
      }
    },
    {
      "id": "demand-3",
      "title": "Holders, concentration, and whales",
      "minutes": 2,
      "body": [
        "Count how many unique wallets hold a coin, and watch that number over months. A steadily rising holder count suggests demand is organic and broadening — more separate people are choosing to own it, not just the same few moving size around.",
        "Concentration is the other side. If a handful of whales hold most of the supply, a single one of them can swing the price hard, and the 'market' is really just their decisions in disguise.",
        "Neither number is a verdict on its own. But broadening ownership plus low concentration is a healthier picture than a price held up by a few large wallets you can't see the intentions of."
      ],
      "insight": "A holder count rising steadily over months signals broadening, organic demand — concentration in a few whales signals fragility.",
      "quiz": {
        "q": "The number of unique wallets holding a coin has risen steadily for several months. What does that most reliably suggest?",
        "options": [
          "The price is guaranteed to rise next",
          "Whales are taking full control of supply",
          "Demand is broadening to more separate holders",
          "The team is about to release a product"
        ],
        "correctIdx": 2
      }
    },
    {
      "id": "demand-4",
      "title": "Active addresses vs. vanity metrics",
      "minutes": 2,
      "body": [
        "Some metrics are cheap to buy. Follower counts, Discord members, and engagement can be inflated with a credit card in an afternoon, so a big community number tells you almost nothing about real usage.",
        "On-chain activity is far harder to fake. Active addresses actually transacting, fees being paid, and real transfers all cost something to manufacture and leave a public trail anyone can audit.",
        "So weight what's expensive to fake. Treat social numbers as a vanity layer, and let on-chain usage — addresses doing real things — carry the weight when you judge whether demand is real."
      ],
      "insight": "Followers and Discord members are cheap to buy; on-chain active addresses cost something to fake. Weight the metric that's hard to game.",
      "quiz": {
        "q": "Which signal is hardest to fake when judging whether a project has real demand?",
        "options": [
          "Number of Twitter followers",
          "Discord member count",
          "On-chain active addresses actually transacting",
          "Engagement on the project's posts"
        ],
        "correctIdx": 2
      }
    },
    {
      "id": "demand-5",
      "title": "Exchange listings: signal or noise?",
      "minutes": 2,
      "body": [
        "A listing on a major exchange is real in one narrow way: it adds access and liquidity. More people can now buy the coin, and trading it gets easier. That's a plumbing upgrade, not a change in what the project does.",
        "The pump that often follows is mostly attention and new access, not new fundamentals. Nothing about the protocol's revenue, tokenomics, or usage improved because a venue added a trading pair, and those listing pumps tend to fade.",
        "So read a listing for what it is. It tells you the coin is easier to trade now — it doesn't tell you the project got better, and it isn't evidence for your thesis."
      ],
      "insight": "A new listing improves access and liquidity, not fundamentals. The pump is attention; the project is unchanged.",
      "quiz": {
        "q": "A coin gets listed on a major exchange and jumps. What does the listing actually tell you?",
        "options": [
          "The coin is now easier to access and trade, but the project is unchanged",
          "The project's fundamentals just improved",
          "The team passed a quality review by the exchange",
          "Demand is now permanently higher"
        ],
        "correctIdx": 0
      }
    }
  ]
};
