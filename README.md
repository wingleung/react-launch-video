# React Launch Video

A Claude Code plugin for launch videos of your React app: short, cinematic videos in the style of Linear, Vercel and
Framer launches, rendered in [Remotion](https://www.remotion.dev) from your app's **real** components instead of a
redrawn mockup. It does CLIs too. It is not for Vue, Svelte, Angular or plain HTML.

It gives Claude a proven method (storyboard first, reading-time holds, overlapping handoffs, a camera that moves then
holds still), a starter kit of scene components and scripted quality gates that a render has to pass before it counts
as done. A second skill reviews a reel against the same standards.

[![A reel of the Relay test fixture: title card, the inbox, the settings dialog and the end card](docs/demo.gif)](https://wingleung.github.io/react-launch-video)

That reel is built from `evals/fixtures/relay-web`, the small React app in this repo, and rendered by the plugin with
no hand editing ([full quality MP4](docs/demo-relay-web.mp4)). The product page is
[wingleung.github.io/react-launch-video](https://wingleung.github.io/react-launch-video).

## Install

In Claude Code:

```
/plugin marketplace add wingleung/react-launch-video
/plugin install react-launch-video@react-launch-video
```

That is `plugin@marketplace`, and both are called `react-launch-video`. You also need **Node.js 22.18 or later** and
**ffmpeg** on your PATH. Ask Claude to run the doctor (`/react-launch-video:create run the doctor`) and it prints the
install command for your OS when something is missing.

**What it costs.** Remotion is free for individuals, non-profits and companies with up to 3 employees. A for-profit
company with more than 3 employees needs a
[Remotion Company License](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md). The fixture reel above takes
20 to 30 minutes. Expect a few hours the first time on a real codebase, mostly the one-time component split, and most
of it unattended.

| Skill                        | Use it for                                                                                                                                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/react-launch-video:create` | Plan, build, render and verify a reel of your app or CLI                                                                                                                                     |
| `/react-launch-video:review` | Review a reel you already have, a Remotion project or a bare MP4. Findings come ranked by severity with a fix each, and anything it cannot check from frames alone is listed as not verified |

Claude also picks them up on its own when you ask for a promo video, launch reel or feature teaser. To review a video,
ask `/react-launch-video:review the video in ./promo.mp4 and tell me what to fix`.

## Try it before you point it at your product

Clone this repo and run the plugin against the fixture inside it. Nothing in your own code is touched, and you get a
finished reel to judge the method by:

```bash
git clone https://github.com/wingleung/react-launch-video && cd react-launch-video
```

Then, in Claude Code from that directory:

```
/react-launch-video:create a launch video of the Relay inbox and the settings dialog, in evals/fixtures/relay-web
```

## Using it on your product

Open Claude Code in your product's repo and ask for what you want, in a slash command or plain English ("make me a
launch video of the settings page"):

```
/react-launch-video:create a 20 second launch video of our issue inbox and the command palette
```

1. **It reads your product** and asks what the reel should say, then writes a storyboard: beats, timings, easings,
   which data is real and which is a placeholder. Read that storyboard, it is where changes are cheap.
2. **It makes your components renderable**: where a page fetches its own data, it splits it into a display-only view
   that takes its state as props, and checks your typecheck, tests and build before and after. Stay for this step,
   and start from a clean git tree so you can read the diff.
3. **It builds a reel package** next to your product (`reel/` by default, Remotion pinned) and renders drafts,
   reviewing frames as it goes.
4. **It runs the [quality gates](docs/quality-gates.md)** and keeps iterating until they pass, reporting which gate
   still fails if it cannot.
5. **You get** `reel.mp4` (1920x1080 unless you ask for [another size](docs/other-sizes.md)), `storyboard.md` and the
   frames it reviewed. Ask for motion blur at the end ("render the final with motion blur"), it multiplies render time.

It does not upload or send your product, your reel or your data anywhere. It downloads npm packages and Remotion's
headless browser. Remotion itself reports render usage to remotion.pro only when a Remotion license key is configured,
which the plugin never does. See [SECURITY.md](SECURITY.md).

## What it covers

- **React web apps.** The reel imports your real components and renders them frame by frame, so what ships is what the
  video shows. Next.js works for client components (`"use client"`), not server components, and Gatsby does not work.
  [What renders, and what does not](plugin/skills/create/references/frameworks.md) has the full table.
- **CLIs.** The terminal session is recreated from the CLI's own source: its strings, colours and prompts, traced
  through the code path that actually runs.

Other stacks (Vue, Svelte, Angular, plain HTML, native apps) are out of scope. The skill says so and stops, rather
than redrawing your product by hand.

## Documentation

- [Quality gates](docs/quality-gates.md): the six gates, how to read `edge-scan` output and the tools around them
- [Troubleshooting](docs/troubleshooting.md): a black still, missing styles, fonts, version mismatches
- [Vertical, square and 4:5 cuts](docs/other-sizes.md): another frame size for stories and social posts
- The skills themselves: [create](plugin/skills/create/SKILL.md) and [review](plugin/skills/review/SKILL.md), with the
  create skill's references on [pacing](plugin/skills/create/references/pacing.md),
  [the storyboard](plugin/skills/create/references/storyboard.md),
  [what to change in the kit](plugin/skills/create/references/customise.md) and
  [techniques and pitfalls](plugin/skills/create/references/techniques.md)
- For AI assistants: [llms.txt](https://wingleung.github.io/react-launch-video/llms.txt) indexes all of it, and
  [llms-full.txt](https://wingleung.github.io/react-launch-video/llms-full.txt) is the whole set in one file

## Updating and removing

```
/plugin update react-launch-video
/plugin uninstall react-launch-video
```

Restart Claude Code after an update to apply it. Installed copies only update when the version in
`plugin/.claude-plugin/plugin.json` changes, see [CHANGELOG.md](CHANGELOG.md). Uninstalling leaves the
`react-launch-video` marketplace in place (`/plugin marketplace remove react-launch-video` removes it) and leaves any
`reel/` package it built in your product, which is yours to keep or delete.

## Licensing

This plugin is MIT licensed (see [LICENSE](LICENSE)). It is an independent project, not affiliated with or endorsed by
Remotion or the React project. Remotion and React are trademarks of their owners. The plugin states Remotion's licence
terms before it installs anything. Fonts in a reel must come from your product or a licensed package such as
`@fontsource`, never copied out of your system font folder or another app, and the skill enforces this.

## Contributing

Issues and pull requests are welcome. Keep changes to the method sourced (a reference, a measurement or a rendered
before and after) and run `./scripts/check.sh`. Start with [CONTRIBUTING.md](CONTRIBUTING.md), and
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) applies here. [evals/README.md](evals/README.md) covers the test cases and
fixtures.
