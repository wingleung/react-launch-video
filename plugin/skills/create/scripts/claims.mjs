#!/usr/bin/env node
// Check every number a comment or a reference doc claims about the reel's timing against the reel's own curves.
//
//     node claims.mjs src/                                check every [measured: ...] claim in the source
//     node claims.mjs src/ --doc references/pacing.md     check a reference doc too, repeatable
//     node claims.mjs src/ --values cues                  print every signal at every cue, to write a claim from
//     node claims.mjs src/ --strict                       and fail when there is no claim, or no signal to claim
//
// Six wrong numbers shipped in kit comments before this existed. Every one was written as a justification for a
// timing choice and never looked at again after the timing moved, so each read as documentation while being a defect
// report. A number about this reel now has to be written as a claim, and a claim is re-derived on every run:
//
//     [measured: product blur at endCard is 14px]
//     [measured: min brightest over titleExit..productIn + 0.45 is 40.3%]
//     [measured: product opacity crosses 10% after outro at 15.80s]
//
// A claim names a signal from SIGNALS in curves.ts, and its moments are expressions over the cue names in
// timeline.ts. Tolerance defaults to 0.5 for a percentage, 0.1 for pixels and one frame for a crossing, and a
// trailing "+/- 2" widens it. A claim wrapped in backticks is read as an example of the form, not as a claim.
//
// The second half is the lint. Prose that puts a percentage or a pixel figure beside a signal's name without a claim
// fails too, because that is the shape all six defects had. Tag the block [convention] for practice with no source,
// [rule] for a threshold the document itself sets, [rendered] for something measured off real frames that no curve
// can re-derive (peak luma under blur, banding, a colour), or cite one, when the figure is not a measurement of
// this reel. [rendered] is the honest escape hatch and also the weakest: it dates from the render that produced it,
// so say which reel, and prefer a claim whenever the number is a property of the curves.
//
// Needs the reel's own node_modules and a Node that can import TypeScript (22.18 or later), because it imports the
// curves rather than reimplementing them. A second copy of the timing would drift exactly where this has to be right.
import { existsSync, readFileSync, readdirSync } from "node:fs";
// The default export, because a named import of registerHooks is a SyntaxError on a Node without it, thrown before
// a line of this file runs, and the version check in loadKit is the message that Node's user needs.
import nodeModule from "node:module";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { parse } from "./lib/cli.mjs";
import { fixed } from "./lib/fmt.mjs";
import { mark } from "./lib/report.mjs";
import { main, stripsTypes } from "./lib/run.mjs";

const SPEC = {
  positionals: ["src"],
  options: [
    { flag: "--doc", dest: "docs", metavar: "FILE", append: true, help: "a reference doc to check as well" },
    { flag: "--values", dest: "values", metavar: "MOMENTS", help: "print every signal at these moments, or at `cues`" },
    { flag: "--as", dest: "as", metavar: "DIR", help: "report src paths as if it were this directory" },
    { flag: "--strict", dest: "strict", store: true, default: false, help: "checking no claim at all is a failure" },
  ],
};

// A percentage claim is written to a tenth, pixels to a tenth, and a crossing lands on a frame.
const DEFAULT_TOLERANCE = { "%": 0.5, px: 0.1, s: 0.02 };
const TOLERANCE = String.raw`(?:\s*(?:±|\+\/-)\s*([\d.]+))?`;
const OVER = new RegExp(String.raw`^(min|max)\s+(.+?)\s+over\s+(.+?)\.\.(.+?)\s+is\s+(-?[\d.]+)\s*(%|px)${TOLERANCE}$`);
const AT = new RegExp(String.raw`^(.+?)\s+at\s+(.+?)\s+is\s+(-?[\d.]+)\s*(%|px)${TOLERANCE}$`);
const CROSSES = new RegExp(
  String.raw`^(.+?)\s+crosses\s+(-?[\d.]+)\s*(%|px)\s+after\s+(.+?)\s+at\s+(-?[\d.]+)s${TOLERANCE}$`,
);
const CLAIM = /\[measured:\s*([^\]]+?)\s*\]/g;
const FIGURE = /(-?\d+(?:\.\d+)?)\s*(?:%|px(?![a-z]))/gi;
// What a signal measures. Prose that carries none of these words is not describing one, whatever it names.
const MEASURE = /opacity|blur|bright|dim\b|fade|dissolve/;
// A cue expression is arithmetic over names. Nothing else can reach the evaluator.
const CUE_EXPRESSION = /^[A-Za-z0-9_.+\-*/() ]+$/;

