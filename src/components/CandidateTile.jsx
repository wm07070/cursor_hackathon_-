import { memo, useEffect, useRef } from "react";

// 감독관 대시보드의 응시자 영상 타일 (Discord 통화 참가자 스타일).
function CandidateTile({ id, name, tier, score, tags, stream, onSelect }) {
  const ref = useRef(null);
  const t = ["green", "yellow", "red"].includes(tier) ? tier : "green";

  useEffect(() => {
    if (ref.current && stream && ref.current.srcObject !== stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`vtile ${t} clickable`} onClick={() => onSelect(id)} title="클릭하면 확대">
      <span className="vtile-expand">⤢</span>
      {stream ? (
        <video ref={ref} muted playsInline autoPlay className="cam" />
      ) : (
        <div className="cam mock">
          <span className="dot" /> 연결 대기…
        </div>
      )}

      {tags && tags.length > 0 && (
        <div className="vtile-tags">
          {tags.slice(0, 2).map((x, i) => (
            <span key={i}>{x}</span>
          ))}
        </div>
      )}

      <span className={`vtile-score ${t}`}>{score}</span>

      <div className="vtile-bottom">
        <i className={`dot ${t}`} />
        <span className="nm">{name}</span>
      </div>
    </div>
  );
}

export default memo(CandidateTile);
