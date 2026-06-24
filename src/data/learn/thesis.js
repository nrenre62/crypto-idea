// src/data/learn/thesis.js — Learn module: Building Your Thesis
// No author names (#24). Each lesson quiz has one correctIdx (#25, quiz-gated).
// One of the ~9 modules composed by src/data/learn-content.js.
export const thesis = {
  "id": "thesis",
  "icon": "📝",
  "title": "Building Your Thesis",
  "sub": "The research funnel, writing conviction, and reviewing it",
  "lessons": [
    {
      "id": "thesis-1",
      "title": "The five-step research funnel",
      "minutes": 3,
      "body": [
        "Research works best as a funnel: you ask the cheap questions first and stop early when a coin fails one. Step one, is it real and actually being built? Step two, is there real demand for what it does? Step three, do the tokenomics dilute you over time? Step four, is the yield or revenue real? Step five, what is your own conviction once the first four are answered?",
        "The app does the first two steps for you. Automated signals flag whether a project is genuinely shipping code and whether people are genuinely using it — the parts that scale across thousands of coins and are easy to fake with marketing.",
        "Steps three through five are yours by hand. You read the tokenomics, judge whether the yield comes from real revenue, and decide if any of it adds up to a reason to own the coin. The app surfaces the signals; the conviction is still your job."
      ],
      "insight": "Automated signals answer 'is it real?' and 'is it used?' — you still have to judge dilution, real yield, and your own conviction by hand.",
      "quiz": {
        "q": "In the five-step funnel, which parts do the automated signals handle for you?",
        "options": [
          "Whether the tokenomics dilute you and whether the yield is real",
          "Your final conviction and position size",
          "Whether the project is real/being built and whether there's real demand",
          "All five steps, so you don't have to read anything yourself"
        ],
        "correctIdx": 2
      }
    },
    {
      "id": "thesis-2",
      "title": "Turning signals into a written thesis",
      "minutes": 3,
      "body": [
        "A thesis is the specific reason you own a coin, written down. It combines the automated signals — this is being built, this is being used — with your manual findings on tokenomics and real yield into one clear sentence you could defend to a skeptic.",
        "Vague optimism is not a thesis. 'I think it'll go up' or 'the tech is cool' tells you nothing you can later test. A strong thesis is specific and falsifiable: it names what has to be true, so reality can eventually prove you right or wrong.",
        "Compare 'this token captures fees from real usage that's growing, and emissions are scheduled to fall' against 'it's the future of finance.' The first you can check next quarter. The second can never be wrong, which is exactly what makes it useless."
      ],
      "insight": "A real thesis is specific and falsifiable — if it can never be proven wrong, it's not a thesis, it's a feeling.",
      "quiz": {
        "q": "Which of these is the strongest thesis for owning a coin?",
        "options": [
          "It has great technology and a strong community",
          "Usage-based fees are growing and token emissions are scheduled to decline",
          "It's the future of finance and still early",
          "Lots of people online are bullish on it"
        ],
        "correctIdx": 1
      }
    },
    {
      "id": "thesis-3",
      "title": "What would change your mind?",
      "minutes": 3,
      "body": [
        "Before you own a coin, write down what would prove your thesis wrong. These are your disconfirming conditions: specific, objective things that, if they happened, mean the reason you bought no longer holds.",
        "Set them up front, while you're calm, because the moment a coin drops you will be tempted to rationalise. Without a pre-set trigger, every piece of bad news becomes 'just noise' and you quietly move the goalposts to keep holding.",
        "Good conditions are concrete and checkable: usage falls for two straight quarters, the team abandons the roadmap, emissions get raised after promising they wouldn't. Bad ones are vague, like 'if it feels wrong' — feelings will always find a reason to stay."
      ],
      "insight": "Decide what would prove you wrong before you buy — otherwise, when it drops, you'll rationalise instead of think.",
      "quiz": {
        "q": "Why define your 'what would change my mind' conditions before you buy?",
        "options": [
          "So you have a pre-set, objective exit trigger before emotion makes you rationalise",
          "So you can guarantee you'll never take a loss",
          "Because the app won't let you save a thesis without them",
          "To predict exactly when the price will fall"
        ],
        "correctIdx": 0
      }
    },
    {
      "id": "thesis-4",
      "title": "Reviewing: is the thesis still intact?",
      "minutes": 2,
      "body": [
        "A thesis isn't written once and forgotten. You revisit it on a schedule and ask one question: is the reason I bought still true? Tag where it stands — intact, worth a review, or challenged — and let that drive what you do next.",
        "The trigger for action isn't the price moving; it's your change-my-mind conditions being met. A coin can fall hard while your thesis stays perfectly intact, or rise while it quietly breaks. Price down is not the same as thesis broken.",
        "When a disconfirming condition actually trips, that's your cue to act, not to invent excuses. This is where the Journal earns its keep — your past entries show whether you're responding to evidence or to your mood."
      ],
      "insight": "Act when your change-my-mind conditions are met — not when the price scares you. Price down is not the same as thesis broken.",
      "quiz": {
        "q": "During a thesis review, what should actually prompt you to act?",
        "options": [
          "The price dropping sharply",
          "Your pre-set change-my-mind conditions being met",
          "Other people in the market turning bearish",
          "It's been a long time since you bought"
        ],
        "correctIdx": 1
      }
    },
    {
      "id": "thesis-5",
      "title": "From conviction to a position you can hold",
      "minutes": 3,
      "body": [
        "Real conviction is what lets you hold through volatility without panic-selling, because you already decided WHY you own the coin before the chart got scary. The decision was made in calm; the storm just tests it.",
        "Conviction should also shape size. The stronger and more tested your thesis, the more comfortable a position you can hold; a thin, uncertain reason deserves a small position you can lose without flinching. Don't size bigger than your conviction can carry.",
        "This is the whole loop: research the coin through the funnel, write a specific falsifiable thesis with exit conditions, then hold and review. Research, then thesis, then hold and review — repeated, calmly, over time."
      ],
      "insight": "Conviction decided in advance is what lets you hold through volatility — and it should set your size, not the other way around.",
      "quiz": {
        "q": "What does real, pre-decided conviction actually give you?",
        "options": [
          "A guarantee the coin will go up over time",
          "Permission to size as large as possible",
          "The ability to hold through volatility because you decided WHY beforehand",
          "A reason to check the price more often"
        ],
        "correctIdx": 2
      }
    }
  ]
};
