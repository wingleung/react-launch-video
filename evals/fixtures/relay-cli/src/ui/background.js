// Asks the terminal for its background colour (OSC 11). Only callers that pass the result on get a dark theme.
export async function detectDarkBackground() {
  if (!process.stdin.isTTY) return false;
  return new Promise((resolve) => {
    const finish = (isDark) => {
      clearTimeout(timer);
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      resolve(isDark);
    };
    const onData = (data) => {
      const match = /rgb:([0-9a-f]{2})/i.exec(data.toString());
      finish(match ? parseInt(match[1], 16) < 0x80 : false);
    };
    // Terminals that do not answer OSC 11 leave us waiting: give up after 150ms and assume a light background.
    const timer = setTimeout(() => finish(false), 150);
    process.stdin.setRawMode(true);
    process.stdin.on("data", onData);
    process.stdin.resume();
    process.stdout.write("\x1b]11;?\x07");
  });
}