// Resolve the kit's extensionless relative imports the way a bundler would, so Node can import curves.ts in place.
function resolveLikeABundler() {
  nodeModule.registerHooks({
    resolve(specifier, context, nextResolve) {
      if (/^\.{1,2}\//.test(specifier) && !/\.[cm]?[jt]sx?$|\.json$/.test(specifier)) {
        for (const extension of [".ts", ".tsx"]) {
          try {
            return nextResolve(`${specifier}${extension}`, context);
          } catch {
            // fall through, so an import that resolves to nothing fails naming itself rather than a guess
          }
        }
      }
      return nextResolve(specifier, context);
    },
  });
}

async function loadKit(src) {
  const curves = join(src, "curves.ts");
  const timeline = join(src, "timeline.ts");
  for (const file of [curves, timeline]) {
    if (!existsSync(file)) throw new Error(`${relative(process.cwd(), file)} not found, so no claim can be checked`);
  }
  if (!stripsTypes() || typeof nodeModule.registerHooks !== "function") {
    throw new Error(`needs Node 22.18 or later to import the kit's TypeScript, this is ${process.version}`);
  }
  resolveLikeABundler();
  let modules;
  try {
    modules = await Promise.all([curves, timeline].map((file) => import(pathToFileURL(file).href)));
  } catch (error) {
    const stripping = /Unknown file extension|Unexpected token|ERR_UNSUPPORTED/.test(String(error.message));
    const hint = stripping ? ` (needs Node 22.18 or later to import TypeScript, this is ${process.version})` : "";
    throw new Error(`could not import the kit${hint}: ${error.message}`);
  }
  const [{ SIGNALS }, { CUE, FPS, DURATION_SECONDS }] = modules;
  if (!SIGNALS) throw new Error("curves.ts exports no SIGNALS, so a claim has nothing to name");
  return { signals: SIGNALS, cue: { ...CUE, duration: DURATION_SECONDS }, fps: FPS ?? 60, duration: DURATION_SECONDS };
}

function moment(expression, cue) {
  const text = expression.trim();
  if (!CUE_EXPRESSION.test(text)) throw new Error(`"${text}" is not arithmetic over cue names`);
  const names = Object.keys(cue);
  let value;
  try {
    value = new Function(...names, `"use strict"; return (${text});`)(...names.map((name) => cue[name]));
  } catch (error) {
    throw new Error(`"${text}" does not evaluate: ${error.message}`);
  }
  if (!Number.isFinite(value)) throw new Error(`"${text}" is not a time`);
  return value;
}

function signalNamed(name, signals) {
  const signal = signals[name.trim()];
  if (!signal) throw new Error(`"${name.trim()}" is not a signal (curves.ts has ${Object.keys(signals).join(", ")})`);
  return signal;
}

/** The value a claim writes, which is the signal scaled into the unit it declares. */
const sample = (signal, seconds) => (signal.unit === "%" ? signal.at(seconds) * 100 : signal.at(seconds));

function extreme(kind, signal, from, to, fps) {
  if (to < from) throw new Error(`the window ends (${fixed(to, 3)}s) before it starts (${fixed(from, 3)}s)`);
  let best = null;
  let when = from;
  for (let frame = Math.round(from * fps); frame <= Math.round(to * fps); frame += 1) {
    const seconds = frame / fps;
    const value = sample(signal, seconds);
    if (best === null || (kind === "min" ? value < best : value > best)) [best, when] = [value, seconds];
  }
  return { value: best ?? sample(signal, from), when };
}

function crossing(signal, threshold, after, duration, fps) {
  const start = Math.round(after * fps);
  let previous = sample(signal, start / fps);
  for (let frame = start + 1; frame <= Math.round(duration * fps); frame += 1) {
    const seconds = frame / fps;
    const value = sample(signal, seconds);
    if (previous < threshold !== value < threshold) return seconds;
    previous = value;
  }
  return null;
}

