import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Captions } from "./scene/Captions";
import { Dashboard } from "./scene/Dashboard";
import { Title } from "./scene/Title";
import { CUE } from "./timeline";

const CAMERA_TIMES = [
  0,
  CUE.productIn,
  CUE.dashboardHold,
  CUE.incidentOpen,
  CUE.cameraOnIncident,
  9.5,
  CUE.walkStart,
  CUE.endCard,
];
const ZOOM = [1, 1, 1.1, 1.3, 1.8, 1.8, 1.4, 1];
const FOCUS_X = [960, 960, 900, 700, 700, 700, 760, 960];

const STARS = Array.from({ length: 80 }, () => ({ x: Math.random() * 1920, y: Math.random() * 1080 }));

export function StatusReel() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const opts = { easing: Easing.inOut(Easing.cubic), extrapolateRight: "clamp" as const };
  const zoom = interpolate(t, CAMERA_TIMES, ZOOM, opts);
  const focusX = interpolate(t, CAMERA_TIMES, FOCUS_X, opts);

  const enter = interpolate(t, [CUE.productIn, CUE.productIn + 1], [0, 1], {
    easing: Easing.in(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: "#07080c" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" />
      {STARS.map((s, i) => (
        <div key={i} style={{ position: "absolute", left: s.x, top: s.y, width: 2, height: 2, background: "white" }} />
      ))}
      <AbsoluteFill style={{ transform: `translateX(${960 - focusX * zoom}px) scale(${zoom})`, opacity: enter }}>
        <Dashboard />
      </AbsoluteFill>
      <Title />
      <Captions />
      {t > CUE.endCard && t < CUE.cut && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", color: "white", fontSize: 96 }}>
          Status
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}
