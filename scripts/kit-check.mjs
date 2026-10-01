// Checks the starter kit the way a reel package would: copy it into a temp project with Remotion, typecheck it with
// tsc, render it, then import its camera so the kit's own assertStillWhileReading actually runs.
//
// The import exists because the typecheck is not enough. The assertion only fires when a composition loads, so a
// typecheck will happily pass a kit whose example camera drifts through the end card, and that is exactly what
// shipped once. An example that fails its own gate is worse than no example. The render exists for the same reason
// one level up: nothing else here bundles the kit, so a package that typechecks and cannot render would pass.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const kit = "plugin/skills/create/assets/kit";
const scaffold = "plugin/skills/create/assets/scaffold";

/** A step whose tool already printed why it failed, so the error carries no message of its own. */
class Failed extends Error {}
function run(command, args, options = {}) {
  try {
    return execFileSync(command, args, { stdio: "inherit", ...options });
  } catch {
    throw new Failed();
  }
}

/** A PNG as one byte of luma per pixel, through the system ffmpeg the gates already need. */
function luma(png) {
  return execFileSync("ffmpeg", ["-v", "error", "-i", png, "-f", "rawvideo", "-pix_fmt", "gray", "-"], {
    maxBuffer: 1 << 26,
  });
}

/** Every remotion package on one exact version, and the comment that quotes it quoting the same one. */
function checkPins() {
  const manifest = JSON.parse(readFileSync(join(scaffold, "package.json"), "utf8"));
  const pins = { ...manifest.dependencies, ...manifest.devDependencies };
  for (const [name, version] of Object.entries(pins)) {
    if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`scaffold pins ${name} to ${version}, not an exact version`);
    if ((name === "remotion" || name.startsWith("@remotion/")) && version !== pins.remotion) {
      throw new Error(`scaffold pins ${name} to ${version} but remotion to ${pins.remotion}`);
    }
  }
  for (const quoted of manifest._comment.join(" ").match(/\d+\.\d+\.\d+/g) ?? []) {
    if (quoted !== pins.remotion) throw new Error(`scaffold comment quotes ${quoted} but remotion is ${pins.remotion}`);
  }
}

