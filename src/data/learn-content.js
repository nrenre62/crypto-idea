// src/data/learn-content.js
// Learn library — module / lesson / quiz content for the Learn tab.
//
// This is the SEED set for A5 (the gamification machinery in utils/learn.js +
// useLearn reads this shape). A7 (0f-content) expands it to the full ~9 modules /
// ~50 lessons. Every shipped lesson here is real — no placeholders.
//
// Voice: NO author names (#24) — principles are taught first-party. Each lesson has
// a hand-authored quiz with a single `correctIdx` (#25, quiz-gated completion).
//
// Shape:
//   module = { id, icon, title, sub, lessons: [lesson] }
//   lesson = { id, title, minutes, body: [paragraph], insight, quiz }
//   quiz   = { q, options: [string], correctIdx }

export const MODULES = [
  {
    id: "markets",
    icon: "📈",
    title: "How Markets Really Work",
    sub: "Cycles, hype, psychology — and what actually drives prices",
    lessons: [
      {
        id: "markets-1",
        title: "Price is a vote, not a verdict",
        minutes: 2,
        body: [
          "A price is just the last number two people agreed on. In the short run it measures how people feel about a coin right now — not whether the project behind it is any good.",
          "That gap matters. A token can double because a popular account mentioned it, then halve a week later when attention moves on. Nothing about the actual project changed — only the crowd's mood did.",
          "Treat price as one piece of evidence about sentiment, never as proof of quality. The work of an investor is to ask what the price is NOT telling you.",
        ],
        insight: "A rising price tells you others are buying — not that the project is sound.",
        quiz: {
          q: "A coin jumps 30% in a week. What does that most reliably tell you?",
          options: [
            "The team shipped a major product",
            "More people are buying it right now",
            "The token is now undervalued",
            "The project's fundamentals improved",
          ],
          correctIdx: 1,
        },
      },
      {
        id: "markets-2",
        title: "Why bull markets feel like skill",
        minutes: 2,
        body: [
          "When everything is going up, almost every choice looks smart. Buy at random in a bull market and you'll probably be up — which feels like skill but is really just the tide lifting every boat.",
          "The danger is that the tide goes out. Strategies that only worked because the whole market was rising stop working, and the confidence built during the easy phase leads to bigger bets at exactly the wrong time.",
          "Judge your decisions by the reasoning behind them, not by whether the number went up. A good decision can lose money and a bad one can make money — over many cycles, only the reasoning compounds.",
        ],
        insight: "In a rising market, profit is not proof your process is good.",
        quiz: {
          q: "You made money on every trade last month. What's the safest conclusion?",
          options: [
            "Your strategy is proven and you should size up",
            "You have an edge the market hasn't noticed",
            "A rising market may be doing the work, not your process",
            "It's time to take on more risk",
          ],
          correctIdx: 2,
        },
      },
    ],
  },
  {
    id: "fundamentals",
    icon: "🔍",
    title: "Reading the Fundamentals",
    sub: "GitHub health, founder visibility, real revenue vs. emissions",
    lessons: [
      {
        id: "fundamentals-1",
        title: "Why GitHub commits matter more than price action",
        minutes: 2,
        body: [
          "When a project's price goes up, it's easy to feel good about it. But price action tells you nothing about whether the project is actually being built. It tells you about demand for a token — not about whether the team is working.",
          "GitHub commits are different. Every commit is a real action: a developer pushed code. You can see when the last commit happened, how many people are contributing, and whether the main repository was updated this week or last year.",
          "The Myria case: the token pumped while the community stayed excited, but the GitHub showed zero commits for a year — the team had quietly moved on. The project was dead; the price just hadn't admitted it yet.",
        ],
        insight: "A project that stops committing code usually stops shipping product. Price follows building — not the other way around.",
        quiz: {
          q: "Which is the strongest signal a project is still being actively built?",
          options: [
            "Token price increased 30% last month",
            "Community Discord is very active",
            "Last GitHub commit was 2 days ago",
            "Founder tweeted about the project",
          ],
          correctIdx: 2,
        },
      },
      {
        id: "fundamentals-2",
        title: "Real revenue vs. token emissions",
        minutes: 3,
        body: [
          "Some protocols earn money: users pay fees for something they actually want. Others mostly print their own token and pay it out as 'yield' — which can look like growth but is really just dilution wearing a costume.",
          "Ask where the rewards come from. If the headline yield is paid in a token the protocol mints at will, every reward makes each existing token worth a little less. Real revenue comes from outside the system; emissions come from inside it.",
          "This is one of the manual checks the app can't fully automate — you read it from the project's own dashboards and docs, and write what you find in your journal.",
        ],
        insight: "Yield paid in freshly-minted tokens isn't income — it's dilution. Real revenue is paid by users, not by the printer.",
        quiz: {
          q: "A protocol advertises '120% APY' paid in its own token. What should you check first?",
          options: [
            "Whether the APY is higher than competitors",
            "Whether that reward is funded by real fees or by minting new tokens",
            "How many people are staking",
            "The token's price chart",
          ],
          correctIdx: 1,
        },
      },
    ],
  },
];
