# Changelog

## 2.0.1

- **A listing icon** for the Claude plugin directory, at `plugin/.claude-plugin/icon.png`, rendered from the site's
  favicon by `scripts/make-icon.mjs` so the two cannot drift apart.
- **The product's `.env` stays out of the reel.** The bundling notes said a Vite product's `import.meta.env` needs a
  `DefinePlugin` without saying what goes in it. They now say placeholder values, never the product's `.env`, since a
  reel takes its data as props and no key or token belongs in its bundle. The grep command beside it had a stray
  quote that kept it from running.
- **Credit where it is due.** The README, the listing text and the product page now say plainly that Remotion does
  the rendering and the plugin is a method on top, link Remotion wherever a reel is explained and point anyone who
  wants to prompt a video from scratch to Remotion's own Agent Skills.

## 2.0.0

The plugin is renamed from `product-reel` to **`react-launch-video`**, so the name says what it makes and the stack it
makes it for. The method, the kit and the gates are unchanged.

- **New install id and commands.** `react-launch-video@react-launch-video`, `/react-launch-video:create` and
  `/react-launch-video:review`. An install of `product-reel` does not follow the rename: remove it with
  `/plugin uninstall product-reel` and `/plugin marketplace remove product-reel`, then install the new name.
- **Why this name.** It is named for the job, the way HyperFrames names its `product-launch-video` skill, with the
  stack in front because that is the scope. "Remotion" is kept out of the name: Remotion publishes its own Claude Code
  plugin, its terms reserve its marks, and a plugin directory holds names that read as someone else's brand.
  `product-reel` also collided with an existing product-reel skill.
- **Scope said up front.** The manifest, both descriptions and the README say React apps (and CLIs) in Remotion, and
  name what it is not for. Plain HTML joins Vue, Svelte and Angular in the create skill's refusal, which
  `references/frameworks.md` already applied to "any site with no React component at all".
- **A product page** at wingleung.github.io/react-launch-video, built from `site/` and deployed by
  `.github/workflows/pages.yml`, now the manifest's `homepage`.

### Fixed in a review before publishing

A six-part review (security, scripts, kit, docs, site and evals) ran before the repository went public. Every finding
below was reproduced first, and each script fix has a regression test.

- **Gates.** The runner passes a reel that is not 16:9 (it handed `--width` to `edge-scan`, which rejected it) and
  fails a hollow package with no motion or no claims, which used to pass all six. `edge-scan` scales its faint-border
  threshold per frame, so a bright moment elsewhere no longer hides a resting border. `fonts` compares whole family
  names, reads JSX `fontFamily` and treats `@remotion/google-fonts` as a network font. Duration comes from the video
  stream, not the container. `add-music` pads a short track instead of cutting the video. The runner and
  `render-motion-blur` use the running Node directly and no shell, so neither needs `node` or `npx` on the PATH and a
  Windows path with a space cannot split. Old Node gets the version message instead of a stack trace.
- **Kit.** A vertical or square cut frames on its own centre. Overlapping captions cross-fade instead of popping. The
  title hold counts from the last word settling. Reveals keep an element's own transform. Unordered camera keys and
  impossible fits throw. Keycaps use the shared reading time. The scaffold restores the note that the product's
  dependencies are not copied, ships `@remotion/fonts` pinned and throws when the product path does not exist.
  `kit-check` now renders the assembled package and cleans up its temp project, which it used to leave behind at 250MB
  a run.
- **Docs.** The skills match the kit's real numbers (easeOut, exit blur, keycap minimum, the 0.05s product lead), list
  `gates.mjs`, say where the product path is set and give `reading-time.mjs` its real input. The README says what a
  run costs up front. `SECURITY.md` and `CODE_OF_CONDUCT.md` link this repository's private reporting form.
- **Listing.** The marketplace entry no longer overrides `plugin.json`'s description in `/plugin`, and `release-check`
  now asserts that instead of only counting characters.
- **Directory readiness.** `plugin/README.md` is the listing text the Claude plugin directory requires, and says what
  the plugin runs, fetches and changes. One description is shared by both manifests, the site and the repository. Line
  endings are left to Git, since the directory refuses a `.gitattributes` that rewrites file contents, and prettier
  accepts either ending instead. A 1280x640 card is the repository's social preview and the site's share image.
- **A demo reel that passes its own rule, with its source.** The old demo sliced a line of text at the top edge during
  a pull-back, which the skill's own edge rule fails. It was re-made by following the create skill on the bundled test
  app, with every `CROSSES` range cropped every 0.1s, and its source is now in `demo/` so it can be rendered again. The
  GIF, poster, 720p copy, social card and every number the site states about the reel were redone from it.
