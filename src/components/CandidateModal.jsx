import { useEffect, useRef } from "react";
import StatusBadge from "./StatusBadge.jsx";

const TIER_LABEL = { green: "정상", yellow: "주의", red: "경고" };

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
          <p className="modal-hint">바깥을 클릭하거나 Esc 키로 닫기</p>
        </div>
      </div>
    </div>
  );
}
