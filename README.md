# Product Reel

A Claude Code plugin for cinematic product reels: short launch videos in the style of Linear, Vercel and Framer,
rendered in [Remotion](https://www.remotion.dev) from your product's **real** components instead of a redrawn mockup.

It gives Claude a proven method (storyboard first, reading-time holds, overlapping handoffs, a camera that moves then
holds still), a starter kit of scene components and scripted quality gates that a render has to pass before it counts as
done. A second skill reviews a reel against the same standards.

| Skill                  | Use it for                                                                     |
| ---------------------- | ------------------------------------------------------------------------------ |
| `/product-reel:create` | Plan, build, render and verify a reel of your app or CLI                       |
| `/product-reel:review` | Review an existing reel or Remotion project and get ranked findings with fixes |

Claude also picks them up on its own when you ask for a promo video, launch reel or feature teaser.

![A reel of the Relay test fixture: title card, the inbox, the settings dialog and the end card](docs/demo.gif)

That reel is built from `evals/fixtures/relay-web`, the small React app in this repo, and rendered by the plugin with
no hand editing ([full quality MP4](docs/demo-relay-web.mp4)).

## Quickstart

Install (below), then open Claude Code in your product's repo and ask for what you want:

```
/product-reel:create a 20 second reel of our issue inbox and the command palette
```

Plain English works too ("make me a launch video of the settings page"), and Claude picks the skill up on its own.

What happens next:

1. **It reads your product** and asks what the reel should say, then writes a storyboard: beats, timings, easings, which
   data is real and which is a placeholder. Read that storyboard, it is where changes are cheap.
2. **It builds a reel package** next to your product (`reel/` by default) and renders drafts, reviewing frames as it
   goes.
3. **It runs the gates** and keeps iterating until they pass, reporting which gate still fails if it cannot.
4. **You get** `reel.mp4` (1920x1080), `storyboard.md` and the frames it reviewed.

The two fixture cases in `evals/` take **20 to 30 minutes** each. Budget **30 to 60 minutes** and several renders
for a first reel of a product it has not seen, most of it unattended.
Ask for motion blur at the end ("render the final with motion blur"), it multiplies render time so it is not used during
iteration.

### What it changes in your repo

- **It adds** a reel package (its own `package.json` and `node_modules`, Remotion pinned).
- **It may edit your components**: a page usually has to be split into a display-only view that takes its state as
  props, so it can be rendered frame by frame. The split is mechanical and the skill verifies your typecheck, tests and
  build still pass, but start from a clean git tree so you can read the diff.
- **It does not** upload or send your product, your reel or your data anywhere. It does download npm packages and
  Remotion's headless browser.

## What it covers (v1)

- **React web apps.** The reel imports your real components, split into display-only views, and renders them frame by
  frame. What ships is what the video shows.
- **CLIs.** The terminal session is recreated from the CLI's own source: its strings, colours and prompts, traced
  through the code path that actually runs.

Other stacks (Vue, Svelte, Angular, native apps) are out of scope for v1. The skill says so rather than redrawing your
product by hand.

## What you get in a reel

- A title card that recedes as the product rises in front of it, numbered feature captions and an end card, all held for
  their reading time (characters ÷ 17 + 0.5s, measured from fully settled).
- A camera that pushes in on what matters, computed from measured bounds, and holds perfectly still while text is read.
- Frame-perfect determinism: no CSS transitions, clocks or randomness leaking into the render.
- Optional band-free motion blur for the final render.

Every rule is sourced in the create skill's `references/pacing.md`.

## Quality gates

These run on every render, and a failing one means another pass rather than a caveat in the report:

| Gate                   | Fails when                                                                    |
| ---------------------- | ----------------------------------------------------------------------------- |
| `check-video.mjs`      | wrong resolution or length, no fade from or to black, an empty stage mid-reel |
| `edge-scan.mjs`        | a border rests inside the action-safe margin, or content runs off the frame   |
| `easing-inventory.mjs` | an animated value does not have the easing the storyboard says it has         |

These are tools rather than gates, and pass or fail nothing:

| Tool                     | Does                                                           |
| ------------------------ | -------------------------------------------------------------- |
| `contact-sheet.mjs`      | builds the frame sheets and crops the review is done on        |
| `doctor.mjs`             | checks this machine has Node and ffmpeg with the right filters |
| `render-motion-blur.mjs` | renders the final with band-free motion blur                   |

The kit adds one more: `assertStillWhileReading` runs when the composition loads and throws when the camera moves
while text is being read, so that render fails in seconds instead of after an hour.

## Install

In Claude Code:

```
/plugin marketplace add wingleung/product-reel
/plugin install product-reel@product-reel
```

That is `plugin@marketplace`, and both are called `product-reel`.

### Prerequisites

- Node.js with npm (tested with Node 22)
- ffmpeg and ffprobe on your PATH. A system ffmpeg with the `tmix` filter is only needed for the motion blur render.

Ask Claude to run the doctor (`/product-reel:create run the doctor`) to check. It prints the install command for your
OS when something is missing. Remotion is installed per reel with npm and downloads its own headless browser on the
first render.

## Troubleshooting

| Symptom                                      | Cause and fix                                                                                                                                                          |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The doctor reports a missing tool            | Install it with the command it prints, then open a new terminal so the PATH is picked up                                                                               |
| Motion blur render fails on a missing filter | Remotion's bundled ffmpeg has no `tmix`. Install a system ffmpeg and make sure it is first on the PATH                                                                 |
| Styles missing in the render                 | Utility CSS (Tailwind, UnoCSS) has to be generated over the reel and your components before each render, see the skill's step 4                                        |
| Text renders in a fallback font              | Fonts must be loaded through `@remotion/fonts` from your product or a licensed package, not a stylesheet link                                                          |
| Frames differ between renders                | Something is not derived from the frame: a clock, `Math.random`, a CSS transition or an async effect. The storyboard's determinism table lists how each is neutralised |
| A gate fails and the reel looks fine         | Read the gate's output before overriding it. It reports times, so crop those frames and look at full resolution                                                        |

## Updating and removing

```
/plugin update product-reel
/plugin uninstall product-reel
```

Installed copies only update when the version in `plugin/.claude-plugin/plugin.json` changes.

## Licensing

This plugin is MIT licensed (see `LICENSE`).

**Remotion has its own licence.** It is free for individuals, non-profits and for-profit organisations with up to 3
employees. A for-profit company with more than 3 employees needs a Remotion Company License. Read the terms in
[Remotion's LICENSE.md](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md) before using this at work.

Fonts in a reel must come from your product or a licensed package such as `@fontsource`, never copied out of your system
font folder or another app. The skill enforces this.

## Evals

`evals/` holds three test cases and the fixtures they run against: a small React app, a small CLI and a deliberately
flawed reel for the review skill. See `evals/README.md` for how to run them with and without the plugin.

## Contributing

Issues and pull requests are welcome. Keep changes to the method sourced (a reference, a measurement or a rendered
before and after) and run the gate scripts on any change to the kit.
