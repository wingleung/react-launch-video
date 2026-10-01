import { Composition } from "remotion";
import { Reel } from "./Reel";
import { DURATION_SECONDS, FPS } from "./timeline";
import "./reel.css";

/**
 * What Remotion loads. `index.ts` registers this, and `remotion.config.ts` sits next to it.
 *
 * The duration is derived from `timeline.ts` rather than written here, so retiming a cue moves the end of the reel
 * with it. A hardcoded frame count is the classic way to end up with a second of black after the fade, or with the
 * end card cut off, and neither shows up until someone watches the very end.
 *
 * Change `width` and `height` for a vertical or square cut, and pass the same numbers to `gates.mjs` (it hands them
 * to `check-video.mjs`, which defaults to 1920x1080 and will otherwise fail a correct render). `edge-scan.mjs` needs
 * neither: its safe margin is a share of whatever frame it reads.
 */
export function RemotionRoot() {
  return (
    <Composition
      id="Reel"
      component={Reel}
      durationInFrames={Math.round(DURATION_SECONDS * FPS)}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
}
