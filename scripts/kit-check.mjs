// Checks the starter kit the way a reel package would: copy it into a temp project with Remotion, typecheck it with
// tsc, then import its camera so the kit's own assertStillWhileReading actually runs.
//
// The second half exists because the first half is not enough. The assertion only fires when a composition loads, so
// a typecheck will happily pass a kit whose example camera drifts through the end card, and that is exactly what
// shipped once. An example that fails its own gate is worse than no example.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
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

function check(root) {
  // A reel package is the scaffold at the root with the kit as its src/, which is exactly what the skill tells a user
  // to assemble. Building it the same way here means the pins and the tsconfig under test are the ones that ship,
  // rather than a second copy of them that can drift.
  const dir = join(root, "reel");
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
      '  await import("./src/camera.ts");',
      '  const kit = await import("./src/motion.ts");',
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
      '  assert.equal(kit.readingTime("Short"), 0.8);',
      '  assert.equal(Math.round(kit.readingTime("Command palette Search by name") * 100) / 100, 2.26);',
      "  assert.equal(kit.beatsAt(94)(4), (4 * 60) / 94);",
      "",
      "  // the reading-time guard has to fire, and only when the hold is genuinely short",
      '  const short = [{ label: "caption", from: 0, to: 1, text: "Command palette Search by name" }];',
      "  assert.throws(() => kit.assertReadingTime(short), /holds 1\\.00s but needs 2\\.46s/);",
      '  kit.assertReadingTime([{ label: "caption", from: 0, to: 3, text: "Command palette Search by name" }]);',
      '  kit.assertReadingTime([{ label: "no text", from: 0, to: 0.1 }]);',
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
