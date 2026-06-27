import Landing from "./views/Landing.jsx";
import CandidateView from "./views/CandidateView.jsx";
import ProctorView from "./views/ProctorView.jsx";

// 경로 기반 단순 라우팅 (react-router 미사용)
export default function App() {
  const path = window.location.pathname;

  if (path.startsWith("/proctor")) return <ProctorView />;

  if (path.startsWith("/candidate")) {
    const name =
      new URLSearchParams(window.location.search).get("name")?.trim() || "응시자";
    return <CandidateView name={name} />;
  }

  return <Landing />;
}
