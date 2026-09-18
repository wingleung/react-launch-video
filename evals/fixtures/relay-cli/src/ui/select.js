import { theme } from "./theme.js";

/**
 * Multi-select prompt. Every option starts selected. Keys: up and down to move, x to toggle, enter to confirm.
 * Options: { hasDarkBackground = false, showHelp = true }.
 */
export async function multiSelect(title, options, { hasDarkBackground = false, showHelp = true } = {}) {
  const colours = theme(hasDarkBackground);
  const selected = new Set(options.map((_, index) => index));
  let cursor = 0;

  const render = () => {
    const lines = [colours.title(title)];
    options.forEach((option, index) => {
      const pointer = index === cursor ? colours.cursor(">") : " ";
      const label = selected.has(index) ? colours.selected(`✓ ${option}`) : colours.unselected(`  ${option}`);
      lines.push(`${pointer} ${label}`);
    });
    if (showHelp) lines.push(colours.help("↑/↓ move • x toggle • enter confirm"));
    return lines;
  };

  if (!process.stdin.isTTY) return options;
  let drawn = 0;
  const draw = () => {
    if (drawn) process.stdout.write(`\x1b[${drawn}A\x1b[0J`);
    const lines = render();
    process.stdout.write(lines.join("\n") + "\n");
    drawn = lines.length;
  };

  process.stdin.setRawMode(true);
  draw();
  return new Promise((resolve) => {
    const onData = (data) => {
      const key = data.toString();
      if (key === "\x1b[A") cursor = Math.max(0, cursor - 1);
      else if (key === "\x1b[B") cursor = Math.min(options.length - 1, cursor + 1);
      else if (key === "x") selected.has(cursor) ? selected.delete(cursor) : selected.add(cursor);
      else if (key === "\r") {
        process.stdin.off("data", onData);
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write(`\x1b[${drawn}A\x1b[0J`);
        return resolve(options.filter((_, index) => selected.has(index)));
      }
      draw();
    };
    process.stdin.on("data", onData);
    process.stdin.resume();
  });
}
