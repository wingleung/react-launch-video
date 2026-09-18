// Subprocess helpers. A failure throws a one-line error naming the command, because that line is what ends up
// pasted into a bug report.
import { spawnSync } from "node:child_process";

const TEXT_BUFFER = 64 * 1024 * 1024;
// Raw gray frames from a whole reel run to tens of megabytes, and Node's 1MB default truncates them silently,
// which would read as "no frames" and report a clean video.
const BYTE_BUFFER = 512 * 1024 * 1024;

function check(command, result) {
  if (result.error && result.error.code === "ENOENT") throw new Error(`${command} not found on the PATH`);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = String(result.stderr ?? "")
      .trim()
      .split("\n")[0];
    throw new Error(`${command} exited ${result.status}${detail ? `: ${detail}` : ""}`);
  }
  return result;
}

/** stdout as text, throwing when the command is missing or fails. */
export function runText(command, args) {
  return check(command, spawnSync(command, args, { encoding: "utf8", maxBuffer: TEXT_BUFFER })).stdout;
}

/** stdout as raw bytes, throwing when the command is missing or fails. */
export function runBytes(command, args) {
  return check(command, spawnSync(command, args, { maxBuffer: BYTE_BUFFER })).stdout;
}

/** Run with the terminal's own stdio, throwing when the command is missing or fails. */
export function runInherit(command, args) {
  check(command, spawnSync(command, args, { stdio: "inherit" }));
}

/** stdout and stderr together, and an empty string for any failure at all. For probing what a machine has. */
export function runLenient(command, args, timeoutMs = 30000) {
  const result = spawnSync(command, args, { encoding: "utf8", maxBuffer: TEXT_BUFFER, timeout: timeoutMs });
  if (result.error) return "";
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

/** Run a script body, reporting a failure as one line rather than a stack trace. */
export function main(name, body) {
  try {
    process.exitCode = body() ?? 0;
  } catch (error) {
    console.error(`${name}: ${error.message}`);
    process.exitCode = 1;
  }
}
