import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { CAMERA } from "./camera";
import { productAlpha, productBlur, productEnter, productRecede, reelFade } from "./curves";
import { smoothPath } from "./motion";
import { Stage } from "./scene/Stage";

// The product's accent colours from its design tokens, at low alpha. Neutral placeholders until you set them.
const GLOW: [string, string] = ["rgba(255, 255, 255, 0.12)", "rgba(255, 255, 255, 0.05)"];

export function Reel() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = frame / fps;

  const times = CAMERA.map(([time]) => time);
  const track = (index: 1 | 2 | 3) =>
    smoothPath(
      seconds,
      times,
      CAMERA.map((key) => key[index]),
    );
  const [focusX, focusY, zoom] = [track(1), track(2), track(3)];
  const cameraX = 960 - focusX * zoom;
  const cameraY = 540 - focusY * zoom;

  // Opacity and blur are their own curves in curves.ts, deliberately faster than the moves below: that split is what
  // keeps the stage lit through both handoffs, and curves.ts carries the reasoning and the measurements.
  const enter = productEnter(seconds);
  const recede = productRecede(seconds);
  const fade = reelFade(seconds);

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <AbsoluteFill style={{ opacity: fade }}>
        {/* The backdrop moves a fraction of the camera: that parallax is what reads as depth. */}
        <Stage
          glow={GLOW}
          offsetX={(cameraX - (960 - 960 * zoom)) * 0.12}
          offsetY={(cameraY - (540 - 540 * zoom)) * 0.12}
          scale={1 + (zoom - 1) * 0.15}
        />
        {/* <TitleCard> goes here, under the camera layer, so the product rises in front of it. */}
        <div
          style={{
            position: "absolute",
            width: 1920,
            height: 1080,
            transformOrigin: "0 0",
            transform: `translate(${cameraX}px, ${cameraY}px) scale(${zoom})`,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: productAlpha(seconds),
              transform:
                `perspective(2400px) translateY(${(1 - enter) * 140 + recede * 40}px) ` +
                `rotateX(${(1 - enter) * 22}deg) scale(${0.94 + 0.06 * enter - 0.08 * recede})`,
              filter: `blur(${productBlur(seconds)}px)`,
            }}
          >
            {/* The product frame (browser, terminal, device) with the real components inside. */}
          </div>
          {/* Popovers and the cursor live here too, so they zoom with the product. */}
        </div>
        {/* Screen space, above the camera: <Captions>, <EndCard>, <Keys>. */}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
