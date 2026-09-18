import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { CUE } from "../timeline";

export function Captions() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (t < CUE.paletteCaptionFrom || t > CUE.paletteCaptionTo) return null;
  const opacity = interpolate(t, [CUE.paletteCaptionFrom, CUE.paletteCaptionFrom + 0.3], [0, 1], {
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ position: "absolute", left: 110, bottom: 104, width: 900, color: "white", opacity }}>
      <div style={{ fontSize: 46, fontWeight: 600 }}>Command palette</div>
      <div style={{ fontSize: 25 }}>Search every service by name, owner, team or on-call rotation</div>
    </div>
  );
}
