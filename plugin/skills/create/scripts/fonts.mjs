#!/usr/bin/env node
// List every font a reel loads and where it comes from, and check a storyboard's truthfulness table against that.
//
//     node fonts.mjs src/                          prints each font with its source and the line that loads it
//     node fonts.mjs src/ --storyboard story.md    also checks the storyboard names every family the code loads
//
// A reel may take fonts from the product's own files, from a licensed package such as @fontsource, or from a font
// the product itself serves. It may not take them from the machine's font folders, and it may not fetch them over
// the network while rendering: both make the render depend on something the repo does not contain, and the first is
// usually a licence breach as well. Exits 1 on either, and on a family the storyboard does not account for.
//
// It also fails a family that is named in a font-family stack but never loaded. That one renders perfectly, in the
// fallback, and a whole reel in the wrong typeface looks plausible until someone who knows the brand sees it.
//
// This exists because the font rule was one clause in the middle of a sentence in SKILL.md, with no gate behind it,
// and two eval rounds could not tell whether a finished reel had obeyed it.
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { parse } from "./lib/cli.mjs";
import { mark } from "./lib/report.mjs";
import { main } from "./lib/run.mjs";

const SPEC = {
  positionals: ["src"],
  options: [
    { flag: "--storyboard", dest: "storyboard", metavar: "STORYBOARD", default: undefined },
    { flag: "--strict", dest: "strict", store: true, default: false, help: "loading no font at all is a failure" },
  ],
};

const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".css", ".html"];
// Where a machine keeps its own fonts. A reel that reads one of these renders differently on someone else's laptop.
const SYSTEM = [
  /\/System\/Library\/Fonts/i,
  /\/Library\/Fonts/i,
  /[A-Z]:\\+Windows\\+Fonts/i,
  /\/Windows\/Fonts/i,
  /\/usr\/share\/fonts/i,
  /~\/\.fonts|\/\.local\/share\/fonts/i,
  /\/Applications\/[^"')]*\.app\//i,
];
// Font hosts. Fetching from one at render time makes the render depend on the network being up and unchanged.
const REMOTE = /fonts\.googleapis\.com|fonts\.gstatic\.com|fonts\.bunny\.net|use\.typekit\.net|fonts\.cdnfonts\.com/i;
// A stack may always fall back to whatever the machine has; it may not NAME a typeface it never loads.
const GENERIC = new Set([
  "sans-serif",
  "serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
  "ui-rounded",
  "inherit",
  "initial",
  "unset",
  "revert",
  "emoji",
  "math",
  "fangsong",
  "-apple-system",
  "blinkmacsystemfont",
  "segoe ui",
  "roboto",
  "helvetica neue",
  "helvetica",
  "arial",
  "apple color emoji",
  "segoe ui emoji",
  "segoe ui symbol",
  "noto color emoji",
]);

/** Families a stylesheet asks for by name, which something then has to load. */
function requested(file, text) {
  const rows = [];
  for (const found of text.matchAll(/font-family\s*:\s*([^;}\n]+)/gi)) {
    for (const part of found[1].split(",")) {
      const name = part.trim().replace(/^["']|["']$/g, "");
      const key = name.toLowerCase();
      if (!name || GENERIC.has(key) || key.startsWith("var(") || name.includes("$")) continue;
      rows.push({ file, line: lineOf(text, found.index), family: name, key });
    }
  }
  return rows;
}

/** Every source file a font could be loaded from, ordered so the report is stable on every machine. */
function sources(root) {
  const found = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const full = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules") walk(full);
      } else if (EXTENSIONS.some((extension) => entry.name.endsWith(extension))) {
        found.push(full);
      }
    }
  };
  walk(root);
  return found.sort();
}

const lineOf = (text, index) => text.slice(0, index).split("\n").length;

