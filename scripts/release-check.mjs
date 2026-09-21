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

// The marketplace entry is what plugin search shows, and it is easy to leave behind because it sits in a different
// file from the one a release touches.
const entry = marketplace.plugins.find((p) => p.name === plugin.name);
if (!entry) problems.push(`marketplace.json lists no plugin named ${plugin.name}.`);
for (const [what, value] of [
  ["marketplace description", marketplace.description],
  ["plugin entry description", entry?.description],
  ["plugin description", plugin.description],
]) {
  if (!value || value.length < 40) problems.push(`The ${what} is missing or too short to say anything.`);
}

for (const problem of problems) console.log(`FAIL  ${problem}`);
if (problems.length) process.exit(1);
console.log(`ok  ${plugin.name} ${plugin.version}, CHANGELOG and both descriptions agree`);
