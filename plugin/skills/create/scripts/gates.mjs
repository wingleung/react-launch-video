#!/usr/bin/env node
// Run every gate on a reel, in one command, from the reel package.
//
//     node <skill>/scripts/gates.mjs outputs/reel.mp4 --src src --storyboard storyboard.md
//     node <skill>/scripts/gates.mjs outputs/reel.mp4 --src src --storyboard storyboard.md --min 30 --max 45
//
// Six gates used to be six hand-typed commands with four argument shapes and three different names for "point at
// the other artefact". On a real reel they get re-run once per iteration, which was 36 to 60 invocations across a
// session and a permission prompt for every one of them.
//
// It also refuses to pass a reel that has not really been made yet. Four of the gates can be satisfied by doing less
// work rather than more: write no claims and the claim gate passes, load no font and the font gate only warns, copy
// no motion and the easing gate has nothing to check. The runner calls those four with --strict, which makes each
// absence a failure, and a preflight catches the untouched kit before any of them run, since failing in a second
// beats failing after a twenty minute render.
//
// Exits non-zero naming the gates that failed. Needs ffmpeg and ffprobe on the PATH.
import { existsSync, readFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "./lib/cli.mjs";
import { mark } from "./lib/report.mjs";
import { main } from "./lib/run.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const skill = dirname(here);

const SPEC = {
  positionals: ["reel"],
  options: [
    { flag: "--src", dest: "src", metavar: "SRC", default: "src" },
    { flag: "--storyboard", dest: "storyboard", metavar: "STORYBOARD", default: "storyboard.md" },
    { flag: "--min", dest: "min", metavar: "MIN", type: "float", default: undefined },
    { flag: "--max", dest: "max", metavar: "MAX", type: "float", default: undefined },
    { flag: "--width", dest: "width", metavar: "WIDTH", type: "int", default: undefined },
    { flag: "--height", dest: "height", metavar: "HEIGHT", type: "int", default: undefined },
    { flag: "--accept", dest: "accept", metavar: "RANGES", default: undefined, help: "passed to edge-scan" },
    { flag: "--skip-preflight", dest: "skipPreflight", store: true, default: false },
  ],
};

/**
 * The things that make a gate pass for the wrong reason. Each is a question about whether the reel was actually
 * made, not about whether it is good, so each names the step that was skipped rather than a threshold.
 */
function preflight(args) {
  const problems = [];
  const read = (path) => (existsSync(path) ? readFileSync(path, "utf8") : null);

  if (!existsSync(args.reel)) problems.push(`${args.reel} does not exist. Render before gating.`);
  if (!existsSync(args.src) || !statSync(args.src).isDirectory()) {
    problems.push(`${args.src} is not a directory. Pass --src if the reel's source is somewhere else.`);
  }

  const storyboard = read(args.storyboard);
  if (storyboard === null) {
    problems.push(
      `${args.storyboard} does not exist. Copy ${join(skill, "references/storyboard.md")} to the reel package` +
        " and fill it in, which is step 2.",
    );
  } else {
    const template = read(join(skill, "references/storyboard.md"));
    if (template !== null && storyboard.trim() === template.trim()) {
      problems.push(`${args.storyboard} is still the unedited template, so the gates would check the kit's example.`);
    }
  }

  // Placeholders the kit ships with. Any one still present means step 4 was not finished, and several gates will
  // happily pass a reel that is still wearing the kit's own clothes.
  const untouched = [
    ["rgba(255, 255, 255, 0.12)", join(args.src, "Reel.tsx"), "GLOW is still the kit's neutral placeholder"],
    ["../my-product", "remotion.config.ts", "remotion.config.ts still points at ../my-product"],
  ];
  for (const [needle, path, what] of untouched) {
    const text = read(path);
    if (text !== null && text.includes(needle)) problems.push(`${what} (${path}).`);
  }
  return problems;
}

main("gates", () => {
  const args = parse("gates.mjs", SPEC, process.argv.slice(2));

  if (!args.skipPreflight) {
    const problems = preflight(args);
    for (const problem of problems) console.log(`${mark(false)}  ${problem}`);
    if (problems.length) {
      console.log(`\nFAILED before running anything: the reel is not finished enough to gate.`);
      console.log("Pass --skip-preflight to run the gates anyway, for a reel this tool does not understand.");
      return 1;
    }
  }

  const bounds = [
    ...(args.min === undefined ? [] : ["--min", String(args.min)]),
    ...(args.max === undefined ? [] : ["--max", String(args.max)]),
  ];
  const size = [
    ...(args.width === undefined ? [] : ["--width", String(args.width)]),
    ...(args.height === undefined ? [] : ["--height", String(args.height)]),
  ];

  const gates = [
    ["check-video", [args.reel, ...bounds, ...size]],
    // No size here: edge-scan reads the frame from the file and its margin is a share of it.
    ["edge-scan", [args.reel, ...(args.accept === undefined ? [] : ["--accept", args.accept])]],
    // Strict, because by here a real reel is being checked: "no motion", "no claim", "no typography at all" and "I
    // could not read the product" are all answers that must not read as a pass.
    ["easing-inventory", [args.src, "--storyboard", args.storyboard, "--strict"]],
    ["claims", [args.src, "--doc", args.storyboard, "--strict"]],
    ["fonts", [args.src, "--storyboard", args.storyboard, "--strict"]],
    ["lightness", [args.reel, "--src", args.src, "--strict"]],
  ];

  const failed = [];
  for (const [name, gateArgs] of gates) {
    console.log(`\n== ${name}`);
    // The Node running this one, since a version manager can leave `node` off the PATH a tool spawns with.
    const result = spawnSync(process.execPath, [resolve(here, `${name}.mjs`), ...gateArgs], { stdio: "inherit" });
    if (result.error) throw result.error;
    if (result.status !== 0) failed.push(name);
  }

  if (failed.length) {
    console.log(`\nFAILED: ${failed.join(", ")}`);
    return 1;
  }
  console.log(`\nAll ${gates.length} gates passed.`);
  return 0;
});
