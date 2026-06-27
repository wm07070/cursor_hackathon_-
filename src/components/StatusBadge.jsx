const MAP = {
  green: "정상",
  yellow: "주의",
  red: "경고",
};
export default function StatusBadge({ tier, score }) {
  const t = MAP[tier] ? tier : "green";
  return (
    <span className={`badge ${t}`}>
      <i className="dot" />
      {MAP[t]} · {score}
    </span>
  );
}
