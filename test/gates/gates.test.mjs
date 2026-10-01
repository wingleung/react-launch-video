// What the gate scripts print, pinned. These ran for months with no tests, and two defects survived that way: the
// bottom edge was never scanned, and nothing would have caught a JSON timestamp losing its ".0".
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { stripsTypes } from "../../plugin/skills/create/scripts/lib/run.mjs";
import { blurFilter } from "../../plugin/skills/create/scripts/render-motion-blur.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const create = join(root, "plugin/skills/create/scripts");
const review = join(root, "plugin/skills/review/scripts");
const demo = join(root, "docs/demo-relay-web.mp4");

let clips;

/** Run a gate and return its output and exit code rather than throwing, since a failing gate is the thing under test. */
function gate(script, args, input, cwd, env) {
  const result = spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8",
    input,
    cwd,
    env,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  return { stdout: result.stdout, stderr: result.stderr, status: result.status };
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

  test("catches a short dip when it is deep, which a flat run length let through", () => {
    const blink = join(clips, "blink.mp4");
    const size = "s=1920x1080:r=60";
    // bright, five frames of near black, bright again: too short for the old six-frame rule, dark enough to see
    ffmpeg(
      "-f",
      "lavfi",
      "-i",
      `color=c=white:${size}:d=2`,
      "-f",
      "lavfi",
      "-i",
      `color=c=0x0a0a0a:${size}:d=0.083`,
      "-f",
      "lavfi",
      "-i",
      `color=c=white:${size}:d=2`,
      "-filter_complex",
      "[0][1][2]concat=n=3:v=1",
      "-pix_fmt",
      "yuv420p",
      blink,
    );
    const { stdout, status } = gate(join(create, "check-video.mjs"), ["--min", "1", "--max", "10", blink]);
    assert.equal(status, 1);
    assert.match(stdout, /^FAIL {2}no near-empty stage mid-reel \(FOUND 2\.00s to 2\.08s\)$/m);
  });

  // A container is as long as its longest stream, so a score that runs past the last frame used to set the length.
  test("measures the video stream, not a longer audio track muxed beside it", () => {
    const long = join(clips, "long-audio.mp4");
    ffmpeg("-f", "lavfi", "-i", "sine=frequency=440:duration=30", "-c:a", "aac", join(clips, "tone30.m4a"));
    ffmpeg("-i", demo, "-i", join(clips, "tone30.m4a"), "-map", "0:v", "-map", "1:a", "-c", "copy", long);
    const { stdout } = gate(join(create, "check-video.mjs"), [long]);
    assert.match(stdout, /duration 15 to 30s \(is 21\.37s\)/);
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
    assert.match(stdout, /storyboard check passed: 24 motion calls/);
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

  // -shortest stopped at whichever stream ended first, so a short track cut the reel and its end card with it.
  test("keeps every frame when the track is shorter than the reel, and says so", () => {
    const silent = join(clips, "silent-short.mp4");
    const scored = join(clips, "scored-short.mp4");
    ffmpeg("-t", "4", "-i", demo, "-c:v", "copy", silent);
    ffmpeg("-f", "lavfi", "-i", "sine=frequency=440:duration=1.5", "-c:a", "aac", join(clips, "short.m4a"));
    const { stderr, status } = gate(join(create, "add-music.mjs"), [silent, join(clips, "short.m4a"), scored]);
    assert.equal(status, 0, stderr);
    assert.match(stderr, /the track ends at 1\.5\ds, before the reel's last frame at 4\.0\ds/);
    const stream = (file, kind, entry) =>
      execFileSync(
        "ffprobe",
        [
          "-v",
          "error",
          "-count_frames",
          "-select_streams",
          kind,
          "-show_entries",
          `stream=${entry}`,
          "-of",
          "csv=p=0",
        ].concat(file),
        { encoding: "utf8" },
      ).trim();
    assert.equal(stream(scored, "v:0", "nb_read_frames"), stream(silent, "v:0", "nb_read_frames"));
    assert.ok(Number(stream(scored, "a:0", "duration")) >= 3.9, "the audio should be padded to the reel's length");
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

  // An empty table above exit 0 reads exactly like a pass, which is the shape of silent success.
  test("fails when handed nothing rather than reporting an empty pass", () => {
    const { stderr, status } = gate(join(review, "reading-time.mjs"), [], "");
    assert.equal(status, 1);
    assert.match(stderr, /nothing was checked/);
  });
});

describe("claims", () => {
  // A kit small enough to have no dependencies at all, so the gate itself is under test rather than Remotion.
  let kit;

  before(() => {
    kit = join(clips, "claims-kit");
    mkdirSync(kit, { recursive: true });
    writeFileSync(
      join(kit, "timeline.ts"),
      "export const FPS = 60;\n" +
        "export const CUE = { start: 0, endCard: 2 } as const;\n" +
        "export const DURATION_SECONDS = 4;\n",
    );
    writeFileSync(
      join(kit, "curves.ts"),
      "const ramp = (seconds: number) => Math.min(1, Math.max(0, seconds / 2));\n" +
        'export const SIGNALS: Record<string, { unit: "%" | "px"; at: (seconds: number) => number }> = {\n' +
        '  "product opacity": { unit: "%", at: ramp },\n' +
        '  "product blur": { unit: "px", at: (seconds: number) => 10 * ramp(seconds) },\n' +
        "};\n",
    );
  });

  /** Write one comment into the fixture kit and run the gate over it. */
  function claim(comment) {
    writeFileSync(join(kit, "Demo.ts"), `// ${comment}\nexport const demo = 1;\n`);
    return gate(join(create, "claims.mjs"), [kit]);
  }

  test("re-derives a claim from the curves", () => {
    const { stdout, status } = claim("[measured: product opacity at endCard is 100%]");
    assert.equal(status, 0, stdout);
    assert.match(stdout, /ok {2}.*product opacity at endCard is 100% {2}\[100\.00%\]/);
  });

  test("fails a claim the curves no longer support, and says by how much", () => {
    const { stdout, status } = claim("[measured: product opacity at endCard is 15%]");
    assert.equal(status, 1);
    assert.match(stdout, /off by 85\.00, outside the 0\.50 this claim allows/);
  });

  test("checks the extreme over a window and the moment it happens", () => {
    const { stdout, status } = claim("[measured: min product blur over start..endCard is 0px]");
    assert.equal(status, 0, stdout);
    assert.match(stdout, /at 0\.000s/);
  });

  test("finds where a signal crosses a threshold", () => {
    const { stdout, status } = claim("[measured: product opacity crosses 50% after start at 1.017s]");
    assert.equal(status, 0, stdout);
  });

  // The ramp crosses 50% on frame 60 at 60fps and frame 30 at 30fps, both 1.000s. A crossing written one frame late
  // is within the default either way, and two frames late is not, at whichever rate the composition runs.
  test("allows a crossing one frame of the composition's own rate either side", () => {
    const slow = join(clips, "claims-kit-30");
    mkdirSync(slow, { recursive: true });
    writeFileSync(join(slow, "curves.ts"), readFileSync(join(kit, "curves.ts")));
    writeFileSync(join(slow, "timeline.ts"), readFileSync(join(kit, "timeline.ts"), "utf8").replace("60", "30"));
    const at = (dir, seconds) => {
      writeFileSync(join(dir, "Demo.ts"), `// [measured: product opacity crosses 50% after start at ${seconds}s]\n`);
      return gate(join(create, "claims.mjs"), [dir]).status;
    };
    assert.equal(at(slow, "1.033"), 0, "one frame late at 30fps");
    assert.equal(at(slow, "1.067"), 1, "two frames late at 30fps");
    assert.equal(at(kit, "1.017"), 0, "one frame late at 60fps");
    assert.equal(at(kit, "1.033"), 1, "two frames late at 60fps");
  });

  test("rejects a signal the curves do not export, and lists the ones they do", () => {
    const { stdout, status } = claim("[measured: title opacity at endCard is 100%]");
    assert.equal(status, 1);
    assert.match(stdout, /"title opacity" is not a signal \(curves\.ts has product opacity, product blur\)/);
  });

  test("rejects a claim in the wrong unit rather than comparing the numbers", () => {
    const { stdout, status } = claim("[measured: product blur at endCard is 100%]");
    assert.equal(status, 1);
    assert.match(stdout, /"product blur" is measured in px, not %/);
  });

  test("reads a claim inside backticks as an example of the form, not as a claim", () => {
    const { stdout, status } = claim("write one as `[measured: product opacity at endCard is 15%]`");
    assert.equal(status, 0, stdout); // the wrong number in it is an example too, so neither half of the gate fires
    assert.match(stdout, /0 claims/);
  });

  test("fails a figure written beside a signal with no claim behind it", () => {
    const { stdout, status } = claim("the product opacity is 15% here, which nobody has ever checked");
    assert.equal(status, 1);
    assert.match(stdout, /"15%" sits beside a signal's name with no claim and no source/);
  });

  test("lets a tagged threshold and a cited figure through", () => {
    assert.equal(claim("product opacity must stay under 10% [rule]").status, 0);
    assert.equal(claim("product blur over 20px reads as fog [convention]").status, 0);
    assert.equal(claim("product blur peaks at 20px ([source](https://example.com/blur))").status, 0);
  });

  // Peak luma under blur is the case this exists for: it is a real measurement and no curve can re-derive it.
  test("lets a figure read off a render through when it says so", () => {
    assert.equal(claim("product opacity bottomed at 11% of the median [rendered]").status, 0);
    assert.equal(claim("product opacity bottomed at 11% of the median").status, 1);
  });

  test("does not excuse the rest of a block because one figure in it is claimed", () => {
    const { stdout, status } = claim(
      "[measured: product opacity at endCard is 100%] and the product blur is 3px there",
    );
    assert.equal(status, 1);
    assert.match(stdout, /"3px" sits beside a signal's name/);
  });

  test("ignores a figure in prose that is not about brightness or blur", () => {
    assert.equal(claim("the product renders at 880px wide so its own text is larger").status, 0);
  });

  test("prints every signal at every cue, which is where a claim's number comes from", () => {
    const { stdout, status } = gate(join(create, "claims.mjs"), [kit, "--values", "cues"]);
    assert.equal(status, 0, stdout);
    assert.match(stdout, /product opacity {2}0\.0% {8}100\.0%/);
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

describe("doctor", () => {
  // The claim gate needs a newer Node than a render does, so doctor has to say which one this machine is on.
  // Asking the predicate directly is the only way to cover the versions the machine running the tests is not on.
  test("knows which Node versions can import TypeScript", () => {
    for (const version of ["18.20.0", "20.11.1", "22.17.9", "nonsense", ""]) {
      assert.equal(stripsTypes(version), false, version);
    }
    for (const version of ["22.18.0", "22.19.1", "24.0.0", "v26.8.1"]) {
      assert.equal(stripsTypes(version), true, version);
    }
  });

  test("reports the claim gate's Node requirement as its own row", () => {
    const { stdout } = gate(join(create, "doctor.mjs"), []);
    assert.match(stdout, /node 22\.18\+ for the claim gate/);
  });
});

describe("fonts", () => {
  let src;

  before(() => {
    src = join(clips, "fonts-src");
    mkdirSync(src, { recursive: true });
  });

  /** Write one file into the fixture and run the gate over it. */
  function fonts(name, body, args = []) {
    writeFileSync(join(src, name), body);
    const result = gate(join(create, "fonts.mjs"), [src, ...args]);
    rmSync(join(src, name));
    return result;
  }

  test("passes a font from a licensed package", () => {
    const { stdout, status } = fonts("App.tsx", 'import "@fontsource/inter/400.css";\n');
    assert.equal(status, 0, stdout);
    assert.match(stdout, /a licensed package/);
  });

  test("passes a font file the product ships", () => {
    const { status } = fonts("reel.css", '@font-face { src: url("/fonts/Relay-Bold.woff2"); }\n');
    assert.equal(status, 0);
  });

  test("fails a font taken from the machine's font folder", () => {
    const { stdout, status } = fonts("reel.css", '@font-face { src: url("/System/Library/Fonts/Helvetica.ttc"); }\n');
    assert.equal(status, 1);
    assert.match(stdout, /loads Helvetica from a font folder/);
  });

  test("fails a font fetched over the network at render time", () => {
    const { stdout, status } = fonts(
      "index.html",
      '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400" rel="stylesheet">\n',
    );
    assert.equal(status, 1);
    assert.match(stdout, /loads Inter from the network/);
  });

  // The one that renders perfectly and ships wrong, which is why it is a gate and not a review note.
  test("fails a family that is named but never loaded", () => {
    const { stdout, status } = fonts("reel.css", 'body { font-family: "S\u00f6hne", sans-serif; }\n');
    assert.equal(status, 1);
    assert.match(stdout, /asks for S\u00f6hne but nothing loads it/);
  });

  test("lets a stack fall back to whatever the machine has", () => {
    const { status } = fonts("reel.css", "body { font-family: ui-sans-serif, system-ui, sans-serif; }\n");
    assert.equal(status, 0);
  });

  test("checks the storyboard accounts for every family the code loads", () => {
    const story = join(clips, "fonts-story.md");
    writeFileSync(story, "# Storyboard\n\nNothing about type here.\n");
    const missing = fonts("App.tsx", 'import "@fontsource/inter/400.css";\n', ["--storyboard", story]);
    assert.equal(missing.status, 1);
    assert.match(missing.stdout, /the storyboard does not say where inter comes from/);

    writeFileSync(story, "# Storyboard\n\nType is Inter, from @fontsource, SIL Open Font License.\n");
    const named = fonts("App.tsx", 'import "@fontsource/inter/400.css";\n', ["--storyboard", story]);
    assert.equal(named.status, 0, named.stdout);
  });
});

describe("lightness", () => {
  // A reel is a dark stage with the product's own surface on it, so a panel of known grey is the whole fixture.
  function reel(name, grey) {
    const out = join(clips, name);
    ffmpeg(
      "-f",
      "lavfi",
      "-i",
      "color=c=0x05060a:s=1920x1080:r=60:d=20",
      "-vf",
      `drawbox=x=360:y=210:w=1200:h=460:color=0x${grey}${grey}${grey}:t=fill`,
      "-pix_fmt",
      "yuv420p",
      out,
    );
    return out;
  }

  test("passes a dark product declared dark", () => {
    const { stdout, status } = gate(join(create, "lightness.mjs"), [reel("dark.mp4", "10"), "--declared", "0.05"]);
    assert.equal(status, 0, stdout);
    assert.match(stdout, /ok\s+LIGHTNESS declared 0\.05/);
  });

  test("passes a white product declared white", () => {
    const { status } = gate(join(create, "lightness.mjs"), [reel("white.mp4", "ff"), "--declared", "1"]);
    assert.equal(status, 0);
  });

  // The mistake the gate exists for: the shipped default left alone on a pale product.
  test("fails a pale product left at the shipped default, and says which way to move", () => {
    const { stdout, status } = gate(join(create, "lightness.mjs"), [reel("pale.mp4", "ff"), "--declared", "0"]);
    assert.equal(status, 1);
    assert.match(stdout, /FAIL {2}LIGHTNESS declared 0\.00, the render shows 1\.00/);
    assert.match(stdout, /paler than the kit was told/);
    assert.match(stdout, /sits as a visible slab/);
  });

  test("fails a dark product declared pale, with the opposite diagnosis", () => {
    const { stdout, status } = gate(join(create, "lightness.mjs"), [reel("murk.mp4", "10"), "--declared", "1"]);
    assert.equal(status, 1);
    assert.match(stdout, /darker than the kit was told/);
    assert.match(stdout, /can empty the stage/);
  });

  // A product with no flat background at all. The first version of this gate took the most repeated luma and read
  // a near-white gradient as 0.06, because the stage's own glow was denser than any one band of the gradient, so
  // it told the author of a white product to make it darker. The assertion is that shape, not an exact number.
  test("reads a pale gradient as pale, not as the stage behind it", () => {
    const out = join(clips, "gradient.mp4");
    ffmpeg(
      "-f",
      "lavfi",
      "-i",
      "color=c=0x05060a:s=1920x1080:r=60:d=20",
      "-f",
      "lavfi",
      // a surface that ramps down its height, so no single luma is the background
      "-i",
      "color=c=black:s=1200x460:r=60:d=20,geq=lum=170+60*Y/H:cb=128:cr=128",
      "-filter_complex",
      "[0:v][1:v]overlay=x=360:y=210",
      "-pix_fmt",
      "yuv420p",
      out,
    );
    const read = gate(join(create, "lightness.mjs"), [out, "--declared", "0.85"]);
    assert.equal(read.status, 0, read.stdout);
    const [, shown] = /the render shows (\d\.\d\d)/.exec(read.stdout) ?? [];
    assert.ok(Number(shown) >= 0.75, `a pale gradient should not read dark, read ${shown}`);

    const wrong = gate(join(create, "lightness.mjs"), [out, "--declared", "0"]);
    assert.equal(wrong.status, 1);
    assert.match(wrong.stdout, /paler than the kit was told/);
  });

  // Two surfaces and no single background. LIGHTNESS governs how much PEAK brightness survives the blur, and a peak
  // comes from the brightest large thing, so the pale panel is the right answer rather than an average of the two.
  test("follows the brighter surface when a product has two", () => {
    const out = join(clips, "split.mp4");
    ffmpeg(
      "-f",
      "lavfi",
      "-i",
      "color=c=0x05060a:s=1920x1080:r=60:d=20",
      "-vf",
      "drawbox=x=360:y=210:w=1200:h=460:color=0xffffff:t=fill," +
        "drawbox=x=360:y=210:w=400:h=460:color=0x12151c:t=fill",
      "-pix_fmt",
      "yuv420p",
      out,
    );
    const { stdout, status } = gate(join(create, "lightness.mjs"), [out, "--declared", "1"]);
    assert.equal(status, 0, stdout);
  });

  test("reads the declared value out of the kit's own curves.ts", () => {
    const src = join(clips, "lightness-src");
    mkdirSync(src, { recursive: true });
    writeFileSync(join(src, "curves.ts"), "export const LIGHTNESS = 0.56;\n");
    const { stdout, status } = gate(join(create, "lightness.mjs"), [reel("mid.mp4", "8f"), "--src", src]);
    assert.equal(status, 0, stdout);
    assert.match(stdout, /declared 0\.56/);
  });

  test("says so rather than guessing when curves.ts has no literal to read", () => {
    const src = join(clips, "lightness-nolit");
    mkdirSync(src, { recursive: true });
    writeFileSync(join(src, "curves.ts"), "export const LIGHTNESS = measured();\n");
    const { stderr, status } = gate(join(create, "lightness.mjs"), [reel("any.mp4", "8f"), "--src", src]);
    assert.equal(status, 1);
    assert.match(stderr, /no literal "export const LIGHTNESS = <number>"/);
  });
});

describe("render-motion-blur", () => {
  // The whole script was untested and check.sh never ran it. The fragile part is the escaping: the commas inside
  // mod(n\,N) have to survive being joined into a filter list, and when they do not, ffmpeg reads them as filter
  // separators and fails in a way that reads like a codec problem rather than a quoting one.
  test("keeps the commas inside the select expression escaped", () => {
    assert.match(blurFilter(4, 60), /select=eq\(mod\(n\\,4\)\\,3\)/);
    assert.equal(blurFilter(4, 60).split(",").length, 7, "an unescaped comma would split into more filters");
  });

  test("ffmpeg accepts the chain and it averages each group into one frame", () => {
    const input = join(clips, "blur-in.mp4");
    const output = join(clips, "blur-out.mp4");
    // 24 frames in, 4 samples per frame, so 6 frames out.
    ffmpeg("-f", "lavfi", "-i", "testsrc=s=320x180:r=60:d=0.4", "-pix_fmt", "yuv420p", input);
    ffmpeg("-i", input, "-vf", blurFilter(4, 60), "-fps_mode", "passthrough", "-c:v", "libx264", output);
    const frames = execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-count_frames",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=nb_read_frames",
        "-of",
        "default=nk=1:nw=1",
        output,
      ],
      { encoding: "utf8" },
    ).trim();
    assert.equal(Number(frames), 6, `expected 24 frames to average into 6, got ${frames}`);
  });

  test("refuses to run without a composition id and an output", () => {
    const { stderr, status } = gate(join(create, "render-motion-blur.mjs"), []);
    assert.equal(status, 1);
    assert.match(stderr, /usage: render-motion-blur\.mjs/);
  });
});

describe("gates runner", () => {
  let reel;

  before(() => {
    reel = join(clips, "runner");
    mkdirSync(join(reel, "src"), { recursive: true });
    mkdirSync(join(reel, "outputs"), { recursive: true });
  });

  /** Build a reel package in whatever state the test needs, then run the runner over it. */
  function run(state = {}, args = []) {
    const src = join(reel, "src");
    writeFileSync(join(reel, "outputs", "reel.mp4"), "");
    writeFileSync(join(src, "Reel.tsx"), state.glow ?? 'const GLOW = ["rgba(122, 162, 255, 0.14)"];\n');
    writeFileSync(join(reel, "remotion.config.ts"), state.config ?? 'const product = "../relay";\n');
    if (state.storyboard === null) rmSync(join(reel, "storyboard.md"), { force: true });
    else writeFileSync(join(reel, "storyboard.md"), state.storyboard ?? "# Storyboard\n\nReal content.\n");
    return gate(join(create, "gates.mjs"), ["outputs/reel.mp4", "--src", "src", ...args], undefined, reel);
  }

  // The point of the preflight: these all used to be silent passes, found only after a twenty minute render.
  test("refuses a reel with no storyboard, before running any gate", () => {
    const { stdout, status } = run({ storyboard: null });
    assert.equal(status, 1);
    assert.match(stdout, /storyboard\.md does not exist/);
    assert.doesNotMatch(stdout, /== check-video/, "it must not reach the gates");
  });

  test("refuses a storyboard that is still the shipped template", () => {
    const template = readFileSync(join(create, "..", "references", "storyboard.md"), "utf8");
    const { stdout, status } = run({ storyboard: template });
    assert.equal(status, 1);
    assert.match(stdout, /still the unedited template/);
  });

  test("refuses a kit whose placeholders were never edited", () => {
    const { stdout, status } = run({
      glow: 'const GLOW = ["rgba(255, 255, 255, 0.12)", "rgba(255, 255, 255, 0.05)"];\n',
      config: 'const product = path.resolve("../my-product");\n',
    });
    assert.equal(status, 1);
    assert.match(stdout, /GLOW is still the kit's neutral placeholder/);
    assert.match(stdout, /still points at \.\.\/my-product/);
  });

  test("--skip-preflight runs the gates on a reel it does not understand", () => {
    const { stdout } = run({ storyboard: null }, ["--skip-preflight"]);
    assert.match(stdout, /== check-video/, "it should reach the gates");
    assert.doesNotMatch(stdout, /does not exist\. Render before gating/);
  });
});

describe("gates runner on a finished reel", () => {
  // Every gate's own tests feed it a fixture, which never proved the runner can pass anything at all. This is the
  // smallest package that is honestly finished: one cited motion call, one claim, one loaded font and a render
  // whose surface matches its LIGHTNESS. It is portrait, so the size flags have somewhere to go.
  let video;
  const SIZE = ["--width", "864", "--height", "1080", "--min", "1", "--max", "10"];
  const FINISHED = {
    "src/timeline.ts":
      "export const FPS = 60;\nexport const CUE = { start: 0, endCard: 2 } as const;\nexport const DURATION_SECONDS = 4;\n",
    "src/curves.ts":
      "export const LIGHTNESS = 0.56;\n" +
      "const ramp = (seconds: number) => Math.min(1, Math.max(0, seconds / 2));\n" +
      'export const SIGNALS: Record<string, { unit: "%" | "px"; at: (seconds: number) => number }> = {\n' +
      '  "product opacity": { unit: "%", at: ramp },\n};\n',
    "src/motion.ts":
      'import { Easing, interpolate } from "remotion";\n' +
      "export const emphasizedIn = Easing.bezier(0.05, 0.7, 0.1, 1);\n" +
      "export function tween(frame: number, range: number[], to: number[], easing = emphasizedIn) {\n" +
      "  return interpolate(frame, range, to, { easing });\n}\n",
    "src/Panel.tsx":
      'import "@fontsource/inter/400.css";\nimport { emphasizedIn, tween } from "./motion";\n' +
      "// [measured: product opacity at endCard is 100%]\n" +
      "export const Panel = ({ frame }: { frame: number }) => {\n" +
      "  const slide = tween(frame, [0, 30], [0, 1], emphasizedIn);\n  return slide;\n};\n",
    "src/Reel.tsx": 'const GLOW = ["rgba(122, 162, 255, 0.14)"];\n',
    "remotion.config.ts": 'const product = "../relay";\n',
    "storyboard.md":
      "# Storyboard\n\nType is Inter, from @fontsource, SIL Open Font License.\n\n" +
      "| Beat | Code | Easing |\n| --- | --- | --- |\n| Slide | `Panel.tsx#slide` | emphasizedIn `0.05, 0.7, 0.1, 1` |\n",
  };

  before(() => {
    video = join(clips, "finished.mp4");
    // fades up from black, holds a mid-grey product well inside the action-safe margin, fades out to black
    ffmpeg(
      "-f",
      "lavfi",
      "-i",
      "color=c=0x05060a:s=864x1080:r=60:d=4",
      "-vf",
      "drawbox=x=132:y=240:w=600:h=600:color=0x8f8f8f:t=fill,fade=t=in:st=0:d=0.5,fade=t=out:st=3.4:d=0.5",
      "-pix_fmt",
      "yuv420p",
      video,
    );
  });

  /** A fresh reel package with `changes` applied over the finished one (null deletes a file), gated with `args`. */
  function finished(changes = {}, args = SIZE, env = undefined) {
    const dir = mkdtempSync(join(clips, "package-"));
    for (const [path, body] of Object.entries({ ...FINISHED, ...changes })) {
      if (body === null) continue;
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), body);
    }
    mkdirSync(join(dir, "outputs"));
    copyFileSync(video, join(dir, "outputs", "reel.mp4"));
    return gate(join(create, "gates.mjs"), ["outputs/reel.mp4", ...args], undefined, dir, env);
  }

  test("passes a finished reel cut to a size that is not 16:9", () => {
    const { stdout, status } = finished();
    assert.equal(status, 0, stdout);
    assert.match(stdout, /All 6 gates passed\./);
  });

  // Four gates can be satisfied by doing less. Each change below removes one piece of work and nothing else.
  test("fails a reel with no motion in it, rather than passing an empty inventory", () => {
    const { stdout, status } = finished({
      "src/motion.ts": null,
      "src/Panel.tsx": FINISHED["src/Panel.tsx"].replace(/^.*tween.*\n/gm, ""),
      "storyboard.md": FINISHED["storyboard.md"].replace(/\n\|[\s\S]*$/, "\n"),
    });
    assert.equal(status, 1);
    assert.match(stdout, /FAILED: easing-inventory$/m);
  });

  test("fails a reel that claims nothing, and one with no signal to claim about", () => {
    const unclaimed = FINISHED["src/Panel.tsx"].replace(/^\/\/ \[measured.*\n/m, "");
    const silent = finished({ "src/Panel.tsx": unclaimed });
    assert.equal(silent.status, 1);
    assert.match(silent.stdout, /FAILED: claims$/m);

    const curves = FINISHED["src/curves.ts"].replace(/= \{\n.*\n\};/s, "= {};");
    const empty = finished({ "src/curves.ts": curves, "src/Panel.tsx": unclaimed });
    assert.equal(empty.status, 1);
    assert.match(empty.stdout, /curves\.ts exports no signals/);
    assert.match(empty.stdout, /FAILED: claims$/m);
  });

  // A version manager can put node on an interactive shell's PATH and nowhere else, so the runner runs its gates on
  // the Node that is already running it.
  test("runs every gate when node is not on the PATH", () => {
    const bin = mkdtempSync(join(clips, "bin-"));
    for (const tool of ["ffmpeg", "ffprobe"]) {
      symlinkSync(execFileSync("which", [tool], { encoding: "utf8" }).trim(), join(bin, tool));
    }
    const { stdout, stderr, status } = finished({}, SIZE, { ...process.env, PATH: bin });
    assert.equal(status, 0, stdout + stderr);
  });
});
