// 같은 LAN에서는 host candidate로 충분하지만, 안전하게 공개 STUN을 둔다.
export const RTC_CONF = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};
