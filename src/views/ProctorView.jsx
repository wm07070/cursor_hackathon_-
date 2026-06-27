import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { RTC_CONF } from "../rtc/config.js";
import ProctorDashboard from "../components/ProctorDashboard.jsx";

export default function ProctorView() {
  // id -> { id, name, score, tier, tags, stream }
  const [candidates, setCandidates] = useState({});
  const pcsRef = useRef({}); // id -> RTCPeerConnection

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
          ...(p[id] || {}),
          ...patch,
        },
      }));

    socket.on("candidate:join", ({ id, name }) => upsert(id, { name }));

    socket.on("candidate:leave", ({ id }) => {
      pcsRef.current[id]?.close();
      delete pcsRef.current[id];
      setCandidates((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
    });

    socket.on("score", ({ from, name, score, tier, tags }) =>
      upsert(from, { name, score, tier, tags })
    );

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

  return <ProctorDashboard candidates={Object.values(candidates)} />;
}
