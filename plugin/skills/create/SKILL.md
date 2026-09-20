---
name: create
description: >-
  Plan, build, render and verify a cinematic product reel (promo video, launch video, feature teaser, product demo
  video, animated walkthrough, motion graphics showcase) of a React web app or a CLI, in the style of Linear, Vercel or
  Framer launch videos. Renders the product's real components in Remotion (or recreates a CLI's terminal from its
  source) with a storyboard, sourced reading-time holds, title and end cards, feature captions, a still-holding camera
  and scripted quality gates. Use this whenever someone wants a video of their app, extension, website or CLI, asks how
  to time or pace a promo or demo video, wants a title card, end card or smoother intro or outro, or asks to make a
  Remotion video more cinematic, even if they never say Remotion or cinematic.
---

# Cinematic product reel

A reel that feels like a launch video comes from three things: the real product on screen, pacing that respects reading
time and motion that overlaps and flows instead of starting and stopping. This skill carries a proven method and a
starter kit for all three.

If the `remotion-best-practices` and `motion-design` skills are installed, pair with them for Remotion API details
and motion vocabulary. Neither ships with this plugin. When
the reel is rendered, review it with `/product-reel:review`.

**Scope.** This works for two kinds of product: a React web app, whose real components render inside Remotion, and a
CLI, whose terminal session is recreated from the CLI's own source. For anything else (Vue, Svelte, Angular, native
mobile or desktop apps) say so before starting and stop: the method depends on rendering the real product, and redrawing
it by hand is exactly what the method avoids.

"React web app" is not the whole question, because what has to render is a component called as a function in a browser
with props you supply. React Server Components cannot be. Read `references/frameworks.md` before step 1b: it says which
rendering models, styling systems and font setups work, which need setup, and which to refuse.

Paths below are relative to this skill's folder, `${CLAUDE_SKILL_DIR}`.

## What is in this skill

- `references/pacing.md`: sourced durations, easing curves and rules (reading time, overlaps, camera, outro). Read it
  before writing any timeline.
- `references/storyboard.md`: the beat sheet template with reading-time columns and a worked example.
- `references/techniques.md`: how to render real components frame by frame and every pitfall hit doing it. Read the
  section you need when you reach that step.
- `assets/kit/`: copy-in source. `motion.ts` (easings, `tween`, `smoothPath` camera curve), `reveal.ts` (`useReveal`,
  `boxWithin`), `reel.css`, `timeline.ts`, `camera.ts` and `Reel.tsx` skeletons, `remotion.config.ts` and `scene/`
  components:
  `Stage` (drifting glow backdrop), `Lockup` and `Titles` (title and end card), `Captions`, `Keys` (keycaps), `Cursor`,
  `Ring` (border beam and selection ring).
- `node scripts/doctor.mjs`: checks Node and ffmpeg (with the filters the gates use) and prints install hints for this
  OS. Run it before step 4.
- `node scripts/contact-sheet.mjs`: tiles six frames of a render into a review sheet, or crops one at full resolution.
- `node scripts/check-video.mjs`: hard gates on a render (resolution, duration range, fade from and to black, no
  near-empty stage mid-reel, which is what a queued handoff looks like). Exits non-zero when a gate fails. Pass
  `--width` and `--height` for a cut that is not 16:9.
- `node scripts/edge-scan.mjs`: finds borders resting inside the action-safe margin (fails) and content running off the
  frame edge (ranges to crop and judge). Once a range has been cropped and judged deliberate, list it in
  `--accept "top:7.8-13.0"` so later renders stop reporting it.
- `node scripts/easing-inventory.mjs`: lists every motion call with the easing the code really applies and checks the
  storyboard's easing table against it.
- `scripts/render-motion-blur.mjs` with `assets/kit/MotionBlur.tsx`: optional band-free motion blur for the final
  render.
- `node scripts/add-music.mjs`: puts a track on a finished reel by copying the video stream, never re-encoding it.
  Taking a reel through an editor to add music re-encodes it, and these gradients band when that happens.

## Workflow

### 1. Inventory the real material

Before designing anything, find what already exists, because the reel should show the product as it ships:

- the UI components to show and how they get their data
- design tokens (a Tailwind or UnoCSS config), fonts, logo component, icons
- real copy: landing page headline, the product's own names for its features (manifest, docs, README)
- real data: bundled fallbacks, fixtures, catalog files, recorded API responses

Figma is rarely needed: the components, tokens and fonts already exist in code, and rendering them is exact and cannot
drift. Anything you must invent (sample data, a placeholder page behind the product) gets flagged in the README.

### 1b. Prove one component renders, before designing anything