- **What re-making the demo taught the skill.** Measure boxes after the product's fonts load (the demo's window read
  17px short before Inter arrived), give the cursor its own compositing layer so parallel renders agree, add a reading
  window for key UI text, tag measured figures in the frame review log for the claims gate, and drop the logo cue
  from the title when a product has no logo.
- **Docs an assistant can use.** A test with fresh Claude sessions answering twelve user questions scored 12 of 12 from
  the site's `llms.txt` but 6 of 12 from the README, which never linked the skill docs and called `edge-scan`'s
  `CROSSES` a failure (it exits 0). The README is now half the length and links three new guides in `docs/` (quality
  gates, troubleshooting, other frame sizes) plus the skills and references. `llms.txt` lists them in reading order,
  `llms-full.txt` serves every document in one file and the page declares its `llms.txt` with `rel="describedby"`.
- **Site.** Every Copy button has its own name and announces the copy. The timeline's stripes meet 3:1 and each beat
  says where it moves. Phones get a 720p hero reel (616KB instead of 4MB). Pages write access is scoped to the deploy
  job and every action is pinned to a commit.
- **Evals.** Runs stage the fixture outside the repo so they cannot read their own assertions. The fixtures describe
  the product rather than the traps. The flawed reel renders every flaw its assertions grade. The web fixture's Vite
  moves to 7.3.6 for its dev-server advisories, and the CLI fixture uses `relay.example`.

## 1.5.0

Three audits agreed the method was sound and that a stranger could not follow it to a finished reel. This release is
about the on-ramp.

- **The kit now ships a reel package.** It had no `package.json`, no `tsconfig.json`, no `Root.tsx`, no `index.ts`
  and no `registerRoot` anywhere, while step 1b said to "stand up a bare Remotion package" and gave nothing to stand
  it up with. `assets/scaffold/` is the package root and `assets/kit/` is its `src/`, which is the split `SKILL.md`
  already papered over with a parenthetical. Copy two directories, `npm install`, `npm run still`, and a frame comes
  out. `kit-check.mjs` assembles the same two halves, so CI typechecks the pins users actually get.
- **One command runs every gate.** `scripts/gates.mjs` replaces six hand-typed commands that had four argument
  shapes and three different names for "point at the other artefact". On a real reel those were re-run once per
  iteration, 36 to 60 invocations across a session, each one a permission prompt.
- **The runner refuses to start on a reel that was never finished.** Four gates could be satisfied by doing less
  work rather than more: write no claims and the claim gate passes, load no font and the font gate only warns. It
  now checks for a missing storyboard, an unedited template and the kit's own placeholder colours, and says so in
  about twenty milliseconds rather than after a twenty minute render.
- **Every script invocation in both skills is absolute.** They were bare relative, so `node scripts/check-video.mjs
outputs/reel.mp4` had no working directory that satisfied both halves: `scripts/` only exists under the skill,
  `outputs/` only under the reel. It hit six times on the first gate run. `skill-paths.mjs` now validates 24
  references where it validated 5, and fails a bare one.
- **`references/customise.md`**, the twenty or so things the kit leaves open, five of which were documented. Three
  of them are theme colours in three different files, and a reel that sets one and misses the others renders
  perfectly in someone else's palette, which no gate can see.
- **Every gate failure names its lever.** `check-video`'s duration gate fails correct reels, because the skill lets
  the user set the length while the gate defaults to 15 to 30, and nothing said `--min` and `--max` existed.
- **The scaffold's proof-of-life still rendered frame 0**, which is the fade from black: zero lit pixels, the one
  image that cannot tell a working install from a broken one, directly above the line "A command that exits 0 is not
  a pass".
- The Remotion licence notice moves ahead of the first install and `doctor.mjs` prints it. `create`'s description
  gains the negative scope clause `review` already had. `frameworks.md` gains the row for a site with no React
  component at all, which it had no answer for. `render-motion-blur.mjs` gets its first test.

## 1.4.0

The blur fix in 1.3.0 was verified against the curves and never against pixels, and it was a regression. Rendering it
is what found that, so this release is mostly about the difference between a number a curve predicts and a number a
frame shows.

- **The outro no longer goes dark.** Defocus spreads a highlight, so it takes peak brightness with it, and a product
  screenshot is mostly thin text on a dark panel: rendered, peak luma fell from 243 to 76 in three frames as the exit
  blur crossed 8px and bottomed at 11% of the reel's median. Blur can make the product unreadable or keep the stage
  lit, not both. The outro now uses three levers, the blur for unreadability, a bloom that puts back the light the
  blur takes, and a real overlap with the end card starting 0.4s into the outro rather than 0.5s. The darkest outro
  frame goes from 11% of the median to 33%.
