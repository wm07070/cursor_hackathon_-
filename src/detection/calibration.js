// 응시자별 baseline 보정. 세션 시작 첫 N초를 "정상"으로 캡처해 개인 기준선 산출.
export function createCalibrator(durationMs = 8000) {
  const samples = [];
  let startTs = null;
  let baseline = null;

  return {
    feed(frame, tsMs) {
      if (baseline) return;
      if (startTs === null) startTs = tsMs;
      if (frame.hasFace) samples.push(frame);
      if (tsMs - startTs >= durationMs && samples.length > 10) {
        baseline = summarize(samples);
      }
    },
    get ready() { return baseline !== null; },
    get baseline() { return baseline; },
    progress(tsMs) {
      if (baseline) return 1;
      if (startTs === null) return 0;
      return Math.min(1, (tsMs - startTs) / durationMs);
    },
  };
}

function summarize(samples) {
  const mean = (sel) => samples.reduce((a, s) => a + sel(s), 0) / samples.length;
  return {
    gazeOffset: mean((s) => s.gazeOffset),
    yaw: mean((s) => s.yaw),
    pitch: mean((s) => s.pitch),
    blink: mean((s) => s.blink),
  };
}
