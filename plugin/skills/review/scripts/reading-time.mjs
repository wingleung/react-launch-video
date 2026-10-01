#!/usr/bin/env node
// Check on-screen text holds against reading time.
//
// Reads lines of `hold_seconds<TAB>text` from stdin or a file and prints the required hold for each one:
// characters / 17 + 0.5 seconds, never under 0.8 seconds (Netflix children's reading speed plus a settle margin, see
// react-launch-video create skill, references/pacing.md).
//
// Put every character visible in the block into `text`, chapter numbers and labels included, joined with spaces. The
// hold is from the moment the whole block is readable to the moment its exit starts. Holds with less than 0.2s of
// margin are reported as TIGHT.
//
//     printf '1.2\tCommand palette Search by name, hostname or group\n' | node reading-time.mjs
import { readFileSync } from "node:fs";
import { charCount, fixed } from "../../create/scripts/lib/fmt.mjs";
import { main } from "../../create/scripts/lib/run.mjs";

const CHARS_PER_SECOND = 17;
const SETTLE = 0.5;
const MINIMUM = 0.8;
const TIGHT = 0.2;

const required = (text) => Math.max(MINIMUM, charCount(text) / CHARS_PER_SECOND + SETTLE);

main("reading-time", () => {
  const path = process.argv[2];
  // Fold CRLF first, so a Windows file does not count its carriage returns as characters.
  const source = readFileSync(path === undefined ? 0 : path, "utf8").replace(/\r\n/g, "\n");
  let failures = 0;
  let rows = 0;
  console.log(`${"held".padStart(6)} ${"needs".padStart(6)}  status  chars  text`);
  for (const line of source.split("\n")) {
    if (!line.trim()) continue;
    const tab = line.indexOf("\t");
    const held = tab === -1 ? line : line.slice(0, tab);
    const text = tab === -1 ? "" : line.slice(tab + 1);
    const hold = Number(held.trim());
    if (held.trim() === "" || Number.isNaN(hold)) throw new Error(`not a number of seconds: ${held}`);
    const need = required(text);
    const ok = hold >= need;
    rows += 1;
    if (!ok) failures += 1;
    const status = !ok ? "SHORT" : hold < need + TIGHT ? "TIGHT" : "ok";
    const chars = String(charCount(text)).padStart(5);
    console.log(`${fixed(hold, 2).padStart(6)} ${fixed(need, 2).padStart(6)}  ${status.padEnd(6)}  ${chars}  ${text}`);
  }
  // Handed nothing, this has checked nothing, and an empty table above an exit code of 0 reads exactly like a pass.
  // That is the shape of silent success: the caller believes every hold was verified when none was.
  if (!rows) {
    console.error("reading-time: no `seconds<TAB>text` rows were given, so nothing was checked");
    return 1;
  }
  return failures ? 1 : 0;
});
