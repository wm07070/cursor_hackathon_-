import { useState } from "react";

export default function Landing() {
  const [name, setName] = useState("");

  const enterCandidate = () => {
    const n = name.trim() || `응시자-${Math.floor(Math.random() * 900 + 100)}`;
    window.location.href = `/candidate?name=${encodeURIComponent(n)}`;
  };

  return (
    <div className="landing">
      <div className="landing-card">
        <div className="landing-brand">
          ExamGuard <span className="sub">· 실시간 원격 감독</span>
        </div>
        <p className="landing-desc">
          같은 와이파이의 기기에서 접속하세요. 응시자 영상과 이상 점수가
          감독관 대시보드로 실시간 전송됩니다.
        </p>

        <div className="landing-section">
          <label>응시자로 입장</label>
          <div className="landing-row">
            <input
              value={name}
              placeholder="이름 입력 (예: 홍길동)"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && enterCandidate()}
            />
            <button className="primary" onClick={enterCandidate}>
              입장
            </button>
          </div>
        </div>

        <div className="landing-divider" />

        <div className="landing-section">
          <label>감독관으로 입장</label>
          <a className="ghost" href="/proctor">
            감독관 대시보드 열기
          </a>
        </div>
      </div>
    </div>
  );
}
