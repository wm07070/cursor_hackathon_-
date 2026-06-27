import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { RTC_CONF } from "../rtc/config.js";
import ProctorDashboard from "../components/ProctorDashboard.jsx";
import Toasts from "../components/Toasts.jsx";

const HISTORY_LEN = 60;

export default function ProctorView() {
  // id -> { id, name, score, tier, tags, stream, history, away }
  const [candidates, setCandidates] = useState({});
  const [toasts, setToasts] = useState([]);
  const pcsRef = useRef({}); // id -> RTCPeerConnection
  const prevTierRef = useRef({}); // id -> 직전 tier (경고 전환 감지용)
  const audioCtxRef = useRef(null);

  const beep = () => {
    try {
      let ctx = audioCtxRef.current;
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = ctx;
      }
      if (ctx.state === "suspended") ctx.resume();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = "sine";
      o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.setValueAtTime(660, ctx.currentTime + 0.12);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      o.start();
      o.stop(ctx.currentTime + 0.42);
    } catch {
      /* 오디오 정책으로 막히면 무시 */
    }
  };

  const pushToast = (t) => {
    setToasts((p) => [...p.slice(-4), t]);
    setTimeout(() => setToasts((p) => p.filter((x) => x.key !== t.key)), 6000);
  };

  const closeToast = (key) => setToasts((p) => p.filter((x) => x.key !== key));

  useEffect(() => {
    // 브라우저 오디오 자동재생 정책 우회: 첫 클릭에 오디오 컨텍스트 활성화
    const arm = () => {
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        audioCtxRef.current.resume?.();
      } catch {
        /* noop */
      }
    };
    window.addEventListener("pointerdown", arm, { once: true });
    return () => window.removeEventListener("pointerdown", arm);
  }, []);

  useEffect(() => {
    const socket = io();
    socket.emit("join", { role: "proctor" });

    const upsert = (id, patch) =>
      setCandidates((p) => ({
        ...p,
        [id]: {
          id,
          name: "응시자",
          score: 0,
          tier: "green",
          tags: [],
          history: [],
          away: false,
          ...(p[id] || {}),
          ...patch,
        },
      }));

    socket.on("candidate:join", ({ id, name }) => upsert(id, { name }));

    socket.on("candidate:leave", ({ id }) => {
      pcsRef.current[id]?.close();
      delete pcsRef.current[id];
      delete prevTierRef.current[id];
      setCandidates((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
    });

    socket.on("score", ({ from, name, score, tier, tags, away }) => {
      // 경고(red)로 새로 진입한 순간만 알림
      if (tier === "red" && prevTierRef.current[from] !== "red") {
        beep();
        pushToast({
          key: `${from}-${Date.now()}`,
          name: name || "응시자",
          reason: (tags && tags[0]) || "이상 행동 감지",
          score,
        });
      }
      prevTierRef.current[from] = tier;

      setCandidates((p) => {
        const cur = p[from] || {};
        const history = [...(cur.history || []), score].slice(-HISTORY_LEN);
        return {
          ...p,
          [from]: {
            id: from,
            name: name || cur.name || "응시자",
            score,
            tier,
            tags: tags || [],
            stream: cur.stream,
            away: !!away,
            history,
          },
        };
      });
    });

    socket.on("rtc:offer", async ({ from, name, sdp }) => {
      pcsRef.current[from]?.close();
      const pc = new RTCPeerConnection(RTC_CONF);
      pcsRef.current[from] = pc;
      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit("rtc:ice", { to: from, candidate: e.candidate });
      };
      pc.ontrack = (e) => upsert(from, { name, stream: e.streams[0] });
      try {
        await pc.setRemoteDescription(sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("rtc:answer", { to: from, sdp: pc.localDescription });
      } catch (err) {
        console.warn("answer 생성 실패", err);
      }
    });

    socket.on("rtc:ice", async ({ from, candidate }) => {
      try {
        await pcsRef.current[from]?.addIceCandidate(candidate);
      } catch {
        /* noop */
      }
    });

    return () => {
      socket.disconnect();
      Object.values(pcsRef.current).forEach((pc) => pc.close());
      pcsRef.current = {};
    };
  }, []);

  return (
    <>
      <ProctorDashboard candidates={Object.values(candidates)} />
      <Toasts toasts={toasts} onClose={closeToast} />
    </>
  );
}