Before the storyboard, and before touching a single product file, run `node scripts/doctor.mjs`, then stand up a bare
Remotion package next to the product and render one still of its most important component, imported unchanged, with
hand-written props. Do not split anything yet, and do not style the reel: this package is the one step 4 builds on, so
the work is not thrown away.

Read the still. A command that exits 0 is not a pass: a component that renders a loading skeleton, an unstyled block,
the wrong theme or an overlay drawn outside the frame has failed this gate as surely as one that threw.

If it does not render, stop and tell the user which build tool and framework you found, what failed and what it would
take to get past it. The whole method depends on the product's components running inside a plain webpack bundle, and
every later step costs more to undo. `references/techniques.md` section 1b covers the usual causes: build-tool-only
imports, public paths, monorepo resolution, silent CSS extraction, portals, late-mounting overlays, per-frame state and
iframes.

React Server Components cannot be rendered by a client bundler at all. If the product has an `app/` tree with `async`
components, or a `use server` module in the path, say so here and agree with the user what to do, which is usually to
build the reel from its client components only. `references/frameworks.md` has the full table, including the `next/*`
components, the styling systems that need a plugin and the `next/font` substitution.

### 1c. Measure the real boxes

Render a throwaway composition that prints the measurements you need into a still: the product window's box, the rows
or cards the camera will frame, the cursor's targets. Read the numbers off it and keep them in a `boxes.ts`.

This is not optional and it is not part of step 1b. Every camera key comes from `fitCamera(box, safe)` and a box chosen
by eye is how tables and long lines end up cropped. Expect it to be its own small piece of code.

If the split in step 3 pins a value the storyboard depends on (a clock-driven greeting becoming a fixed prop changes
what the header says, and so what it costs to read), do that part of the split first. The order below is the common
case, not a rule.

### 2. Storyboard with timings

Fill in `references/storyboard.md` and show it to the user before building scenes. Structure:

1. Fade up from black into a **title card**: logo plus headline, words rising out of a blur, held for reading time.
2. The product **enters while the title recedes** behind it (overlap, not a queue).
3. **Feature beats**, 3 to 5s each: a move, then a hold long enough to read what matters. Name each feature with a
   numbered caption using the product's own feature names.
4. **Outro**: pull back as the product recedes, **end card** with the headline and a subline (homepage, platforms),
   hold, fade to black.

When the captions, the reading-time floor and a requested length cannot all hold, **reading time wins and the total
length gives**. A product whose own sentences run 40 to 55 characters cannot carry three captions in 20 seconds. Say so
and agree the trade with the user rather than shortening a hold below its floor, and remember that the user's stated
length beats the gate's 15 to 30s range: passing the gate is not the same as answering the brief. Captions also come in
zero, two or more. A lone caption numbered "01" with no "02" reads as broken.

