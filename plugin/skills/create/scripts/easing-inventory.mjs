#!/usr/bin/env node
// List every animated value in a reel's source with the easing the code actually applies, and check a storyboard.
//
//     node easing-inventory.mjs src/                         prints file:line, helper and easing for every motion call
//     node easing-inventory.mjs src/ --storyboard story.md   also checks the storyboard's easing table against the code
//
// Finds tween, springAt, interpolate, spring, smoothPath and direct calls of named easings, resolves `Easing.bezier`
// constants to their numbers and applies the kit defaults (tween eases out with easeOut, springAt uses SMOOTH,
// interpolate without an easing is linear).
//
// With --storyboard, each row of the storyboard's easing table cites the code as `File.tsx:12` or `File.tsx:12-40`
// (a range covers every call inside it). The check fails when a cited call's easing is not named in its row (by the
// constant's name, its bezier numbers, `linear`, the spring config's name or values) or when a call is cited by no row.
// Delete kit components the reel does not use so they do not show up as uncited. Exits 1 on any failure.
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { parse } from "./lib/cli.mjs";
import { sliceChars } from "./lib/fmt.mjs";
import { main } from "./lib/run.mjs";

const SPEC = {
  positionals: ["src"],
  options: [{ flag: "--storyboard", dest: "storyboard", metavar: "STORYBOARD", default: undefined }],
};

const DEPTH = { "(": 1, "[": 1, "{": 1, ")": -1, "]": -1, "}": -1 };
const HELPERS = /\b(tween|springAt|interpolate|spring|smoothPath)\s*\(/g;
// Every break a text editor counts as a line, so a cited line number matches what a contributor sees.
const LINE_BREAK = new RegExp("\\r\\n|[\\n\\r\\v\\f\\u001c\\u001d\\u001e\\u0085\\u2028\\u2029]");
const SEPARATOR = String.fromCharCode(0); // joins the parts of a lookup key, since no path or easing contains it

/** Every .ts and .tsx under a directory, ordered component by component so the walk is stable everywhere. */
function sources(root) {
  const found = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const full = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules") walk(full);
      } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
        found.push(full);
      }
    }
  };
  walk(root);
  return found.sort((a, b) => {
    const left = a.split("/");
    const right = b.split("/");
    for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
      const one = left[index] ?? "";
      const two = right[index] ?? "";
      if (one !== two) return one < two ? -1 : 1;
    }
    return 0;
  });
}

/** Blank out comments and keep every newline so line numbers stay right. */
function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (comment) => comment.replace(/[^\n]/g, " "));
}

function callArgs(text, openParen) {
  let depth = 0;
  for (let index = openParen; index < text.length; index += 1) {
    depth += DEPTH[text[index]] ?? 0;
    if (depth === 0) return text.slice(openParen + 1, index);
  }
  return text.slice(openParen + 1);
}

