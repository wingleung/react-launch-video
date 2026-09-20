# Storyboard template

Write this before any scene code. It is the contract the timeline implements and the review checks against.

## Header

- **Product and audience:** what it is, who watches (their platform decides keyboard labels and window chrome).
- **One-line story:** the single thing a viewer should remember.
- **Real sources:** where the UI components, logo, fonts, tokens, headline copy, feature names and data come from.
- **Placeholders:** anything invented, to replace before publishing.

## Beat sheet

| #   | Beat       | On screen               | Text shown (characters)    | Reading time | Settled at | Exit at | Hold  | Margin |
| --- | ---------- | ----------------------- | -------------------------- | ------------ | ---------- | ------- | ----- | ------ |
| 0   | Title card | Logo and headline       | "Relay Issue Search" (18)  | 1.56s        | 1.54       | 2.45    | 0.91s | FAIL   |
| 1   | ...        |                         |                            |              |            |         |       |        |
| n   | End card   | Logo, headline, subline | headline plus subline (63) | 4.21s        | ...        | ...     | ...   | ...    |

Reading time = characters ÷ 17 + 0.5s, minimum 0.8s. Count every visible character in the block with lines joined by
single spaces, chapter numbers and keycap labels included. "Settled at" is when the last part of the block has fully
finished its reveal. Hold = exit at minus settled at, and must reach the reading time with 0.2s of margin. The example
row 0 fails on purpose: fix it by moving the exit later, not by shortening the reveal. Keycaps get a row each.

Total length: sum it here and keep it inside the agreed range before building scenes.

## Easing inventory

Every animated element, not only the big moves. If it changes over time, it has a row, and the row cites the code (
`File.tsx:line` or `File.tsx:first-last`) and names the easing that code really applies, by constant name or numbers.
Helper defaults count: the kit's `tween` eases out with `easeOut` when no easing is passed, `springAt` uses `SMOOTH` and
a bare `interpolate` is linear. Prefer `File.tsx#symbol`, naming the declaration that owns the call, so
`const enter = tween(...)` is cited as `Reel.tsx#enter`: a line number is invalidated by any edit above it and a name
is not. Line and range citations still work. Generate the list with `node scripts/easing-inventory.mjs src`, and before
the final render check the table with `--storyboard`. Delete kit components the reel does not use.

| Element                  | Property                  | Easing                                                                | Duration               | Code                                                                                    |
| ------------------------ | ------------------------- | --------------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------- |
| Title words              | opacity, y, blur          | emphasizedIn `0.05, 0.7, 0.1, 1`, 90ms stagger                        | 0.9s                   | `Lockup.tsx#p`                                                                          |
| Title exit               | scale, y, blur / opacity  | emphasizedOut `0.3, 0, 0.8, 0.15` / easeOut                           | 0.7s / 0.45s           | `Titles.tsx#exit` `Titles.tsx#gone`                                                     |
| Product entrance / exit  | y, rotateX, scale, blur   | emphasizedIn / emphasizedOut, opacity out easeInOut, blur out easeOut | 1.0s / 0.8s, blur 0.4s | `Reel.tsx#enter` `Reel.tsx#arrived` `Reel.tsx#exit` `Reel.tsx#gone` `Reel.tsx#dissolve` |
| Camera                   | focus, zoom               | `smoothPath` monotone cubic through keys                              | per key                | `Reel.tsx#track`                                                                        |
| Product parts build      | opacity, y                | spring SMOOTH `damping 200`, 0.55s                                    | 0.55s                  | `reveal.ts:32`                                                                          |
| Captions in / out, scrim | opacity, y, blur          | emphasizedIn 0.8s, 80ms stagger / emphasizedOut 0.4s, scrim easeOut   |                        | `Captions.tsx#enter` `Captions.tsx#leave` `Captions.tsx#current`                        |
| Keycaps                  | y, opacity / press, leave | spring SNAPPY `damping 22, stiffness 260, mass 0.7` / easeOut         |                        | `Keys.tsx#enter` `Keys.tsx#leave` `Keys.tsx#down`                                       |
| Cursor                   | x / y / click / fade      | easeInOut / settleY `0.3, 0.9, 0.3, 1` / linear / easeOut             |                        | `Cursor.tsx#previous` `Cursor.tsx#press`                                                |
| Highlights               | angle                     | easeInOut lap                                                         |                        | `Ring.tsx#angle`                                                                        |
| Ambient glow drift       | backdrop glow position    | sine                                                                  | continuous             | `scene/Stage.tsx`                                                                       |
| Fade from and to black   | opacity                   | easeInOut `0.65, 0, 0.35, 1`                                          | 0.8s / 0.6s            | `Reel.tsx#fade`                                                                         |

The line numbers above are the kit's. Yours move as you edit, so regenerate before the final check.

## Effect budget

| Beat | Push-in (fitCamera on which measured box, which safe area) | Edges (inside safe or bled, nothing sliced) | Highlight | Keycaps | Caption |
| ---- | ---------------------------------------------------------- | ------------------------------------------- | --------- | ------- | ------- |
| 1    |                                                            |                                             | none      | none    | 01 ...  |

