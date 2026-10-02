# Demo reel source

The source of `docs/demo-relay-web.mp4`, the plugin's showcase reel, built by following the create skill on the request
"a launch video of the Relay inbox and the settings dialog".

- `relay-web/` is "the user's product": a copy of `evals/fixtures/relay-web` with one display-only split, which the
  skill's step 3 asks for. `src/components/InboxView.tsx` holds the inbox markup moved verbatim out of `App.tsx`, so the
  reel can pass the greeting and Focus mode as props instead of reading the clock and React state.
- `reel/` is the Remotion package the skill scaffolds: the kit in `src/`, the measured boxes in `src/boxes.ts`, the
  camera in `src/camera.ts` and the cues in `src/timeline.ts`. `reel/storyboard.md` has the beats, reading-time holds,
  easings, truthfulness sources and the frame review log.

Remotion is free for individuals, non-profits and companies with up to 3 employees. A larger for-profit company needs a
Remotion Company License.

## Render it

From the root of a fresh clone, with Node 22 and ffmpeg on the PATH:

```sh
npm ci --prefix demo/relay-web
npm ci --prefix demo/reel
npm --prefix demo/reel run render
```

The first install brings the product's own React and its `@fontsource/inter`, which the reel imports from there. The
first render also downloads Remotion's headless Chrome into `demo/reel/node_modules`, so it needs the network once. The
render takes about a minute and writes `demo/reel/outputs/reel.mp4` (1920x1080, 60fps, 24.53s, no audio).

Two renders of the same source match to an SSIM of 0.9999 rather than byte for byte. Chrome repaints only the part of
a frame that changed, so the border of the button under the cursor anti-aliases a level or two differently depending on
which frame a parallel render tab drew before it, and the encoder carries that through the next second of video. Every
value the reel sets is a function of the frame alone, and the same frames rendered in one tab come out identical.

To publish it, copy it over the README's demo and rebuild the GIF and the poster from it:

```sh
cp demo/reel/outputs/reel.mp4 docs/demo-relay-web.mp4
./scripts/make-demo.sh
```

## Check it

The skill's six gates, run from the repo root against the render and its source:

```sh
(cd demo/reel && node ../../plugin/skills/create/scripts/gates.mjs outputs/reel.mp4 \
  --src src --storyboard storyboard.md --min 18 --max 25)
```

`--min 18 --max 25` is the length the brief asked for. Edge-scan reports content crossing the top and bottom edges from
10.1s to 14.5s, where the push-in on the settings dialog bleeds the window's top and bottom borders off the frame. The
frame review log in `reel/storyboard.md` records the crops that show no text line, row or control is cut there.
