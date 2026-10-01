import { Easing, interpolate, spring, type SpringConfig } from "remotion";

export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
/** Material 3 emphasized decelerate: large things arriving on screen. */
export const emphasizedIn = Easing.bezier(0.05, 0.7, 0.1, 1);
/** Material 3 emphasized accelerate: large things leaving. */
export const emphasizedOut = Easing.bezier(0.3, 0, 0.8, 0.15);

export const SMOOTH: Partial<SpringConfig> = { damping: 200 };
export const SNAPPY: Partial<SpringConfig> = { damping: 22, stiffness: 260, mass: 0.7 };

/** Clamped interpolation between two cue points given in seconds. */
export function tween(
  frame: number,
  fps: number,
  [start, end]: [number, number],
  [from, to]: [number, number],
  easing = easeOut,
) {
  return interpolate(frame, [start * fps, end * fps], [from, to], {
    easing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

export function springAt(frame: number, fps: number, startSeconds: number, config = SMOOTH, durationInFrames?: number) {
  return spring({ frame: frame - startSeconds * fps, fps, config, durationInFrames });
}

/**
 * A monotone cubic through keyframes (Fritsch and Butland slopes). Speed carries through intermediate keys instead
 * of easing to a stop at each one, two equal keys still make a hold, it never overshoots, and it eases at both ends.
 */
export function smoothPath(t: number, times: number[], values: number[]): number {
  const last = times.length - 1;
  if (t <= times[0]!) return values[0]!;
  if (t >= times[last]!) return values[last]!;

  const width = (i: number) => times[i + 1]! - times[i]!;
  const secant = (i: number) => (values[i + 1]! - values[i]!) / width(i);
  const slope = (i: number) => {
    if (i === 0 || i === last) return 0;
    const [before, after] = [secant(i - 1), secant(i)];
    if (before * after <= 0) return 0;
    const [h0, h1] = [width(i - 1), width(i)];
    return (3 * (h0 + h1)) / ((2 * h1 + h0) / before + (h1 + 2 * h0) / after);
  };

  let i = 0;
  while (t > times[i + 1]!) i++;
  const h = width(i);
  const s = (t - times[i]!) / h;
  const [p0, p1, m0, m1] = [values[i]!, values[i + 1]!, slope(i) * h, slope(i + 1) * h];
  return (
    (2 * s ** 3 - 3 * s ** 2 + 1) * p0 +
    (s ** 3 - 2 * s ** 2 + s) * m0 +
    (-2 * s ** 3 + 3 * s ** 2) * p1 +
    (s ** 3 - s ** 2) * m1
  );
}

/** A camera keyframe: the focus point the camera centres and the zoom, at a time in seconds. */
export type CameraKey = [seconds: number, focusX: number, focusY: number, zoom: number];

export interface ReadingWindow {
  label: string;
  /** When the text has fully settled. */
  from: number;
  /** When its exit starts. */
  to: number;
  /**
   * Every character the block shows, lines joined by single spaces, chapter numbers and keycap labels included.
   * Supply it and `assertReadingTime` checks the hold against it.
   */
  text?: string;
}

/** Seconds of beat `n` at `bpm`. Anchor cues on beats when the reel is cut to music, so every hit lands with it. */
export function beatsAt(bpm: number): (n: number) => number {
  return (n) => (n * 60) / bpm;
}

const CHARS_PER_SECOND = 17;
const SETTLE = 0.5;
const MINIMUM = 0.8;
/** Slack on top of reading time, so a hold that passes by a few hundredths survives a neighbour being retimed. */
export const READING_MARGIN = 0.2;

/** The hold a block of text needs: its characters at reading speed plus a settle margin. See references/pacing.md. */
export function readingTime(text: string): number {
  return Math.max(MINIMUM, [...text].length / CHARS_PER_SECOND + SETTLE);
}

/**
 * Throws when any window carrying `text` holds it for less than its reading time plus `margin`. Runs at composition
 * load, so a caption that is a few frames short fails in seconds rather than surviving to a review that has to measure
 * it by hand. Windows with no `text` are skipped.
 */
export function assertReadingTime(windows: ReadingWindow[], margin = READING_MARGIN): void {
  for (const { label, from, to, text } of windows) {
    if (text === undefined) continue;
    const needed = readingTime(text) + margin;
    const held = to - from;
    if (held < needed) {
      throw new Error(
        `"${label}" holds ${held.toFixed(2)}s but needs ${needed.toFixed(2)}s ` +
          `(${[...text].length} characters at ${CHARS_PER_SECOND}/s, plus ${SETTLE}s to settle and ${margin}s of ` +
          `margin). Hold it longer, or show less text.`,
      );
    }
  }
}

/**
 * Throws unless the camera keys run strictly forward in time. smoothPath reads them in array order, so a key out of
 * order interpolates without complaint, and two keys at one time make a hard cut instead of a hold.
 */
export function assertCameraKeys(camera: CameraKey[]): void {
  for (let i = 1; i < camera.length; i++) {
    const [before, at] = [camera[i - 1]![0], camera[i]![0]];
    if (at > before) continue;
    throw new Error(
      at === before
        ? `Camera keys ${i - 1} and ${i} are both at ${at.toFixed(2)}s, which cuts rather than moves. ` +
            `A hold is two equal keys at different times.`
        : `Camera key ${i} at ${at.toFixed(2)}s comes after key ${i - 1} at ${before.toFixed(2)}s in the array. ` +
            `Keep CAMERA in time order.`,
    );
  }
}

/**
 * Throws when the camera moves while text is being read. A zoom or pan that creeps through a hold rescales the text
 * every frame, which viewers see as wobble, so every hold is two equal keys. Call it beside the CAMERA array: it runs
 * when the composition loads, so the render fails before it costs an hour. It checks the keys' order first.
 */
export function assertStillWhileReading(camera: CameraKey[], windows: ReadingWindow[], fps = 60): void {
  assertCameraKeys(camera);
  const times = camera.map(([time]) => time);
  const track = (index: 1 | 2 | 3, at: number) =>
    smoothPath(
      at,
      times,
      camera.map((key) => key[index]),
    );
  for (const { label, from, to } of windows) {
    const start: [number, number, number] = [track(1, from), track(2, from), track(3, from)];
    // The last frame is excluded: `to` is where the exit starts, so a camera move beginning exactly there is the
    // next beat rather than movement under text, and frame rounding otherwise reports it as a one-frame overlap.
    for (let frame = 0; frame < Math.round((to - from) * fps); frame++) {
      const at = from + frame / fps;
      const now: [number, number, number] = [track(1, at), track(2, at), track(3, at)];
      const moved = ["focus x", "focus y", "zoom"].filter((_, i) => Math.abs(now[i]! - start[i]!) > 0.01);
      if (moved.length > 0) {
        throw new Error(
          `Camera moves (${moved.join(", ")}) at ${at.toFixed(2)}s while "${label}" is being read ` +
            `(${from.toFixed(2)}s to ${to.toFixed(2)}s). Hold it with two equal keys around that window.`,
        );
      }
    }
  }
}

export interface Size {
  width: number;
  height: number;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const FRAME: Box = { x: 0, y: 0, width: 1920, height: 1080 };

/** The safe action box for any frame size. `ACTION_SAFE` is exactly this for the default 1920x1080 frame. */
export function safeArea(frame: Size = FRAME, inset = 0.035): Box {
  const x = Math.round(frame.width * inset);
  const y = Math.round(frame.height * inset);
  return { x, y, width: frame.width - 2 * x, height: frame.height - 2 * y };
}

/**
 * SMPTE ST 2046-1 safe action area: 93% of the frame, 3.5% in from each edge. A window border resting between it and
 * the frame edge reads as a mistake: keep it inside or bleed it clearly off. edge-scan.mjs checks renders.
 * For any frame other than 1920x1080, call `safeArea(frame)` instead.
 */
export const ACTION_SAFE: Box = { x: 67, y: 38, width: 1786, height: 1004 };
/**
 * Action safe minus the caption column (Captions sits at left 110 with width 560). Frame the product here while a
 * caption is up.
 *
 * This constrains the box you pass to `fitCamera`, and nothing else. The rest of the product still bleeds across the
 * full frame, including under the caption, so a window wider than this area will sit behind the text however the
 * camera is placed. The fix is the product's render width, not the camera.
 */
export const CAPTION_SAFE: Box = { x: 700, y: 38, width: 1153, height: 1004 };

/**
 * The camera focus and zoom that fit `box` (world coordinates, measured) inside `safe` (screen area) with `margin`
 * pixels to spare on every side. Use it for every push-in instead of choosing a zoom by eye: a zoom chosen by eye is
 * how tables, columns and long lines end up cropped at the frame edge. Returns [focusX, focusY, zoom] for a CAMERA key.
 */
export function fitCamera(
  box: Box,
  safe: Box = ACTION_SAFE,
  margin = 24,
  maxZoom = 2,
  frame: Size = FRAME,
): [number, number, number] {
  const [roomX, roomY] = [safe.width - 2 * margin, safe.height - 2 * margin];
  if (roomX <= 0 || roomY <= 0 || box.width <= 0 || box.height <= 0) {
    throw new Error(
      `fitCamera cannot fit a ${box.width}x${box.height} box in a ${safe.width}x${safe.height} safe area with ` +
        `${margin}px of margin on every side. Measure the box again, or pass a smaller margin.`,
    );
  }
  const zoom = Math.min(maxZoom, roomX / box.width, roomY / box.height);
  const safeCenterX = safe.x + safe.width / 2;
  const safeCenterY = safe.y + safe.height / 2;
  return [
    box.x + box.width / 2 - (safeCenterX - frame.width / 2) / zoom,
    box.y + box.height / 2 - (safeCenterY - frame.height / 2) / zoom,
    zoom,
  ];
}