At most one push-in and one highlight per beat. Leave a cell "none" deliberately rather than filling every column.

## Determinism risks

| Risk found in this product                       | Where                                  | How it is neutralised                                            |
| ------------------------------------------------ | -------------------------------------- | ---------------------------------------------------------------- |
| CSS transition or keyframe classes on components | e.g. `transition-all`, `animate-pulse` | global kill in `reel.css`, motion re-created from the frame      |
| Clock or date                                    | e.g. a time-of-day greeting            | passed in as a fixed prop                                        |
| Randomness                                       | e.g. generated backgrounds             | seeded constants                                                 |
| Timers, throttles, debounces                     | e.g. search results                    | logic ported to a pure function and verified against the library |
| Async effects                                    | e.g. permission checks on mount        | a state that settles synchronously, checked on the first frames  |
| Network fonts or data                            | e.g. a font stylesheet link            | files from the product's public folder                           |
| `Suspense` boundaries                            | e.g. a lazy child or a `use()` promise | resolved data passed as props, so no frame captures the fallback |
| Observers (Intersection, Resize)                 | e.g. a reveal on scroll into view      | the revealed state passed in, since frames render out of order   |
| `matchMedia` theming                             | e.g. `prefers-color-scheme`            | the theme forced by the reel, not read from the headless browser |
| Real-time animation libraries                    | e.g. Framer Motion, view transitions   | the value driven by the frame, or the component frozen           |

Write "checked, none" for a risk that does not apply, so a reviewer can tell checked from forgotten.

## Truthfulness

| Item                                                                           | On screen | Source (file, UI copy, help text, docs) or "placeholder"                                                       |
| ------------------------------------------------------------------------------ | --------- | -------------------------------------------------------------------------------------------------------------- |
| Chapter names and captions                                                     |           |                                                                                                                |
| Headline and end card copy                                                     |           |                                                                                                                |
| Data shown (counts, names, output)                                             |           |                                                                                                                |
| Fonts                                                                          |           | product public folder, licensed npm package or the product's own CDN link. Never system or other apps' folders |
| Window chrome and keyboard labels                                              |           | the audience's platform                                                                                        |
| Each rendering claim (colours, hidden or shown elements, a bug shown as it is) |           | call chain from the product's call site, `file:line` hops (techniques.md 2b)                                   |

## Handoffs

For each boundary between beats: which move ends, which starts and by how much they overlap (aim for 30 to 50%). Flag
any gap where nothing is on screen. Overlap the motion, never the legibility: for every handoff that brings in text (the
end card, a caption, a title) name the frame where the text passes 50% opacity and the product's opacity under it at
that frame, which must be below 10%. Faint over faint is a dissolve and is fine. Check the midpoint of each handoff on a
contact sheet.

## Camera

| Time | Focus x | Focus y | Zoom | Why                                                                          |
| ---- | ------- | ------- | ---- | ---------------------------------------------------------------------------- |
|      |         |         |      | pull back before push (anticipation), hold (equal keys, the camera is still) |

Push-in zooms come from `fitCamera` on a measured box, inside `ACTION_SAFE` (3.5% in from each edge) or `CAPTION_SAFE`
while a caption is up. A framing either keeps the window's borders inside the safe area or bleeds them well off the
frame, and a bleed slices no text line, row or control. `node scripts/edge-scan.mjs` reports both on the render.

## Frame review log

| Render  | Sheet, crop or gate (frames) | What it showed | Verdict                                                     |
| ------- | ---------------------------- | -------------- | ----------------------------------------------------------- |
| draft 1 |                              |                | fixed: what changed, or not a problem: which rule allows it |

Fill it in as you review. Every problem ends as **fixed** (the change and the render that shows it) or **not a problem**
(the rule that allows it). "Accepted", "known issue" and "left for later" are not verdicts: they mean another pass. The
final rows name the render and paste the result of `check-video.mjs`, `edge-scan.mjs` and
`easing-inventory.mjs --storyboard`, all exiting 0.

## Worked example (a 26s reel of a browser extension)

0. Fade from black 0.8s. Logo and "Relay Issue Search" rise word by word (90ms stagger), hold to 2.45s, recede.
1. Browser rises 0.15s into the title exit (1.0s, emphasized decelerate), URL types, page wireframe builds.
2. Cursor arcs to the toolbar icon while a border beam laps it once, click with ripple.
3. Real popup opens loading, grows to the real linked issue (measured heights), camera pushes to 1.7x with a slight pull
   back first, card border beam, cursor rests on a link, hold 3s. Caption "01 Issue popup".
4. Camera pulls back to the full window before a new tab opens. The real new tab page builds diagonally, the window
   framed right of the caption. Caption "02 New tab page".
5. Keycaps Ctrl K beside the palette. The real palette pieces glide section by section with a selection ring, then it
   types "bug" (query verified against the real library) and Enter. Caption "03 Command palette".
6. Pull back 1.1s as the browser blurs away, end card with homepage URL, hold, fade to black 0.6s.
