---
name: review
description: >-
  Review a product promo reel, launch video or feature teaser (a Remotion project, its timeline or a rendered MP4)
  against cinematic pacing and craft standards: reading-time holds, overlapping handoffs, easing direction, stop-go or
  creeping camera, frame determinism, collisions and crops at the frame edge, empty frames and truthfulness of what is
  shown. Produces severity-ranked findings with file, cue or frame references and a concrete fix each. Use this whenever
  someone asks to review, critique, check or polish a promo video, demo reel or Remotion composition, asks whether a
  reel works, or has just rendered one and wants to know what to fix. Not for in-app UI animation code (transitions,
  hovers, gestures).
---

# Reviewing a product reel

A reel is judged by a viewer who watches it once, at speed, without context. The review finds everything that stops that
viewer reading, following or trusting what is on screen. Default to flagging: a move that merely works but queues,
stalls or hides something is a finding.

The standards and their sources live in the authoring skill, `/product-reel:create`: read
`${CLAUDE_SKILL_DIR}/../create/references/pacing.md` for numbers and
`${CLAUDE_SKILL_DIR}/../create/references/techniques.md` for the rendering pitfalls. Cite them in findings. UI
micro-interaction budgets (sub-300ms and so on) do not apply to a video's holds and camera moves, so do not flag a 3s
hold for being slow if the text on screen needs it.

## Gather the evidence

1. **Timeline**: the cue points, camera keyframes and caption windows (a `timeline.ts`, a `CUE` object or a storyboard).
2. **Scenes**: the composition code, looking for how motion is driven.
3. **Frames**: if a render exists, build contact sheets yourself with
   `node ${CLAUDE_SKILL_DIR}/../create/scripts/contact-sheet.mjs`. Pick frames at every cue point that matters: just
   before a move, mid-move, on arrival and mid-hold, plus every handoff between beats. Crop small effects at full
   resolution. Look at the sheets, do not infer them from the code.
4. **Gate scripts** from `${CLAUDE_SKILL_DIR}/../create/scripts/`. Run
   `node ${CLAUDE_SKILL_DIR}/../create/scripts/doctor.mjs` first: everything below shells out to ffmpeg, and without
   it the failure is a raw spawn error rather than an install hint.
   `node ${CLAUDE_SKILL_DIR}/../create/scripts/easing-inventory.mjs <src> --storyboard <storyboard>` whenever there is source and a storyboard (it lists every
   motion call with the easing the code applies, even without a storyboard), and on a render `${CLAUDE_SKILL_DIR}/../create/scripts/check-video.mjs` and
   `${CLAUDE_SKILL_DIR}/../create/scripts/edge-scan.mjs`. Crop every CROSSES range edge-scan lists and look for sliced text.

   On a render with its source, `node ${CLAUDE_SKILL_DIR}/../create/scripts/lightness.mjs <reel> --src <src>` checks that the product's lightness is what
   the kit's `curves.ts` was told, since the outro's fade and bloom are tuned from it and the default suits a dark
   product. A pale product left at the default reads as an end card sitting on a visible slab.

   Two more run on source alone and answer questions that are otherwise guesswork from a finished reel:
   `node ${CLAUDE_SKILL_DIR}/../create/scripts/fonts.mjs <src> --storyboard <storyboard>` says where every font comes from, which no frame can show you (a
   reel rendered in the fallback looks entirely plausible), and `node ${CLAUDE_SKILL_DIR}/../create/scripts/claims.mjs <src> --doc <storyboard>` re-derives
   every timing number the source and the storyboard assert. A number in a comment that the code no longer supports is
   a defect report, not documentation, so report it as one.

5. If there is no render, review code and timeline only, and list what could not be verified. Work out edge distances
   and overlaps from the layout numbers (a window's left plus width against the 1920 frame) where you can.

When the project's product could not render inside Remotion in the first place (a server-rendered framework, a
styling system that needs a bundler plugin, a font that only exists inside a compiler), say so: the create skill's
`references/frameworks.md` has the table, and a reel built around an unrenderable product is a finding, not a detail.

For every piece of on-screen text, compute its required hold with `node ${CLAUDE_SKILL_DIR}/scripts/reading-time.mjs`
instead of estimating.

## What to check

### Pacing

