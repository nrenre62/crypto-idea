// src/data/learn/fundamentals.js — Learn module: Reading the Fundamentals
// No author names (#24). Each lesson quiz has one correctIdx (#25, quiz-gated).
// One of the ~9 modules composed by src/data/learn-content.js.
export const fundamentals = {
  "id": "fundamentals",
  "icon": "🔍",
  "title": "Reading the Fundamentals",
  "sub": "GitHub health, founder visibility, real revenue vs. emissions",
  "lessons": [
    {
      "id": "fundamentals-1",
      "title": "Why GitHub commits matter more than price action",
      "minutes": 2,
      "body": [
        "When a project's price goes up, it's easy to feel good about it. But price action tells you nothing about whether the project is actually being built. It tells you about demand for a token — not about whether the team is working.",
        "GitHub commits are different. Every commit is a real action: a developer pushed code. You can see when the last commit happened, how many people are contributing, and whether the main repository was updated this week or last year.",
        "The Myria case: the token pumped while the community stayed excited, but the GitHub showed zero commits for a year — the team had quietly moved on. The project was dead; the price just hadn't admitted it yet."
      ],
      "insight": "A project that stops committing code usually stops shipping product. Price follows building — not the other way around.",
      "quiz": {
        "q": "Which is the strongest signal a project is still being actively built?",
        "options": [
          "Token price increased 30% last month",
          "Community Discord is very active",
          "Last GitHub commit was 2 days ago",
          "Founder tweeted about the project"
        ],
        "correctIdx": 2
      }
    },
    {
      "id": "fundamentals-2",
      "title": "Real revenue vs. token emissions",
      "minutes": 3,
      "body": [
        "Some protocols earn money: users pay fees for something they actually want. Others mostly print their own token and pay it out as 'yield' — which can look like growth but is really just dilution wearing a costume.",
        "Ask where the rewards come from. If the headline yield is paid in a token the protocol mints at will, every reward makes each existing token worth a little less. Real revenue comes from outside the system; emissions come from inside it.",
        "This is one of the manual checks the app can't fully automate — you read it from the project's own dashboards and docs, and write what you find in your journal."
      ],
      "insight": "Yield paid in freshly-minted tokens isn't income — it's dilution. Real revenue is paid by users, not by the printer.",
      "quiz": {
        "q": "A protocol advertises '120% APY' paid in its own token. What should you check first?",
        "options": [
          "Whether the APY is higher than competitors",
          "Whether that reward is funded by real fees or by minting new tokens",
          "How many people are staking",
          "The token's price chart"
        ],
        "correctIdx": 1
      }
    },
    {
      "id": "fundamentals-3",
      "title": "Founder visibility: building in public vs. going quiet",
      "minutes": 2,
      "body": [
        "Some teams build in the open: regular updates, working demos, and straight answers to hard questions about delays or risks. Others go quiet after raising money, hide behind a logo, and post only when there's something to hype.",
        "Visibility is not proof of honesty — a chatty team can still fail or mislead. But the reverse is more telling: a team that collected money and then stopped explaining what they're doing has removed your ability to check on them, which is itself information.",
        "What you want is consistency over time. A team that keeps showing its work, even when the work is slow or the news is bad, is easier to hold with conviction than one you only hear from on the way up."
      ],
      "insight": "Visibility doesn't prove a team is good — but silence after raising money takes away your ability to judge them, and that's a flag.",
      "quiz": {
        "q": "Which is the healthier signal about a team you're researching?",
        "options": [
          "They post only when the price is rising and the news is good",
          "They stay anonymous and rarely communicate after the raise",
          "They keep posting honest updates, including about delays and problems",
          "They have the most active hype on social media"
        ],
        "correctIdx": 2
      }
    },
    {
      "id": "fundamentals-4",
      "title": "Active developers vs. a single committer",
      "minutes": 3,
      "body": [
        "Open code lets you see who is actually building. The question isn't just how much work is happening — it's how many different people are doing it, and whether the project survives if any one of them walks away.",
        "When every commit comes from a single account, the project has a bus-factor problem: if that one person quits, gets bored, or disappears, development stops. A real team shows multiple contributors pushing work over time, so no single exit is fatal.",
        "Raw commit counts can mislead. 1000 commits from one person is weaker than 300 commits spread across twelve contributors, because the second project keeps moving when someone leaves. Look at who is committing, not just how often."
      ],
      "insight": "A healthy repo has work spread across many contributors — 300 commits from twelve people beats 1000 from one, because it survives anyone leaving.",
      "quiz": {
        "q": "Which repository looks healthier for a project you might hold long-term?",
        "options": [
          "1000 commits, all from a single contributor",
          "300 commits spread across twelve active contributors",
          "5000 commits, but no activity in the last six months",
          "200 commits from two accounts owned by the same person"
        ],
        "correctIdx": 1
      }
    },
    {
      "id": "fundamentals-5",
      "title": "Documentation and audits as signals of seriousness",
      "minutes": 3,
      "body": [
        "Real documentation, public testing, and security audits cost time and money. A team that invests in them is signaling an intent to last — they're building something they expect people to inspect, use, and rely on.",
        "An audit is a focused review of the smart-contract code by people looking for known classes of bugs. It can reduce the risk of certain failures, but it guarantees nothing: auditors can miss things, code changes after the review, and an audit says nothing about whether the project is honest or the token is worth anything.",
        "So treat an audit as evidence of seriousness and one less category of unknown risk — not as a stamp of safety and never as a reason a price 'should' go up. Read what was actually reviewed, by whom, and what they flagged."
      ],
      "insight": "An audit reduces known smart-contract risk — it does not make a project safe, honest, or a good buy.",
      "quiz": {
        "q": "What does a completed security audit actually tell you?",
        "options": [
          "The token is safe to buy and will hold its value",
          "Reviewers checked the code for known bug types, reducing but not eliminating risk",
          "The project is guaranteed to have no vulnerabilities",
          "The price should rise because the project is now trustworthy"
        ],
        "correctIdx": 1
      }
    },
    {
      "id": "fundamentals-6",
      "title": "Roadmaps: promises vs. shipped milestones",
      "minutes": 2,
      "body": [
        "A roadmap is a list of promises about the future. Promises are cheap — anyone can draw an ambitious timeline, and a beautiful roadmap tells you almost nothing about whether the team can deliver it.",
        "What carries weight is the track record behind the roadmap: did this team ship the things they promised before? A history of hitting past milestones, even modest ones, is real evidence they can hit the next ones.",
        "So read a roadmap backwards. Compare what was previously promised to what actually shipped, on roughly what timeline. A team that quietly delivers beats one that keeps announcing."
      ],
      "insight": "Judge a roadmap by what the team already shipped, not by how ambitious the next milestones look.",
      "quiz": {
        "q": "What's the best way to judge a project's roadmap?",
        "options": [
          "How ambitious and far-reaching the upcoming milestones are",
          "How polished and well-designed the roadmap presentation is",
          "How many features are planned for the next quarter",
          "Whether the team has actually shipped its past promised milestones"
        ],
        "correctIdx": 3
      }
    }
  ]
};
