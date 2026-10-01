// Checks that a release moved the things a release has to move together.
//
// An installed copy only updates when `plugin.json`'s version changes, so shipping a fix without a bump means
// nobody's install ever sees it. The repo's own README says that, and nothing enforced it. The CHANGELOG is the
// other half: a bumped version with no entry is a release nobody can read.
import { readFileSync } from "node:fs";

const problems = [];
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const plugin = JSON.parse(read("plugin/.claude-plugin/plugin.json"));
const marketplace = JSON.parse(read(".claude-plugin/marketplace.json"));
const changelog = read("CHANGELOG.md");

const headings = [...changelog.matchAll(/^## (\S+)/gm)].map((m) => m[1]);
if (headings[0] !== plugin.version) {
  problems.push(
    `plugin.json is ${plugin.version} but the newest CHANGELOG entry is ${headings[0] ?? "(none)"}. ` +
      "Bump one or write the other: an install only updates when the version changes.",
  );
}
if (headings.filter((v) => v === plugin.version).length > 1) {
  problems.push(`CHANGELOG has more than one ## ${plugin.version} entry.`);
}

for (const [what, value] of [
  ["marketplace description", marketplace.description],
  ["plugin description", plugin.description],
]) {
  if (!value || value.length < 40) problems.push(`The ${what} is missing or too short to say anything.`);
}

// A marketplace entry's own description replaces plugin.json's in the plugin listing and in `claude plugin details`,
// and it sits in a file a release does not touch, so it drifts. Leaving it out shows plugin.json's.
const entry = marketplace.plugins.find((p) => p.name === plugin.name);
if (!entry) problems.push(`marketplace.json lists no plugin named ${plugin.name}.`);
else if (entry.description !== undefined && entry.description !== plugin.description) {
  problems.push(
    "The marketplace entry's description differs from plugin.json's, and the listing shows the entry's. " +
      "Delete it from marketplace.json so plugin.json's shows, or make the two identical.",
  );
}

for (const problem of problems) console.log(`FAIL  ${problem}`);
if (problems.length) process.exit(1);
console.log(`ok  ${plugin.name} ${plugin.version}, CHANGELOG and the plugin listing's description agree`);
