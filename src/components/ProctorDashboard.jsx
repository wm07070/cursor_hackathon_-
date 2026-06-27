import { useState } from "react";
import CandidateTile from "./CandidateTile.jsx";
import CandidateModal from "./CandidateModal.jsx";

const GROUPS = [
  { tier: "red", label: "경고" },
  { tier: "yellow", label: "주의" },
  { tier: "green", label: "정상" },
];

const norm = (c) => (["green", "yellow", "red"].includes(c.tier) ? c.tier : "green");

export default function ProctorDashboard({ candidates }) {
  const counts = candidates.reduce((a, c) => ((a[norm(c)] = (a[norm(c)] || 0) + 1), a), {});
  const [focusedId, setFocusedId] = useState(null);
  const focused = candidates.find((c) => c.id === focusedId) || null;

  return (
    <div className="app">
      {/* 서버 레일 */}
      <nav className="rail">
        <div className="rail-icon">
          <span className="rail-pill" />
          EG
        </div>
        <div className="rail-divider" />
        <div className="rail-icon alt" title="역량검사 A">A</div>
      </nav>

      {/* 채널 사이드바 */}
      <aside className="sidebar">
        <div className="sidebar-head">ExamGuard</div>
        <div className="sidebar-body">
          <div className="sidebar-cat">감독 세션</div>
          <div className="channel active">
            <span className="hash">#</span> 역량검사 A
            <span className="count">{candidates.length}</span>
          </div>
          <div className="channel">
            <span className="hash">#</span> 역량검사 B
          </div>
          <div className="sidebar-cat">현황</div>
          <div className="channel">
            <span className="hash">#</span> 경고
            <span className="count">{counts.red || 0}</span>
          </div>
          <div className="channel">
            <span className="hash">#</span> 주의
            <span className="count">{counts.yellow || 0}</span>
          </div>
          <div className="channel">
            <span className="hash">#</span> 정상
            <span className="count">{counts.green || 0}</span>
          </div>
        </div>
        <div className="sidebar-user">
          <div className="avatar">
            감
            <span className="avatar-dot green" />
          </div>
          <div className="who">
            <b>감독관</b>
            <small>온라인</small>
          </div>
        </div>
      </aside>

      {/* 메인 */}
      <main className="main">
        <header className="main-head">
          <span className="hash">#</span>
          <span className="title">역량검사 A</span>
          <span className="topic">실시간 원격 감독 · 응시자 {candidates.length}명</span>
          <span className="spacer" />
          <span className="pill r">
            <i className="dot red" /> 경고 {counts.red || 0}
          </span>
          <span className="pill y">
            <i className="dot yellow" /> 주의 {counts.yellow || 0}
          </span>
        </header>

        <div className="stage">
          {candidates.length === 0 ? (
            <div className="stage-empty">
              <div className="big">🎥</div>
              <h2>응시자 접속 대기 중</h2>
              <p>같은 와이파이의 응시자에게 접속 링크를 공유하세요. 입장하면 여기에 실시간 영상이 표시됩니다.</p>
            </div>
          ) : (
            <div className="stage-grid">
              {candidates.map((c) => (
                <CandidateTile key={c.id} {...c} onSelect={setFocusedId} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 멤버 목록 (상태별 그룹) */}
      <aside className="members">
        {GROUPS.map(({ tier, label }) => {
          const list = candidates
            .filter((c) => norm(c) === tier)
            .sort((a, b) => b.score - a.score);
          return (
            <div key={tier}>
              <div className="members-cat">
                {label} — {list.length}
              </div>
              {list.map((c) => (
                <div className="member" key={c.id} onClick={() => setFocusedId(c.id)} title="클릭하면 확대">
                  <div className="avatar">
                    {(c.name || "?").trim().charAt(0)}
                    <span className={`avatar-dot ${tier}`} />
                  </div>
                  <div className="who">
                    <b>{c.name}</b>
                    <small className={tier !== "green" ? tier : ""}>
                      {label} · {c.score}
                      {c.tags && c.tags.length > 0 ? ` · ${c.tags[0]}` : ""}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
        <p className="members-note">
          판정이 아닌 <b>감독관 시선 라우팅</b>. 최종 판단은 사람이 합니다.
        </p>
      </aside>

      <CandidateModal candidate={focused} onClose={() => setFocusedId(null)} />
    </div>
  );
}
