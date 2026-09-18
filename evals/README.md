# Evals

Three test cases in `evals.json`, each with the assertions a grader checks:

| Case                   | Skill  | Fixture                                          | Cost                                  |
| ---------------------- | ------ | ------------------------------------------------ | ------------------------------------- |
| `relay-web-focus-mode` | create | `fixtures/relay-web`, a small React app          | renders video, about 20 to 30 minutes |
| `relay-cli-sync`       | create | `fixtures/relay-cli`, a small Node CLI           | renders video, about 20 to 30 minutes |
| `review-flawed-reel`   | review | `fixtures/flawed-reel`, a reel with seeded flaws | code only, a few minutes              |

The fixtures are fictional ("Relay") and contain the traps a real product has: a clock-based greeting, CSS transitions,
a debounced search, and a CLI prompt helper whose dark theme and key help line the real `sync` path never uses.

## Running them

Run each case twice: once with the plugin and once without (a baseline), in separate fresh sessions, then grade both
against the case's assertions. Anthropic's `skill-creator` skill, if you have it, does this end to end. Two rules learned the hard way:

- Keep `evals.json` and every assertion out of the directory a run works in, and copy them in only for grading. Runs
  that can read their assertions score higher for the wrong reason.
- Grade video assertions on frames you extract yourself (`contact-sheet.mjs` in the create skill), not on the run's
  own stills or claims, and run `check-video.mjs` and `edge-scan.mjs` on every reel.

These are a manual suite in this repo's own format, not `claude plugin eval` cases: that command discovers
`<dir>/**/case.yaml` or `prompt.md` plus `graders/*.md`, which `evals/` does not have yet. Porting them is open work.
