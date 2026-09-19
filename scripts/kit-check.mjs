// Checks the starter kit the way a reel package would: copy it into a temp project with Remotion, typecheck it with
// tsc, then import its camera so the kit's own assertStillWhileReading actually runs.
//
// The second half exists because the first half is not enough. The assertion only fires when a composition loads, so
// a typecheck will happily pass a kit whose example camera drifts through the end card, and that is exactly what
// shipped once. An example that fails its own gate is worse than no example.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "kit-check-"));
cpSync("plugin/skills/create/assets/kit", join(dir, "src"), { recursive: true });
writeFileSync(
  join(dir, "package.json"),
  JSON.stringify({
    name: "kit-check",
    private: true,
    type: "module",
    dependencies: { remotion: "4.0.525", "@remotion/cli": "4.0.525", react: "19.2.0", "react-dom": "19.2.0" },
    devDependencies: { "@types/node": "22.19.1", "@types/react": "19.2.2", typescript: "5.9.3" },
  }),
);
writeFileSync(
  join(dir, "tsconfig.json"),
  JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "Bundler",
      jsx: "react-jsx",
      strict: true,
      noUncheckedIndexedAccess: true,
      skipLibCheck: true,
      noEmit: true,
    },
    include: ["src"],
  }),
);
execFileSync("npm", ["install", "--silent", "--no-audit", "--no-fund"], { cwd: dir, stdio: "inherit" });
execFileSync("npx", ["tsc", "-p", "."], { cwd: dir, stdio: "inherit" });
console.log("kit typecheck passed");

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
    "try {",
    '  await import("./src/camera.ts");',
    "} catch (error) {",
    "  console.error(`kit camera: ${error.message}`);",
    "  process.exit(1);",
    "}",
    "",
  ].join("\n"),
);
try {
  execFileSync("node", ["assert-camera.mjs"], { cwd: dir, stdio: "inherit" });
} catch {
  process.exit(1);
}
console.log("kit camera holds still through every reading window");
