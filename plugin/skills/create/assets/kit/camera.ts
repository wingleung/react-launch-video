import { assertReadingTime, assertStillWhileReading } from "./motion";
import type { CameraKey, ReadingWindow } from "./motion";
import { CUE } from "./timeline";

// Camera keyframes: [seconds, focus x, focus y, zoom], in world coordinates on the stage, which is the composition's
// width by height (1920x1080 unless Root.tsx says otherwise). The focus point sits at the centre of the frame.
// smoothPath carries speed through the keys, so only equal neighbours stop the camera.
export const CAMERA: CameraKey[] = [
  [CUE.productIn, 960, 640, 0.86],
  [CUE.productIn + 1.15, 960, 540, 1],
  // ...push-ins with a small pull back before each (anticipation), and two equal keys for every hold: a camera that
  // keeps zooming through a hold rescales the product's text every frame, which reads as wobble
  [CUE.outro + 1.1, 960, 540, 0.92],
  // The pull back ends on the key above, 1.1s into the outro. This one repeats its zoom so the camera is perfectly
  // still for the whole end card, which references/pacing.md rule 7 asks for and the assertion below enforces.
  [CUE.fadeOut + 0.7, 960, 540, 0.92],
];

// Every window where text is being read, from fully settled to the start of its exit. Add one per caption.
//
// Give each window the `text` it shows and `assertReadingTime` checks the hold against reading time as well. The
// timings below are placeholders: once you know the real copy, set the cues in timeline.ts from it rather than the
// other way round, because a title hold of 1.0s is already too short for a title of more than about ten characters.
//   { label: "title", from: CUE.titleWords + 0.9, to: CUE.titleExit, text: "Relay Issue Search" },
export const READING: ReadingWindow[] = [
  { label: "title", from: CUE.titleWords + 0.9, to: CUE.titleExit },
  // ...one per caption: { label: "01 ...", from: captionFrom + 0.96, to: captionTo, text: "01 Issue popup" },
  { label: "end card", from: CUE.endCard + 0.9, to: CUE.fadeOut },
];

// Both run when the composition loads, so a camera that drifts under text, or a caption held for less time than it
// takes to read, fails in seconds rather than after a render. This file holds no JSX on purpose: the kit's own check
// script imports it and runs these assertions in CI.
assertStillWhileReading(CAMERA, READING);
assertReadingTime(READING);
