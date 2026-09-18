import { easeInOut } from "../motion";

// Paints `background` only on a band `width` wide along the border: the content box is masked out of the padding box.
const RING_MASK = "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)";

export function Ring({
  background,
  radius,
  width = 1.5,
  glow = 0.55,
  style,
}: {
  background: string;
  radius: number;
  width?: number;
  /** Opacity of a blurred copy that lets the band bleed light past the edge. */
  glow?: number;
  style?: React.CSSProperties;
}) {
  const band: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    borderRadius: radius + width,
    padding: width,
    background,
    WebkitMask: RING_MASK,
    WebkitMaskComposite: "xor",
    maskComposite: "exclude",
  };
  return (
    <div style={{ position: "absolute", inset: -width, pointerEvents: "none", ...style }}>
      <div style={{ position: "absolute", inset: 0, filter: "blur(6px)", opacity: glow }}>
        <div style={band} />
      </div>
      <div style={band} />
    </div>
  );
}

/**
 * One lap of light around an element's border, in a two-colour gradient. `progress` runs 0 to 1 over the lap; outside
 * that range nothing renders, so it points something out once and is gone.
 */
export function BorderBeam({
  progress,
  radius,
  from = "rgba(59,130,246,0.9)",
  to = "#d946ef",
}: {
  progress: number;
  radius: number;
  from?: string;
  to?: string;
}) {
  if (progress <= 0 || progress >= 1) return null;
  const angle = easeInOut(progress) * 360;
  const opacity = Math.min(1, progress / 0.15, (1 - progress) / 0.3);
  return (
    <Ring
      radius={radius}
      style={{ opacity }}
      background={
        `conic-gradient(from ${angle}deg, transparent 0deg 240deg, ` +
        `${from} 310deg, ${to} 352deg, transparent 360deg)`
      }
    />
  );
}

/**
 * Wrap a target in a positioned box with this inside it to follow an element through a list: set `top` and `height`
 * from the measured row each frame (see `boxWithin` in reveal.ts) and it glides with the selection.
 */
export function SelectionRing({
  radius = 8,
  from = "rgba(59,130,246,0.95)",
  to = "rgba(217,70,239,0.8)",
}: {
  radius?: number;
  from?: string;
  to?: string;
}) {
  return <Ring radius={radius} glow={0.4} background={`linear-gradient(90deg, ${from}, ${to} 60%, transparent)`} />;
}
