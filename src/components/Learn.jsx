import React, { useState } from "react";
import { useLearn } from "../hooks/useLearn.js";
import { MODULE_ICONS, LockIcon } from "./learn-icons.jsx";
import { HeaderTags } from "./HeaderTags.jsx";
import { Ic } from "./ui.jsx";

/**
 * Learn tab — real gamified learning, wired to persisted progress.
 *
 * Content (modules/lessons/quizzes) lives in src/data/learn-content.js; the pure
 * level/XP/streak/module-state logic is in utils/learn.js; progress is loaded +
 * saved via the useLearn hook (Firestore users/{uid}/learn/progress, A4). Lesson
 * completion is QUIZ-GATED (#25): a lesson only counts once its quiz is answered
 * correctly. Scoped under .ci-app.
 */

function Module({ m, isComplete, onOpen }) {
  const isDone = m.status === "done";
  const isActive = m.status === "active";
  const isLocked = m.status === "locked";
  const nextInModule = isActive ? m.lessons.find((l) => !isComplete(l.id)) : null;
  return (
    <div className={"module" + (isActive ? " active" : "") + (isLocked ? " locked" : "")}>
      <div className="m-top">
        <div className={"m-icon" + (isDone ? " done" : "") + (isLocked ? " locked-icon" : "")}>{isLocked ? LockIcon : (MODULE_ICONS[m.id] || m.icon)}</div>
        <div className="m-info">
          <div className="m-title">
            {m.title}
            {isDone && <span style={{ fontSize: 10, background: "var(--sg-s)", color: "var(--sg)", padding: "2px 7px", borderRadius: 999, fontWeight: 700 }}>✓ Done</span>}
          </div>
          <div className="m-subtitle">{m.sub}</div>
          {nextInModule && <div style={{ fontSize: 11.5, color: "var(--accent)", fontWeight: 600, marginTop: 5 }}>Next: {nextInModule.title}</div>}
        </div>
      </div>
      {!isLocked && (
        <>
          <div className="m-prog-bar"><div className={"m-prog-fill " + (isDone ? "done-fill" : "active-fill")} style={{ width: m.pct + "%" }} /></div>
          <div className="m-foot">
            <span className="m-foot-count">{m.done}/{m.total} lessons · {m.pct}%</span>
            <button className="m-btn" onClick={onOpen}>{isDone ? "Review →" : m.done > 0 ? "Continue →" : "Start →"}</button>
          </div>
        </>
      )}
    </div>
  );
}

function LessonOverlay({ lesson, moduleTitle, done, onComplete, onClose }) {
  const correct = lesson.quiz.correctIdx;
  // R11-Q: select → Submit → feedback. A re-opened completed lesson starts fresh
  // (picked=null) so Submit always works; a correct submit re-greens it. No auto-reveal.
  const [picked, setPicked] = useState(null);
  const [result, setResult] = useState(null); // null | "ok" | "bad"

  const pick = (i) => { setPicked(i); if (result) setResult(null); };  // re-picking clears the result
  const submit = () => {
    if (picked == null) return;
    if (picked === correct) { setResult("ok"); onComplete(lesson.id); }  // quiz-gated: only a correct submit completes
    else setResult("bad");
  };

  return (
    <div className="ci-app overlay">
      <div className="overlay-head">
        <div className="overlay-head-title">{moduleTitle}</div>
        <div className="ov-close" onClick={onClose} role="button" aria-label="Close">{Ic.close}</div>
      </div>
      <div className="overlay-body">
        <div className="lesson-title">{lesson.title}</div>
        <div className="lesson-body">{lesson.body.map((p, i) => (<p key={i}>{p}</p>))}</div>
        <div className="lesson-insight">
          <div className="li-label">The key insight</div>
          <div className="li-text">{lesson.insight}</div>
        </div>
        <div className="quiz-card">
          <div className="quiz-q">{lesson.quiz.q}</div>
          {lesson.quiz.options.map((opt, i) => (
            <div key={i} className={"quiz-opt" + (picked === i ? " selected" : "")} onClick={() => pick(i)}>
              <div className="radio" /> {opt}
            </div>
          ))}
          {result === "ok" && <div className="quiz-result ok">✓ Correct — lesson complete</div>}
          {result === "bad" && <div className="quiz-result bad">Not quite — re-read <strong>The key insight</strong> above, then pick again and submit.</div>}
        </div>
        {result === "ok"
          ? <button className="btn-primary" style={{ marginTop: 20 }} onClick={onClose}>Done →</button>
          : <button className="btn-primary" style={{ marginTop: 20 }} disabled={picked == null} onClick={submit}>Submit</button>}
        <div className="disclaimer">For educational purposes only — not financial advice.</div>
      </div>
    </div>
  );
}

export function Learn() {
  const { level, modules, next, isComplete, complete, progress } = useLearn();
  const [active, setActive] = useState(null); // { lesson, moduleTitle }

  const openLesson = (lesson, moduleTitle) => setActive({ lesson, moduleTitle });
  const openModule = (m) => openLesson(m.lessons.find((l) => !isComplete(l.id)) || m.lessons[0], m.title);

  const lessonsDone = progress.completedLessons.length;
  const lessonsTotal = modules.reduce((s, m) => s + m.total, 0);

  return (
    <div className="ci-app screen-bg">
      {/* R13-6: standard apphead (title + tags) like the other tabs, so the shell
          account avatar floats over a plain header and the tags space identically. The
          XP-progress card (.learn-hero) sits below it with the Portfolio value-card frame. */}
      <div className="apphead">
        <div>
          <div className="title">Your Investing Edge <span className="beta">BETA</span><HeaderTags /></div>
        </div>
      </div>
      <div className="learn-hero">
        <div className="learn-level">Level {level.level} · {level.title}</div>
        <div className="xp-bar"><div className="xp-fill" style={{ width: level.pct + "%" }} /></div>
        <div className="xp-label">{level.nextAt != null ? `${level.xp} / ${level.nextAt} XP to Level ${level.level + 1}` : `${level.xp} XP · Max level`}</div>
        <div className="learn-chips">
          {progress.streak > 0 && <span className="learn-chip">🔥 {progress.streak}-day streak</span>}
          <span className="learn-chip">📚 {lessonsDone} of {lessonsTotal} lessons</span>
        </div>
      </div>

      {next ? (
        <div className="today-lesson" onClick={() => openLesson(next.lesson, next.module.title)} style={{ cursor: "pointer" }}>
          <div className="tl-label">Today's lesson</div>
          <div className="tl-title">{next.lesson.title}</div>
          <div className="tl-meta">
            <span>📖 {next.lesson.minutes} min read</span>
            <span>{next.module.title}</span>
          </div>
          <div className="tl-excerpt">{next.lesson.insight}</div>
          <div className="tl-cta">
            Start lesson
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </div>
        </div>
      ) : (
        <div className="today-lesson">
          <div className="tl-label">All caught up</div>
          <div className="tl-title">You've completed every lesson available 🎉</div>
          <div className="tl-excerpt">More modules are on the way — keep your streak going.</div>
        </div>
      )}

      <div className="module-list">
        <div className="grid-auto module-grid">
          {modules.map((m) => (<Module key={m.id} m={m} isComplete={isComplete} onOpen={() => openModule(m)} />))}
        </div>
        <div className="disclaimer">Timeless investing principles distilled into the CryptoIdea research framework. For educational purposes only — not financial advice.</div>
      </div>

      {active && (
        <LessonOverlay
          lesson={active.lesson}
          moduleTitle={active.moduleTitle}
          done={isComplete(active.lesson.id)}
          onComplete={complete}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}
