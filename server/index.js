// ExamGuard 풀버전 서버: 자체서명 HTTPS + Socket.IO 시그널링.
// - dist 정적 서빙(감독관/응시자/랜딩 SPA)
// - WebRTC offer/answer/ICE 중계
// - 응시자 anomaly score 브로드캐스트
import express from "express";
import https from "https";
import os from "os";
import fs from "fs";
import { execFileSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "..", "dist");
const CERT_DIR = path.join(__dirname, "certs");
const PORT = process.env.PORT ? Number(process.env.PORT) : 5173;

const app = express();
app.use(express.static(DIST));
// SPA 폴백: /proctor, /candidate 등 클라이언트 라우팅 (Express 5: 와일드카드 대신 미들웨어)
app.use((_req, res) => res.sendFile(path.join(DIST, "index.html")));

// 자체서명 인증서 (LAN 기기에서 카메라 사용을 위한 secure context 확보)
function ensureCerts() {
  const keyPath = path.join(CERT_DIR, "key.pem");
  const certPath = path.join(CERT_DIR, "cert.pem");
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    return { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
  }
  fs.mkdirSync(CERT_DIR, { recursive: true });
  const san = ["DNS:localhost", "IP:127.0.0.1", ...lanIPs().map((ip) => `IP:${ip}`)].join(",");
  execFileSync("openssl", [
    "req", "-x509", "-newkey", "rsa:2048", "-nodes",
    "-keyout", keyPath, "-out", certPath,
    "-days", "365", "-subj", "/CN=examguard.local",
    "-addext", `subjectAltName=${san}`,
  ]);
  return { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
}

const server = https.createServer(ensureCerts(), app);

const io = new Server(server, { cors: { origin: "*" } });

// 단일 감독관 + 다수 응시자 모델
let proctorId = null;
const candidates = new Map(); // socketId -> name

io.on("connection", (socket) => {
  socket.on("join", ({ role, name }) => {
    socket.data.role = role;

    if (role === "proctor") {
      proctorId = socket.id;
      // 기존 응시자 목록 전달
      for (const [id, n] of candidates) {
        io.to(proctorId).emit("candidate:join", { id, name: n });
      }
      // 응시자들에게 감독관 온라인 알림 → 재협상(offer) 유도
      for (const id of candidates.keys()) io.to(id).emit("proctor:online");
    } else {
      socket.data.name = name;
      candidates.set(socket.id, name);
      if (proctorId) io.to(proctorId).emit("candidate:join", { id: socket.id, name });
      socket.emit("proctor:status", { online: !!proctorId });
    }
  });

  // 응시자 → 감독관 offer
  socket.on("rtc:offer", ({ sdp }) => {
    if (proctorId) {
      io.to(proctorId).emit("rtc:offer", {
        from: socket.id,
        name: candidates.get(socket.id),
        sdp,
      });
    }
  });

  // 감독관 → 응시자 answer
  socket.on("rtc:answer", ({ to, sdp }) => {
    io.to(to).emit("rtc:answer", { from: socket.id, sdp });
  });

  // ICE 양방향 중계
  socket.on("rtc:ice", ({ to, candidate }) => {
    if (socket.data.role === "proctor") {
      io.to(to).emit("rtc:ice", { from: socket.id, candidate });
    } else if (proctorId) {
      io.to(proctorId).emit("rtc:ice", { from: socket.id, candidate });
    }
  });

  // 점수 업데이트
  socket.on("score", ({ name, score, tier, tags }) => {
    if (proctorId) {
      io.to(proctorId).emit("score", { from: socket.id, name, score, tier, tags });
    }
  });

  socket.on("disconnect", () => {
    if (socket.id === proctorId) {
      proctorId = null;
    } else if (candidates.has(socket.id)) {
      candidates.delete(socket.id);
      if (proctorId) io.to(proctorId).emit("candidate:leave", { id: socket.id });
    }
  });
});

function lanIPs() {
  const out = [];
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const i of ifaces || []) {
      if (i.family === "IPv4" && !i.internal) out.push(i.address);
    }
  }
  return out;
}

server.listen(PORT, "0.0.0.0", () => {
  const ips = lanIPs();
  console.log("\n  ExamGuard 풀버전 서버 (HTTPS)\n");
  console.log(`  감독관(이 PC):  https://localhost:${PORT}/proctor`);
  for (const ip of ips) {
    console.log(`  응시자(같은 와이파이):  https://${ip}:${PORT}/`);
  }
  console.log("\n  ※ 자체서명 인증서라 브라우저 경고가 뜨면 '고급 → 계속 진행'을 누르세요.\n");
});
