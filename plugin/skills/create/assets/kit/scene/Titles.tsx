import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { easeOut, emphasizedOut, tween } from "../motion";

/**
 * Opens the reel, then recedes (smaller, blurred) as the product rises in front of it. Start the product's entrance
 * about 0.15s after `exitAt` so the two moves overlap instead of queueing. The title's opacity leaves faster than its
 * recede, so it is gone before the rising product covers part of it: a half-covered headline behind a window reads as
 * a mistake, not as depth.
 */
export function TitleCard({ exitAt, children }: { exitAt: number; children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = tween(frame, fps, [exitAt, exitAt + 0.7], [0, 1], emphasizedOut);
  const gone = tween(frame, fps, [exitAt, exitAt + 0.45], [0, 1], easeOut);
  if (gone >= 1) return null;

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        opacity: 1 - gone,
        transform: `translateY(${-40 * exit}px) scale(${1 - 0.1 * exit})`,
        filter: exit > 0 ? `blur(${8 * exit}px)` : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}

/**
 * Comes forward as the product recedes. Start it once the product has faded out where the lockup sits (the kit's Reel
 * fades it by CUE.outro + 0.55), never over it, and hold for the subline's reading time before the fade to black.
 */
export function EndCard({ at, children }: { at: number; children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < at * fps) return null;
  return <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>{children}</AbsoluteFill>;
}
