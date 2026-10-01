# Evals

Three test cases in `evals.json`, each with the assertions a grader checks:

| Case                   | Skill  | Fixture                                          | Cost                                  |
| ---------------------- | ------ | ------------------------------------------------ | ------------------------------------- |
| `relay-web-focus-mode` | create | `fixtures/relay-web`, a small React app          | renders video, about 20 to 30 minutes |
| `relay-cli-sync`       | create | `fixtures/relay-cli`, a small Node CLI           | renders video, about 20 to 30 minutes |
| `review-flawed-reel`   | review | `fixtures/flawed-reel`, a reel with seeded flaws | code only, a few minutes              |

The fixtures are fictional ("Relay") and contain the traps a real product has: a clock-based greeting, CSS transitions,
a debounced search and a CLI prompt helper whose dark theme and key help line the real `sync` path never uses. The
fixtures themselves never name these traps, so this list stays here, outside what a run can see.

## Prerequisites

Node 22.18 or later, `ffmpeg` and `ffprobe` on the `PATH`, network access (npm installs and the headless browser
Remotion downloads on its first render) and the plugin installed in the Claude Code that runs the case.

## Running them

1. Stage the fixture. Copy the case's `files` entry (for example `evals/fixtures/relay-web`) into an empty directory
   outside this repo, so the staging directory holds `relay-web/` and nothing else:

   ```sh
   stage="$(mktemp -d)" && cp -R evals/fixtures/relay-web "$stage/" && cd "$stage"
   ```

2. Start a fresh Claude Code session in the staging directory and send the case's `prompt` unchanged. Prompts name the
   fixture as `./relay-web`, `./relay-cli` or `./flawed-reel` and write deliverables to `outputs/` (or `review.md`),
   all relative to the staging directory.
3. Run each case twice, once with the plugin and once without (a baseline), each in its own staging directory.
4. Grade both runs against the case's assertions.

Two rules learned the hard way:

- Keep `evals.json` and every assertion out of the directory a run works in, and copy them in only for grading. Runs
  that can read their assertions score higher for the wrong reason. Staging outside the repo is what enforces this: a
  run started inside the repo can read `evals/evals.json`, including the flawed reel's expected findings.
- Grade video assertions on frames you extract yourself (`contact-sheet.mjs` in the create skill), not on the run's
  own stills or claims, and run `check-video.mjs` and `edge-scan.mjs` on every reel.

Anthropic's `skill-creator` skill can run and grade with-and-without pairs, but it cannot read this file as it is. It
expects one `evals/evals.json` per skill inside that skill's directory, with a `skill_name` matching the skill's
frontmatter, assertions under `expectations` rather than `assertions` and `files` paths relative to the skill root.
Using it means splitting this file per skill (`create` takes the first two cases, `review` the third), renaming those
fields and rewriting `files` relative to each skill's directory. Keep the staging step either way: a run must not see
the file it is graded against.

These are a manual suite in this repo's own format, not `claude plugin eval` cases: that command discovers
`<dir>/**/case.yaml` or `prompt.md` plus `graders/*.md`, which `evals/` does not have yet. Porting them is open work.
