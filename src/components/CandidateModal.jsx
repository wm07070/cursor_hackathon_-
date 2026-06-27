import { useEffect, useRef } from "react";
import StatusBadge from "./StatusBadge.jsx";

const TIER_LABEL = { green: "정상", yellow: "주의", red: "경고" };
const TIER_COLOR = { green: "#23a55a", yellow: "#f0b232", red: "#f23f43" };

function Sparkline({ data, tier }) {
  if (!data || data.length < 2) {
    return <div className="spark-empty">점수 추이 수집 중…</div>;
  }
  const W = 240;
  const H = 56;
  const MAX = 100;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - (Math.min(Math.max(v, 0), MAX) / MAX) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const color = TIER_COLOR[tier] || TIER_COLOR.green;
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {[30, 60].map((th) => {
        const y = H - (th / MAX) * H;
        return <line key={th} x1="0" y1={y} x2={W} y2={y} className="spark-grid" />;
      })}
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// 감독관이 응시자를 클릭하면 뜨는 확대(스포트라이트) 보기.
export default function CandidateModal({ candidate, onClose }) {
  const ref = useRef(null);
  const t = candidate && ["green", "yellow", "red"].includes(candidate.tier) ? candidate.tier : "green";

  useEffect(() => {
    if (ref.current && candidate?.stream && ref.current.srcObject !== candidate.stream) {
      ref.current.srcObject = candidate.stream;
    }
  }, [candidate?.stream]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!candidate) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal ${t}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-video">
          {candidate.stream ? (
            <video ref={ref} muted playsInline autoPlay className="cam" />
          ) : (
            <div className="cam mock">
              <span className="dot" /> 연결 대기…
            </div>
          )}
          <button className="modal-close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
          <span className={`vtile-score ${t}`}>{candidate.score}</span>
        </div>

        <div className="modal-info">
          <div className="modal-title">
            <i className={`dot ${t}`} />
            <b>{candidate.name}</b>
            <StatusBadge tier={t} score={candidate.score} />
          </div>
          {candidate.tags && candidate.tags.length > 0 ? (
            <ul className="modal-tags">
              {candidate.tags.map((x, i) => (
                <li key={i}>· {x}</li>
              ))}
            </ul>
          ) : (
            <p className="modal-none">현재 감지된 이상 신호 없음 · {TIER_LABEL[t]}</p>
          )}

          <div className="modal-spark">
            <div className="modal-spark-head">
              <span>점수 추이</span>
              <span className="modal-spark-now" style={{ color: TIER_COLOR[t] }}>
                현재 {candidate.score}
              </span>
            </div>
            <Sparkline data={candidate.history} tier={t} />
          </div>

          <p className="modal-hint">바깥을 클릭하거나 Esc 키로 닫기</p>
        </div>
      </div>
    </div>
  );
}
