#!/usr/bin/env node
// Check a rendered reel against the things a render gets wrong silently.
//
//     node check-video.mjs reel.mp4 [--min 15] [--max 30]
//
// Resolution, duration, that it opens and ends on black, and that the stage is never near-empty mid-reel (a handoff
// that lets the old element leave before the new one arrives). Exits 1 when any gate fails.
//
// Needs ffmpeg and ffprobe on the PATH. No dependencies.
import { parse } from "./lib/cli.mjs";
import { fixed, g, roundHalfEven } from "./lib/fmt.mjs";
import { probeFps, probeGeometry } from "./lib/probe.mjs";
import { main, runText } from "./lib/run.mjs";
import { mark } from "./lib/report.mjs";

const SPEC = {
  positionals: ["video"],
  options: [
    { flag: "--min", dest: "min", metavar: "MIN", type: "float", default: 15 },
    { flag: "--max", dest: "max", metavar: "MAX", type: "float", default: 30 },
    { flag: "--width", dest: "width", metavar: "WIDTH", type: "int", default: 1920 },
    { flag: "--height", dest: "height", metavar: "HEIGHT", type: "int", default: 1080 },
  ],
};

const BLACK = 24; // leaves room for limited-range black (16) and encoder noise
const YMAX = /YMAX=(\d+)/;

// -ss is an input option and has to precede -i, while -frames:v applies to the output and has to follow it.
const luma = (video, seek = [], output = []) =>
  runText("ffmpeg", [
    "-loglevel",
    "error",
    ...seek,
    "-i",
    video,
    ...output,
    "-vf",
    "signalstats,metadata=print:key=lavfi.signalstats.YMAX:file=-",
    "-f",
    "null",
    "-",
  ]);

/** The brightest pixel's luma. An average would pass a dark end card with small white text as black. */
function brightest(video, seconds) {
  const out = luma(video, ["-ss", fixed(Math.max(seconds, 0), 3)], ["-frames:v", "1"]);
  const found = YMAX.exec(out);
  return found ? Number(found[1]) : 255;
}

/**
 * Mid-reel runs of 0.1s or more whose brightest pixel is under 45% of the median (and under 60). A shorter dip in a
 * crossfade does not read as empty.
 */
function emptyStretches(video, fps) {
  const out = luma(video);
  const values = [...out.matchAll(new RegExp(YMAX.source, "g"))].map((found) => Number(found[1]));
  if (!values.length) return [];
  const median = [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
  const edge = Math.trunc(1.5 * fps); // the fades from and to black are allowed to be dark
  const threshold = Math.min(60, 0.45 * median);
  const dark = values.map((value, index) => index >= edge && index < values.length - edge && value < threshold);
  const stretches = [];
  let start = null;
  dark.concat(false).forEach((isDark, index) => {
    if (isDark && start === null) {
      start = index;
    } else if (!isDark && start !== null) {
      if (index - start >= Math.max(3, roundHalfEven(0.1 * fps))) stretches.push([start / fps, index / fps]);
      start = null;
    }
  });
  return stretches;
}

main("check-video", () => {
  const args = parse("check-video.mjs", SPEC, process.argv.slice(2));
  const { width, height, duration } = probeGeometry(args.video);
  const fps = probeFps(args.video);
  const empty = emptyStretches(args.video, fps);
  const found = empty.map(([from, to]) => ` (FOUND ${fixed(from, 2)}s to ${fixed(to, 2)}s)`).join("");

  const gates = [
    [`resolution ${args.width}x${args.height}`, width === args.width && height === args.height],
    [
      `duration ${g(args.min)} to ${g(args.max)}s (is ${fixed(duration, 2)}s)`,
      args.min <= duration && duration <= args.max,
    ],
    ["opens from black", brightest(args.video, 0) <= BLACK],
    ["ends on black", brightest(args.video, duration - 0.05) <= BLACK],
    [`no near-empty stage mid-reel${found}`, !empty.length],
  ];
  for (const [name, ok] of gates) console.log(`${mark(ok)}  ${name}`);
  return gates.every(([, ok]) => ok) ? 0 : 1;
});
