# ExamGuard

웹캠 기반 **실시간 원격 시험 감독** 데모. 같은 와이파이의 여러 응시자가 접속하면,
각자의 영상과 이상행동 점수(anomaly score)가 하나의 감독관 대시보드로 실시간 전송됩니다.

- **분석(브라우저 로컬)**: MediaPipe FaceLandmarker로 시선/머리자세/깜빡임 추출 → 개인 baseline 대비 편차로 점수화
- **실시간 전송**: WebRTC(영상) + Socket.IO(점수/시그널링)
- **감독관 대시보드**: 응시자 타일 + 등급(정상/주의/경고) + 우선검토 패널

> 판정이 아니라 **감독관의 시선을 라우팅**하는 도구입니다. 최종 판단은 사람이 합니다.

## 기술 스택
JavaScript (React 18 + Vite) · Node.js (Express, HTTPS) · Socket.IO · WebRTC · MediaPipe Tasks Vision

## 실행
```bash
npm install
npm run serve
```
콘솔에 출력되는 주소로 접속:
- 감독관(이 PC): `https://localhost:5173/proctor`
- 응시자(같은 와이파이): `https://<이-PC의-LAN-IP>:5173/`

자체서명 HTTPS라 첫 접속 시 브라우저 경고가 뜹니다. **"고급 → 계속 진행"** 을 누르세요.
(HTTPS여야 다른 기기에서 카메라가 동작합니다. 인증서는 최초 실행 시 자동 생성됩니다.)

## 구조
- `server/index.js` — HTTPS 정적 서빙 + Socket.IO 시그널링(offer/answer/ICE) + 점수 브로드캐스트
- `src/views/CandidateView.jsx` — 웹캠 + MediaPipe 분석 + WebRTC 송신 + 점수 전송
- `src/views/ProctorView.jsx` — 다수 응시자 WebRTC 수신 + 대시보드
- `src/detection/*` — 시선/머리자세/깜빡임 신호 → anomaly score
- `public/mediapipe/*` — 로컬에서 서빙하는 WASM/모델 (오프라인 동작)

## 튜닝
- 임계치: `src/detection/signals.js` (`gazeDev > 0.25`, `headDev > 0.35`)
- 등급 경계: `src/detection/anomalyScore.js`의 `tier()` (30 / 60)
