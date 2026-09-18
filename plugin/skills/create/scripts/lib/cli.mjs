// Just enough of argparse to keep the usage, help and error text these scripts already print.
// Not supported, because nothing here uses it: abbreviated flags ("--ever 0.5").

const INDENT = 2;
const MAX_HELP_POSITION = 24;

function invocation(option) {
  return option.metavar ? `${option.flag} ${option.metavar}` : option.flag;
}

function usageLine(prog, spec) {
  const parts = ["[-h]", ...spec.options.map((option) => `[${invocation(option)}]`), ...spec.positionals];
  return `usage: ${prog} ${parts.join(" ")}`;
}

function helpText(prog, spec) {
  const entries = [{ flag: "-h, --help", help: "show this help message and exit" }, ...spec.options];
  const longest = Math.max(
    ...entries.map((entry) => (entry.flag === "-h, --help" ? entry.flag : invocation(entry)).length),
  );
  const position = Math.min(longest + INDENT + 2, MAX_HELP_POSITION);
  const lines = [usageLine(prog, spec), "", "positional arguments:"];
  for (const name of spec.positionals) lines.push(`  ${name}`);
  lines.push("", "options:");
  for (const entry of entries) {
    const shown = entry.flag === "-h, --help" ? entry.flag : invocation(entry);
    const left = `  ${shown}`;
    if (!entry.help) lines.push(left);
    else if (left.length >= position) lines.push(left, `${" ".repeat(position)}${entry.help}`);
    else lines.push(`${left}${" ".repeat(position - left.length)}${entry.help}`);
  }
  return lines.join("\n");
}

function die(prog, spec, message) {
  console.error(usageLine(prog, spec));
  console.error(`${prog}: error: ${message}`);
  process.exit(2);
}

/** Parse argv the way argparse would, or exit 0 on --help and 2 on a usage error. */
export function parse(prog, spec, argv) {
  const values = {};
  for (const option of spec.options) values[option.dest] = option.default;
  const positionals = [];
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "-h" || argument === "--help") {
      console.log(helpText(prog, spec));
      process.exit(0);
    }
    if (argument.startsWith("-") && argument !== "-") {
      const [flag, inlineValue] = argument.includes("=") ? argument.split(/=(.*)/s) : [argument, undefined];
      const option = spec.options.find((candidate) => candidate.flag === flag);
      if (!option) die(prog, spec, `unrecognized arguments: ${argument}`);
      if (option.store) {
        if (inlineValue !== undefined) die(prog, spec, `argument ${flag}: ignored explicit argument '${inlineValue}'`);
        values[option.dest] = true;
        continue;
      }
      const raw = inlineValue !== undefined ? inlineValue : argv[(index += 1)];
      if (raw === undefined) die(prog, spec, `argument ${flag}: expected one argument`);
      if (option.type === "float") {
        const parsed = Number(raw);
        if (raw.trim() === "" || Number.isNaN(parsed)) {
          die(prog, spec, `argument ${flag}: invalid float value: '${raw}'`);
        }
        values[option.dest] = parsed;
      } else {
        values[option.dest] = raw;
      }
      continue;
    }
    positionals.push(argument);
  }
  const missing = spec.positionals.slice(positionals.length);
  if (missing.length) die(prog, spec, `the following arguments are required: ${missing.join(", ")}`);
  if (positionals.length > spec.positionals.length) {
    die(prog, spec, `unrecognized arguments: ${positionals.slice(spec.positionals.length).join(" ")}`);
  }
  spec.positionals.forEach((name, position) => {
    values[name] = positionals[position];
  });
  return values;
}
