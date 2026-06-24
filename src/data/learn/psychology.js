// src/data/learn/psychology.js — Learn module: The Psychology of Conviction
// No author names (#24). Each lesson quiz has one correctIdx (#25, quiz-gated).
// One of the ~9 modules composed by src/data/learn-content.js.
export const psychology = {
  "id": "psychology",
  "icon": "🧠",
  "title": "The Psychology of Conviction",
  "sub": "FOMO, anchoring, loss aversion, and deciding in advance",
  "lessons": [
    {
      "id": "psychology-1",
      "title": "FOMO is a signal to slow down",
      "minutes": 2,
      "body": [
        "Fear of missing out is the feeling that everyone else is getting rich and you are being left behind. It peaks right when a coin has already run hard and the crowd is loudest — which is often the worst moment to enter.",
        "Notice the logic underneath the urge. 'It's going up' is a description of the recent past, not a reason it will keep going up. If the only thing pulling you in is the price action and the noise around it, you don't actually have a reason to buy.",
        "So flip the script: treat intense FOMO as an alarm, not a green light. When you feel it hardest, that is the moment to step back, pull up your thesis, and ask whether anything real has changed."
      ],
      "insight": "If your only reason to buy is that it's going up, that's not a reason — it's FOMO, and it should trigger a pause.",
      "quiz": {
        "q": "You feel an intense urge to buy a coin only because it's surging and everyone's talking about it. What is the healthiest response?",
        "options": [
          "Buy quickly before the chance disappears",
          "Buy a small amount so you don't miss out entirely",
          "Pause and check your thesis before doing anything",
          "Wait for one more green day to confirm the trend"
        ],
        "correctIdx": 2
      }
    },
    {
      "id": "psychology-2",
      "title": "Why you write your thesis before you buy",
      "minutes": 3,
      "body": [
        "A thesis is a short written answer to two questions: why you own this coin, and what would make you change your mind. You write it before you buy, while you are calm and have nothing on the line.",
        "Its job is to be a record you can return to when things get loud. When the price crashes or spikes, the version of you reading the thesis is panicked or greedy — the version who wrote it was thinking clearly. The note lets the calm you overrule the emotional you.",
        "This is why the app's Journal asks for it up front. Without a written thesis you have nothing to judge later, so every move tempts you to invent a new reason on the spot. With one, you simply ask: is this still true?"
      ],
      "insight": "A written thesis is a calm decision made in advance — so the panicked or greedy version of you has something to answer to.",
      "quiz": {
        "q": "What is the main purpose of writing your thesis before you buy a coin?",
        "options": [
          "To predict the price more accurately",
          "To give your calm self a record your emotional self must answer to later",
          "To prove to others that you did your research",
          "To lock in a fixed plan you can never change"
        ],
        "correctIdx": 1
      }
    },
    {
      "id": "psychology-3",
      "title": "Anchoring to your entry price",
      "minutes": 2,
      "body": [
        "Anchoring is fixating on one number and judging everything against it. The most common anchor is the price you paid: 'I'll sell when it gets back to my entry,' or 'I can't sell here, I'm down.'",
        "The market has no idea what you paid and does not care. Your entry price is a sunk cost — it's already spent and it tells you nothing about whether the coin is worth holding from today forward.",
        "The only forward-looking question is whether your thesis still holds at the current price. Sometimes a coin far below your entry is worth keeping; sometimes one far above it should be sold. The entry number doesn't decide that."
      ],
      "insight": "The market doesn't know what you paid — your entry price is a sunk cost, not a reason to hold or sell.",
      "quiz": {
        "q": "Why should the price you originally paid NOT drive your decision to hold or sell?",
        "options": [
          "Because the market is forward-looking and doesn't care what you paid",
          "Because your entry price is usually inaccurate after fees",
          "Because you should always wait to break even before selling",
          "Because entry prices only matter for tax purposes"
        ],
        "correctIdx": 0
      }
    },
    {
      "id": "psychology-4",
      "title": "Loss aversion and holding losers too long",
      "minutes": 3,
      "body": [
        "Loss aversion means a loss hurts more than an equal gain feels good. So we avoid the pain by refusing to 'lock in' a loss — we keep holding a sinking coin, hoping it claws back to even.",
        "But here is the trap: if the reason you bought is gone, the loss is already real. The number on your screen doesn't become true only when you sell; selling just stops you pretending otherwise. Holding a dead thesis is not patience, it's avoidance.",
        "The sound question is never 'how far down am I?' — it's 'does my thesis still hold?' If the thesis is intact, a deep drop may be noise worth riding out. If the thesis is broken, the size of the loss is not a reason to stay."
      ],
      "insight": "If the thesis is dead, the loss is already real — decide on whether the reason to own still holds, not on how far down you are.",
      "quiz": {
        "q": "A coin is down 70% and your reason for owning it no longer holds. What is the sound basis for deciding what to do?",
        "options": [
          "Hold until it returns to your entry so you don't lock in the loss",
          "Whether your original thesis still holds, regardless of the loss size",
          "How much money you'd be giving up by selling now",
          "Whether other coins are also down right now"
        ],
        "correctIdx": 1
      }
    },
    {
      "id": "psychology-5",
      "title": "Confirmation bias in your own research",
      "minutes": 3,
      "body": [
        "Once you like a coin, your brain quietly takes a side. You start reading the bullish threads, nodding at good news, and skimming past anything that contradicts you. It feels like research, but you're really collecting reasons to do what you already wanted.",
        "The fix is not 'try to be objective' — that rarely works. The fix is to deliberately hunt for the case against you: what would have to be true for this to be a bad hold? What evidence would prove your thesis wrong?",
        "This is exactly why your thesis includes change-my-mind conditions. They turn a vague good feeling into specific, falsifiable claims you can actively test against — and they tell you when you were wrong before the price has to."
      ],
      "insight": "You can't out-discipline confirmation bias by 'staying objective' — you beat it by actively searching for the evidence you're wrong.",
      "quiz": {
        "q": "What is the best antidote to confirmation bias in your own research?",
        "options": [
          "Read as much bullish analysis as possible to build conviction",
          "Try harder to stay neutral and objective while you read",
          "Deliberately look for evidence that your thesis is wrong",
          "Only follow analysts who already agree with you"
        ],
        "correctIdx": 2
      }
    },
    {
      "id": "psychology-6",
      "title": "Selling: deciding before the moment",
      "minutes": 3,
      "body": [
        "Selling is where emotion hits hardest. In the moment, a green candle screams greed and a red one screams fear — and neither feeling knows anything about whether you should actually sell.",
        "So you decide the rules before the moment arrives, while you're calm. Write down your sell conditions: the thesis is broken, a target you set in advance is hit, or a clearly better opportunity has appeared. These are reasons; 'it scared me today' is not.",
        "When one of those conditions triggers, you're executing a calm decision rather than reacting. The goal isn't to predict the perfect exit — it's to make the choice with a clear head instead of a racing one."
      ],
      "insight": "Decide your sell conditions in advance, while you're calm — in-the-moment selling is just fear or greed wearing a plan's clothing.",
      "quiz": {
        "q": "When is the best time to decide the conditions under which you'll sell a coin?",
        "options": [
          "In advance, while you're calm and have a clear head",
          "The moment the price makes a sharp move",
          "Whenever the coin first turns a profit",
          "Only after consulting the day's news and sentiment"
        ],
        "correctIdx": 0
      }
    }
  ]
};
