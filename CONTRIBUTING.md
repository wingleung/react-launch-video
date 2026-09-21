# Contributing

Thanks for helping. This plugin is a method plus a kit, so the bar for changes is evidence rather than taste.

## The rule that matters

**Every change to the method is backed by evidence**: a citable source, a measurement, or a rendered before and after.
"This looks nicer" is not enough, because every rule here was paid for by a reel that failed without it. Say in the pull
request which of the three you have.

## Before you open a pull request

You need Node 22.18 or later, ffmpeg and the `claude` CLI on your PATH. `node
plugin/skills/create/scripts/doctor.mjs` checks the first two. A reel renders on 18, but the claim gate imports the
kit's TypeScript directly to re-derive every measured number, and running TypeScript without a build step needs
22.18.

```bash
./scripts/check.sh
```

It runs exactly what CI runs: manifest validation, the release consistency check, the client-name gate, formatting,
the skill path check, the kit typecheck, the storyboard easing check, the font check, the gate tests and the fixtures.
It names the steps that failed on the last line, so assert its exit code rather than reading its output for green.

If you changed the kit, also state that you rendered something with it and that `check-video.mjs` and `edge-scan.mjs`
passed on that render. The kit's line numbers are cited by the storyboard example, so the easing check will tell you
when they drift.

## What belongs where

- `plugin/skills/create` the authoring skill: SKILL.md is the workflow, `references/` the sourced detail, `assets/kit`
  the code that gets copied into a reel, `scripts/` the gates.
- `plugin/skills/review` the review skill, which reads the create skill's references through `${CLAUDE_SKILL_DIR}`.
- `evals/` test cases and fixtures. Fixtures are fictional ("Relay") and deliberately contain the traps real products
  have.

Nothing client-owned or personal goes in this repo. The client-name gate is there to catch slips.

## Regenerating the demo

`docs/demo.gif` and `docs/poster.png` both come from `docs/demo-relay-web.mp4` through `./scripts/make-demo.sh`. Do
not convert the MP4 by hand: both start after the title card has risen, because the reel fades up from black and
frame 0 is the only frame a thumbnail ever shows.

## Scope

v1 covers React web apps and CLIs. Support for other stacks is a real piece of work, not a tweak: open an issue first
so we can agree what "rendering the real product" means there.
