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
// It reads the product's surface as the 75th percentile of the frame's non-stage pixels. The percentile is the point
// here, twice over. It has to ignore the product's text and chrome, which are a minority of its area, and it has to
// lean towards the brighter surface when a product has more than one, because LIGHTNESS ends up governing how much
// PEAK brightness survives the blur and a peak comes from the brightest large thing rather than from an average.
//
// An earlier version took the most repeated non-stage luma instead, on the reasoning that a flat UI background is
// the single most repeated value. That is true and it broke on the first product that had no flat background: a
// near-white gradient spread its pixels thin enough that the densest single value was the stage's own glow, and the
// gate read a white product as 0.06 and told the user to make it darker. Measured across five reels differing only
// in palette (flat dark, flat mid-grey, flat white, a white gradient, and a white panel with a dark sidebar) the
// percentile lands within 0.03 of the truth on all five where the mode was wrong by 0.84 on one of them.
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
// Enough of the frame has to be product for a percentile of it to mean anything.
const SURFACE = 0.05;
const QUANTILE = 0.75;
const FRAMES = 9;

/** The product's surface luma, as a high percentile of everything that is not the stage. */
function surface(pixels) {
  const histogram = new Uint32Array(256);
  let counted = 0;
  for (const pixel of pixels) {
    if (pixel < STAGE) continue;
    histogram[pixel]++;
    counted++;
  }
  if (!counted) return null;
  let seen = 0;
  for (let value = STAGE; value < 256; value++) {
    seen += histogram[value];
    if (seen >= counted * QUANTILE) return { luma: value, share: counted / pixels.length };
  }
  return { luma: 255, share: counted / pixels.length };
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
    console.log(
      `warn  less than ${SURFACE * 100}% of the frame is product, so there is nothing to take a reading from`,
    );
    console.log(`      this reads as a product that never fills the stage, or one darker than the backdrop it sits on`);
    return declared <= 0.1 ? 0 : 1;
  }

  const lumas = found.map((one) => one.luma).sort((a, b) => a - b);
  const measured = lumas[Math.floor(lumas.length / 2)] / 255;
  const off = Math.abs(measured - declared);
  const ok = off <= args.tolerance;

  for (const one of found) {
    console.log(
      `      ${fixed(one.at, 2)}s  surface reads luma ${one.luma}, from the ${fixed(one.share * 100, 1)}%` +
        ` of the frame that is product`,
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
