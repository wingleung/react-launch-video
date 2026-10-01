import { useCurrentFrame, useVideoConfig } from "remotion";
import { CUE } from "../timeline";

export function Title() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (t < CUE.titleIn || t > CUE.titleGone) return null;
  const opacity = Math.min(1, (CUE.titleGone - t) / (CUE.titleGone - CUE.titleExit));
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontFamily: "Inter",
        fontSize: 88,
        fontWeight: 700,
        opacity,
      }}
    >
      Every service, one page
    </div>
  );
}
