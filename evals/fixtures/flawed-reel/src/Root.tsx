import { Composition } from "remotion";
import { StatusReel } from "./StatusReel";
import { DURATION_SECONDS, FPS } from "./timeline";
import "./utilities.css";

export function RemotionRoot() {
  return (
    <Composition
      id="StatusReel"
      component={StatusReel}
      durationInFrames={Math.round(DURATION_SECONDS * FPS)}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
}
