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

## 배포 (공개 인터넷)

이 앱은 **상시 WebSocket(Socket.IO) 서버**가 필요해서, 서버리스(Vercel)보다
**WebSocket을 상시 지원하는 PaaS(Render/Railway/Fly.io)** 에 통째로 올리는 것이 가장 간단합니다.
프로덕션(`NODE_ENV=production`)에서는 서버가 평문 HTTP로 listen하고, 플랫폼이 HTTPS를 종단 처리합니다.

### Render (권장, 무료 티어)
1. 이 저장소를 Render에 연결 (New → Web Service → 이 GitHub 저장소 선택)
2. 설정은 저장소의 `render.yaml`이 자동 적용 (Build: `npm install && npm run build`, Start: `npm start`, `NODE_ENV=production`)
3. 배포 후 발급되는 `https://<앱>.onrender.com` 주소를 공유
   - 감독관: `https://<앱>.onrender.com/proctor`
   - 응시자: `https://<앱>.onrender.com/`

### Railway
1. New Project → Deploy from GitHub repo
2. Variables에 `NODE_ENV=production` 추가 (Nixpacks가 `npm run build` → `npm start` 자동 실행)

### NAT 통과 (TURN)
서로 다른 네트워크의 사용자 간 영상 연결을 위해 `src/rtc/config.js`에 공개 TURN(OpenRelay)이
기본 포함돼 있습니다. 트래픽이 많거나 운영용이면 본인 TURN 자격증명(metered/Twilio/coturn)으로 교체하세요.

> 참고: 무료 티어는 유휴 시 슬립 → 첫 접속이 수십 초 지연될 수 있습니다.

## 튜닝
- 임계치: `src/detection/signals.js` (`gazeDev > 0.25`, `headDev > 0.35`)
- 등급 경계: `src/detection/anomalyScore.js`의 `tier()` (30 / 60)
