// ffprobe wrappers. The geometry call is byte-identical in check-video and edge-scan, and the frame-rate call is
// shared with contact-sheet, which tolerated the trailing comma differently. Both tolerances are kept here.
import { runText } from "./run.mjs";

/** Width, height and duration of the first video stream. */
export function probeGeometry(video) {
  const raw = runText("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height:format=duration",
    "-of",
    "json",
    video,
  ]);
  const probe = JSON.parse(raw);
  const stream = probe.streams?.[0];
  if (!stream) throw new Error(`${video} has no video stream`);
  return { width: stream.width, height: stream.height, duration: Number(probe.format.duration) };
}

/** Frames per second. ffprobe prints a rational ("60/1") and sometimes a trailing comma. */
export function probeFps(video) {
  const raw = runText("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=r_frame_rate",
    "-of",
    "csv=p=0",
    video,
  ]);
  const rate = raw.trim().split(",")[0];
  const [numerator, denominator] = rate.split("/");
  const fps = denominator === undefined ? Number(numerator) : Number(numerator) / Number(denominator);
  if (!Number.isFinite(fps) || fps <= 0) throw new Error(`${video} reports an unusable frame rate: ${raw.trim()}`);
  return fps;
}
