const MAP = {
  green: { label: "정상", cls: "badge green" },
  yellow: { label: "주의", cls: "badge yellow" },
  red: { label: "경고", cls: "badge red" },
};
export default function StatusBadge({ tier, score }) {
  const m = MAP[tier] ?? MAP.green;
  return (
    <span className={m.cls}>
      {m.label} · {score}
    </span>
  );
}
