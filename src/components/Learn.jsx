import React, { useState } from "react";

/**
 * Learn tab — DESIGN SHELL with the static module content from the product spec.
 *
 * Visual content (XP/badges/modules) is static. The lesson overlay + quiz are
 * interactive (the quiz reveals the correct answer) but progress is not persisted
 * yet — that lands with the Learn backend in a later increment. Scoped under .ci-app.
 */
const MODULES = [
  { id: 1, icon: "📈", title: "How Markets Really Work", sub: "Cycles, hype, psychology — and what actually drives prices", lessons: 5, done: 5, status: "done", badgeText: "Market Psychology unlocked" },
  { id: 2, icon: "🔍", title: "Reading the Fundamentals", sub: "GitHub health, founder visibility, real revenue vs. emissions", lessons: 7, done: 3, status: "active", nextLesson: "Lesson 4 — Why GitHub commits matter more than price action" },
  { id: 3, icon: "🏗️", title: "Portfolio Construction", sub: "One winner per category, position sizing, structural connections", lessons: 6, done: 0, status: "locked" },
  { id: 4, icon: "💎", title: "The Conviction Framework", sub: "Holding through volatility — with data, not hope", lessons: 8, done: 0, status: "locked" },
  { id: 5, icon: "📚", title: "Great Investor Principles", sub: "Timeless principles from the world's best investors — applied to crypto investing", lessons: 10, done: 0, status: "locked" },
];

const BADGES = ["🎯", "📊", "💎", "📝", "🔍"];

const QUIZ = [
  "Token price increased 30% last month",
  "Community Discord is very active",
  "Last GitHub commit was 2 days ago", // correct
  "Founder tweeted about the project",
];
const QUIZ_CORRECT = 2;

function Module({ m, onContinue }) {
  const pct = m.lessons ? Math.round((m.done / m.lessons) * 100) : 0;
  const isDone = m.status === "done";
  const isActive = m.status === "active";
  const isLocked = m.status === "locked";
  return (
    <div className={"module" + (isActive ? " active" : "") + (isLocked ? " locked" : "")}>
      <div className="m-top">
        <div className={"m-icon" + (isDone ? " done" : "") + (isLocked ? " locked-icon" : "")}>{isLocked ? "🔒" : m.icon}</div>
        <div className="m-info">
          <div className="m-title">
            {m.title}
            {isDone && <span style={{ fontSize: 10, background: "var(--sg-s)", color: "var(--sg)", padding: "2px 7px", borderRadius: 999, fontWeight: 700 }}>✓ Done</span>}
          </div>
          <div className="m-subtitle">{m.sub}</div>
          {isActive && m.nextLesson && <div style={{ fontSize: 11.5, color: "var(--accent)", fontWeight: 600, marginTop: 5 }}>Next: {m.nextLesson}</div>}
          {isDone && m.badgeText && <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 4 }}>🎯 {m.badgeText}</div>}
        </div>
      </div>
      {!isLocked && (
        <div className="m-prog">
          <div className="m-prog-bar"><div className={"m-prog-fill " + (isDone ? "done-fill" : "active-fill")} style={{ width: pct + "%" }} /></div>
          <div className="m-prog-label">{m.done}/{m.lessons} lessons · {pct}% complete</div>
        </div>
      )}
      {isActive && <div className="m-cta"><button className="m-btn" onClick={onContinue}>Continue →</button></div>}
    </div>
  );
}

function LessonOverlay({ onClose }) {
  const [answered, setAnswered] = useState(false);
  return (
    <div className="ci-app overlay">
      <div className="overlay-head">
        <div className="back-btn" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
        </div>
        <div className="overlay-head-title">Module 2 · Lesson 4</div>
      </div>
      <div className="overlay-body">
        <div className="lesson-title">Why GitHub commits matter more than price action</div>
        <div className="lesson-body">
          <p>When a project's price goes up, it's easy to feel good about it. But price action tells you nothing about whether the project is actually being built. It tells you about <strong>demand for a token</strong> — not about whether the team is working.</p>
          <p>GitHub commits are different. Every commit is a real action: a developer pushed code. You can see when the last commit happened, how many people are contributing, and whether the main repository was updated this week or last year.</p>
          <p><strong>The Myria case:</strong> Myria was a gaming blockchain. The token pumped in 2024. The community was excited. But in early 2026 the GitHub showed zero commits all year — the founder had quietly taken another job. The project was dead; the community just hadn't noticed yet.</p>
        </div>
        <div className="lesson-insight">
          <div className="li-label">The key insight</div>
          <div className="li-text">A project that stops committing code usually stops shipping product. Price follows building — not the other way around.</div>
        </div>
        <div className="quiz-card">
          <div className="quiz-q">Which is the strongest signal a project is still being actively built?</div>
          {QUIZ.map((opt, i) => (
            <div key={i} className={"quiz-opt" + (answered && i === QUIZ_CORRECT ? " correct" : "")} onClick={() => setAnswered(true)}>
              <div className="radio" /> {opt}
            </div>
          ))}
        </div>
        <button className="btn-primary" style={{ marginTop: 20 }} onClick={onClose}>Next lesson →</button>
        <div className="disclaimer">For educational purposes only — not financial advice.</div>
      </div>
    </div>
  );
}

export function Learn() {
  const [showLesson, setShowLesson] = useState(false);
  return (
    <div className="ci-app screen-bg">
      <div className="learn-hero">
        <div className="learn-level">Level 2 · Fundamental Analyst</div>
        <div className="learn-title">Your Investing Edge <span className="beta">BETA</span></div>
        <div className="xp-bar"><div className="xp-fill" style={{ width: "70%" }} /></div>
        <div className="xp-label">847 / 1,200 XP to Level 3</div>
      </div>

      <div className="badges-row">
        {BADGES.map((b, i) => (<div className="badge-chip" key={i}>{b}</div>))}
        <div style={{ display: "flex", alignItems: "center", padding: "0 4px", fontSize: 12, color: "var(--ink-faint)" }}>+3 more →</div>
      </div>

      <div className="today-lesson" onClick={() => setShowLesson(true)} style={{ cursor: "pointer" }}>
        <div className="tl-label">Today's lesson</div>
        <div className="tl-title">Why GitHub commits matter more than price action</div>
        <div className="tl-meta">
          <span>📖 2 min read</span>
          <span>Module 2 · Lesson 4</span>
        </div>
        <div className="tl-excerpt">A project that stops committing code usually stops shipping product. Price follows building — not the other way around. The Myria case study shows exactly why.</div>
        <div className="tl-cta">
          Start lesson
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        </div>
      </div>

      <div className="module-list">
        {MODULES.map((m) => (<Module key={m.id} m={m} onContinue={() => setShowLesson(true)} />))}
        <div className="disclaimer">Timeless investing principles distilled into the CryptoIdea research framework. For educational purposes only — not financial advice.</div>
      </div>

      {showLesson && <LessonOverlay onClose={() => setShowLesson(false)} />}
    </div>
  );
}
