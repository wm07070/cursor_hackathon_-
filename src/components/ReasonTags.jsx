export default function ReasonTags({ tags }) {
  if (!tags || tags.length === 0) return null;
  return (
    <ul className="reasons">
      {tags.map((t, i) => (
        <li key={i}>· {t}</li>
      ))}
    </ul>
  );
}
