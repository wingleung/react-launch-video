#!/usr/bin/env node
// Check that the LIGHTNESS the kit was told matches the product that actually rendered.
//
//     node lightness.mjs reel.mp4 --src src/        reads LIGHTNESS from src/curves.ts and compares
//     node lightness.mjs reel.mp4 --declared 0.56   compares against a value you pass
//
// LIGHTNESS is the one number that makes the outro product-dependent: it sets how fast the product leaves and how
// much it blooms as it blurs out. Both ends of the palette fail, in opposite ways. A dark product left declared as
// pale leaves too fast and can empty the stage. A pale product left at the shipped default of 0, which is the
// likelier mistake because it needs no action, leaves too slowly and parks a visible slab under the end card's
// wordmark. Neither shows up in any other gate: check-video sees a lit frame and the blur rule is satisfied either
// way.
//
// It finds the product's own background as the most repeated non-stage luma in a frame, which is what a large flat
// UI surface is. Measured on three reels whose products differed only in palette, that recovered 0.06, 0.56 and 1.00
// against declared values of 0.05, 0.56 and 1.00.
//
// Needs ffmpeg and ffprobe on the PATH. No dependencies. Exits 1 when the two disagree by more than the tolerance.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "./lib/cli.mjs";
import { fixed } from "./lib/fmt.mjs";
import { probeFps, probeGeometry } from "./lib/probe.mjs";
import { mark } from "./lib/report.mjs";
import { main, runBytes } from "./lib/run.mjs";

const SPEC = {
  positionals: ["video"],
  options: [
    { flag: "--src", dest: "src", metavar: "SRC", default: undefined, help: "the reel's source, to read LIGHTNESS" },
    { flag: "--declared", dest: "declared", metavar: "N", type: "float", default: undefined },
    { flag: "--tolerance", dest: "tolerance", metavar: "N", type: "float", default: 0.2 },
  ],
};

// Below this a pixel is the stage rather than the product. The kit's own backdrop sits at about 6.
const STAGE = 12;
// A UI surface is a large flat area. Anything smaller than this is a button or a bar, not the background.
const SURFACE = 0.02;
const FRAMES = 9;

/** The most repeated luma that is not the stage, and what fraction of the frame it covers. */
function surface(pixels) {
  const histogram = new Uint32Array(256);
  let counted = 0;
  for (const pixel of pixels) {
    if (pixel < STAGE) continue;
    histogram[pixel]++;
    counted++;
  }
  if (!counted) return null;
  let best = STAGE;
  for (let value = STAGE; value < 256; value++) if (histogram[value] > histogram[best]) best = value;
  return { luma: best, share: histogram[best] / pixels.length };
}

/** One frame of raw 8-bit grey, seeking before the input so ffmpeg does not decode everything up to it. */
const grey = (video, seconds, width, height) =>
  runBytes("ffmpeg", [
    "-loglevel",
    "error",
    "-ss",
    fixed(seconds, 3),
    "-i",
    video,
    "-frames:v",
    "1",
    "-vf",
    `format=gray,scale=${width}:${height}`,
    "-f",
    "rawvideo",
    "-",
  ]);

/** The literal the kit ships. Parsed rather than imported so this gate needs no node_modules and no Node 22.18. */
function declaredIn(src) {
  const file = join(src, "curves.ts");
  const found = /export\s+const\s+LIGHTNESS\s*(?::\s*number\s*)?=\s*(-?[\d.]+)\s*;/.exec(readFileSync(file, "utf8"));
  if (!found) throw new Error(`${file} has no literal "export const LIGHTNESS = <number>" to compare against`);
  return Number(found[1]);
}

main("lightness", () => {
  const args = parse("lightness.mjs", SPEC, process.argv.slice(2));
  if (args.declared === undefined && !args.src)
    throw new Error("pass --src or --declared, or there is nothing to check");
  const declared = args.declared ?? declaredIn(args.src);

  const { width, height, duration } = probeGeometry(args.video);
  probeFps(args.video);
  // The middle of the reel: past the product's entrance, before the outro starts taking it away again.
  const from = duration * 0.25;
  const step = (duration * 0.5) / (FRAMES - 1);

  const found = [];
  for (let i = 0; i < FRAMES; i++) {
    const at = from + i * step;
    const pixels = grey(args.video, at, width, height);
    if (pixels.length < width * height) continue;
    const read = surface(pixels.subarray(0, width * height));
    if (read && read.share >= SURFACE) found.push({ at, ...read });
  }

  if (!found.length) {
    // Every frame was stage, so either the product never appears or it is darker than the backdrop it sits on.
    console.log(`warn  no flat surface covering ${SURFACE * 100}% of the frame was found, so nothing can be compared`);
    console.log(`      this reads as a product with no large background of its own, or one darker than the stage`);
    return declared <= 0.1 ? 0 : 1;
  }

  const lumas = found.map((one) => one.luma).sort((a, b) => a - b);
  const measured = lumas[Math.floor(lumas.length / 2)] / 255;
  const off = Math.abs(measured - declared);
  const ok = off <= args.tolerance;

  for (const one of found) {
    console.log(
      `      ${fixed(one.at, 2)}s  surface at luma ${one.luma} over ${fixed(one.share * 100, 1)}% of the frame`,
    );
  }
  console.log(
    `${mark(ok)}  LIGHTNESS declared ${fixed(declared, 2)}, the render shows ${fixed(measured, 2)}` +
      ` (off by ${fixed(off, 2)}, tolerance ${fixed(args.tolerance, 2)})`,
  );
  if (ok) return 0;

  const paler = measured > declared;
  console.log(
    `\nThe product is ${paler ? "paler" : "darker"} than the kit was told, so its outro is tuned for something else.` +
      `\nSet LIGHTNESS to about ${fixed(measured, 2)} in curves.ts and render again.`,
  );
  console.log(
    paler
      ? "Left too low, a pale product leaves too slowly and sits as a visible slab under the end card's wordmark."
      : "Left too high, a dark product leaves too fast and too dim, which can empty the stage as it blurs out.",
  );
  return 1;
});