- **`brightest` reads opacity and blur, not opacity alone.** A blurred layer keeps all of its opacity while losing
  almost all of its light, so the old signal certified a near-black frame as 96% lit and the claim gate agreed with
  it. It now folds in a falloff keyed on blur per stroke width, calibrated on two far-apart points from a real render
  (a 112px wordmark at 4.3px keeps 97%, 2px UI text at 8px keeps 30%), and it agrees with the render at both handoffs
  to within 3 points. `kit-check` pins both calibration points and its monotonicity. It is still a smoke alarm:
  `check-video.mjs` on a real render measures pixels instead of predicting them, and it is the authority.
- **A new gate, `scripts/fonts.mjs`.** It says where every font comes from and fails one taken from a machine's font
  folder, one fetched over the network at render time, or a family named in a stack that nothing loads. The last is
  the dangerous one: it renders in the fallback and looks entirely plausible. The kit's own `reel.css` asked for Inter
  and never loaded it, which this found on its first run. The rule existed in one clause in the middle of a sentence
  in SKILL.md and two evaluation rounds could not tell whether a finished reel had obeyed it.
- **The review skill runs the source gates too**, `fonts.mjs` and `claims.mjs`, so a reviewer can decide font
  provenance and stale timing numbers instead of guessing at them from a finished video.
- **`doctor.mjs` reports the Node version the claim gate needs.** It checked 18, which renders but cannot import the
  kit's TypeScript; type stripping landed in 22.18. A user on 20 used to meet that requirement as an import error an
  hour into a reel.
- **Tested against a light and a mid-grey product too**, since the falloff was calibrated on a dark one. Both blur to
  a bright slab that keeps its own light: the same outro rendered at 53% and 82% of each reel's median against the
  dark product's 33%, and the bloom moved none of them. So the bloom is for dark products and inert on paler ones,
  and `brightest` reads them low, which is the safe direction.
- **`LIGHTNESS` in `curves.ts` makes the outro product-dependent.** One number, 0 for a dark product UI and 1 for a
  white one, read off the product's own surface token. It drives how fast the product leaves and how much it blooms,
  because the two ends fail in opposite ways. At 0 it is a no-op: the dark reel renders byte for byte identical to
  before. Set on the test products it took the slab behind the wordmark from 35% of peak brightness to 12% on a
  mid-grey product and from 23% to 3% on a light one, and all three palettes then land within 5.6 to 5.8:1 of
  wordmark contrast. `kit-check` pins the default and the direction of both derived values.
- **A new gate, `scripts/lightness.mjs`**, so `LIGHTNESS` is enforced rather than advisory. It reads the product's
  surface as a high percentile of the frame's non-stage pixels and fails when that disagrees with what `curves.ts`
  declares, naming the direction and the remedy, because the two ends go wrong in opposite ways. Across five reels
  differing only in palette, flat dark, flat mid-grey, flat white, a white gradient and a white panel with a dark
  sidebar, it lands within 0.03 of the truth on all five.
- The percentile is deliberate on both counts: it has to ignore the product's text, which is a minority of its area,
  and it has to follow the brighter surface when a product has two, because `LIGHTNESS` governs how much **peak**
  brightness survives the blur and a peak comes from the brightest large thing rather than from an average. The
  first version took the most repeated luma instead, on the reasoning that a flat UI background is the most repeated
  value. That is true right up until a product has no flat background: a near-white gradient spread its pixels thin
  enough that the densest single value was the stage's own glow, and the gate read a white product as 0.06 and told
  its author to make it darker.
- **The opposite risk appears as the product gets paler, and the lightness gate is what now reports it.** At the frame where the end card's
  wordmark is half risen, the blurred product behind it sits at 7% of the reel's peak brightness when the product is
  dark, 23% when it is light and 35% when it is mid-grey. All three pass the 12px rule, so the card always lands on
  something unreadable, but on a dark product that is near-blackness and on a pale one it is a visible slab. Rule 1
  now says so and names the lever, which is the opacity fade rather than the blur.
- The claim lint gains a **[rendered]** tag for figures read off real frames that no curve can re-derive. That class
  of number is most of this release and there was no honest way to write one down.

## 1.3.0

Every number the kit and the references state about the reel's timing is now re-derived from the code on every run.

- **A new gate, `scripts/claims.mjs`.** Six wrong numbers shipped in kit comments over two evaluation rounds, each one
  written as a justification for a timing choice and never looked at again once the timing moved, so each read as
  documentation while being a defect report. A measurement is now written as a claim,
  `[measured: product blur at endCard is 14.0px]`, and the gate imports the reel's own curves and re-derives it. It
  also fails prose that puts a percentage or a pixel figure beside a signal with no claim behind it, which is the
  shape all six had.
