import React from "react";

/**
 * Learn tab — DESIGN SHELL with the static module content from the product spec.
 *
 * Visual only for now: XP/level, badges, today's lesson, and the module list render
 * from the data below. Lesson detail + quiz overlay and real progress tracking land
 * in a later increment. Scoped under .ci-app.
 */
const MODULES = [
  { id: 1, icon: "📈", title: "How Markets Really Work", sub: "Cycles, hype, psychology — and what actually drives prices", lessons: 5, done: 5, status: "done", badgeText: "Market Psychology unlocked" },
  { id: 2, icon: "🔍", title: "Reading the Fundamentals", sub: "GitHub health, founder visibility, real revenue vs. emissions", lessons: 7, done: 3, status: "active", nextLesson: "Lesson 4 — Why GitHub commits matter more than price action" },
  { id: 3, icon: "🏗️", title: "Portfolio Construction", sub: "One winner per category, position sizing, structural connections", lessons: 6, done: 0, status: "locked" },
  { id: 4, icon: "💎", title: "The Conviction Framework", sub: "Holding through volatility — with data, not hope", lessons: 8, done: 0, status: "locked" },
  { id: 5, icon: "📚", title: "Great Investor Principles", sub: "Buffett, Munger, Marks — applied to crypto investing", lessons: 10, done: 0, status: "locked" },
];

const BADGES = ["🎯", "📊", "💎", "📝", "🔍"];

function Module({ m }) {
  const pct = m.lessons ? Math.round((m.done / m.lessons) * 100) : 0;
  const isDone = m.status === "done";
  const isActive = m.status === "active";
  const isLocked = m.status === "locked";
  return (
    <div className={"module" + (isActive ? " active" : "") + (isLocked ? " locked" : "")}>
      <div className="m-top">
        <div className={"m-icon" + (isDone ? " done" : "") + (isLocked ? " locked-icon" : "")}>
          {isLocked ? "🔒" : m.icon}
        </div>
        <div className="m-info">
          <div className="m-title">
            {m.title}
            {isDone && (
              <span style={{ fontSize: 10, background: "var(--sg-s)", color: "var(--sg)", padding: "2px 7px", borderRadius: 999, fontWeight: 700 }}>✓ Done</span>
            )}
          </div>
          <div className="m-subtitle">{m.sub}</div>
          {isActive && m.nextLesson && (
            <div style={{ fontSize: 11.5, color: "var(--accent)", fontWeight: 600, marginTop: 5 }}>Next: {m.nextLesson}</div>
          )}
          {isDone && m.badgeText && (
            <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 4 }}>🎯 {m.badgeText}</div>
          )}
        </div>
      </div>
      {!isLocked && (
        <div className="m-prog">
          <div className="m-prog-bar">
            <div className={"m-prog-fill " + (isDone ? "done-fill" : "active-fill")} style={{ width: pct + "%" }} />
          </div>
          <div className="m-prog-label">{m.done}/{m.lessons} lessons · {pct}% complete</div>
        </div>
      )}
    </div>
  );
}

export function Learn() {
  return (
    <div className="ci-app screen-bg">
      <div className="learn-hero">
        <div className="learn-level">Level 2 · Fundamental Analyst</div>
        <div className="learn-title">Your Investing Edge</div>
        <div className="xp-bar"><div className="xp-fill" style={{ width: "70%" }} /></div>
        <div className="xp-label">847 / 1,200 XP to Level 3</div>
      </div>

      <div className="badges-row">
        {BADGES.map((b, i) => (<div className="badge-chip" key={i}>{b}</div>))}
        <div style={{ display: "flex", alignItems: "center", padding: "0 4px", fontSize: 12, color: "var(--ink-faint)" }}>+3 more →</div>
      </div>

      <div className="today-lesson">
        <div className="tl-label">Today's lesson</div>
        <div className="tl-title">Why GitHub commits matter more than price action</div>
        <div className="tl-meta">
          <span>📖 2 min read</span>
          <span>Module 2 · Lesson 4</span>
        </div>
        <div className="tl-excerpt">
          A project that stops committing code usually stops shipping product. Price follows building — not the other way around. The Myria case study shows exactly why.
        </div>
        <div className="tl-cta">
          Lessons coming soon
        </div>
      </div>

      <div className="module-list">
        {MODULES.map((m) => (<Module key={m.id} m={m} />))}
        <div className="disclaimer">
          Principles from Buffett, Munger, Marks, and the CryptoIdea research framework. For educational purposes only — not financial advice.
        </div>
      </div>
    </div>
  );
}
