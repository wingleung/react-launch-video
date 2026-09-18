#!/usr/bin/env node
// Check this machine has what a reel needs before the first render fails an hour in.
//
//     node doctor.mjs
//
// Node, npm and ffmpeg with the filters the gates use. Exits 1 when something required is missing.
import { accessSync, constants } from "node:fs";
import { delimiter, join } from "node:path";
import { main, runLenient } from "./lib/run.mjs";
import { mark } from "./lib/report.mjs";

const SYSTEM = { darwin: "Darwin", linux: "Linux", win32: "Windows" }[process.platform] ?? "Linux";
const HINTS = {
  node: {
    Darwin: "brew install node, or install from https://nodejs.org",
    Linux: "install Node.js from your distribution or https://nodejs.org (a version manager such as nvm works)",
    Windows: "winget install OpenJS.NodeJS.LTS, or install from https://nodejs.org",
  },
  ffmpeg: {
    Darwin: "brew install ffmpeg",
    Linux: "install ffmpeg from your distribution (apt install ffmpeg, dnf install ffmpeg)",
    Windows: "winget install Gyan.FFmpeg, then open a new terminal so it is on the PATH",
  },
};

/** Find a command on the PATH, honouring PATHEXT on Windows, where an executable bit means nothing. */
function which(command) {
  const extensions = process.platform === "win32" ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT").split(";") : [""];
  const mode = process.platform === "win32" ? constants.F_OK : constants.X_OK;
  for (const directory of (process.env.PATH ?? "").split(delimiter).filter(Boolean)) {
    for (const extension of extensions) {
      const full = join(directory, command + extension);
      try {
        accessSync(full, mode);
        return full;
      } catch {
        // not here, keep looking
      }
    }
  }
  return null;
}

main("doctor", () => {
  const problems = [];
  const report = (ok, label, detail, required = true) => {
    console.log(`${mark(ok, required)}  ${label}: ${detail}`);
    if (!ok && required) problems.push(label);
  };
  const hint = (tool) => HINTS[tool][SYSTEM] ?? HINTS[tool].Linux;

  if (which("node")) {
    const version = runLenient("node", ["--version"]).trim().replace(/^v+/, "");
    const major = /^\d/.test(version) ? Number(version.split(".")[0]) : 0;
    report(major >= 18, "node", `${version} (tested with 22, 18 or later expected)`);
  } else {
    report(false, "node", `not found. ${hint("node")}`);
  }
  report(Boolean(which("npm")), "npm", which("npm") ? "found" : "not found, it ships with Node.js");

  if (which("ffmpeg") && which("ffprobe")) {
    const filters = runLenient("ffmpeg", ["-hide_banner", "-filters"]);
    const has = (name) => new RegExp(`\\s${name}\\s`).test(filters);
    for (const name of ["xstack", "signalstats", "sobel"]) {
      report(has(name), `ffmpeg filter ${name}`, "used by the gate scripts");
    }
    report(has("tmix"), "ffmpeg filter tmix", "optional, for the motion blur render only", false);
  } else {
    report(false, "ffmpeg and ffprobe", `not found. ${hint("ffmpeg")}`);
  }

  if (problems.length) {
    console.log(`\nMissing: ${problems.join(", ")}. Fix these before building a reel.`);
    return 1;
  }
  console.log("\nReady.");
  return 0;
});
