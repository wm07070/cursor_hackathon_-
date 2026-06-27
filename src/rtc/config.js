// 같은 LAN에서는 host candidate로 충분하지만, 공개망(서로 다른 NAT) 배포 시에는
// STUN + TURN이 필요하다. OpenRelay(metered)의 공개 무료 TURN을 기본 포함.
// 운영용으로는 본인 TURN 자격증명으로 교체 권장.
export const RTC_CONF = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
};
