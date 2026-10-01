import { useCurrentFrame, useVideoConfig } from "remotion";
import { READING_MARGIN, readingTime, SNAPPY, springAt, tween } from "../motion";

export interface Combo {
  /** Use the viewer's platform labels: "Ctrl" for a Linux or Windows audience, not "⌘". */
  keys: string[];
  press: number;
  /** Held keys stay down until here. */
  release?: number;
}

function Keycap({ label, down }: { label: string; down: number }) {
  return (
    <div
      style={{
        minWidth: 88,
        height: 88,
        padding: "0 26px",
        borderRadius: 18,
        display: "grid",
        placeItems: "center",
        fontSize: 30,
        fontWeight: 500,
        color: "#e5e5e5",
        background: "linear-gradient(180deg, rgba(48,48,56,0.85), rgba(27,27,32,0.85))",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.14)",
        transform: `translateY(${down * 6}px)`,
        boxShadow: `0 ${7 - down * 6}px 0 #0c0c0f, 0 24px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)`,
      }}
    >
      {label}
    </div>
  );
}

/**
 * Screen-space keycaps, so the keyboard half of the story reads even while the camera moves. Place them outside the
 * product's measured on-screen bounds at that moment (not on the terminal, window or dialog they drive) and confirm it
 * on a contact sheet. Easing: spring SNAPPY in, easeOut fade out over 0.17s
 * and easeOut press and release (tween's default).
 */
export function Keys({ combos, left, top }: { combos: Combo[]; left: number; top: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <>
      {combos.map(({ keys, press, release = press + 0.12 }) => {
        const enter = springAt(frame, fps, press - 0.3, SNAPPY);
        // Keycaps are text the viewer must read, so each combo stays up for its reading time after the press, with the
        // same margin as a caption, however quickly the key is released.
        const hold = readingTime(keys.join(" ")) + READING_MARGIN;
        const leaveAt = Math.max(release + 0.16, press + hold);
        const leave = tween(frame, fps, [leaveAt, leaveAt + 0.17], [0, 1]);
        if (frame < (press - 0.3) * fps || leave >= 1) return null;
        const down =
          tween(frame, fps, [press, press + 0.05], [0, 1]) - tween(frame, fps, [release, release + 0.1], [0, 1]);
        return (
          <div
            key={keys.join("+") + press}
            style={{
              position: "absolute",
              left,
              top,
              display: "flex",
              gap: 14,
              opacity: Math.min(1, enter) * (1 - leave),
              transform: `translateY(${(1 - enter) * 30 + leave * 12}px)`,
            }}
          >
            {keys.map((key, i) => (
              <Keycap key={`${i}-${key}`} label={key} down={down} />
            ))}
          </div>
        );
      })}
    </>
  );
}
