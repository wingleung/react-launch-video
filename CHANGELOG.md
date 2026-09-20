# Changelog

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
- **Tested against a light-themed product too**, since the falloff was calibrated on a dark one. A light product
  blurs to a bright slab that keeps its own light: the same outro rendered at 53% of the reel's median against the
  dark product's 33%, and the bloom changed nothing either way. So the bloom is for dark products and inert on light
  ones, and `brightest` reads a light product about 18 points low, which is the safe direction. Both are recorded in
  the code rather than left for the next person to rediscover.
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
