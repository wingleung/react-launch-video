import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { multiSelect } from "../src/ui/select.js";
import { theme } from "../src/ui/theme.js";

const cli = fileURLToPath(new URL("../src/cli.js", import.meta.url));
const run = (args, input = "") => execFileSync("node", [cli, ...args], { input, encoding: "utf8" });
const ESC = String.fromCharCode(27);

test("help lists the sync command", () => {
  assert.match(run(["--help"]), /relay sync {6}Compare local drafts/);
});

test("sync prints a summary of what it pushed", () => {
  const output = run(["sync"]);
  assert.match(output, /3 local changes are not on the server yet/);
  assert.match(output, /REL-131 Retry button on failed uploads pushed/);
});

test("the unselected colour is the light grey unless a caller detected a dark background", () => {
  // What `sync` gets: it never passes hasDarkBackground, so the prompt renders the readable light variant.
  assert.ok(theme(false).unselected("x").startsWith(`${ESC}[38;5;252m`));
  assert.ok(theme(true).unselected("x").startsWith(`${ESC}[38;5;235m`));
});

test("multiSelect keeps every option when there is no terminal to prompt on", async () => {
  const options = ["a", "b"];
  assert.deepEqual(await multiSelect("Choose", options, { showHelp: false }), options);
});
