# React Launch Video

Launch videos of React apps and CLIs, rendered in [Remotion](https://www.remotion.dev) from your real components,
with scripted quality gates and a review skill. Not for Vue, Svelte, Angular or plain HTML.

Ask Claude for a launch video and it reads your product, writes a storyboard you can edit, renders your own React views
(or recreates your CLI's terminal from its source) and keeps iterating until six quality gates pass. Every caption is
held long enough to read and the camera stays still while you read it. A second skill reviews any reel, a Remotion
project or a rendered MP4, and ranks what it finds by severity with a fix for each.

## Skills

- `/react-launch-video:create` plans, builds, renders and verifies a reel of your React app or CLI.
- `/react-launch-video:review` reviews an existing reel against the same standards.

Claude also picks them up when you ask for a promo video, launch video or feature teaser.

## Requirements

Node.js 22.18 or later and ffmpeg on your PATH. Ask `/react-launch-video:create run the doctor` and it prints the
install command for anything missing.

## What it runs, fetches and changes

- **Runs** the plugin's own Node scripts (the quality gates, the contact sheets and the doctor), Remotion's renderer
  through the reel package's scripts and ffmpeg, all on your machine.
- **Fetches** npm packages for a reel package it creates next to your product (Remotion and React, pinned to exact
  versions) and Remotion's headless browser on the first render.
- **Changes** your repository: it adds that reel package and may split a page into a display-only view that takes its
  state as props. It checks your typecheck, tests and build before and after the split, so start from a clean git tree
  and read the diff.
- **Sends nothing.** Your product, the reel and your data are never uploaded anywhere. Remotion itself reports render
  usage to remotion.pro only when a Remotion license key is configured, which the plugin never does.

## Licensing

The plugin is MIT licensed. Remotion has its own licence: free for individuals, non-profits and companies with up to 3
employees, while a for-profit company with more than 3 employees needs a
[Remotion Company License](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md). The plugin states this
before it installs anything. React Launch Video is an independent project, not affiliated with or endorsed by Remotion
or the React project.

Full documentation, a 20 to 30 minute trial on a bundled test app and troubleshooting:
[github.com/wingleung/react-launch-video](https://github.com/wingleung/react-launch-video). Product page:
[wingleung.github.io/react-launch-video](https://wingleung.github.io/react-launch-video).
