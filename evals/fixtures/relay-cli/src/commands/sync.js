import { multiSelect } from "../ui/select.js";
import { withSpinner } from "../ui/spinner.js";

const bold = (text) => `\x1b[1m${text}\x1b[0m`;
const green = (text) => `\x1b[32m${text}\x1b[0m`;

/** Sample data standing in for the server response. */
async function fetchChanges() {
  await new Promise((resolve) => setTimeout(resolve, 900));
  return [
    { label: "REL-131 Retry button on failed uploads (new draft)", kind: "create" },
    { label: "REL-118 Keyboard shortcut cheat sheet (edited title)", kind: "update" },
    { label: "REL-124 Empty state for new projects (new comment)", kind: "comment" },
  ];
}

export async function sync() {
  const changes = await withSpinner("Comparing drafts with relay.app", fetchChanges);
  console.log(bold(`${changes.length} local changes are not on the server yet`));

  // Prompts in sync stay compact: no key help, the default theme.
  const chosen = await multiSelect(
    "Choose what to push",
    changes.map((change) => change.label),
    { showHelp: false },
  );

  for (const label of chosen) {
    await withSpinner(`Pushing ${label.split(" ")[0]}`, () => new Promise((resolve) => setTimeout(resolve, 400)));
  }
  console.log(`\n${bold("Summary")}`);
  for (const label of chosen) console.log(green(`✓ ${label.split(" (")[0]} pushed`));
  const skipped = changes.length - chosen.length;
  if (skipped) console.log(`  ${skipped} change${skipped === 1 ? "" : "s"} kept local`);
}
