import CandidateTile from "./CandidateTile.jsx";

export default function ProctorDashboard({ candidates }) {
  const counts = candidates.reduce(
    (a, c) => ((a[c.tier] = (a[c.tier] || 0) + 1), a),
    {}
  );
  // 우선검토: 빨강 → 노랑 → 초록, 동급은 score 내림차순
  const order = { red: 0, yellow: 1, green: 2 };
  const priority = [...candidates].sort(
    (a, b) => (order[a.tier] ?? 3) - (order[b.tier] ?? 3) || b.score - a.score
  );

  return (
    <div className="dash">
      <header className="bar">
        <div className="brand">
          ExamGuard <span className="sub">· 감독관 대시보드</span>
        </div>
        <div className="stats">
          <span>세션: 역량검사 A</span>
          <span>접속 {candidates.length}</span>
          <span className="y">주의 {counts.yellow || 0}</span>
          <span className="r">경고 {counts.red || 0}</span>
        </div>
      </header>

      <div className="body">
        <section className="grid">
          {candidates.length === 0 ? (
            <div className="empty">응시자 접속 대기 중… 응시자에게 접속 링크를 공유하세요.</div>
          ) : (
            candidates.map((c) => <CandidateTile key={c.id} {...c} />)
          )}
        </section>

        <aside className="panel">
          <h3>▶ 우선검토</h3>
          {priority.length === 0 ? (
            <p className="note">접속한 응시자가 없습니다.</p>
          ) : (
            <ol>
              {priority.map((c) => (
                <li key={c.id} className={c.tier}>
                  <b>{c.name}</b>
                  <span>
                    {c.tier === "red" ? "경고" : c.tier === "yellow" ? "주의" : "정상"}{" "}
                    {c.score}
                  </span>
                </li>
              ))}
            </ol>
          )}
          <p className="note">
            판정이 아닌 <b>감독관 시선 라우팅</b>. 최종 판단은 사람이 합니다.
          </p>
        </aside>
      </div>
    </div>
  );
}
