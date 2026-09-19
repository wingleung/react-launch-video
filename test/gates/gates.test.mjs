// What the gate scripts print, pinned. These ran for months with no tests, and two defects survived that way: the
// bottom edge was never scanned, and nothing would have caught a JSON timestamp losing its ".0".
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

const root = fileURLToPath(new URL("../../", import.meta.url));
const create = join(root, "plugin/skills/create/scripts");
const review = join(root, "plugin/skills/review/scripts");
const demo = join(root, "docs/demo-relay-web.mp4");

let clips;

/** Run a gate and return its stdout and exit code rather than throwing, since a failing gate is the thing under test. */
function gate(script, args, input) {
  try {
    const stdout = execFileSync("node", [script, ...args], { encoding: "utf8", input, maxBuffer: 64 * 1024 * 1024 });
    return { stdout, status: 0 };
  } catch (error) {
    return { stdout: error.stdout ?? "", status: error.status };
  }
}

const ffmpeg = (...args) => execFileSync("ffmpeg", ["-loglevel", "error", "-y", ...args]);

before(() => {
  clips = mkdtempSync(join(tmpdir(), "gate-clips-"));
  const size = "s=1920x1080:r=60";
  // a bar 9px in from every edge, which is inside the 3.5% action-safe margin
  ffmpeg(
    "-f",
    "lavfi",
    "-i",
    `color=c=black:${size}:d=3`,
    "-vf",
    "drawbox=x=9:y=9:w=1902:h=1062:color=white:t=3",
    "-pix_fmt",
    "yuv420p",
    join(clips, "border.mp4"),
  );
  ffmpeg("-f", "lavfi", "-i", "sine=frequency=440:duration=6", "-c:a", "aac", join(clips, "tone.m4a"));
  // bright, then two seconds of nothing, then bright again: a handoff that empties the stage
  ffmpeg(
    "-f",
    "lavfi",
    "-i",
    `color=c=white:${size}:d=2`,
    "-f",
    "lavfi",
    "-i",
    `color=c=black:${size}:d=2`,
    "-f",
    "lavfi",
    "-i",
    `color=c=white:${size}:d=2`,
    "-filter_complex",
    "[0][1][2]concat=n=3:v=1",
    "-pix_fmt",
    "yuv420p",
    join(clips, "empty.mp4"),
  );
});

after(() => rmSync(clips, { recursive: true, force: true }));

describe("check-video", () => {
  test("passes a real reel on every gate", () => {
    const { stdout, status } = gate(join(create, "check-video.mjs"), [demo]);
    assert.equal(status, 0);
    assert.equal(
      stdout,
      "ok    resolution 1920x1080\n" +
        "ok    duration 15 to 30s (is 21.37s)\n" +
        "ok    opens from black\n" +
        "ok    ends on black\n" +
        "ok    no near-empty stage mid-reel\n",
    );
  });

  test("reports the times of a stage that empties mid-reel", () => {
    const { stdout, status } = gate(join(create, "check-video.mjs"), [
      "--min",
      "1",
      "--max",
      "10",
      join(clips, "empty.mp4"),
    ]);
    assert.equal(status, 1);
    assert.match(stdout, /^FAIL {2}no near-empty stage mid-reel \(FOUND 2\.00s to 4\.00s\)$/m);
    assert.match(stdout, /^FAIL {2}opens from black$/m);
  });

  test("gates a vertical cut against its own frame size", () => {
    const portrait = join(clips, "portrait.mp4");
    ffmpeg("-t", "2", "-i", demo, "-vf", "crop=864:1080:528:0", "-pix_fmt", "yuv420p", portrait);
    const sized = gate(join(create, "check-video.mjs"), [
      "--width",
      "864",
      "--height",
      "1080",
      "--min",
      "1",
      "--max",
      "10",
      portrait,
    ]);
    assert.match(sized.stdout, /^ok {4}resolution 864x1080$/m);
    // and the same file fails the default 16:9 gate, which is the bug this option fixes
    const unsized = gate(join(create, "check-video.mjs"), ["--min", "1", "--max", "10", portrait]);
    assert.equal(unsized.status, 1);
    assert.match(unsized.stdout, /^FAIL {2}resolution 1920x1080$/m);
  });

  test("formats the duration bounds the way %g does", () => {
    const { stdout } = gate(join(create, "check-video.mjs"), ["--min", "17.5", "--max", "1234567", demo]);
    assert.match(stdout, /duration 17\.5 to 1\.23457e\+06s \(is 21\.37s\)/);
  });
});