function splitTop(argumentText) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const character of argumentText) {
    depth += DEPTH[character] ?? 0;
    if (character === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function norm(text) {
  return text.replace(/[\s:{}'"`]/g, "").toLowerCase();
}

function lineNumber(text, index) {
  let line = 1;
  for (let at = 0; at < index; at += 1) if (text[at] === "\n") line += 1;
  return line;
}

main("easing-inventory", () => {
  const args = parse("easing-inventory.mjs", SPEC, process.argv.slice(2));
  const files = sources(args.src);
  const texts = new Map(files.map((file) => [file, stripComments(readFileSync(file, "utf8"))]));

  const beziers = new Map();
  const springs = new Map();
  for (const text of texts.values()) {
    for (const [, name, numbers] of text.matchAll(/(?:const|let)\s+(\w+)\s*=\s*Easing\.bezier\(([^)]*)\)/g)) {
      beziers.set(
        name,
        numbers
          .split(",")
          .map((number) => number.trim())
          .join(","),
      );
    }
    for (const [, name, config] of text.matchAll(/(?:const|let)\s+(\w+)\s*(?::[^=]+)?=\s*(\{[^}]*damping[^}]*\})/g)) {
      springs.set(name, config);
    }
  }

  let defaultTween = "easeOut";
  let tweenEasingIndex = 4; // kit signature: tween(frame, fps, [start, end], [from, to], easing = easeOut)
  for (const text of texts.values()) {
    // a reel that writes its own tween helper has its own signature and default
    const own = /(?:function\s+tween\s*(?:<[^>]*>)?\s*\(|const\s+tween\s*=\s*\()/.exec(text);
    if (!own) continue;
    const params = splitTop(callArgs(text, own.index + own[0].length - 1));
    params.forEach((param, index) => {
      if (!/^(ease|easing|curve)\b/i.test(param.trim())) return;
      tweenEasingIndex = index;
      const fallback = /=\s*([\w.]+)\s*$/.exec(param);
      defaultTween = fallback ? fallback[1] : "linear";
    });
  }

  /** A readable easing and the tokens that name it in a storyboard row. */
  const describe = (raw) => {
    const expression = raw.trim();
    if (beziers.has(expression)) {
      return [`${expression} bezier(${beziers.get(expression)})`, [expression, beziers.get(expression)]];
    }
    if (springs.has(expression)) {
      return [`spring ${expression} ${springs.get(expression)}`, [expression, springs.get(expression)]];
    }
    const bezier = /^Easing\.bezier\(([^)]*)\)$/.exec(expression);
    if (bezier) {
      const numbers = bezier[1]
        .split(",")
        .map((number) => number.trim())
        .join(",");
      return [`bezier(${numbers})`, [numbers]];
    }
    if (expression.startsWith("{")) return [`spring ${expression}`, [expression]];
    return [expression, [expression]];
  };

  const entries = [];
  for (const [file, text] of texts) {
    const rel = relative(args.src, file);
    const lines = text.split(LINE_BREAK);
    // The nearest declaration before the call owns it: `const enter = tween(...)` is owned by `enter`, and a call
    // inside a component with no closer declaration is owned by the component. Citing that name instead of a line
    // number means an edit somewhere else in the file no longer invalidates the storyboard.
    const ownerOf = (index) => {
      const declarations = [
        ...text.slice(0, index).matchAll(/(?:function\s+(\w+)|(?:const|let)\s+(\w+)\s*(?::[^=]+)?=)/g),
      ];
      const last = declarations[declarations.length - 1];
      return last ? (last[1] ?? last[2]) : undefined;
    };
    const record = (index, helper, easing, tokens) => {
      const line = lineNumber(text, index);
      const owner = ownerOf(index);
      entries.push({ file: rel, line, owner, helper, easing, tokens, code: sliceChars(lines[line - 1].trim(), 90) });
    };

    for (const match of text.matchAll(HELPERS)) {
      const helper = match[1];
      const before = text.slice(0, match.index);
      if (/function\s*$/.test(before)) continue;
      const enclosing = [...before.matchAll(/function\s+(\w+)/g)].map((found) => found[1]);
      if (enclosing.length && enclosing[enclosing.length - 1].startsWith("assert")) continue;
      const parts = splitTop(callArgs(text, match.index + match[0].length - 1));
      let easing;
      let tokens;
      if (helper === "tween") {
        if (parts.length < tweenEasingIndex) continue;
        if (parts.length > tweenEasingIndex) {
          [easing, tokens] = describe(parts[tweenEasingIndex]);
        } else {
          [easing, tokens] = describe(defaultTween);
          easing += " (tween default)";
        }
      } else if (helper === "springAt") {
        [easing, tokens] = parts.length > 3 ? describe(parts[3]) : describe("SMOOTH");
        tokens.push("spring");
      } else if (helper === "interpolate") {
        let options = parts.length > 3 ? parts[3] : "";
        if (/^\w+$/.test(options)) {
          // options passed as a variable: read its object literal in this file
          const declared = new RegExp(`(?:const|let)\\s+${options}\\s*(?::[^=]+)?=\\s*\\{`).exec(text);
          options = declared ? `{${callArgs(text, declared.index + declared[0].length - 1)}}` : `easing: ${options}`;
        }
        const found = /easing\s*:\s*((?:Easing\.bezier\([^)]*\))|[\w.]+(?:\([^)]*\))?)/.exec(options);
        if (!found && /\beasing\b/.test(options)) continue; // shorthand `{ easing }`, a helper passing it through
        [easing, tokens] = found ? describe(found[1]) : ["linear", ["linear"]];
      } else if (helper === "spring") {
        const options = parts.length ? parts[0] : "";
        const found = /config\s*:\s*(\{[^}]*\}|\w+)/.exec(options) ?? /\b(config)\b/.exec(options);
        [easing, tokens] = found ? describe(found[1]) : ["spring default", ["spring"]];
        tokens.push("spring");
      } else {
        [easing, tokens] = ["smoothPath monotone cubic", ["smoothPath", "monotone"]];
      }
      if (["easing", "config"].includes(easing.split(" ")[0])) continue; // the helper's own definition
      record(match.index, helper, easing, tokens);
    }

    for (const name of beziers.keys()) {
      for (const match of text.matchAll(new RegExp(`\\b${name}\\s*\\(`, "g"))) {
        if (/(?:const|let)\s+$/.test(text.slice(0, match.index))) continue;
        const [easing, tokens] = describe(name);
        record(match.index, "direct", easing, tokens);
      }
    }
  }

  const unique = new Map(
    entries.map((entry) => [[entry.file, entry.line, entry.helper, entry.easing].join(SEPARATOR), entry]),
  );
  const listed = [...unique.values()].sort((a, b) => (a.file === b.file ? a.line - b.line : a.file < b.file ? -1 : 1));
  for (const entry of listed) {
    const where = `${entry.file}:${entry.line}`.padEnd(28);
    console.log(`${where} ${entry.helper.padEnd(12)} ${entry.easing.padEnd(46)} ${entry.code}`);
  }

  if (args.storyboard === undefined) return 0;

  // Only the easing table's rows are citations. The storyboard template also asks for a determinism table and a
  // truthfulness table, and those legitimately carry `File.tsx:12` references in their own columns, which this used
  // to read as easing citations and fail as uncited. Tables are contiguous runs of pipe rows, and the easing one is
  // the one whose header names Easing. A storyboard with no such header falls back to every row, as before.
  const lines = readFileSync(args.storyboard, "utf8").split(LINE_BREAK);
  const tables = [];
  let block = [];
  for (const line of lines) {
    if (line.replace(/^\s+/, "").startsWith("|")) block.push(line);
    else if (block.length) {
      tables.push(block);
      block = [];
    }
  }
  if (block.length) tables.push(block);
  const easingTables = tables.filter((table) => /\beasing\b/i.test(table[0]));
  const rows = (easingTables.length ? easingTables : tables).flat();
  const cite = /([\w./-]+\.tsx?)(?::(\d+)(?:\s*-\s*(\d+))?|#(\w+))/g;
  const failures = [];
  const covered = new Set();
  for (const row of rows) {
    for (const [, file, start, end, symbol] of row.matchAll(cite)) {
      const low = Number(start);
      const high = Number(end ?? start);
      const cited = symbol
        ? listed.filter((entry) => entry.file.endsWith(file) && entry.owner === symbol)
        : listed.filter((entry) => entry.file.endsWith(file) && low <= entry.line && entry.line <= high);
      const shown = symbol ? `${file}#${symbol}` : `${file}:${start}${end ? `-${end}` : ""}`;
      if (!cited.length) failures.push(`cites ${shown} but no motion call is there`);
      for (const entry of cited) {
        covered.add([entry.file, entry.line].join(SEPARATOR));
        if (!entry.tokens.some((token) => norm(row).includes(norm(token)))) {
          const shown = sliceChars(row.trim(), 110);
          failures.push(`${entry.file}:${entry.line} applies ${entry.easing} but its row does not name it: ${shown}`);
        }
      }
    }
  }
  for (const entry of listed) {
    if (!covered.has([entry.file, entry.line].join(SEPARATOR))) {
      failures.push(`${entry.file}:${entry.line} (${entry.easing}) is cited by no storyboard row: ${entry.code}`);
    }
  }

  console.log();
  if (failures.length) {
    console.log(`storyboard check FAILED (${failures.length}):`);
    for (const failure of failures) console.log(`  ${failure}`);
    return 1;
  }
  console.log(
    `storyboard check passed: ${listed.length} motion calls, every one cited with the easing the code applies`,
  );
  return 0;
});
