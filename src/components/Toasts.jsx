export default function Toasts({ toasts, onClose }) {
  if (!toasts || toasts.length === 0) return null;
  return (
    <div className="toast-layer">
      {toasts.map((t) => (
        <div key={t.key} className="toast" onClick={() => onClose(t.key)}>
          <div className="toast-icon">⚠</div>
          <div className="toast-body">
            <b>{t.name}</b>
            <span>
              {t.reason} · 점수 {t.score}
            </span>
          </div>
          <button className="toast-x" onClick={() => onClose(t.key)} aria-label="닫기">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
