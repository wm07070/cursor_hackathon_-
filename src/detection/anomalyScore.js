// 신호 가중합 → 0~100 score → 3단계 등급 + 한국어 근거 태그.
export const WEIGHTS = {
  gazeOffSustained: 0.35,  // 화면 이탈 지속
  headTiltSustained: 0.25, // 머리 기울임/회전 지속
  lowBlinkListening: 0.1,  // 깜빡임 감소(듣는 중)
  glassesGate: 0.2,        // 착용 게이트
  handToTemple: 0.1,       // 캡처 제스처
};

const LABELS = {
  gazeOffSustained: "시선 이탈 지속",
  headTiltSustained: "머리 기울임 반복",
  lowBlinkListening: "깜빡임 급감(청취 의심)",
  glassesGate: "안경 착용",
  handToTemple: "촬영 트리거 의심",
};

export function computeScore(signals) {
  let s = 0;
  for (const k in WEIGHTS) s += WEIGHTS[k] * (signals[k] ?? 0);
  return Math.min(100, Math.round(s * 100));
}

export function tier(score) {
  if (score >= 60) return "red";    // 경고
  if (score >= 30) return "yellow"; // 주의
  return "green";                   // 정상
}

// 점수에 실제로 기여한 신호만 태그로 (기여도 큰 순)
export function reasonTags(signals) {
  return Object.keys(WEIGHTS)
    .map((k) => ({ k, contrib: WEIGHTS[k] * (signals[k] ?? 0) }))
    .filter((x) => x.contrib > 0.04)
    .sort((a, b) => b.contrib - a.contrib)
    .map((x) => LABELS[x.k]);
}
