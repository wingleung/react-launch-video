#!/usr/bin/env node
// Tile six frames of a rendered reel into one half-scale contact sheet for review, or crop one frame.
// The usage text below is what the script prints when called with nothing, so keep the two in step.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fixed } from "./lib/fmt.mjs";
import { probeFps } from "./lib/probe.mjs";
import { main, runInherit } from "./lib/run.mjs";

const USAGE = `Tile six frames of a rendered reel into one half-scale contact sheet for review, or crop one frame.

    node contact-sheet.mjs <video.mp4> <out.jpeg> <frame> <frame> <frame> <frame> <frame> <frame>
    node contact-sheet.mjs <video.mp4> --crop <out.png> <seconds> <w:h:x:y>

Frames are frame numbers at the video's own rate. Pick them at cue points: just before a move, mid-move, on arrival,
mid-hold and mid-handoff. The crop form checks something small (a border beam, a caret) at full resolution.
Needs ffmpeg and ffprobe on the PATH. No dependencies, so it runs the same on macOS, Linux and Windows.
`;

const TILES = 6;
const LAYOUT = "xstack=inputs=6:layout=0_0|w0_0|0_h0|w0_h0|0_h0+h0|w0_h0+h0";

const ffmpeg = (...args) => runInherit("ffmpeg", ["-loglevel", "error", "-y", ...args]);

/** A whole number or nothing. `parseInt` would quietly accept "1.5" as 1. */
function wholeNumber(text) {
  if (!/^[+-]?\d+$/.test(text.trim())) throw new Error(`invalid frame number: ${text}`);
  return Number(text.trim());
}

main("contact-sheet", () => {
  const argv = process.argv.slice(2);
  if (argv.length < 2) {
    console.error(USAGE);
    return 1;
  }
  const video = argv[0];

  if (argv[1] === "--crop") {
    if (argv.length !== 5) {
      console.error("usage: node contact-sheet.mjs <video> --crop <out.png> <seconds> <w:h:x:y>");
      return 1;
    }
    const [, , out, seconds, box] = argv;
    ffmpeg("-ss", seconds, "-i", video, "-frames:v", "1", "-vf", `crop=${box}`, out);
    console.log(out);
    return 0;
  }

  const out = argv[1];
  const frames = argv.slice(2);
  if (frames.length !== TILES) {
    console.error(`need exactly ${TILES} frame numbers`);
    return 1;
  }
  const fps = probeFps(video);
  const temporary = mkdtempSync(join(tmpdir(), "contact-sheet-"));
  try {
    const inputs = [];
    for (const frame of frames) {
      const still = join(temporary, `${frame}.jpeg`);
      // Seek to the middle of the frame so rounding never lands on its neighbour.
      const at = fixed((wholeNumber(frame) + 0.5) / fps, 4);
      ffmpeg("-ss", at, "-i", video, "-frames:v", "1", "-vf", "scale=960:-1", still);
      inputs.push("-i", still);
    }
    ffmpeg(...inputs, "-filter_complex", LAYOUT, out);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
  console.log(out);
  return 0;
});
