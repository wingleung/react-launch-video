import { Composition, Freeze, useCurrentFrame } from "remotion";

/**
 * Motion blur without banding. Register this next to the reel: it renders every output frame `samples` times across
 * the first half of the frame interval (a 180° shutter), and `scripts/render-motion-blur.mjs` averages each group back
 * into one frame in ffmpeg at 16 bits.
 *
 * Why not `@remotion/motion-blur`: CameraMotionBlur stacks translucent copies in the browser, which measurably banded
 * dark gradients and rendered about 6x slower on a real reel. Offer blur for the final render only.
 */
export function MotionBlurComposition({
  id,
  component: Reel,
  fps,
  durationInFrames,
  samples = 4,
}: {
  id: string;
  component: React.ComponentType;
  fps: number;
  durationInFrames: number;
  samples?: number;
}) {
  function ShutterSamples() {
    const frame = useCurrentFrame();
    const outputFrame = Math.floor(frame / samples);
    const sample = frame % samples;
    // In this composition's own frame units: `samples` of them make one output frame, twice that span one frame.
    return (
      <Freeze frame={outputFrame * samples + sample / 2}>
        <Reel />
      </Freeze>
    );
  }
  return (
    <Composition
      id={id}
      component={ShutterSamples}
      fps={fps * samples}
      durationInFrames={durationInFrames * samples}
      width={1920}
      height={1080}
    />
  );
}
