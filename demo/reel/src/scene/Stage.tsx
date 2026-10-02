import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * The backdrop drifts a fraction of the camera move, which is what sells the depth. On top of that the glow wanders
 * slowly on its own, so a held shot is never a still frame while the product itself stays perfectly still. Keep it to
 * soft gradients: fine detail here (a grid, noise, thin lines) shimmers as it moves by fractions of a pixel.
 */
export function Stage({
  offsetX,
  offsetY,
  scale,
  glow,
}: {
  offsetX: number;
  offsetY: number;
  scale: number;
  /** Two accent colours from the product's design tokens, as rgba with low alpha: [main glow, secondary glow]. */
  glow: [string, string];
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const [driftX, driftY] = [Math.sin(t * 0.21) * 60, Math.cos(t * 0.17) * 36];
  return (
    <AbsoluteFill style={{ background: "#05060a", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: -240,
          transform: `translate(${offsetX + driftX}px, ${offsetY + driftY}px) scale(${scale})`,
          background: [
            `radial-gradient(50% 45% at 50% 8%, ${glow[0]}, transparent 70%)`,
            `radial-gradient(35% 35% at 82% 30%, ${glow[1]}, transparent 70%)`,
          ].join(", "),
        }}
      />
    </AbsoluteFill>
  );
}