function check(root) {
  checkPins();

  // A reel package is the scaffold at the root with the kit as its src/, next to the product it shows, which is
  // exactly what the skill tells a user to assemble. Building it the same way here means the pins, the tsconfig and
  // the config under test are the ones that ship, rather than a second copy of them that can drift.
  const dir = join(root, "reel");
  mkdirSync(join(root, "my-product", "public"), { recursive: true });
  cpSync(scaffold, dir, { recursive: true });
  cpSync(kit, join(dir, "src"), { recursive: true });

  // Lockless on purpose, and the one install in this repo that is not pinned. The scaffold's direct dependencies are
  // exact, which is what a typecheck actually rides on, so the float is transitive. A lockfile here would pin the
  // whole tree, but it would also ship to every user through `assets/scaffold/`, go stale, and be rewritten by npm
  // into a diff that `prettier --check` then argues with. If CI ever reddens with no repo change, look here first.
  run("npm", ["install", "--silent", "--no-audit", "--no-fund"], { cwd: dir });
  run("npx", ["tsc", "-p", "."], { cwd: dir });
  console.log("kit typecheck passed");

  // Before the rewrite below, so the claim gate sees the kit exactly as a reel ships it, extensionless imports and all.
  const references = "plugin/skills/create/references";
  const docs = readdirSync(references)
    .filter((name) => name.endsWith(".md"))
    .flatMap((name) => ["--doc", join(references, name)]);
  run("node", ["plugin/skills/create/scripts/claims.mjs", join(dir, "src"), "--as", kit, ...docs]);

  // The scaffold's own `still` script, the proof of life step 1b hands a user. It must not be black: frame 0 was,
  // and a black still looks the same whether the toolchain works or not.
  run("npm", ["run", "still", "--", "--log=error"], { cwd: dir });
  const still = luma(join(dir, "outputs", "still.png"));
  const mean = still.reduce((sum, value) => sum + value, 0) / still.length;
  if (mean < 4) throw new Error(`the scaffold's still is black: mean luma ${mean.toFixed(2)} of 255`);
  console.log(`kit renders: the scaffold's still has mean luma ${mean.toFixed(2)} of 255`);

  // A vertical cut must frame like a wide one. A box drawn round the camera's focus has to land dead centre whatever
  // the frame size, and it sat 420px right and 135px high at 1080x1350 while Reel.tsx centred on 960, 540.
  const reel = join(dir, "src", "Reel.tsx");
  const slot = "{/* Popovers and the cursor live here too, so they zoom with the product. */}";
  const source = readFileSync(reel, "utf8");
  if (!source.includes(slot)) throw new Error(`Reel.tsx no longer has the slot this check draws into: ${slot}`);
  const marker =
    "<div style={{ position: 'absolute', left: focusX - 100, top: focusY - 100, " +
    "width: 200, height: 200, background: 'white' }} />";
  writeFileSync(reel, source.replace(slot, marker));
  const [width, height] = [1080, 1350];
  const portrait = join(dir, "outputs", "portrait.png");
  const size = [`--width=${width}`, `--height=${height}`];
  run("npx", ["remotion", "still", "src/index.ts", "Reel", portrait, "--frame=480", ...size, "--log=error"], {
    cwd: dir,
  });
  const pixels = luma(portrait);
  let [left, top, right, bottom] = [width, height, -1, -1];
  pixels.forEach((value, index) => {
    if (value < 200) return;
    const [x, y] = [index % width, Math.floor(index / width)];
    [left, top, right, bottom] = [Math.min(left, x), Math.min(top, y), Math.max(right, x), Math.max(bottom, y)];
  });
  const centre = [(left + right + 1) / 2, (top + bottom + 1) / 2];
  if (right < 0 || Math.abs(centre[0] - width / 2) > 2 || Math.abs(centre[1] - height / 2) > 2) {
    throw new Error(`at ${width}x${height} the camera's focus lands at ${centre}, not the frame centre`);
  }
  console.log(`kit frames a ${width}x${height} cut on the camera's focus`);

  // A bundler resolves `./motion` for Remotion, Node does not, so spell the extensions out in this throwaway copy.
  // camera.ts reaches only .ts files, which is why it carries no JSX.
  for (const name of readdirSync(join(dir, "src")).filter((file) => file.endsWith(".ts"))) {
    const path = join(dir, "src", name);
    const withExtensions = readFileSync(path, "utf8").replace(/from "(\.\/[^"]+)"/g, (whole, specifier) =>
      existsSync(join(dir, "src", `${specifier.slice(2)}.ts`)) ? `from "${specifier}.ts"` : whole,
    );
    writeFileSync(path, withExtensions);
  }
  // The probe reports the assertion on its own, because a stack trace through the module loader buries the one line
  // that says which window the camera moved in.
  writeFileSync(
    join(dir, "assert-camera.mjs"),
    [
      'import assert from "node:assert/strict";',
      "try {",
      '  const camera = await import("./src/camera.ts");',
      '  const kit = await import("./src/motion.ts");',
      '  const curves = await import("./src/curves.ts");',
      "",
      "  // safeArea generalises the constant rather than replacing it, so the two must agree on the default frame",
      "  assert.deepEqual(kit.safeArea(), kit.ACTION_SAFE);",
      "  assert.deepEqual(kit.safeArea({ width: 1080, height: 1350 }), { x: 38, y: 47, width: 1004, height: 1256 });",
      "",
      "  // a vertical frame must change the zoom that fits a wide box",
      "  const box = { x: 400, y: 200, width: 1200, height: 700 };",
      "  const portrait = { width: 1080, height: 1350 };",
      "  const wideZoom = kit.fitCamera(box)[2];",
      "  const tallZoom = kit.fitCamera(box, kit.safeArea(portrait), 24, 2, portrait)[2];",
      "  assert.ok(tallZoom < wideZoom, `a vertical frame should zoom out further: ${tallZoom}, ${wideZoom}`);",
      "",
      "  // and the frame size must move the focus whenever the safe area is off centre, which is what it is for",
      "  const offCentre = kit.CAPTION_SAFE;",
      "  assert.notEqual(",
      "    kit.fitCamera(box, offCentre, 24, 2, portrait)[0],",
      "    kit.fitCamera(box, offCentre)[0],",
      "  );",
      "",
      "  // a safe area narrower than its two margins has no zoom that fits, and used to return a negative one",
      "  const sliver = { x: 0, y: 0, width: 40, height: 400 };",
      "  assert.throws(() => kit.fitCamera(box, sliver), /cannot fit a 1200x700 box in a 40x400 safe area/);",
      "",
      "  // smoothPath reads keys in array order, so an unsorted key interpolated silently and a repeated time cut",
      "  const still = [0, 960, 540, 1];",
      "  assert.throws(() => kit.assertCameraKeys([[2, 960, 540, 1], still]), /comes after key 0/);",
      "  assert.throws(() => kit.assertCameraKeys([still, [0, 960, 540, 2]]), /both at 0\\.00s/);",
      "  kit.assertCameraKeys(camera.CAMERA);",
      "",
      '  assert.equal(kit.readingTime("Short"), 0.8);',
      '  assert.equal(Math.round(kit.readingTime("Command palette Search by name") * 100) / 100, 2.26);',
      "  assert.equal(kit.beatsAt(94)(4), (4 * 60) / 94);",
      "",
      "  // the reading-time guard has to fire, and only when the hold is genuinely short",
      '  const short = [{ label: "caption", from: 0, to: 1, text: "Command palette Search by name" }];',
      "  assert.throws(() => kit.assertReadingTime(short), /holds 1\\.00s but needs 2\\.46s/);",
      '  kit.assertReadingTime([{ label: "caption", from: 0, to: 3, text: "Command palette Search by name" }]);',
      '  kit.assertReadingTime([{ label: "no text", from: 0, to: 0.1 }]);',
      "",
      "  // a lockup is readable once its LAST word has risen, which camera.ts counts from, and its comment quotes",
      "  assert.equal(Math.round(curves.settled(0.55, 3) * 100) / 100, 1.63);",
      '  const title = camera.READING.find(({ label }) => label === "title");',
      "  assert.equal(Math.round((title.to - title.from) * 100) / 100, 0.82);",
      '  assert.throws(() => kit.assertReadingTime([{ ...title, text: "R" }]), /needs 1\\.00s/);',
      "} catch (error) {",
      "  console.error(`kit: ${error.message}`);",
      "  process.exit(1);",
      "}",
      "",
    ].join("\n"),
  );
  run("node", ["assert-camera.mjs"], { cwd: dir });
  console.log("kit camera holds still, reading times hold up, sizing generalises, blur falloff is calibrated");
}

const root = mkdtempSync(join(tmpdir(), "kit-check-"));
try {
  check(root);
} catch (error) {
  if (!(error instanceof Failed)) console.error(`kit: ${error.message}`);
  process.exitCode = 1;
} finally {
  // Every run installs a full Remotion tree here, 253MB of it, and before this cleanup 108 runs had left 27GB behind.
  rmSync(root, { recursive: true, force: true });
}
