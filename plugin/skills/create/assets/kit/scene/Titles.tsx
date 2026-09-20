import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { easeOut, emphasizedOut, tween } from "../motion";

/**
 * Opens the reel, then recedes (smaller, blurred) as the product rises in front of it. Start the product's entrance
 * 0.05s after `exitAt`, which `timeline.ts` records the measurement for: the two have to overlap while both are still
 * substantial, or the stage goes dark between them.
 *
 * The blur is driven by the same progress as the opacity, not by the slower recede. Tied to the recede it is barely
 * begun while the headline is still visible, so a crisp ghost of the title sits over the arriving product, which
 * reads as a mistake rather than as depth.
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
        filter: gone > 0 ? `blur(${8 * gone}px)` : undefined,
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
