import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { CAMERA } from "./camera";
import { easeInOut, emphasizedIn, emphasizedOut, smoothPath, tween } from "./motion";
import { Stage } from "./scene/Stage";
import { CUE } from "./timeline";

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

  const enter = tween(frame, fps, [CUE.productIn, CUE.productIn + 1.0], [0, 1], emphasizedIn);
  const exit = tween(frame, fps, [CUE.outro + 0.1, CUE.outro + 0.9], [0, 1], emphasizedOut);
  // Opacity leaves faster than the recede (emphasizedOut still shows 85% at the midpoint), so the end card rises on
  // clear background. It still overlaps: the product is at 15% when the end card starts and under 3% by the time its
  // first words land, so no frame is empty.
  const gone = tween(frame, fps, [CUE.outro + 0.1, CUE.outro + 0.7], [0, 1], easeInOut);
  const fade =
    tween(frame, fps, [0, 0.8], [0, 1], easeInOut) *
    (1 - tween(frame, fps, [CUE.fadeOut, CUE.fadeOut + 0.6], [0, 1], easeInOut));

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
              opacity: enter * (1 - gone),
              transform:
                `perspective(2400px) translateY(${(1 - enter) * 140 + exit * 40}px) ` +
                `rotateX(${(1 - enter) * 22}deg) scale(${0.94 + 0.06 * enter - 0.08 * exit})`,
              filter: `blur(${(1 - enter) * 14 + exit * 10}px)`,
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
