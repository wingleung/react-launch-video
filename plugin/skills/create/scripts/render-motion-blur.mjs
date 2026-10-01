#!/usr/bin/env node
// Renders a motion-blur composition (see assets/kit/MotionBlur.tsx) and averages each group of samples back into one
// frame with ffmpeg at 16 bits. Run it from the reel package so its own @remotion/cli resolves.
//
//   node render-motion-blur.mjs <shutter-composition-id> <output.mp4> --fps 60 --samples 4
//
// Needs an ffmpeg with the tmix filter on the PATH: the ffmpeg bundled with Remotion does not have it.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * The ffmpeg chain that averages each group of samples back into one frame. Exported and pure so a test can assert
 * the escaping: the commas inside `mod(n\,N)` have to survive being joined into a filter list, and if they do not
 * ffmpeg reads them as filter separators and fails in a way that looks like a codec problem.
 */
export function blurFilter(samples, fps) {
  return [
    "format=yuv444p16le",
    `tmix=frames=${samples}`,
    // Keeps the last sample of each group, where tmix has just averaged the whole group.
    `select=eq(mod(n\\,${samples})\\,${samples - 1})`,
    `setpts=N/${fps}/TB`,
    "format=yuv420p",
  ].join(",");
}

const USAGE = "usage: render-motion-blur.mjs <shutter-composition-id> <output.mp4> --fps 60 --samples 4";

/**
 * The entry point of the @remotion/cli the reel package installed, or null outside one. Run with this Node rather
 * than through npx: npx needs a shell for its Windows shim, which re-splits every argument on spaces and hands & and
 * | to cmd.exe, and outside a reel package it downloads the latest `remotion`, which has no binary to run.
 */
function remotionCli() {
  let manifest;
  try {
    manifest = createRequire(join(process.cwd(), "package.json")).resolve("@remotion/cli/package.json");
  } catch {
    return null;
  }
  const { bin } = JSON.parse(readFileSync(manifest, "utf8"));
  const entry = typeof bin === "string" ? bin : bin?.remotion;
  return entry ? join(dirname(manifest), entry) : null;
}

/** Exit status of the render, or of the first thing that stopped it. */
function render(argv) {
  const [id, output] = argv.filter(
    (argument, index) => !argument.startsWith("--") && !argv[index - 1]?.startsWith("--"),
  );
  const option = (name, fallback) => {
    const index = argv.indexOf(`--${name}`);
    return index === -1 ? fallback : Number(argv[index + 1]);
  };
  const fps = option("fps", 60);
  const samples = option("samples", 4);
  if (!id || !output) {
    console.error(USAGE);
    return 1;
  }
  if (!/^[A-Za-z0-9-]+$/.test(id)) {
    console.error(`composition id "${id}" can only hold letters, digits and hyphens, which is what Remotion allows`);
    return 1;
  }
  if (!Number.isInteger(samples) || samples < 1) {
    console.error("--samples needs a whole number of samples per frame, 1 or more");
    return 1;
  }
  if (!Number.isFinite(fps) || fps <= 0) {
    console.error("--fps needs the composition's frame rate, a number above 0");
    return 1;
  }

  const filters = spawnSync("ffmpeg", ["-hide_banner", "-filters"], { encoding: "utf8" });
  if (filters.error || !/\btmix\b/.test(filters.stdout ?? "")) {
    console.error("needs ffmpeg with the tmix filter on the PATH (dnf install ffmpeg, winget install ffmpeg)");
    return 1;
  }
  const cli = remotionCli();
  if (!cli) {
    console.error("@remotion/cli is not installed here. Run this from the reel package, after npm install.");
    return 1;
  }

  // No shell for either: ffmpeg would mangle the filter, and the render needs none now that it skips npx.
  const run = (command, args) => {
    const result = spawnSync(command, args, { stdio: "inherit" });
    if (result.error) throw result.error;
    return result.status ?? 1;
  };

  // The samples render is 35 to 40MB and used to be written beside the output, which is the folder the user asked
  // for deliverables in. A crash then left it there among them, and an early exit left it in the temp directory.
  const scratch = mkdtempSync(join(tmpdir(), "motion-blur-"));
  try {
    const intermediate = join(scratch, "samples.mp4");
    const rendered = run(process.execPath, [cli, "render", id, intermediate, "--crf=4"]);
    if (rendered !== 0) return rendered;
    const averaged = run("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-i",
      intermediate,
      "-vf",
      blurFilter(samples, fps),
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
    if (averaged !== 0) return averaged;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
  console.log(`Rendered ${output} with ${samples}-sample motion blur`);
  return 0;
}

// Importing this module for `blurFilter` must not start a render, so the render runs only when this file is the
// program. resolve() normalises the argv path the same way pathToFileURL does, so the two compare on Windows.
if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? "")).href) {
  process.exitCode = render(process.argv.slice(2));
}
