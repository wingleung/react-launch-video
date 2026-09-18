// Colours for prompts, with a variant for light and dark terminals.
const ansi = (code) => (text) => `\x1b[${code}m${text}\x1b[0m`;

export function theme(hasDarkBackground) {
  return {
    title: ansi("1;35"),
    cursor: ansi("36"),
    selected: ansi("32"),
    // Unselected options: 252 is a light grey, 235 a near-black grey.
    unselected: hasDarkBackground ? ansi("38;5;235") : ansi("38;5;252"),
    help: ansi("2"),
  };
}
