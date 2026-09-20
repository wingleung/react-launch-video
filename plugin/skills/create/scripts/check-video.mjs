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
    { flag: "--handoffs", dest: "handoffs", store: true, default: false, help: "also report the darkest moments" },
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
function emptyStretches(video, fps, collected) {
  const out = luma(video);
  const values = [...out.matchAll(new RegExp(YMAX.source, "g"))].map((found) => Number(found[1]));
  if (collected) collected.values = values;
  if (!values.length) return [];
  const median = [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
  const edge = Math.trunc(1.5 * fps); // the fades from and to black are allowed to be dark
  const threshold = Math.min(60, 0.45 * median);
  const dark = values.map((value, index) => index >= edge && index < values.length - edge && value < threshold);
  // How long a dip must last before it counts depends on how dark it is. A frame lit to a fifth of the reel's median
  // is a hole as soon as you can see it, while a shallow dip has to persist to read as one. A single run length for
  // both is what let a five-frame drop to 14% of median pass as acceptable.
  const deep = Math.min(40, 0.2 * median);
  const held = Math.max(3, roundHalfEven(0.1 * fps));
  const glimpse = Math.max(2, roundHalfEven(0.033 * fps));
  const stretches = [];
  let start = null;
  dark.concat(false).forEach((isDark, index) => {
    if (isDark && start === null) {
      start = index;
    } else if (!isDark && start !== null) {
      const darkest = Math.min(...values.slice(start, index));
      if (index - start >= (darkest < deep ? glimpse : held)) stretches.push([start / fps, index / fps]);
      start = null;
    }
  });
  return stretches;
}

main("check-video", () => {
  const args = parse("check-video.mjs", SPEC, process.argv.slice(2));
  const { width, height, duration } = probeGeometry(args.video);
  const fps = probeFps(args.video);
  const luma = {};
  const empty = emptyStretches(args.video, fps, luma);
  const found = empty.map(([from, to]) => ` (FOUND ${fixed(from, 2)}s to ${fixed(to, 2)}s)`).join("");

  // Each gate carries the lever that moves it. A gate that reports a fact without naming the fix sends the reader
  // looking for one, and the duration gate in particular fails correct reels: the skill lets the user set the
  // length, this defaults to 15 to 30, and nothing said --min and --max existed.
  const gates = [
    [
      `resolution ${args.width}x${args.height}`,
      width === args.width && height === args.height,
      `the render is ${width}x${height}. Pass --width and --height for a cut that is not 16:9.`,
    ],
    [
      `duration ${g(args.min)} to ${g(args.max)}s (is ${fixed(duration, 2)}s)`,
      args.min <= duration && duration <= args.max,
      "if the brief asked for this length, pass --min and --max rather than cutting the reel to fit the default.",
    ],
    ["opens from black", brightest(args.video, 0) <= BLACK, "the reel has to fade up. See reelFade in curves.ts."],
    [
      "ends on black",
      brightest(args.video, duration - 0.05) <= BLACK,
      "the reel has to fade out. Check CUE.fadeOut against the composition's duration.",
    ],
    [
      `no near-empty stage mid-reel${found}`,
      !empty.length,
      "a handoff queued instead of overlapping. Re-run with --handoffs for the darkest moments, and see rule 1 of" +
        " references/pacing.md, which covers the three levers: overlap, blur and bloom.",
    ],
  ];
  for (const [name, ok] of gates) console.log(`${mark(ok)}  ${name}`);
  for (const [, ok, remedy] of gates) if (!ok && remedy) console.log(`      ${remedy}`);

  // A gate that passes says nothing about how close it came. On request, show the darkest moments mid-reel so a
  // handoff can be checked against its cue points instead of taking a silent pass as proof.
  if (args.handoffs && luma.values?.length) {
    const values = luma.values;
    const median = [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
    const edge = Math.trunc(1.5 * fps);
    const middle = values.map((value, index) => ({ value, index })).slice(edge, values.length - edge);
    const darkest = [...middle].sort((a, b) => a.value - b.value).slice(0, 5);
    console.log(`\nbrightest pixel: median ${median} across the reel. Darkest moments away from the fades:`);
    for (const { value, index } of darkest) {
      console.log(
        `  ${fixed(index / fps, 2).padStart(7)}s  ${String(value).padStart(3)}  (${fixed((100 * value) / median, 1).padStart(5)}% of median)`,
      );
    }
  }
  return gates.every(([, ok]) => ok) ? 0 : 1;
});
