// src/data/learn/tokenomics.js — Learn module: Tokenomics & Supply
// No author names (#24). Each lesson quiz has one correctIdx (#25, quiz-gated).
// One of the ~9 modules composed by src/data/learn-content.js.
export const tokenomics = {
  "id": "tokenomics",
  "icon": "🪙",
  "title": "Tokenomics & Supply",
  "sub": "Supply schedules, dilution, unlocks, market cap vs. FDV",
  "lessons": [
    {
      "id": "tokenomics-1",
      "title": "Supply is the denominator of every price",
      "minutes": 2,
      "body": [
        "A coin's price per unit tells you almost nothing on its own. Price is just total value divided by supply, so the per-coin number is set by how many coins exist — a choice the project makes, not a measure of worth.",
        "This is why a token trading at a fraction of a cent is not 'cheap' and a token trading at thousands of dollars is not 'expensive'. Two projects worth the exact same amount can show wildly different unit prices depending on whether they minted millions of coins or billions.",
        "Train yourself to think in market cap, not per-coin price. When you catch yourself saying 'it's only $0.002, it could easily hit $1', stop and multiply that target by the supply — the answer is usually an impossible total value."
      ],
      "insight": "A low unit price is not cheap. Cheapness lives in the market cap, not the number on the ticker.",
      "quiz": {
        "q": "A coin trades at $0.004. Why is that NOT enough to call it 'cheap'?",
        "options": [
          "Because cheap coins always turn out to be scams",
          "Because you can't know the value until you multiply by total supply",
          "Because anything under a cent can't be on a major exchange",
          "Because a low price means the team has already sold out"
        ],
        "correctIdx": 1
      }
    },
    {
      "id": "tokenomics-2",
      "title": "Market cap vs. fully diluted valuation",
      "minutes": 3,
      "body": [
        "Market cap is circulating supply times price — the value of the coins actually trading today. Fully diluted valuation (FDV) uses the total or maximum supply, so it values every coin that will ever exist as if it traded at today's price.",
        "When market cap and FDV are close, most of the supply is already out. When they're far apart, a lot of tokens are still locked up and waiting to enter the market. That gap is a dilution overhang: future supply that can press on price as it unlocks.",
        "Picture a coin at $100M market cap but $2B FDV. Only about 5% of the eventual supply is circulating; the other 95% is scheduled to arrive later. The price you see is supported by a small float, and a flood is sitting behind it."
      ],
      "insight": "A market cap far below FDV means most tokens haven't hit the market yet — you're looking at a small float with a large overhang behind it.",
      "quiz": {
        "q": "A token shows a $100M market cap but a $2B fully diluted valuation. What does that gap mean?",
        "options": [
          "Most of the supply isn't circulating yet and is set to dilute holders later",
          "The token is undervalued by roughly 20x",
          "The team has already sold the majority of tokens",
          "FDV is a calculation error and can be ignored"
        ],
        "correctIdx": 0
      }
    },
    {
      "id": "tokenomics-3",
      "title": "Unlock schedules and the cliff problem",
      "minutes": 3,
      "body": [
        "Early investors and team members usually receive tokens that are locked at launch and released over time — a vesting schedule. Some schedules drip tokens out gradually; others have a 'cliff', where a large tranche unlocks all at once on a single date.",
        "An unlock is simply new sell-side supply arriving on a calendar you can read in advance. The people receiving it often bought in far below the current price, so they have every reason to sell into whatever demand exists.",
        "This is a manual check the app flags but can't fully automate: you look up the unlock schedule yourself and write what you find. A large cliff landing next month is predictable downward pressure — not a surprise, if you bothered to look."
      ],
      "insight": "Unlocks are sell pressure you can see coming. A big cliff is new supply on a known date, aimed at holders who got in cheap.",
      "quiz": {
        "q": "A token has a large investor unlock scheduled for next month. Why does that matter structurally?",
        "options": [
          "Unlocks always cause the price to rise as confidence returns",
          "It only matters if the team publicly announces a sale",
          "It's a predictable jump in sell-side supply from holders who often bought in cheap",
          "Unlocked tokens are burned, so supply actually shrinks"
        ],
        "correctIdx": 2
      }
    },
    {
      "id": "tokenomics-4",
      "title": "Inflation, emissions, and silent dilution",
      "minutes": 3,
      "body": [
        "Many protocols continuously mint new tokens — for staking rewards, liquidity incentives, or block rewards. This is emission, and it inflates supply. Your ownership is a share of the whole, so when supply grows and you do nothing, your slice shrinks.",
        "This is why a headline yield can be a trap. If you earn 20% in new tokens but total supply inflates 25% over the same period, you ended up with more tokens but a smaller share of the network. You were diluted, not rewarded.",
        "The check is to compare what you earn against how fast supply grows. Rewards only beat dilution when they outpace inflation; below that line, the 'yield' is just the printer handing you back a slice of what it took from everyone — including you."
      ],
      "insight": "If your reward rate is below the inflation rate, you're being diluted, not paid. Compare emissions to your yield, not your token count to yesterday's.",
      "quiz": {
        "q": "You earn a 20% staking reward, but the token's total supply inflates 25% that year. What's the net effect on your stake?",
        "options": [
          "You gained 20%, since rewards always add value",
          "It's a wash, because rewards and inflation always cancel out",
          "You came out ahead by 5% on net",
          "Your share of the network shrank — you were diluted despite holding more tokens"
        ],
        "correctIdx": 3
      }
    },
    {
      "id": "tokenomics-5",
      "title": "Who holds the float? Insiders vs. the public",
      "minutes": 2,
      "body": [
        "Total supply tells you how many coins exist; the distribution tells you who controls them. A token can have a large market cap and still be dangerous if a handful of wallets hold most of it.",
        "When the top ten wallets hold, say, 80% of supply, the price you see is set by a thin slice of coins actually changing hands. A few large holders can prop the price up, or dump it, and the rest of the market just rides along.",
        "Concentration is a risk you read from the chain. Many block explorers show top-holder breakdowns, so before you trust a price you can ask: how many wallets would it take to move this, and who are they?"
      ],
      "insight": "Concentrated supply means a few wallets control the price. A small group holding most of the float can prop it up or dump it at will.",
      "quiz": {
        "q": "The top 10 wallets of a token hold 80% of supply. What's the main risk that creates?",
        "options": [
          "A few large holders can move or crash the price almost at will",
          "Higher transaction fees for everyone else",
          "The token can never be listed on a major exchange",
          "Concentration guarantees the price will keep rising"
        ],
        "correctIdx": 0
      }
    },
    {
      "id": "tokenomics-6",
      "title": "Burns and buybacks: real or theater?",
      "minutes": 3,
      "body": [
        "Burning destroys tokens to reduce supply; a buyback uses funds to purchase tokens off the market, often to burn them. Both get marketed as 'returning value' — but the marketing is only as honest as the source of the money and the size of the burn.",
        "Burning tokens that were never in circulation changes nothing real. If a project mints a huge reserve and then 'burns' part of it, the float you actually trade against is untouched — it's a headline, not a supply cut.",
        "The test is where the money comes from. A buyback funded by real fees that users paid is genuine: outside money reducing supply. A buyback funded by minting or selling more treasury tokens just shuffles supply around while looking generous."
      ],
      "insight": "A burn only matters if it's meaningful in size and funded by real revenue. Destroying tokens that were never circulating is cosmetic.",
      "quiz": {
        "q": "A project loudly 'burns' tokens that were locked in its treasury and never circulating. What's the real effect?",
        "options": [
          "It meaningfully raises the value of every circulating token",
          "It permanently doubles the staking rewards",
          "Essentially none — the supply people actually trade is unchanged",
          "It forces the price up by reducing total supply"
        ],
        "correctIdx": 2
      }
    }
  ]
};
