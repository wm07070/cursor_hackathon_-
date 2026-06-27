import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { RTC_CONF } from "../rtc/config.js";
import { createFaceLandmarker, detectFrame } from "../detection/faceLandmarker.js";
import { createCalibrator } from "../detection/calibration.js";
import { createSignalTracker } from "../detection/signals.js";
import { computeScore, tier, reasonTags } from "../detection/anomalyScore.js";
import StatusBadge from "../components/StatusBadge.jsx";
import ReasonTags from "../components/ReasonTags.jsx";

export default function CandidateView({ name }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const latestRef = useRef({ score: 0, tier: "green", tags: [] });
  const manualRef = useRef({ glasses: false, capture: false });
  const awayRef = useRef(false);
  const [away, setAway] = useState(false);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [calibrating, setCalibrating] = useState(true);
  const [calibProgress, setCalibProgress] = useState(0);
  const [state, setState] = useState({ score: 0, tier: "green", tags: [] });
  const [connected, setConnected] = useState(false);
  const [manual, setManual] = useState({ glasses: false, capture: false });

  // 1) 웹캠
  useEffect(() => {
    let stream;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 20, max: 24 },
            facingMode: "user",
          },
          audio: false,
        });
        // 인코더가 프레임레이트보다 부드러움 유지를 우선하도록 힌트
        stream.getVideoTracks().forEach((t) => (t.contentHint = "motion"));
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch (e) {
        setError(e.message);
      }
    })();
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);

  // 2) 시그널링 + WebRTC (응시자가 감독관에게 offer)
  useEffect(() => {
    if (!ready) return;
    const socket = io();
    socketRef.current = socket;
    socket.emit("join", { role: "candidate", name });

    const makeOffer = async () => {
      pcRef.current?.close();
      const pc = new RTCPeerConnection(RTC_CONF);
      pcRef.current = pc;
      streamRef.current.getTracks().forEach((t) => pc.addTrack(t, streamRef.current));
      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit("rtc:ice", { candidate: e.candidate });
      };
      pc.onconnectionstatechange = () =>
        setConnected(pc.connectionState === "connected");

      // 다중 접속 시 와이파이/디코딩 포화 방지: 비트레이트·프레임레이트 상한 + 부하 시 해상도 자동 강하
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
      if (sender) {
        const params = sender.getParameters();
        if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
        params.encodings[0].maxBitrate = 350_000; // ~350kbps
        params.encodings[0].maxFramerate = 20;
        params.degradationPreference = "balanced";
        try {
          await sender.setParameters(params);
        } catch (e) {
          console.warn("sender 파라미터 설정 실패", e);
        }
      }

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("rtc:offer", { sdp: pc.localDescription });
    };

    socket.on("proctor:status", ({ online }) => online && makeOffer());
    socket.on("proctor:online", () => makeOffer());
    socket.on("rtc:answer", async ({ sdp }) => {
      try {
        await pcRef.current?.setRemoteDescription(sdp);
      } catch (e) {
        console.warn("setRemoteDescription 실패", e);
      }
    });
    socket.on("rtc:ice", async ({ candidate }) => {
      try {
        await pcRef.current?.addIceCandidate(candidate);
      } catch {
        /* noop */
      }
    });

    return () => {
      socket.disconnect();
      pcRef.current?.close();
    };
  }, [ready, name]);

  // 3) 감지 루프 (로컬에서 MediaPipe 분석)
  useEffect(() => {
    if (!ready) return;
    let raf,
      landmarker,
      stopped = false;
    const calibrator = createCalibrator(8000);
    const track = createSignalTracker(4000);

    (async () => {
      try {
        landmarker = await createFaceLandmarker();
      } catch (e) {
        setError(`얼굴 인식 모델 로딩 실패: ${e.message}`);
        return;
      }
      // 분석은 ~10fps면 충분. 매 프레임 추론하면 영상 인코더가 굶어 끊김 발생.
      const DETECT_INTERVAL = 100;
      let lastInfer = 0;
      const loop = () => {
        if (stopped) return;
        raf = requestAnimationFrame(loop);
        const video = videoRef.current;
        if (!video || video.readyState < 2) return;
        const ts = performance.now();
        if (ts - lastInfer < DETECT_INTERVAL) return;
        lastInfer = ts;

        const frame = detectFrame(landmarker, video, ts);
        if (!calibrator.ready) {
          calibrator.feed(frame, ts);
          setCalibProgress(calibrator.progress(ts));
          if (calibrator.ready) setCalibrating(false);
        } else {
          const signals = track(frame, calibrator.baseline, ts, manualRef.current);
          const score = computeScore(signals);
          const t = tier(score);
          const tags = reasonTags(signals);
          latestRef.current = { score, tier: t, tags };
          setState({ score, tier: t, tags });
        }
      };
      loop();
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      landmarker?.close?.();
    };
  }, [ready]);

  // 점수 전송 (탭 이탈 시 강제 경고 오버라이드)
  const AWAY_TAG = "화면 이탈(탭 전환)";
  const sendScore = useCallback(() => {
    const s = socketRef.current;
    if (!s || !s.connected) return;
    let { score, tier: t, tags } = latestRef.current;
    if (awayRef.current) {
      score = Math.max(score, 75);
      t = "red";
      tags = [AWAY_TAG, ...tags.filter((x) => x !== AWAY_TAG)].slice(0, 3);
    }
    s.emit("score", { name, score, tier: t, tags, away: awayRef.current });
  }, [name]);

  // 4) 점수 주기 전송
  useEffect(() => {
    const iv = setInterval(sendScore, 500);
    return () => clearInterval(iv);
  }, [sendScore]);

  // 5) 탭/창 이탈 감지 (다른 탭·앱으로 전환 시 즉시 경고)
  useEffect(() => {
    const update = () => {
      const isAway = document.hidden || !document.hasFocus();
      if (isAway !== awayRef.current) {
        awayRef.current = isAway;
        setAway(isAway);
        sendScore(); // 루프가 멈춰도 즉시 반영
      }
    };
    document.addEventListener("visibilitychange", update);
    window.addEventListener("blur", update);
    window.addEventListener("focus", update);
    return () => {
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("blur", update);
      window.removeEventListener("focus", update);
    };
  }, [sendScore]);

  const toggle = (k) => {
    const next = { ...manualRef.current, [k]: !manualRef.current[k] };
    manualRef.current = next;
    setManual(next);
  };

  return (
    <div className="candidate-wrap">
      <div className={`candidate-card ${away ? "away" : ""}`}>
        {error && <div className="error">{error}</div>}
        {away && (
          <div className="error">⚠ 시험 화면을 벗어났습니다. 감독관에게 기록됩니다.</div>
        )}

        <div className="candidate-head">
          <div className="brand">
            <div className="logo">EG</div>
            ExamGuard
          </div>
          <span className={`conn ${connected ? "on" : ""}`}>
            <i className="dot" />
            {connected ? "감독관 연결됨" : "연결 대기"}
          </span>
        </div>

        <div className="candidate-video">
          <video ref={videoRef} muted playsInline autoPlay className="cam" />
          {calibrating && (
            <div className="calib-overlay">
              기준선 보정 중… {Math.round(calibProgress * 100)}%
              <small>정상 상태로 화면을 봐주세요</small>
            </div>
          )}
        </div>

        <div className="candidate-status">
          <span className="name">{name}</span>
          <StatusBadge tier={state.tier} score={state.score} />
        </div>
        <ReasonTags tags={state.tags} />

        <div className="candidate-demo">
          <span>데모 토글:</span>
          <button className={manual.glasses ? "on" : ""} onClick={() => toggle("glasses")}>
            안경 착용 {manual.glasses ? "ON" : "OFF"}
          </button>
          <button className={manual.capture ? "on" : ""} onClick={() => toggle("capture")}>
            캡처 제스처 {manual.capture ? "ON" : "OFF"}
          </button>
        </div>

        <p className="candidate-note">
          이 화면을 켜둔 채로 시험을 진행하세요. 영상과 점수가 감독관에게 실시간 전송됩니다.
        </p>
      </div>
    </div>
  );
}
