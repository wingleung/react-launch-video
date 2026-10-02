import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { titleAlpha, titleBlur, titleGone, titleRecede } from "../curves";

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
  const seconds = frame / fps;
  const recede = titleRecede(seconds, exitAt);
  const gone = titleGone(seconds, exitAt);
  if (gone >= 1) return null;

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        opacity: titleAlpha(seconds, exitAt),
        transform: `translateY(${-40 * recede}px) scale(${1 - 0.1 * recede})`,
        filter: gone > 0 ? `blur(${titleBlur(seconds, exitAt)}px)` : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}

/**
 * Comes forward as the product recedes. Start it on CUE.endCard, where the product is still leaving but already
 * blurred past reading, and hold for the subline's reading time before the fade to black. references/pacing.md rule 1
 * has why that is the cue and what the two of them measure there.
 */
export function EndCard({ at, children }: { at: number; children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < at * fps) return null;
  return <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>{children}</AbsoluteFill>;
}