- Every text hold is at least its reading time: characters ÷ 17 + 0.5s, never under 0.8s. Titles, captions, sublines and
  the key UI text the beat is about (a result row, a catalog entry). Count every character visible in the block (lines
  joined by single spaces), chapter numbers and keycap labels included, and measure from when the whole block has fully
  settled (the last word's reveal has finished) to when its exit starts. Flag passes with under 0.2s of margin as minor.
- Keycaps are text: each combo fully visible for at least 0.8s. A keycap that flashes by is a major.
- Total length inside the agreed range is a gate: a reel over it is a major even if everything else passes.
- Total length around 15 to 30s. Feature beats 3 to 5s. Title card 1.5 to 2.5s. End card 2 to 3s with a fade.
- Enough stillness: holds after moves, not continuous motion. Nothing is shown so fast it cannot be followed (a list
  stepping row by row at key-repeat speed), and nothing drags (a long walk through content no one reads).

### Handoffs

- Consecutive moves overlap (30 to 50%) instead of queueing. The product enters while the title leaves.
- No empty or near-empty frames: a gap between an exit and the next entrance, or a camera still zoomed on something that
  has just disappeared.
- A page or state change happens in view of the camera, not while it is zoomed elsewhere.
- Opens from black and closes to black (or deliberately does not).
- Readable text over readable product in a handoff is a major: at the first frame the text passes 50% opacity, the
  product under it should be below 10%. Both faint at once is a dissolve and fine. Check the frames, not the intent, and
  check the other way too: a gap where neither is visible is the same finding in reverse.
- Every animated element has a named easing, in the storyboard or the code: not only the big moves but captions,
  keycaps, the cursor, highlights, the drift and the fades. The storyboard's easing must be the one the code applies: a
  storyboard that says "emphasized decelerate" over a linear `interpolate`, or "linear" over a helper whose default
  eases, is a major, because every later review trusts the storyboard. Arrivals decelerate (for example
  `0.05, 0.7, 0.1, 1`), exits accelerate. Ease-in on anything arriving is a finding, and so is motion described only
  with verbs ("rises", "slides") without a curve.
- No linear easing on spatial movement (linear is fine for typing, progress and a steady lap).
- **Stop-go camera**: a path interpolated across more than two keyframes with ease-in-out per segment stops at every
  key. Only real holds should stop the camera. Look at how the keyframes are interpolated, not only at their values.
- Push-ins have a slight pull back first (anticipation). During holds the product and camera are perfectly still and
  only a soft backdrop glow moves: a camera zoom or pan that creeps through a hold rescales the text every frame and
  reads as wobble (major on a hold where text is read). Fine detail in a moving backdrop (a grid, noise) shimmers.

### Frame determinism (blockers)

Remotion renders frames out of order in parallel, so anything not derived from the frame renders wrong.

- CSS transitions or keyframe animations still active on rendered components (utility classes like `transition-all`,
  `animate-pulse`) without a global kill.
- `Math.random`, `Date.now`, `new Date()` (time-of-day greetings), state accumulated across frames, timers.
- Fonts, images or data fetched over the network at render time.
- Async effects whose result lands after capture, and libraries that throttle or animate in real time.

### Composition and restraint

- Captions, keycaps or cursors overlapping the product or each other. A caption over blurred product content still
  counts.
- Content cropped at the frame edge at the camera's zoom (a table during a push-in, a long command line, the tallest
  state of a popover). Push-in zooms should be computed from measured bounds, not chosen by eye. A bleed is fine only
  when no text line, row or control is sliced.
- A window or card border resting inside the action-safe margin (3.5% of the frame from each edge: 67px left and right,
  38px top and bottom at 1920x1080, SMPTE ST 2046-1) instead of inside the safe area or clearly bled off. It reads as a
  mistake. Minor when it is brief, major on a hold.
- Effects spent everywhere: more than one push-in or highlight per beat, keycaps where the keyboard is not the story.
  Each extra effect is a new way to crop, collide or rush, so flag overuse even when nothing has broken yet.
- Text too small to read at the zoom used (UI text under about 18px on screen at 1080p).
- A highlight or selection that disagrees with the UI's own active state mid-transition.
- A crossfade that flashes dark or shows two layouts at once.
- Highlights overused: an effect that fires on everything stops pointing at anything.

### Truthfulness

- The UI shown is the real product's components, not a redraw that can drift.
- Data is real or flagged as placeholder. Every chapter name and caption traces to the product's own copy (UI, manifest,
  docs, help text): an invented label is a finding.
- Keyboard labels and window chrome match the audience's platform (macOS traffic lights for a Linux and Windows team is
  a finding).
- Fonts come from the product, a licensed package or the product's own CDN family, not files copied from the system font
  folder or another app.
- The story is shown, not asserted: a setting that changes a page shows the page before and after.
- Anything the reel implies the product does, it really does (a search that would rank a different result first).
- UI the product hides is not shown (a key help line the code disables), and UI the product has no source for (a hint,
  badge or shortcut drawn only in the reel) is invented: flag it as such, not only for its styling. A rendering claim (a
  colour, a theme, a bug shown "truthfully") holds on the code path that really runs: follow it from the product's call
  site (`${CLAUDE_SKILL_DIR}/../create/references/techniques.md` section 2b). A wrong premise under a "not a problem"
  verdict is a finding at the severity of the problem it excused.

### Process

- The frames were reviewed and the review is written down (a frame review log with what each sheet showed and what
  changed). Stills saved with no write-up count as not reviewed.
- Gate failures are fixed, not accepted. A log, README or report that lists a crop, overlap, over-length or short hold
  as "accepted", a "known issue" or "only for a moment" still has that failure: report it at its own severity and say
  the reel is not ready until it is fixed.

## Severity

- **Blocker**: renders incorrectly or non-deterministically, or the viewer cannot read or follow a beat.
- **Major**: violates a pacing or handoff standard in a way a viewer feels (a queue, an empty frame, a stop-go camera, a
  collision, an unflagged invented fact).
- **Minor**: polish (a stagger slightly off, a highlight a touch late).

## Report

Use this structure:

```
## Verdict
<Ship / Ship after majors / Not ready>: one sentence on the biggest issue.

## Findings
| # | Severity | Where | Finding | Why (standard) | Fix |
|---|---|---|---|---|---|
| 1 | Blocker | `Captions.tsx:42`, frames 780 to 830 | ... | Reading time: 48 chars needs 3.3s, held 1.2s (pacing.md) | Move `to` to `from + 3.4` |

## Verified on frames
- <what each contact sheet or crop confirmed, with frame numbers>

## Not verified
- <anything you could only judge from code, and how to check it>
```

"Where" is a file and line, a cue name, a time in seconds or frame numbers, so each finding can be found in one step.
Every fix is concrete: a value, a curve, a reframed camera key. Approve ("Ship") only with no blockers or majors left.
