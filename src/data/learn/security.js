// src/data/learn/security.js — Learn module: Security & Self-Custody
// No author names (#24). Each lesson quiz has one correctIdx (#25, quiz-gated).
// One of the ~9 modules composed by src/data/learn-content.js.
export const security = {
  "id": "security",
  "icon": "🔐",
  "title": "Security & Self-Custody",
  "sub": "Keys, rug pulls, contract risk, wallet hygiene, custody",
  "lessons": [
    {
      "id": "security-1",
      "title": "Your keys, your coins",
      "minutes": 2,
      "body": [
        "Every coin lives on a blockchain, but only a private key can move it. Self-custody means you hold that key yourself — in a wallet you control — instead of trusting a company to hold it for you.",
        "When your coins sit on an exchange, you don't actually hold the key. The exchange does, and you hold an IOU. If they freeze withdrawals, get hacked, or fail, your access goes with them, no matter what your balance screen says.",
        "The tradeoff is responsibility. Holding your own keys removes the middleman that can fail you, but it also means no support line and no password reset. Lose the key and the coins are gone."
      ],
      "insight": "If you don't hold the private key, you hold a promise — and promises can be frozen, hacked, or broken.",
      "quiz": {
        "q": "What does it actually mean to 'self-custody' a coin?",
        "options": [
          "Your balance is large enough to count as ownership",
          "You personally control the private key that can move the coins",
          "Your coins are stored on a regulated exchange",
          "You've verified your identity with the platform"
        ],
        "correctIdx": 1
      }
    },
    {
      "id": "security-2",
      "title": "Spotting rug pulls before they pull",
      "minutes": 3,
      "body": [
        "A rug pull is when the people behind a token quietly drain its value and disappear. The patterns repeat: an anonymous team, a contract that can still mint new tokens, a huge slice of supply held by insiders, and liquidity that isn't locked.",
        "Of all of these, unlocked liquidity is the loudest alarm. If the pool that lets you sell can be withdrawn by the devs, they can pull it out in one transaction — and your token becomes impossible to sell at any real price.",
        "No single flag is proof, but they stack. Locked liquidity, a renounced mint authority, and a transparent team don't guarantee safety, but their absence tells you the door is wide open for the people who built it."
      ],
      "insight": "Unlocked liquidity is the rug under your feet — if the devs can pull the pool, they can leave you holding a token you can't sell.",
      "quiz": {
        "q": "Which factor is the strongest signal that a token could be rug-pulled?",
        "options": [
          "The liquidity pool is unlocked and the devs can withdraw it",
          "The token has a small market cap",
          "The price has fallen recently",
          "The project has an active social media following"
        ],
        "correctIdx": 0
      }
    },
    {
      "id": "security-3",
      "title": "Smart-contract risk and audits",
      "minutes": 3,
      "body": [
        "A smart contract is just code, and code has bugs. When that code holds money, a single flaw can be drained by anyone who finds it before the developers do — and on a blockchain, those mistakes are usually irreversible.",
        "An audit is a review where security experts read the contract and look for known problems. It reduces risk and is a real signal of care, but it is a snapshot, not a warranty. Audited contracts have still been exploited.",
        "Read an audit as 'fewer known holes,' not 'safe.' An unaudited contract holding real funds is a clear danger; an audited one is lower risk, but never zero. The amount you put at stake should reflect that."
      ],
      "insight": "An audit lowers known risk — it never guarantees safety. Audited code has still been drained.",
      "quiz": {
        "q": "What does a smart-contract audit actually guarantee?",
        "options": [
          "The contract is mathematically proven safe",
          "The token's price is protected from crashing",
          "Nothing is guaranteed — it lowers known risk but exploits can remain",
          "User funds are insured if the contract fails"
        ],
        "correctIdx": 2
      }
    },
    {
      "id": "security-4",
      "title": "Phishing, approvals, and wallet hygiene",
      "minutes": 3,
      "body": [
        "Most people who lose crypto weren't beaten by broken cryptography — they were tricked. The attacks are social: a fake site that mimics the real one, a phishing message, or a transaction that looks harmless but grants a stranger permission to move your tokens.",
        "Token approvals are the quiet danger. To use many apps you sign an approval letting a contract spend your tokens, and a malicious one can ask for unlimited access. Once granted, it can drain that token later, with no further click from you.",
        "Good hygiene is simple and boring: type URLs yourself or use trusted bookmarks, read what you're signing, periodically revoke approvals you no longer use, and never enter your seed phrase anywhere. No real service will ever ask for it."
      ],
      "insight": "Hackers rarely break the math — they get you to sign it away. Your seed phrase and your approvals are the real targets.",
      "quiz": {
        "q": "How do most everyday crypto users actually lose their funds?",
        "options": [
          "Attackers crack the blockchain's encryption",
          "Social engineering — phishing sites, fake apps, and malicious approvals",
          "Quantum computers break their private keys",
          "Exchanges secretly sell their coins"
        ],
        "correctIdx": 1
      }
    },
    {
      "id": "security-5",
      "title": "Custody tradeoffs: exchange vs. self",
      "minutes": 2,
      "body": [
        "Leaving funds on an exchange is convenient — easy to trade, recover a login, and get help. But it adds counterparty risk: you're trusting that one company to stay solvent, honest, and not to freeze your account. If it fails, your coins can vanish with it.",
        "Self-custody removes that counterparty but hands you the full job. There's no reset and no support — your security is entirely your own discipline with keys, backups, and approvals.",
        "It isn't all-or-nothing. Many people keep small, actively-traded amounts on an exchange and move larger holdings to self-custody as the stake — and their own skill — grows. Match the method to the amount you'd hate to lose."
      ],
      "insight": "Funds on an exchange carry counterparty risk — you're trusting a company that can fail or freeze you, not just the blockchain.",
      "quiz": {
        "q": "What is the main risk of leaving your coins on an exchange?",
        "options": [
          "The blockchain might reverse your transactions",
          "You'll pay higher network fees over time",
          "Counterparty risk — the exchange could fail, freeze, or be hacked",
          "Your coins slowly lose their private keys"
        ],
        "correctIdx": 2
      }
    }
  ]
};
