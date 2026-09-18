import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { emphasizedIn, emphasizedOut, tween } from "../motion";

export interface Chapter {
  /** The product's own name for the feature (manifest, docs, landing page), not one invented for the video. */
  name: string;
  /** One line. Keep it short enough to fit the caption width without wrapping. */
  detail: string;
  from: number;
  /**
   * Hold for at least the reading time: ("01 name detail" characters) / 17 + 0.5s, plus 0.2s of margin, measured
   * from the detail line fully settled (`from` + 0.16 + 0.8) to `to`.
   */
  to: number;
}

const STAGGER = 0.08;

function useRiseAndLeave(from: number, to: number, distance: number) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = tween(frame, fps, [from, from + 0.8], [0, 1], emphasizedIn);
  const leave = tween(frame, fps, [to, to + 0.4], [0, 1], emphasizedOut);
  const visible = enter * (1 - leave);
  return {
    opacity: visible,
    transform: `translateY(${(1 - enter) * distance - leave * 8}px)`,
    filter: visible < 1 ? `blur(${(1 - visible) * 8}px)` : undefined,
  };
}

function ChapterCaption({
  index,
  name,
  detail,
  from,
  to,
  gradientClass,
}: Chapter & { index: number; gradientClass: string }) {
  const eyebrow = useRiseAndLeave(from, to, 16);
  const title = useRiseAndLeave(from + STAGGER, to, 22);
  const line = useRiseAndLeave(from + 2 * STAGGER, to, 16);

  return (
    <div style={{ position: "absolute", left: 110, bottom: 104, width: 560, whiteSpace: "nowrap", color: "#f5f5f5" }}>
      <div
        className={gradientClass}
        style={{ fontSize: 20, fontWeight: 600, letterSpacing: "0.14em", display: "inline-block", ...eyebrow }}
      >
        {String(index + 1).padStart(2, "0")}
      </div>
      <div
        style={{ marginTop: 8, fontSize: 46, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.1, ...title }}
      >
        {name}
      </div>
      <div style={{ marginTop: 10, fontSize: 25, lineHeight: 1.35, color: "#a3a3a3", ...line }}>{detail}</div>
    </div>
  );
}

/**
 * Numbered feature names, bottom left, one at a time. While a caption is up, frame the product inside CAPTION_SAFE
 * (use fitCamera) so the caption never sits on product content, blurred or not, and check it on a contact sheet.
 * Easing: emphasized decelerate in over 0.8s with 80ms stagger, emphasized accelerate out over 0.4s.
 */
export function Captions({
  chapters,
  gradientClass,
}: {
  chapters: Chapter[];
  /** The product's gradient text class. */ gradientClass: string;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = frame / fps;
  const current = chapters.findIndex(({ from, to }) => seconds >= from && seconds <= to + 0.4);
  if (current === -1) return null;
  const { from, to } = chapters[current]!;

  return (
    <AbsoluteFill>
      {/* A soft scrim, so the caption reads over a busy page as well as over the dark stage. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 45% 40% at 0% 100%, rgba(0,0,0,0.75), transparent 70%)",
          opacity: tween(frame, fps, [from, from + 0.5], [0, 1]) * (1 - tween(frame, fps, [to, to + 0.4], [0, 1])),
        }}
      />
      <ChapterCaption index={current} {...chapters[current]!} gradientClass={gradientClass} />
    </AbsoluteFill>
  );
}
