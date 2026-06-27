# ExamGuard · 실시간 원격 감독 (풀버전)

여러 응시자가 같은 와이파이로 접속해, 각자의 웹캠 영상과 이상 점수를
하나의 감독관 대시보드로 실시간 전송합니다. (WebRTC + Socket.IO)

## 실행
```bash
npm install
npm run serve
```
실행하면 콘솔에 접속 주소가 출력됩니다.
- 감독관(이 PC): `https://localhost:5173/proctor`
- 응시자(같은 와이파이): `https://<이-PC의-LAN-IP>:5173/`

> 자체서명 HTTPS라 처음 접속 시 브라우저 경고가 뜹니다. **"고급 → 계속 진행(안전하지 않음)"** 을 누르면 됩니다.
> HTTPS여야 다른 기기에서 카메라(getUserMedia)가 동작합니다.

## 사용 흐름
1. 감독관 PC에서 `npm run serve` 실행 → 감독관 페이지 열기
2. 응시자들은 휴대폰/노트북에서 LAN IP 주소로 접속 → 이름 입력 후 "입장"
3. 응시자 화면에서 웹캠 권한 허용 → 첫 8초 baseline 보정
4. 감독관 대시보드에 응시자 타일이 실시간 영상 + 점수로 나타남
5. 빨강(경고)/노랑(주의) 응시자가 우선검토 패널 상단으로 정렬됨

## 구조
- `server/index.js` : HTTPS 정적 서빙 + Socket.IO 시그널링(offer/answer/ICE 중계) + 점수 브로드캐스트
- `src/views/CandidateView.jsx` : 웹캠 + MediaPipe 분석(로컬) + WebRTC 송신 + 점수 전송
- `src/views/ProctorView.jsx` : 다수 응시자 WebRTC 수신 + 점수 수신 → 대시보드
- `src/detection/*` : 시선/머리자세/깜빡임 신호 → anomaly score

## 개발 모드 (단일 PC, localhost)
```bash
npm run dev
```
HMR이 필요할 때 사용. 단, 다른 기기 접속/카메라는 `npm run serve`(HTTPS)에서만 동작.

## 현장 튜닝 포인트 (src/detection/signals.js)
- `gazeDev > 0.25`, `headDev > 0.35` 임계치를 우리 얼굴로 조정
- 등급 경계는 `anomalyScore.js`의 `tier()`에서 30/60 조정
