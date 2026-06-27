// 원시 프레임 → 슬라이딩 윈도우 기반 "지속 신호"(0~1)로 변환.
// 핵심: 순간 스파이크가 아니라 최근 N초 동안 임계 초과 "비율"을 본다 → 오탐 급감.
export function createSignalTracker(windowMs = 4000) {
  const buf = []; // { ts, gazeDev, headDev, blink }

  return function track(frame, baseline, tsMs, manual) {
    if (frame.hasFace && baseline) {
      const gazeDev = Math.max(0, frame.gazeOffset - baseline.gazeOffset);
      const headDev =
        Math.abs(frame.yaw - baseline.yaw) + Math.abs(frame.pitch - baseline.pitch);
      buf.push({ ts: tsMs, gazeDev, headDev, blink: frame.blink });
    }
    while (buf.length && tsMs - buf[0].ts > windowMs) buf.shift();

    const n = buf.length || 1;
    const ratio = (pred) => buf.filter(pred).length / n;

    // 임계치는 현장에서 우리 얼굴로 튜닝 (README 3:00~3:30 단계)
    const gazeOffSustained = ratio((s) => s.gazeDev > 0.25);   // 화면 이탈 지속
    const headTiltSustained = ratio((s) => s.headDev > 0.35);  // 머리 기울임/회전 지속
    const avgBlink = buf.reduce((a, s) => a + s.blink, 0) / n;
    const lowBlinkListening = avgBlink < 0.05 && buf.length > 10 ? 1 : 0; // 듣는 중 깜빡임 감소

    return {
      gazeOffSustained,
      headTiltSustained,
      lowBlinkListening,
      glassesGate: manual?.glasses ? 1 : 0,   // 착용 게이트 (스피커형 핵심)
      handToTemple: manual?.capture ? 1 : 0,  // 캡처 제스처 (stretch)
    };
  };
}
