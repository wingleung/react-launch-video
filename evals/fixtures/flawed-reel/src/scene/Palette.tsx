import { useCurrentFrame, useVideoConfig } from "remotion";
import { CUE, SERVICES, WALK_STEP } from "../timeline";

const ROW_HEIGHT = 44;
const VISIBLE_ROWS = 9;
const NAMES = [
  "api",
  "auth",
  "billing",
  "search",
  "checkout",
  "media",
  "notify",
  "reports",
  "export",
  "gateway",
  "queue",
];

function serviceName(index: number) {
  return `${NAMES[index % NAMES.length]}-${String(index + 1).padStart(3, "0")}`;
}

/** The command palette, walked one service at a time with the down arrow. */
export function Palette() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (t < CUE.paletteOpen) return null;
  const selected = Math.min(SERVICES - 1, Math.max(0, Math.floor((t - CUE.walkStart) / WALK_STEP)));
  const first = Math.max(0, selected - (VISIBLE_ROWS - 1));
  const rows = Array.from({ length: VISIBLE_ROWS }, (_, offset) => first + offset);
  return (
    <div
      style={{
        position: "absolute",
        left: 300,
        top: 120,
        width: 760,
        padding: 12,
        background: "#16161a",
        border: "1px solid #2a2a31",
        borderRadius: 12,
        color: "white",
        fontFamily: "Inter",
        fontSize: 22,
      }}
    >
      <div style={{ padding: "10px 14px", color: "#8b8b93" }}>Search services...</div>
      {rows.map((index) => (
        <div
          key={index}
          style={{
            height: ROW_HEIGHT,
            lineHeight: `${ROW_HEIGHT}px`,
            padding: "0 14px",
            borderRadius: 8,
            background: index === selected ? "#26262e" : "transparent",
          }}
        >
          {serviceName(index)}
        </div>
      ))}
    </div>
  );
}