/** Turn a package specifier or file path into the family it most likely provides. */
function family(reference) {
  const fontsource = /@fontsource(?:-variable)?\/([^/"'`]+)/.exec(reference);
  if (fontsource) return fontsource[1].replace(/-/g, " ");
  const file = /([^/\\"']+)\.(?:woff2?|ttf|ttc|otf|otc|eot|pfb)/i.exec(reference);
  if (file) return file[1].replace(/[-_](?:variable|regular|\d+|italic|normal).*$/i, "").replace(/[-_]/g, " ");
  const query = /family=([^&"')]+)/.exec(reference);
  if (query) return decodeURIComponent(query[1].split(":")[0]).replace(/\+/g, " ");
  return reference;
}

/**
 * Every font reference in one file: package imports, @font-face sources, stylesheet links and the file paths handed
 * to @remotion/fonts. Each becomes one row with the origin it implies.
 */
function references(file, text) {
  const rows = [];
  const add = (reference, index, origin) =>
    rows.push({ file, line: lineOf(text, index), reference, origin, family: family(reference) });

  for (const found of text.matchAll(/@fontsource(?:-variable)?\/[^"'`\s]+/g)) add(found[0], found.index, "package");
  for (const found of text.matchAll(/url\(\s*["']?([^"')]+\.(?:woff2?|ttf|ttc|otf|otc|eot|pfb)[^"')]*)["']?\s*\)/gi)) {
    add(found[1], found.index, origin(found[1]));
  }
  // staticFile("fonts/Inter.woff2") and loadFont({ src: ... }), which is how a product's own files reach a render
  for (const found of text.matchAll(/staticFile\(\s*["'`]([^"'`]+)["'`]\s*\)/g)) {
    if (/\.(woff2?|ttf|ttc|otf|otc|eot|pfb)$/i.test(found[1])) add(found[1], found.index, origin(found[1]));
  }
  for (const found of text.matchAll(/<link[^>]+href=["']([^"']+)["'][^>]*>/gi)) {
    if (REMOTE.test(found[1]) || /fonts?/i.test(found[1])) add(found[1], found.index, origin(found[1]));
  }
  return rows;
}

/** Where a reference comes from, which is the whole judgement this gate makes. */
function origin(reference) {
  if (SYSTEM.some((pattern) => pattern.test(reference))) return "system";
  if (REMOTE.test(reference) || /^https?:\/\//i.test(reference)) return "network";
  if (/@fontsource/.test(reference)) return "package";
  return "product";
}

const EXPLAIN = {
  product: "the product's own files",
  package: "a licensed package",
  system: "the machine's font folder, which the repo does not contain and the licence rarely allows",
  network: "fetched at render time, so the render depends on a server staying up and unchanged",
};

main("fonts", () => {
  const args = parse("fonts.mjs", SPEC, process.argv.slice(2));
  const files = sources(args.src).map((file) => [file, readFileSync(file, "utf8")]);
  const rows = files.flatMap(([file, text]) => references(file, text));
  const asked = files.flatMap(([file, text]) => requested(file, text));

  const failures = [];
  const seen = new Map();
  for (const row of rows) {
    const where = `${relative(process.cwd(), row.file)}:${row.line}`;
    const ok = row.origin === "product" || row.origin === "package";
    console.log(`${mark(ok)}  ${where}  ${row.family}  (${EXPLAIN[row.origin]})`);
    if (!ok)
      failures.push(`${where} loads ${row.family} from ${row.origin === "system" ? "a font folder" : "the network"}`);
    if (!seen.has(row.family.toLowerCase())) seen.set(row.family.toLowerCase(), row);
  }

  // A named family nothing loads renders in the fallback and looks fine, which is why it needs a gate and not an eye.
  const loaded = new Set([...seen.keys()]);
  const already = new Set();
  for (const ask of asked) {
    if (already.has(ask.key)) continue;
    already.add(ask.key);
    const has = [...loaded].some((name) => name.includes(ask.key) || ask.key.includes(name));
    const where = `${relative(process.cwd(), ask.file)}:${ask.line}`;
    console.log(`${mark(has)}  ${where}  ${ask.family} is asked for`);
    if (!has)
      failures.push(`${where} asks for ${ask.family} but nothing loads it, so the reel renders in the fallback`);
  }

  if (!rows.length && !asked.length) {
    // A reel that loads nothing renders in whatever the browser has, which is the failure this gate is named for.
    // It is a warning on its own so the kit itself can pass, and a failure under --strict, which is how the runner
    // invokes it: by then a real reel is being checked and "no typography at all" is not a pass.
    const message = "no font is named or loaded anywhere, so the reel renders in the browser's default";
    console.log(`${mark(!args.strict)}  ${message}`);
    if (args.strict) failures.push(message);
  }

  if (args.storyboard) {
    const prose = readFileSync(args.storyboard, "utf8").toLowerCase();
    for (const [key, row] of seen) {
      const named = prose.includes(key) || key.split(" ").every((word) => prose.includes(word));
      console.log(`${mark(named)}  storyboard names ${row.family}`);
      if (!named) failures.push(`the storyboard does not say where ${row.family} comes from`);
    }
  }

  if (failures.length) {
    console.log(`\n${failures.length} problem${failures.length > 1 ? "s" : ""}:`);
    for (const failure of failures) console.log(`  ${failure}`);
    return 1;
  }
  console.log(`\nfonts check passed: ${seen.size} famil${seen.size === 1 ? "y" : "ies"}, every one from the repo`);
  return 0;
});