describe("edge-scan", () => {
  test("reports content crossing the edge without failing the run", () => {
    const { stdout, status } = gate(join(create, "edge-scan.mjs"), [demo]);
    assert.equal(status, 0);
    assert.match(stdout, /1920x1080, 21\.37s, sampled every 0\.2s, action safe is 67px left and right, 38px top/);
    assert.equal(stdout.match(/CROSSES/g).length, 2);
  });

  test("scans all four edges, the bottom one included", () => {
    const { stdout, status } = gate(join(create, "edge-scan.mjs"), [join(clips, "border.mp4")]);
    assert.equal(status, 1);
    for (const edge of ["left", "right", "top", "bottom"]) {
      assert.match(stdout, new RegExp(`TIGHT {4}${edge}\\s`), `${edge} edge was not reported`);
    }
  });

  test("keeps a whole-number timestamp a float in JSON", () => {
    const { stdout } = gate(join(create, "edge-scan.mjs"), ["--json", join(clips, "border.mp4")]);
    const parsed = JSON.parse(stdout);
    assert.deepEqual(parsed.safe, { x: 67, y: 38 });
    assert.equal(parsed.findings.length, 4);
    assert.match(stdout, /"from": 0\.0,/);
    assert.match(stdout, /"to": 3\.0,/);
  });

  test("stops reporting a range that has been looked at and allowed", () => {
    const border = join(clips, "border.mp4");
    assert.equal(gate(join(create, "edge-scan.mjs"), [border]).status, 1);
    const all = "left:0-3.1,right:0-3.1,top:0-3.1,bottom:0-3.1";
    const allowed = gate(join(create, "edge-scan.mjs"), ["--accept", all, border]);
    assert.equal(allowed.status, 0);
    assert.equal(allowed.stdout.match(/ALLOWED/g).length, 4);
    // accepting one edge must not excuse the others
    assert.equal(gate(join(create, "edge-scan.mjs"), ["--accept", "left:0-3.1", border]).status, 1);
    // nor a range that does not cover the finding
    assert.equal(gate(join(create, "edge-scan.mjs"), ["--accept", "top:9-10", border]).status, 1);
  });

  test("prints a whole-number sampling interval as a float", () => {
    const { stdout } = gate(join(create, "edge-scan.mjs"), ["--every", "1.0", demo]);
    assert.match(stdout, /sampled every 1\.0s/); // the interval prints as a float, so "1.0" and never "1"
  });
});