/** Read a claim into its parts, or say what it is that the gate cannot read. */
function parseClaim(text) {
  const over = OVER.exec(text);
  if (over) {
    const [, kind, name, from, to, value, unit, tolerance] = over;
    const bound = Number(tolerance ?? DEFAULT_TOLERANCE[unit]);
    return { form: "over", kind, name, from, to, value: Number(value), unit, tolerance: bound };
  }
  const crosses = CROSSES.exec(text);
  if (crosses) {
    const [, name, threshold, unit, after, value, tolerance] = crosses;
    const bound = Number(tolerance ?? DEFAULT_TOLERANCE.s);
    return { form: "crosses", name, threshold: Number(threshold), unit, after, value: Number(value), tolerance: bound };
  }
  const at = AT.exec(text);
  if (at) {
    const [, name, when, value, unit, tolerance] = at;
    const bound = Number(tolerance ?? DEFAULT_TOLERANCE[unit]);
    return { form: "at", name, when, value: Number(value), unit, tolerance: bound };
  }
  throw new Error("not a claim this gate can read, see the forms at the top of claims.mjs");
}

/** What the reel actually does where the claim looks, in the unit the claim used. */
function derive(claim, kit) {
  const signal = signalNamed(claim.name, kit.signals);
  if (signal.unit !== claim.unit) {
    throw new Error(`"${claim.name.trim()}" is measured in ${signal.unit}, not ${claim.unit}`);
  }
  if (claim.form === "over") {
    const found = extreme(claim.kind, signal, moment(claim.from, kit.cue), moment(claim.to, kit.cue), kit.fps);
    return { actual: found.value, unit: claim.unit, note: `at ${fixed(found.when, 3)}s` };
  }
  if (claim.form === "crosses") {
    const when = crossing(signal, claim.threshold, moment(claim.after, kit.cue), kit.duration, kit.fps);
    if (when === null) throw new Error(`never crosses ${claim.threshold}${claim.unit} after ${claim.after.trim()}`);
    return { actual: when, unit: "s", note: "" };
  }
  const seconds = moment(claim.when, kit.cue);
  return { actual: sample(signal, seconds), unit: claim.unit, note: `at ${fixed(seconds, 3)}s` };
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

/** Comment runs in TypeScript, and paragraphs in markdown: the unit a figure and its excuse have to share. */
function blocks(path, text) {
  if (path.endsWith(".md")) {
    // A blank line ends a block and so does the start of a list item, because a list written without blank lines is
    // one paragraph to a splitter and a dozen separate points to a reader. Tagging has to land on the point.
    const found = [];
    let current = null;
    text
      .replace(/```[\s\S]*?```/g, (fence) => fence.replace(/[^\n]/g, " "))
      .split("\n")
      .forEach((line, index) => {
        if (line.trim() === "") current = null;
        else if (!current || /^[ \t]*(?:[-*+]|\d+\.)[ \t]/.test(line))
          found.push((current = { line: index + 1, text: line }));
        else current.text += `\n${line}`;
      });
    return found;
  }
  const pattern = /\/\*[\s\S]*?\*\/|[ \t]*\/\/[^\n]*(?:\n[ \t]*\/\/[^\n]*)*/g;
  const found = [];
  for (const match of text.matchAll(pattern)) {
    if (text[match.index - 1] === ":") continue; // a URL in a string literal, not a comment
    found.push({ line: lineOf(text, match.index), text: match[0] });
  }
  return found;
}

function sources(root) {
  const found = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const full = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules") walk(full);
      } else if (/\.tsx?$/.test(entry.name)) {
        found.push(full);
      }
    }
  };
  walk(root);
  return found;
}