- **`assets/kit/curves.ts`** holds every opacity and blur curve as a plain function of seconds, and `Reel.tsx`,
  `Titles.tsx` and `Lockup.tsx` call it instead of keeping their own copies. A number checked against a second copy of
  the timing proves nothing about the reel that ships.
- **The product's exit blur no longer rides its fade.** It runs on its own ramp that finishes as the end card starts,
  reaching 14px where it used to reach 5px, so the product is unreadable before anything on the card is readable.
  Rule 1 asked for "blurred", which 5px satisfied on paper while still showing legible window shapes under the
  wordmark, so the threshold is now 12px and measured.
- **Two stale comments corrected**, both found by the new gate rather than by reading: the product is at 50% when the
  end card starts, not 15%, and the end card starts on its own cue rather than where the product has "faded out".
- `pacing.md` marks a threshold it sets with **[rule]**, the way it already marks unsourced practice [convention].
- `claims.mjs` needs Node 22.18 or later, since it imports the kit's TypeScript rather than reimplementing it.

## 1.2.0

An evaluation round found three holes and the gate that was letting them through.

- **The empty-stage gate now scales with depth.** It found both holes in the test reel and discarded both for being a
  frame or two short of a flat six-frame rule, including a near-black frame held five frames.
- **Both kit handoffs are retimed, and measured.** The title handoff left the brightest thing on screen at 9.7%. The
  outro cannot be fixed by timing at all: blur is what makes a leaving product unreadable, not opacity, and rule 1 in
  `pacing.md` now says so with the numbers.
- **Three comments in the kit asserted things that were not true.** Each was written as a justification.
- **`easing-inventory` no longer fights the storyboard template**, which asks for file references in tables it was
  reading as easing citations. It reads the easing table only, and the kit's storyboard now cites symbols.
- **`edge-scan` scales its threshold down for low-contrast content**, so a dark theme's own borders are not invisible
  to it. It never scales up, so bright content is unaffected.
- **Nine pieces of friction from a real build run** are now in the skill: a measurement step of its own, what to do
  when captions and reading time and a requested length collide, why a wide product needs a narrower viewport rather
  than a bigger zoom, and `position: fixed` escaping the camera.
- `Cursor` takes any number of clicks, and `render-motion-blur` no longer leaves a 40MB file among the deliverables.

## 1.1.0

Everything here came from two runs on real products plus an audit, not from the test fixtures.

- **Fails early on a product that cannot render.** A new step renders one still of one real component before the
  storyboard and before any file is edited, and `references/frameworks.md` decides scope by rendering model rather
  than by framework name, so React Server Components are refused up front instead of at the first render.
- **Guards the repo.** The step that edits your components now checks `git status` first, takes a typecheck, test and
  build baseline before the split rather than only after, and offers to revert the split at the end.
- **A real app integration section** in `references/techniques.md`: Vite-only imports, public paths, monorepo
  resolution, silent CSS extraction, portals escaping the camera, late-mounting overlays, per-frame state, iframes.
- **Legibility is decided in the storyboard**, as source px times zoom against an 18px floor, instead of being found
  in review after several drafts.
- **Any frame size.** `check-video --width/--height`, `safeArea()` for any frame, `fitCamera` for the frame it
  composes, and a sized `MotionBlurComposition`, so a vertical cut can be gated like a 16:9 one.
- **Tempo.** `beatsAt(bpm)` for reels cut to music, and `add-music.mjs`, which muxes a track with the video stream
  copied rather than re-encoded.
- **Reading time is a gate**: give a reading window its `text` and `assertReadingTime` throws at composition load.
- **Gates that stop nagging.** `easing-inventory` accepts `File.tsx#symbol` citations that survive edits, and
  `edge-scan --accept` silences ranges already cropped and judged deliberate.
- **Fixed:** the kit's own example camera drifted through the end card and failed the kit's own assertion.

## 1.0.0

First public release.

- `create` skill: storyboard-first method with sourced pacing, a Remotion starter kit (camera path, captions, title and
  end cards, cursor, keycaps, highlights, motion blur) and five gate scripts.
- `review` skill: severity-ranked review of a reel or Remotion project against the same standards.
- Scope: React web apps and CLIs.
- Gates: resolution, length, fades, no empty stage in a handoff, action-safe edges, storyboard easings matching the
  code, and `assertStillWhileReading` in the kit, which fails a render whose camera moves while text is being read.
- Prerequisites are Node and ffmpeg. The gate scripts are dependency-free ESM, run as `node <script>.mjs`, so there is
  one runtime rather than two and nothing that depends on a shebang, which Windows does not have.
- The gates have their own test suite, which pins their output and builds the clips that exercise each failure.
