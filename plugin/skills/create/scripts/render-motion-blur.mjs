#!/usr/bin/env node
// Renders a motion-blur composition (see assets/kit/MotionBlur.tsx) and averages each group of samples back into one
// frame with ffmpeg at 16 bits. Run it from the reel package so `remotion` resolves.
//
//   node render-motion-blur.mjs <shutter-composition-id> <output.mp4> --fps 60 --samples 4
//
// Needs an ffmpeg with the tmix filter on the PATH: the ffmpeg bundled with Remotion does not have it.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [id, output] = process.argv.slice(2);
const option = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : Number(process.argv[index + 1]);
};
const fps = option("fps", 60);
const samples = option("samples", 4);
if (!id || !output) {
  console.error("usage: render-motion-blur.mjs <shutter-composition-id> <output.mp4> --fps 60 --samples 4");
  process.exit(1);
}

// npm .cmd shims only resolve through a shell on Windows. ffmpeg itself must not get one: it would mangle the filter.
function run(command, args, { shell = false } = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", shell });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const filters = spawnSync("ffmpeg", ["-hide_banner", "-filters"], { encoding: "utf8" });
if (filters.error || !/\btmix\b/.test(filters.stdout ?? "")) {
  console.error("needs ffmpeg with the tmix filter on the PATH (dnf install ffmpeg, winget install ffmpeg)");
  process.exit(1);
}

// The samples render is 35 to 40MB and used to be written beside the output, which is the folder the user asked
// for deliverables in. A crash then left it there among them.
const scratch = mkdtempSync(join(tmpdir(), "motion-blur-"));
const intermediate = join(scratch, "samples.mp4");
run("npx", ["remotion", "render", id, intermediate, "--crf=4"], { shell: process.platform === "win32" });
run("ffmpeg", [
  "-y",
  "-loglevel",
  "error",
  "-i",
  intermediate,
  "-vf",
  [
    "format=yuv444p16le",
    `tmix=frames=${samples}`,
    // Keeps the last sample of each group, where tmix has just averaged the whole group.
    `select=eq(mod(n\\,${samples})\\,${samples - 1})`,
    `setpts=N/${fps}/TB`,
    "format=yuv420p",
  ].join(","),
  "-fps_mode",
  "passthrough",
  "-c:v",
  "libx264",
  "-crf",
  "16",
  "-preset",
  "slow",
  "-movflags",
  "+faststart",
  output,
]);
rmSync(scratch, { recursive: true, force: true });
console.log(`Rendered ${output} with ${samples}-sample motion blur`);