main("claims", async () => {
  const args = parse("claims.mjs", SPEC, process.argv.slice(2));
  const kit = await loadKit(args.src);

  if (args.values) {
    const names = args.values === "cues" ? Object.keys(kit.cue) : args.values.split(",").map((part) => part.trim());
    const moments = names.map((name) => ({ name, seconds: moment(name, kit.cue) }));
    const width = Math.max(...Object.keys(kit.signals).map((name) => name.length)) + 2;
    console.log("".padEnd(width) + moments.map((one) => `${one.name}`.padEnd(12)).join(""));
    console.log("".padEnd(width) + moments.map((one) => `${fixed(one.seconds, 2)}s`.padEnd(12)).join(""));
    for (const [name, signal] of Object.entries(kit.signals)) {
      const cells = moments.map((one) => `${fixed(sample(signal, one.seconds), 1)}${signal.unit}`.padEnd(12));
      console.log(name.padEnd(width) + cells.join(""));
    }
    return 0;
  }

  // The kit is checked from a throwaway copy with the reel's dependencies beside it, so --as puts the failures
  // back where someone can open them rather than in a temp directory that will not exist by the time they look.
  const shown = (path) =>
    relative(process.cwd(), args.as && path.startsWith(args.src) ? join(args.as, relative(args.src, path)) : path);
  const files = [...sources(args.src), ...args.docs];
  const rows = [];
  const untagged = [];
  for (const path of files) {
    const text = readFileSync(path, "utf8");
    const where = shown(path);
    for (const block of blocks(path, text)) {
      // A claim inside a code span is an example of the form, not a claim: that is how this file's own header
      // writes one, and how a reference doc teaches the syntax. It still covers its own figures for the lint below,
      // since a number inside an example of a claim is not a loose number.
      const written = [...block.text.matchAll(CLAIM)];
      const claims = written.filter(
        (match) => !(block.text[match.index - 1] === "`" && block.text[match.index + match[0].length] === "`"),
      );
      for (const claim of claims) {
        const at = `${where}:${block.line + lineOf(block.text, claim.index) - 1}`;
        try {
          const parsed = parseClaim(claim[1]);
          const found = derive(parsed, kit);
          const off = Math.abs(found.actual - parsed.value);
          const ok = off <= parsed.tolerance;
          rows.push({
            ok,
            at,
            text: claim[1],
            actual: `${fixed(found.actual, found.unit === "s" ? 3 : 2)}${found.unit}`,
            off: ok
              ? found.note
              : `off by ${fixed(off, 2)}, outside the ${fixed(parsed.tolerance, 2)} this claim allows`,
          });
        } catch (error) {
          rows.push({ ok: false, at, text: claim[1], actual: "", off: error.message });
        }
      }
      // Only prose about how bright or how blurred something is, which is the whole of what a signal measures. A
      // paragraph about font sizes or viewport widths names the product too and is none of this gate's business.
      const prose = block.text.toLowerCase();
      const subjects = new Set(
        Object.keys(kit.signals).flatMap((name) => [name, name.replace(/ (opacity|blur)$/, "")]),
      );
      const about = [...subjects].some((subject) => prose.includes(subject.toLowerCase())) && MEASURE.test(prose);
      // A figure is accounted for when it sits inside a claim, when the block is tagged [convention] as practice,
      // [rule] as a threshold this document sets or [rendered] as read off real frames, or when the block cites a
      // source. One claim does not excuse the rest of its block: that loophole is how a right number ends up
      // vouching for a wrong one two lines below.
      if (!about || /\[convention\]|\[rule\]|\[rendered\]|\]\(http/.test(block.text)) continue;
      const spans = written.map((claim) => [claim.index, claim.index + claim[0].length]);
      for (const figure of block.text.matchAll(FIGURE)) {
        if (spans.some(([from, to]) => figure.index >= from && figure.index < to)) continue;
        const line = block.line + lineOf(block.text, figure.index) - 1;
        untagged.push(`${where}:${line}  "${figure[0]}" sits beside a signal's name with no claim and no source`);
      }
    }
  }

  // Capped, so one deeply nested path does not push every claim off the right of the terminal.
  const column = Math.min(40, Math.max(0, ...rows.map((row) => row.at.length)));
  for (const row of rows) {
    console.log(`${mark(row.ok)}  ${row.at.padEnd(column)}  ${row.text}${row.actual ? `  [${row.actual}]` : ""}`);
    if (row.off) console.log(`      ${"".padEnd(column)}  ${row.off}`);
  }
  for (const line of untagged) console.log(`${mark(false)}  ${line}`);

  // Zero claims re-derive perfectly, so a reel that wrote none passed. Under --strict, which is how the runner calls
  // this, a finished reel has to say something checkable about its own timing.
  const hollow = [];
  if (args.strict && !Object.keys(kit.signals).length)
    hollow.push("curves.ts exports no signals, so nothing can be claimed");
  else if (args.strict && !rows.length)
    hollow.push("no [measured: ...] claim anywhere, so nothing about the timing was checked");
  for (const line of hollow) console.log(`${mark(false)}  ${line}`);

  const failed = rows.filter((row) => !row.ok).length + untagged.length + hollow.length;
  const summary = `${rows.length} claim${rows.length === 1 ? "" : "s"} re-derived from curves.ts`;
  console.log(failed ? `\nclaims check FAILED (${failed})` : `\nclaims check passed: ${summary}`);
  return failed ? 1 : 0;
});