Size every hold with reading time (characters ÷ 17 + 0.5s, never under 0.8s). Count every character visible in the block
with its lines joined by single spaces, chapter numbers and keycap labels included. Measure from the moment the whole
block has fully settled (the last word's reveal has finished) to the moment its exit starts, and leave at least 0.2s of
margin. The numbers and their sources are in `references/pacing.md`. When the user says a part feels long or too fast to
follow, do not only change speed: change what is shown (for a long list, glide section by section with pauses instead of
stepping row by row).

The storyboard also fixes five things that are expensive to retrofit:

- **Legibility at the zoom you chose.** For each framing, write down the smallest UI text that has to be readable and
  what it becomes on screen: source px times the camera zoom. Under 18px at 1080p it cannot be read, and the fix is
  never a bigger zoom on the same shot, because that crops something else. It is showing less: a narrower crop, a
  larger source element, or a caption carrying the words instead. Decide it here. Found after three drafts it costs a
  restructure, and `/product-reel:review` is the last line of defence rather than the first.

- **An easing for every animated element**, not only the big moves: the title words, the product entrance, each camera
  key, captions in and out, keycaps, the cursor's fade and click, highlights, the ambient drift and the fade to black.
  Arrivals decelerate (Material 3 emphasized decelerate `cubic-bezier(0.05, 0.7, 0.1, 1)`), exits accelerate
  (`cubic-bezier(0.3, 0, 0.8, 0.15)`), things already on screen ease in and out, the camera follows `smoothPath`, typing
  and steady laps are linear, springs give their config. A verb like "rises" is not an easing. Each row cites the code
  it describes (`scene/Captions.tsx:22-23`) and names the easing that code applies, including helper defaults (the kit's
  `tween` eases out when no easing is passed, so an unlabelled fade is not linear).
  `node scripts/easing-inventory.mjs src --storyboard storyboard.md` checks both and lists what the table missed.
- **Determinism risks**: what in this product could make frames differ between renders and how each is neutralised (CSS
  transitions or keyframe classes on its components, clocks and dates, randomness, timers and throttles, async effects,
  fonts or data fetched over the network). Say "checked, none" rather than leaving a risk out.
- **Truthfulness**: every chapter name and caption with the product source it comes from (UI copy, manifest, docs, help
  text), every font with its source and licence (the product's public folder or a licensed package such as
  `@fontsource`, never files copied from the system font folder or another app) and window chrome that matches the
  audience's platform (no macOS traffic lights when the audience is on Linux and Windows). Anything invented is marked
  placeholder. What the product hides stays hidden (a help line its code turns off is invented if shown). Every claim
  about how the product renders (a colour, a theme, a hidden or shown element, a bug shown "as it really is") cites the
  call chain from the product's own call site to the line that selects it, and a probe program calls the product's
  function, not a library function with arguments you chose. `references/techniques.md` section 2b has the method.
- **The story, not just the screens**: if the feature changes something (a setting that filters a page), show the before
  and the after.
- **Tempo, if there will be music.** Decide the BPM with the user before any timing, write the hit points as beat
  numbers, and build the cues from `beatsAt(bpm)` in `motion.ts` rather than from seconds. Retiming a reel that was
  written in seconds to land on a beat means moving every reading-time hold and camera window by hand, and pace is
  usually the thing a user asks to change most. Leave a little air at a shared boundary: an exit and the next camera
  move on the exact same beat is legal but reads as a collision. Add the track at the end with
  `node scripts/add-music.mjs`, never by re-exporting the video through an editor.

### Restraint: the effect budget

The kit has many tools. A reel is better with fewer of them used well, and every effect added is another way to crop,
collide or rush. Decide up front, in the storyboard, which you spend:

- **One push-in per beat at most**, and its zoom always comes from `fitCamera` on the measured bounds of what it frames,
  inside `CAPTION_SAFE` while a caption is up. Never pick a zoom by eye.
- **Highlights are optional.** At most one border beam per beat, only where the viewer would otherwise miss the point.
- **Keycaps only when the keyboard is the story**, each fully visible for at least 0.8s (the kit enforces this) and
  placed outside the product's on-screen bounds.
- **Captions never overlap product content**, blurred or not. Frame the product away from them instead.
- **Readable text never lands on readable product.** Handoffs cross as a dissolve, so measure it: where text sits, at
  the first frame the text is over 50% opacity, the product under it is below 10%. Faint over faint is a dissolve and is
  fine, a settled headline over a legible window is not, and neither is a gap (see the empty-stage gate). The kit's
  timings hold to this: read the comments in `assets/kit/timeline.ts` before moving `productIn` or `endCard`.
- **Edges are either clear or clearly bled.** A window or card border rests inside the action-safe area (3.5% in from
  each edge, `ACTION_SAFE`) or runs well off the frame. A bleed never slices a text line, table row or control: if a
  push-in would, fit the whole block it belongs to instead.
- **Hard limits are gates, not goals**: total length inside the agreed range (15 to 30s unless the user said otherwise),
  fades from and to black, no border inside the action-safe margin, nothing sliced at the frame edge, every reading-time
  hold met and a storyboard that matches the code. If a draft runs long, cut or merge a beat before the final render,
  never ship over.

### 3. Make the components renderable

**Before you touch a product file.** Run `git status`. If the tree is not clean, show the user what is uncommitted and
ask before editing any of those files. If it is not a git repo at all, say so and get explicit agreement first. Then
take a baseline: run the product's typecheck, tests and build now, and record the result. A check you only run
afterwards cannot tell your split apart from what was already broken.

Split each component into a display-only view that takes its state as a prop, leaving data fetching in the original.
Stub platform APIs with a bundler alias, share context libraries as one copy and export the pieces of library-driven
components. Prove the split changed nothing: diff the moved markup, then run the typecheck, tests and build again and
compare against the baseline. Details: `references/techniques.md` sections 1, 1b and 2.

If the product has no tests, or they are slow enough that you will not run them on each pass, say so in the report
rather than quietly dropping the guarantee. When the reel is done, list every product file you changed and offer to
revert the split: the user asked for a video, not a refactor.

### 4. Scaffold the reel

Take the package from step 1b, which already renders one real component, and make it the reel. Remotion is free for
individuals, non-profits and companies with up to 3 employees. A larger for-profit company needs a Remotion Company
License, so say so once if the user works for one. Copy the parts of `assets/kit/` you will actually use into the
package's `src/` (move `remotion.config.ts` to the package root). Copying all of it and deleting later is worse: the
easing gate reports every unused kit file as an uncited motion call. Then adapt:

- exact-pinned `remotion` and `@remotion/*` versions, `@remotion/fonts` for the product's own font files
- `remotion.config.ts`: public dir pointing at the product, aliases, a user agent matching the audience's platform
- the product's own theme: `GLOW` in `Reel.tsx` and the `gradientClass` passed to `Lockup` and `Captions` come from its
  design tokens, so the reel looks like the product and not like the kit
- utility CSS generated by its CLI over both source trees before `studio` and `render`

### 5. Build the scenes on the timeline

Keep one `CUE` object of cue points in seconds, each beat anchored on the one before, so a retime is one edit. Then:

- **Frame determinism is non-negotiable.** Every value comes from the frame: no CSS transitions (the kit's `reel.css`
  kills them), no randomness, no clock, no state carried between frames. Remotion renders out of order.
- **Camera** as focus point plus zoom per keyframe through `smoothPath`, so it never stops at intermediate keys. Push-in
  keys come from `fitCamera(measuredBox, safeArea)`, which fits inside `ACTION_SAFE` by default. Add a small pull back
  before push-ins, and hold the camera perfectly still while text is read (two equal keys): a zoom that keeps creeping
  through a hold rescales the text every frame and reads as wobble. List every reading window in
  `READING` in `assets/kit/camera.ts`, one per caption plus the title and end card. The `assertStillWhileReading` call
  at the foot of that file throws when the camera moves inside one, so the render fails in seconds instead of after an
  hour. Give each window the `text` it shows and `assertReadingTime` checks the hold against reading time in the same
  place, which is cheaper than measuring it off a contact sheet later. Pull back fully before the page under it
  changes.
- **Measure, don't guess**: heights, positions and cursor targets come from the DOM (`offsetHeight`, `boxWithin`) or a
  rendered still.
- **Spend only the effect budget from the storyboard** (see Restraint above).

### 6. Render and review, every iteration

Rendering is the only proof. After each change:

1. Typecheck the reel (and the product if you touched it).
2. Render, then build contact sheets at the cue points that moved with `node scripts/contact-sheet.mjs`: before, during
   and after each move, in the middle of each hold and at the midpoint of every handoff (title to product, page changes,
   product to end card). Crop small effects at full resolution.
3. Read the sheets and fix what you see before reporting. Common catches: an empty frame while the camera is zoomed on
   something that just left, a caption overlapping the product, text rising over the product in a handoff, a push-in
   slicing a table row or long line, keycaps flashing by or sitting on the product, a state swap that flashes dark, a
   highlight that disagrees with the active row mid-glide.
4. Run the gates on the render and the source. All three must exit 0:
   - `node scripts/check-video.mjs outputs/reel.mp4` (resolution, length, fades, no near-empty stage in a handoff)
   - `node scripts/edge-scan.mjs outputs/reel.mp4` (borders inside the action-safe margin fail, then crop every CROSSES
     range it lists and look for a sliced line, and move the ones you judge deliberate into `--accept`)
   - `node scripts/easing-inventory.mjs src --storyboard storyboard.md` (the easing table matches the code)
5. Write what each sheet, crop and gate showed in the storyboard's frame review log, with a verdict per problem. A
   problem has two possible verdicts: **fixed** (name the change and the render that shows it) or **not a problem**
   (name the rule that allows it, for example "bleed, no line sliced, crop at frame 1140"). "Accepted", "known issue",
   "only for a moment" and "left for later" are not verdicts: they mean another pass. If you truly cannot fix it, say in
   the report that the reel is not finished and which gate fails, instead of presenting it as done.
6. When the reel is close to done, run `/product-reel:review` on the timeline and sheets.

Send the rendered video to the user as soon as it exists: they judge motion in motion, not from a description. The final
report pastes the last output of the three gate scripts.

### 7. Hand off

- Give commands that run from the session root (for example `npm --prefix path/to/reel run render`) and run them
  yourself in the user's interactive shell first.
- README: beats, pacing choices with their sources, placeholders to replace, render time.
- Motion blur multiplies render time: offer it for the final render, not during iteration, and use `MotionBlur.tsx` with
  `render-motion-blur.mjs` rather than `@remotion/motion-blur`, which bands dark gradients.

## Writing the timeline, an example

```ts
const TITLE_EXIT = 2.45;
const PRODUCT = TITLE_EXIT + 0.15; // overlap: the product rises while the title is still leaving
const at = (s: number) => PRODUCT + s;

export const CUE = {
  titleLogo: 0.35,
  titleWords: 0.55,
  titleExit: TITLE_EXIT,
  productIn: PRODUCT,
  popupOpen: at(3.43),
  // caption "01 Issue popup Linked issue for the page you are on" = 51 chars: 51 / 17 + 0.5 = 3.50s + 0.2s margin,
  // measured from the detail line fully settled (captionFrom + 0.16 + 0.8) to the caption's exit
  popupClose: at(8.25),
  ...
} as const;
```
