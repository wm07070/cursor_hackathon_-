// MediaPipe FaceLandmarker 초기화 + 프레임 추론 헬퍼.
// blendshapes(시선/깜빡임) + transformation matrix(머리자세)를 직접 계산 없이 뽑는다.
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// 로컬(같은 오리진)에서 서빙 → CDN 버전 불일치/오프라인 문제 제거.
// 파일 출처: node_modules/@mediapipe/tasks-vision/wasm, googleapis 모델 → public/mediapipe
const WASM = "/mediapipe/wasm";
const MODEL = "/mediapipe/face_landmarker.task";

export async function createFaceLandmarker() {
  const fileset = await FilesetResolver.forVisionTasks(WASM);
  const opts = {
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: true,
    runningMode: "VIDEO",
    numFaces: 1,
  };
  // 일부 기기/브라우저에서 GPU delegate 실패 → CPU로 폴백.
  try {
    return await FaceLandmarker.createFromOptions(fileset, {
      ...opts,
      baseOptions: { modelAssetPath: MODEL, delegate: "GPU" },
    });
  } catch (e) {
    console.warn("GPU delegate 실패 → CPU 폴백", e);
    return FaceLandmarker.createFromOptions(fileset, {
      ...opts,
      baseOptions: { modelAssetPath: MODEL, delegate: "CPU" },
    });
  }
}

// video 엘리먼트에서 한 프레임 추론 → 원시 신호로 정리.
export function detectFrame(landmarker, video, tsMs) {
  const res = landmarker.detectForVideo(video, tsMs);
  const hasFace = res.faceBlendshapes && res.faceBlendshapes.length > 0;
  if (!hasFace) return { hasFace: false };

  const bs = Object.fromEntries(
    res.faceBlendshapes[0].categories.map((c) => [c.categoryName, c.score])
  );

  // 시선 오프셋 (디스플레이형 글라스 대응)
  const gazeX =
    bs.eyeLookOutLeft + bs.eyeLookInRight - (bs.eyeLookInLeft + bs.eyeLookOutRight);
  const gazeY =
    bs.eyeLookUpLeft + bs.eyeLookUpRight - (bs.eyeLookDownLeft + bs.eyeLookDownRight);
  const gazeOffset = Math.hypot(gazeX, gazeY);

  // 깜빡임
  const blink = (bs.eyeBlinkLeft + bs.eyeBlinkRight) / 2;

  // 머리 자세 (캡처 동작 대응)
  let yaw = 0, pitch = 0, roll = 0;
  const mats = res.facialTransformationMatrixes;
  if (mats && mats.length > 0) {
    ({ yaw, pitch, roll } = matrixToEuler(mats[0].data));
  }

  return { hasFace: true, gazeOffset, blink, yaw, pitch, roll };
}

// 4x4 (column-major, length 16) → yaw/pitch/roll (라디안)
function matrixToEuler(m) {
  const r00 = m[0], r10 = m[1], r20 = m[2];
  const r21 = m[6], r22 = m[10];
  const pitch = Math.atan2(-r20, Math.hypot(r21, r22));
  const yaw = Math.atan2(r10, r00);
  const roll = Math.atan2(r21, r22);
  return { yaw, pitch, roll };
}
