import { useEffect, useRef } from "react";
import StatusBadge from "./StatusBadge.jsx";
import ReasonTags from "./ReasonTags.jsx";

// 감독관 대시보드의 응시자 타일. stream(원격 MediaStream)이 있으면 영상 표시.
export default function CandidateTile({ name, tier, score, tags, stream }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && stream && ref.current.srcObject !== stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`tile ${tier} ${tier === "red" ? "pulse" : ""}`}>
      <div className="tile-head">
        <span className="name">{name}</span>
        <StatusBadge tier={tier} score={score} />
      </div>
      <div className="tile-video">
        {stream ? (
          <video ref={ref} muted playsInline autoPlay className="cam" />
        ) : (
          <div className="cam mock">연결 대기…</div>
        )}
      </div>
      <ReasonTags tags={tags} />
    </div>
  );
}
