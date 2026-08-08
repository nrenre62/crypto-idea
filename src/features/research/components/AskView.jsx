// components/AskView.jsx — pure UI. Thread + send arrive from the useAsk hook.
import { useState } from 'react';

function Rich({ text }) {
  return text.split('\n').map((line, li) => (
    <span key={li}>{li > 0 && <br />}{line.split('**').map((p, i) => (i % 2 ? <strong key={i}>{p}</strong> : <span key={i}>{p}</span>))}</span>
  ));
}

const PROMPTS = ['How concentrated am I?', "What's my biggest risk?", 'Explain my 30-day change'];

export default function AskView({ messages, busy, onSend }) {
  const [draft, setDraft] = useState('');
  const submit = () => { const q = draft.trim(); if (!q) return; setDraft(''); onSend(q); };

  return (
    <div className="view active">
      <div className="ask">
        <h3>Ask about your portfolio</h3>
        <p className="subp"><span className="live-dot"><span className="d" />Live</span> &nbsp;Real answers about anything you hold.</p>

        <div className="thread">
          {messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="bubble-q">{m.text}</div>
            ) : (
              <div key={i} className="bubble-a">
                <div className="a-head">Research</div>
                <div className="a-text"><Rich text={m.text} /></div>
                {m.followups && (
                  <div className="followups">
                    {m.followups.map((f, j) => (
                      <span key={j} className="fu" role="button" tabIndex={0} onClick={() => onSend(f)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSend(f); } }}>{f}</span>
                    ))}
                  </div>
                )}
              </div>
            )
          )}
        </div>

        <div className="ask-input">
          <input value={draft} placeholder="e.g. How concentrated am I?"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
          <button className="ask-send" aria-label="Send" disabled={busy} onClick={submit}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
        </div>
        <div className="prompts">
          {PROMPTS.map((p) => (
            <span key={p} className="prompt" role="button" tabIndex={0} onClick={() => onSend(p)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSend(p); } }}>{p}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
