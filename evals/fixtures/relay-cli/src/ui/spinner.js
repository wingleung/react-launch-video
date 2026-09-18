import { detectDarkBackground } from "./background.js";
import { theme } from "./theme.js";

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

/** Runs `task` with a spinner and a label. The spinner is the only UI that asks for the background colour. */
export async function withSpinner(label, task) {
  const colours = theme(await detectDarkBackground());
  let frame = 0;
  const timer = setInterval(() => {
    process.stdout.write(`\r${colours.cursor(FRAMES[frame++ % FRAMES.length])} ${label}`);
  }, 80);
  try {
    return await task();
  } finally {
    clearInterval(timer);
    process.stdout.write("\r\x1b[2K");
  }
}
