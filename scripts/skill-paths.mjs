// Resolve every ${CLAUDE_SKILL_DIR} path the skills spell out, and check the file is really there.
//
// Claude Code substitutes ${CLAUDE_SKILL_DIR} in a SKILL.md body with that skill's own directory when the skill
// loads, which is how the review skill reaches the create skill's references and scripts next door. The traversal
// is ordinary path arithmetic, so renaming a reference file leaves the pointer behind with nothing to say so: the
// skill simply tells the agent to read a file that is not there, at the one moment nobody is watching.
//
// This runs against plugin/skills, whose layout is what ships: the marketplace entry installs plugin/ as the
// plugin root, so plugin/skills/review is skills/review in an installed copy and the arithmetic is identical.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, normalize, relative } from "node:path";

const root = "plugin/skills";
const REFERENCE = /\$\{CLAUDE_SKILL_DIR\}(\/[^\s`)'"]*)/g;
// A script named without the variable in front of it. Every invocation has to be absolute, because the directory a
// gate runs in is the reel package and `scripts/` only exists under the skill. This is what shipped for months: six
// commands in step 6 that had no working directory from which they could run.
const BARE = /(?<!\$\{CLAUDE_SKILL_DIR\})(?<![\w/.])(?:\.\.\/)?scripts\/[\w-]+\.mjs/g;

let checked = 0;
const broken = [];
for (const skill of readdirSync(root).sort()) {
  const directory = join(root, skill);
  const manifest = join(directory, "SKILL.md");
  if (!existsSync(manifest)) continue;
  const text = readFileSync(manifest, "utf8");
  for (const found of text.matchAll(BARE)) {
    const line = text.slice(0, found.index).split("\n").length;
    broken.push(`${manifest}:${line}  ${found[0]} is named without \${CLAUDE_SKILL_DIR} in front of it`);
  }
  const seen = new Set();
  for (const [, path] of text.matchAll(REFERENCE)) {
    // a trailing slash means a directory the skill points at rather than one file
    const target = normalize(join(directory, path));
    if (seen.has(target)) continue;
    seen.add(target);
    checked++;
    if (!existsSync(target)) broken.push(`${manifest}  \${CLAUDE_SKILL_DIR}${path}  ->  ${relative(".", target)}`);
  }
}

if (broken.length) {
  for (const one of broken) console.log(`FAIL  ${one}`);
  console.log(`\n${broken.length} skill path problem${broken.length > 1 ? "s" : ""}, of ${checked} checked.`);
  process.exit(1);
}
console.log(`skill paths passed: ${checked} references across skills resolve`);
