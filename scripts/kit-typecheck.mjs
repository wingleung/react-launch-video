// Typechecks the starter kit the way a reel package would: copy it into a temp project with Remotion and run tsc.
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "kit-typecheck-"));
cpSync("plugin/skills/create/assets/kit", join(dir, "src"), { recursive: true });
writeFileSync(
  join(dir, "package.json"),
  JSON.stringify({
    name: "kit-typecheck",
    private: true,
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