describe("easing-inventory", () => {
  test("passes the kit against its own storyboard", () => {
    const { stdout, status } = gate(join(create, "easing-inventory.mjs"), [
      join(root, "plugin/skills/create/assets/kit"),
      "--storyboard",
      join(root, "plugin/skills/create/references/storyboard.md"),
    ]);
    assert.equal(status, 0);
    assert.match(stdout, /storyboard check passed: 22 motion calls/);
  });

  test("accepts a citation by symbol, so an edit elsewhere does not invalidate the storyboard", () => {
    const src = join(clips, "src");
    mkdirSync(src, { recursive: true });
    writeFileSync(
      join(src, "motion.ts"),
      'import { Easing, interpolate } from "remotion";\n' +
        "export const emphasizedIn = Easing.bezier(0.05, 0.7, 0.1, 1);\n" +
        "export function tween(frame: number, range: number[], to: number[], easing = emphasizedIn) {\n" +
        "  return interpolate(frame, range, to, { easing });\n}\n",
    );
    writeFileSync(
      join(src, "Panel.tsx"),
      'import { emphasizedIn, tween } from "./motion";\n' +
        "export const Panel = ({ frame }: { frame: number }) => {\n" +
        "  const slide = tween(frame, [0, 30], [0, 1], emphasizedIn);\n  return slide;\n};\n",
    );
    const board = join(clips, "board.md");
    const row = (cite) =>
      `| Beat | Code | Easing |\n| --- | --- | --- |\n| Slide | \`${cite}\` | emphasizedIn \`0.05, 0.7, 0.1, 1\` |\n`;

    writeFileSync(board, row("Panel.tsx#slide"));
    assert.equal(gate(join(create, "easing-inventory.mjs"), [src, "--storyboard", board]).status, 0);

    // the line form still works, so existing storyboards keep passing
    writeFileSync(board, row("Panel.tsx:3"));
    assert.equal(gate(join(create, "easing-inventory.mjs"), [src, "--storyboard", board]).status, 0);

    writeFileSync(board, row("Panel.tsx#nosuch"));
    const missing = gate(join(create, "easing-inventory.mjs"), [src, "--storyboard", board]);
    assert.equal(missing.status, 1);
    assert.match(missing.stdout, /cites Panel\.tsx#nosuch but no motion call is there/);
  });

  test("fails a reel whose motion is not in its storyboard", () => {
    const { stdout, status } = gate(join(create, "easing-inventory.mjs"), [
      join(root, "evals/fixtures/flawed-reel/src"),
      "--storyboard",
      join(root, "evals/fixtures/flawed-reel/storyboard.md"),
    ]);
    assert.equal(status, 1);
    assert.match(stdout, /storyboard check FAILED \(4\)/);
    assert.match(stdout, /is cited by no storyboard row/);
  });
});

describe("add-music", () => {
  test("adds a track without re-encoding a single video frame", () => {
    const silent = join(clips, "silent.mp4");
    const scored = join(clips, "scored.mp4");
    ffmpeg("-t", "4", "-i", demo, "-c:v", "copy", silent);
    const { status } = gate(join(create, "add-music.mjs"), [
      silent,
      join(clips, "tone.m4a"),
      scored,
      "--fade-out",
      "1",
    ]);
    assert.equal(status, 0);
    const videoHash = (file) =>
      execFileSync("ffmpeg", ["-loglevel", "error", "-i", file, "-map", "0:v", "-f", "md5", "-"], { encoding: "utf8" });
    assert.equal(videoHash(scored), videoHash(silent), "the video stream was re-encoded");
    const audio = execFileSync(
      "ffprobe",
      ["-v", "error", "-select_streams", "a", "-show_entries", "stream=codec_name", "-of", "csv=p=0", scored],
      { encoding: "utf8" },
    ).trim();
    assert.equal(audio, "aac");
  });
});

describe("contact-sheet", () => {
  test("tiles six frames into one half-scale sheet", () => {
    const out = join(clips, "sheet.jpeg");
    const { stdout, status } = gate(join(create, "contact-sheet.mjs"), [
      demo,
      out,
      "100",
      "300",
      "500",
      "700",
      "900",
      "1100",
    ]);
    assert.equal(status, 0);
    assert.equal(stdout.trim(), out);
    const size = execFileSync(
      "ffprobe",
      ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", out],
      { encoding: "utf8" },
    ).trim();
    assert.equal(size, "1920,1620");
  });

  test("refuses a frame count it cannot tile", () => {
    const { status } = gate(join(create, "contact-sheet.mjs"), [demo, "out.jpeg", "1", "2", "3"]);
    assert.equal(status, 1);
  });
});

describe("reading-time", () => {
  test("marks a hold that is too short and one that is merely tight", () => {
    const { stdout, status } = gate(
      join(review, "reading-time.mjs"),
      [],
      "1.2\tCommand palette Search by name\n9.0\tPlenty\n",
    );
    assert.equal(status, 1);
    assert.equal(
      stdout,
      "  held  needs  status  chars  text\n" +
        "  1.20   2.26  SHORT      30  Command palette Search by name\n" +
        "  9.00   0.85  ok          6  Plenty\n",
    );
  });

  test("counts an emoji as one character", () => {
    const { stdout } = gate(join(review, "reading-time.mjs"), [], "1.0\tRetry 🚀 uploads\n");
    assert.match(stdout, /^ {2}1\.00 {3}1\.38 {2}SHORT {6}15 {2}Retry 🚀 uploads$/m);
  });
});

describe("doctor", () => {
  test("finds the filters the gates need", () => {
    const { stdout, status } = gate(join(create, "doctor.mjs"), []);
    assert.equal(status, 0, stdout);
    for (const filter of ["xstack", "signalstats", "sobel"]) {
      assert.match(stdout, new RegExp(`ok {4}ffmpeg filter ${filter}:`));
    }
    assert.match(stdout, /\nReady\.\n$/);
  });
});
