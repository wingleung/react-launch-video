// release-check reads the manifests beside itself, so each case is a throwaway tree holding a copy of the script.
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { after, describe, test } from "node:test";

const script = fileURLToPath(new URL("../../scripts/release-check.mjs", import.meta.url));
const trees = [];
const DESCRIPTION = "Launch videos of React apps from their real components. CLIs too. Not for Vue or Svelte.";

/** Run release-check over a tree whose marketplace entry carries `entry` as its description, or none when undefined. */
function check(entry) {
  const tree = mkdtempSync(join(tmpdir(), "release-check-"));
  trees.push(tree);
  for (const dir of ["scripts", "plugin/.claude-plugin", ".claude-plugin"])
    mkdirSync(join(tree, dir), { recursive: true });
  copyFileSync(script, join(tree, "scripts", "release-check.mjs"));
  const plugin = { name: "relay-reel", version: "1.2.0", description: DESCRIPTION };
  writeFileSync(join(tree, "plugin/.claude-plugin/plugin.json"), JSON.stringify(plugin));
  const marketplace = {
    name: "relay-reel",
    description: "Reels of the Relay app, rendered from its real components, with quality gates.",
    plugins: [{ name: "relay-reel", source: "./plugin", ...(entry === undefined ? {} : { description: entry }) }],
  };
  writeFileSync(join(tree, ".claude-plugin/marketplace.json"), JSON.stringify(marketplace));
  writeFileSync(join(tree, "CHANGELOG.md"), "# Changelog\n\n## 1.2.0\n\n- A release.\n");
  const result = spawnSync(process.execPath, [join(tree, "scripts", "release-check.mjs")], { encoding: "utf8" });
  return { stdout: result.stdout, status: result.status };
}

after(() => {
  for (const tree of trees) rmSync(tree, { recursive: true, force: true });
});

describe("release-check", () => {
  // The marketplace entry's description replaces plugin.json's in the plugin listing, so a shorter one silently
  // dropped the scope the plugin.json description states.
  test("fails a marketplace entry whose description differs from plugin.json's", () => {
    const { stdout, status } = check("Launch videos of React apps from their real components.");
    assert.equal(status, 1);
    assert.match(stdout, /marketplace entry's description differs from plugin\.json's/);
  });

  test("passes an entry with no description of its own, or the same one", () => {
    assert.equal(check(undefined).status, 0);
    assert.equal(check(DESCRIPTION).status, 0);
  });
});
