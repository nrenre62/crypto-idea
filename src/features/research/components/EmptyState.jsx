// components/EmptyState.jsx — pure UI.
export default function EmptyState({
  title = 'No coins yet',
  body = 'Add a coin to your portfolio and your AI insights, allocation and risk will appear here automatically.',
}) {
  return (
    <div className="empty-state">
      <div className="empty-ic">◎</div>
      <div className="empty-h">{title}</div>
      <div className="empty-p">{body}</div>
    </div>
  );
}
