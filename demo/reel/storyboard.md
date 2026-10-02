# Storyboard: Relay Focus mode

The contract the timeline implements and the review checks against. Every time below is in seconds and comes from
`src/timeline.ts`. Frames are at 60fps.

## Header

- **Product and audience:** Relay, a small issue tracker for product teams (`../relay-web`). The reel is the
  react-launch-video plugin's showcase demo, watched on the web by developers on Linux, Windows and macOS. Keyboard
  labels follow Linux and Windows (`Ctrl K`, the product's own label).
- **One-line story:** Relay's inbox shows every team's issues, Focus mode in the settings dialog cuts it to the web
  team's.
- **Real sources:** components `InboxView`, `IssueList` and `SettingsDialog` from `relay-web/src/components`, tokens and
  the `brand-gradient` class from `relay-web/src/theme.css`, Inter from the product's `@fontsource/inter` package, data
  from `relay-web/src/data/issues.ts`, feature names and caption copy from `relay-web/README.md`.
- **Placeholders:** none to replace. The greeting is pinned to "Good morning", one of the three the product's
  `greeting()` returns, because the real one reads the clock.

## Beat sheet

| #   | Beat       | On screen                                     | Text shown (characters)                                           | Reading time | Settled at | Exit at | Hold  | Margin |
| --- | ---------- | --------------------------------------------- | ----------------------------------------------------------------- | ------------ | ---------- | ------- | ----- | ------ |
| 0   | Title card | Name and feature, the feature in the gradient | "Relay Focus mode" (16)                                           | 1.44s        | 1.29       | 3.00    | 1.71s | 0.27s  |
| 1   | Inbox      | The whole window, all 8 open issues           | "01 Inbox Every open issue, grouped by status." (45)              | 3.15s        | 4.86       | 8.30    | 3.44s | 0.29s  |
| 2   | Settings   | Push-in on the dialog, Focus mode ticked      | "Focus mode Only show issues assigned to the web team." (53)      | 3.62s        | 10.28      | 14.13   | 3.85s | 0.23s  |
| 3   | Focus mode | The whole window, the web team's 4 issues     | "02 Focus mode Shows only the issues assigned to your team." (58) | 3.91s        | 16.09      | 20.23   | 4.14s | 0.23s  |
| 4   | End card   | Name and feature again                        | "Relay Focus mode" (16)                                           | 1.44s        | 22.17      | 23.83   | 1.66s | 0.22s  |

Row 2 is the dialog's label block, counted because it is the text the beat is about. It settles when the camera
arrives (the dialog itself finished its 0.18s entrance at 9.31). Captions settle at their start plus 0.96s (two 0.08s
staggers plus the 0.8s rise). The two lockups settle at their start plus 0.09s plus 0.9s. `camera.ts` asserts every row
at load with the exact text.

Total length: 24.53s, inside the agreed 18 to 25s. Beats 2 and 3 run 5.8s and 6.1s, over the 3 to 5s convention,
because reading time wins: their text needs 3.62s and 3.91s of stillness on top of the move that frames it.

### Legibility at each framing

| Framing                       | Zoom  | Smallest text that must be read                        | On screen      |
| ----------------------------- | ----- | ------------------------------------------------------ | -------------- |
| Whole window beside a caption | 1.256 | issue titles and the subtitle line, 16px               | 20.1px         |
| Push-in on the dialog         | 1.612 | the dialog's help line (16px) and the card meta (12px) | 25.8px, 19.3px |

The card meta ("REL-109 · web", 12px) lands at 15px in the whole-window framing, under the 18px floor, so it is not
asked to carry anything there. The subtitle "Focus mode: showing the web team's issues" and caption 02 carry the
after-state. On the dialog push-in the meta reads at 19px behind the overlay as the cards filter.

The window renders at 880px wide (techniques.md 1b): at Relay's 1080px maximum the caption framing would put 16px text
at 16px on screen.

## Easing inventory

| Element                  | Property                 | Easing                                                                                   | Duration                | Code                                                                                                                              |
| ------------------------ | ------------------------ | ---------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Title and end card words | opacity, y, blur         | emphasizedIn `0.05, 0.7, 0.1, 1`, 90ms stagger                                           | 0.9s                    | `curves.ts#rise`                                                                                                                  |
| Title exit               | scale, y / opacity, blur | emphasizedOut `0.3, 0, 0.8, 0.15` / easeOut `0.16, 1, 0.3, 1`                            | 0.7s / 0.45s            | `curves.ts#titleRecede` `curves.ts#titleGone`                                                                                     |
| Product entrance / exit  | y, rotateX, scale, blur  | emphasizedIn / emphasizedOut, opacity out easeInOut `0.65, 0, 0.35, 1`, blur out easeOut | 1.0s / 0.8s, blur 0.3s  | `curves.ts#productEnter` `curves.ts#productArrived` `curves.ts#productRecede` `curves.ts#productGone` `curves.ts#productDissolve` |
| Camera                   | focus, zoom              | `smoothPath` monotone cubic through keys                                                 | per key                 | `Reel.tsx#track`                                                                                                                  |
| Settings dialog entrance | opacity, scale 0.97 to 1 | cssEaseOut `0, 0, 0.58, 1`, the product's own CSS `ease-out`                             | 0.18s                   | `curves.ts#dialogIn`                                                                                                              |
| Button hover             | border colour, lift      | cssEase `0.25, 0.1, 0.25, 1`, the product's own CSS `ease`                               | 0.2s in, 0.2s out       | `curves.ts#settingsHover` `curves.ts#doneHover`                                                                                   |
| Captions in / out, scrim | opacity, y, blur         | emphasizedIn 0.8s, 80ms stagger / emphasizedOut 0.4s, scrim easeOut                      | 0.8s / 0.4s             | `Captions.tsx#enter` `Captions.tsx#leave` `Captions.tsx#current`                                                                  |
| Cursor                   | x / y / click / fade     | easeInOut / settleY `0.3, 0.9, 0.3, 1` / linear / easeOut                                | 0.65s moves, 0.2s click | `Cursor.tsx#previous` `Cursor.tsx#press` `scene/Cursor.tsx:74-75`                                                                 |
| Ambient glow drift       | backdrop glow position   | sine                                                                                     | continuous              | `scene/Stage.tsx`                                                                                                                 |
| Fade from and to black   | opacity                  | easeInOut `0.65, 0, 0.35, 1`                                                             | 0.8s / 0.6s             | `curves.ts#reelFade`                                                                                                              |

## Effect budget

| Beat | Push-in (fitCamera on which measured box, which safe area)                             | Edges (inside safe or bled, nothing sliced)                                                    | Highlight | Keycaps | Caption       |
| ---- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------- | ------- | ------------- |
| 1    | none: `BOXES.window` in `CAPTION_SAFE`                                                 | window border inside safe on all four sides                                                    | none      | none    | 01 Inbox      |
| 2    | `BOXES.dialogColumn` in `ACTION_SAFE`: the dialog's width, the header to the last card | window borders bled 17px off the top and 14px off the bottom, every text line inside the frame | none      | none    | none          |
| 3    | none: `BOXES.window` in `CAPTION_SAFE`                                                 | window border inside safe on all four sides                                                    | none      | none    | 02 Focus mode |

The push-in fits the whole column of text the dialog sits over rather than the dialog alone. Fitted to the dialog, the
zoom would be 2 and the header, subtitle and last card would cross the top and bottom edges on the way in and on the
pull-back. Fitted to the column, every text line of the inbox stays inside the frame at both ends of the move, and
because the focus is the same on both axes or moves monotonically with the zoom, at every frame in between.

## Determinism risks

| Risk found in this product                       | Where                                                   | How it is neutralised                                                                                                                 |
| ------------------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| CSS transition or keyframe classes on components | `.card` transition and `.dialog` keyframes in theme.css | global kill in `reel.css`, both re-created from the frame in `curves.ts`                                                              |
| Clock or date                                    | `greeting()` in App.tsx reads `new Date()`              | `InboxView` takes `greeting` as a prop, the reel passes "Good morning"                                                                |
| Randomness                                       | checked, none                                           |                                                                                                                                       |
| Timers, throttles, debounces                     | CommandPalette's 120ms `setTimeout`                     | Quick find is not in this reel, so the palette never mounts                                                                           |
| Async effects                                    | checked, none                                           |                                                                                                                                       |
| Network fonts or data                            | checked, none: Inter is an npm package, data is bundled |                                                                                                                                       |
| `Suspense` boundaries                            | checked, none                                           |                                                                                                                                       |
| Observers (Intersection, Resize)                 | checked, none                                           |                                                                                                                                       |
| `matchMedia` theming                             | checked, none: theme.css is dark only                   |                                                                                                                                       |
| Real-time animation libraries                    | checked, none                                           |                                                                                                                                       |
| Hover state                                      | `.card:hover` in theme.css                              | written from the frame on the two buttons the cursor presses                                                                          |
| Partial repaints in parallel render tabs         | the cursor's drop shadow, the hovered button's border   | the cursor gets its own layer (`willChange` in `scene/Cursor.tsx`). The hovered border still varies by a level or two between renders |

## Truthfulness

| Item                                    | On screen                                                | Source (file, UI copy, help text, docs) or "placeholder"                                                                                                       |
| --------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chapter names and captions              | 01 Inbox, 02 Focus mode and their detail lines           | `relay-web/README.md` Features list: "Inbox: every open issue, grouped by status" and "Focus mode: a setting that shows only the issues assigned to your team" |
| Headline and end card copy              | "Relay Focus mode"                                       | the product name (`package.json`, README) and its feature name. Relay ships no logo, so none is drawn                                                          |
| Data shown (counts, names, output)      | 8 issues, then the 4 web issues                          | `ISSUES` and `MY_TEAM` in `relay-web/src/data/issues.ts`, filtered by the product's own expression in `InboxView`                                              |
| Fonts                                   | Inter 400 and 600                                        | `@fontsource/inter` 5.3.0, the product's own dependency, imported in `Root.tsx` in the order `main.tsx` imports it                                             |
| Window chrome and keyboard labels       | a plain bordered window, no traffic lights. `Ctrl K`     | the audience is on Linux and Windows. The label is the product's own `<kbd>` in InboxView                                                                      |
| Settings dialog overlay appears at once | the window dims in one frame at 9.13 and undims at 14.13 | SettingsDialog.tsx `overlay` has no class and no animation, theme.css animates only `.dialog` (180ms ease-out from opacity 0, scale 0.97)                      |
| Checkbox look                           | Chrome's default checkbox, blue when ticked              | SettingsDialog.tsx renders a bare `<input type="checkbox">` and theme.css sets no `accent-color` or `color-scheme`                                             |
| Greeting                                | "Good morning"                                           | one of the three strings `greeting()` returns in App.tsx, pinned because the real one reads the clock                                                          |
| Cursor                                  | a pointer pressing Settings, the checkbox and Done       | stands in for the viewer's mouse. Each press drives the same state change the product's handler makes (`setSettingsOpen`, `setFocusMode`)                      |

## Handoffs

| Boundary                 | Ends / starts                                                    | Overlap             | Text half visible at              | Product under it                                                                                  |
| ------------------------ | ---------------------------------------------------------------- | ------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------- |
| Title to product         | title recedes 3.00 to 3.70 / product rises 3.05 to 4.05          | 0.65s of 0.7s       | n/a, the title is leaving         | none while the title is readable, [measured: max product opacity over titleExit..productIn is 0%] |
| Product to caption 01    | camera lands 4.20 / caption rises from 3.90                      | 0.30s               | detail line at frame 247 (4.12s)  | none: the window is framed right of the caption                                                   |
| Caption 01 to the dialog | caption leaves 8.30 to 8.70 / cursor moves 8.35 to 8.95          | 0.35s               | n/a                               | n/a                                                                                               |
| Dialog to caption 02     | camera pulls back 14.18 to 15.23 / caption rises from 15.13      | 0.10s               | detail line at frame 921 (15.35s) | none: the window is framed right of the caption                                                   |
| Product to end card      | product recedes and blurs from 20.88 / end card rises from 21.18 | 0.4s into the outro | "Relay" at frame 1275 (21.25s)    | [measured: product blur at endCard + 0.07 is 14.0px], past rule 1's blur threshold                |

No gap with an empty stage: `check-video` finds none.

## Camera

Keys from `src/camera.ts`, focus in world coordinates on the 1920x1080 stage. Wide is
`fitCamera(BOXES.window, CAPTION_SAFE)`, dialog is `fitCamera(BOXES.dialogColumn)` inside `ACTION_SAFE`.

| Time  | Focus x | Focus y | Zoom  | Why                                                            |
| ----- | ------- | ------- | ----- | -------------------------------------------------------------- |
| 3.05  | 707.9   | 640.5   | 1.080 | entry: 0.86 of wide, 100px low, as the product rises           |
| 4.20  | 707.9   | 540.5   | 1.256 | wide, the window beside caption 01                             |
| 9.18  | 707.9   | 540.5   | 1.256 | hold (equal keys) through caption 01 and the click on Settings |
| 9.38  | 707.9   | 540.5   | 1.218 | anticipation: a 3% pull back before the push-in                |
| 10.28 | 961     | 541.5   | 1.612 | the dialog column, every text line inside the frame            |
| 14.18 | 961     | 541.5   | 1.612 | hold (equal keys) through the dialog's reading time            |
| 15.23 | 707.9   | 540.5   | 1.256 | pull back to wide for caption 02                               |
| 20.78 | 707.9   | 540.5   | 1.256 | hold (equal keys) through caption 02                           |
| 21.88 | 960     | 540     | 0.920 | outro pull back as the product recedes                         |
| 24.53 | 960     | 540     | 0.920 | hold (equal keys) for the end card                             |

## Frame review log

| Render  | Sheet, crop or gate (frames)                                | What it showed                                                                                                                                                                                                                                                                                                     | Verdict                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| draft 1 | sheet, frames 520 to 590                                    | The cursor presses Settings and nothing answers until the dialog mounts. The product's `.card:hover` (accent border, lift) is missing because reel.css kills its transition                                                                                                                                        | fixed: the hover is re-created from the frame in `curves.ts#settingsHover` and `curves.ts#doneHover`. The draft 2 crop at 9.08s shows the accent border on Settings, at 14.05s on Done                                                                                                                                                                                                                              |
| draft 1 | sheet, frames 1271 to 1475                                  | The end card runs 3.45s from its rise to black, over the 2 to 3s convention                                                                                                                                                                                                                                        | fixed: `fadeOut` moved to `OUTRO + 3.05`. The hold is 1.66s against the 1.64s the lockup needs, draft 2                                                                                                                                                                                                                                                                                                             |
| draft 1 | sheet, frames 548 and 852                                   | The whole window dims in one frame as the dialog opens and brightens in one frame as it closes                                                                                                                                                                                                                     | not a problem: the product's overlay has no entrance or exit animation (SettingsDialog.tsx `overlay` has no class, theme.css animates only `.dialog`). It dims the window under a translucent black rather than flashing it dark, and check-video finds no near-empty stage                                                                                                                                         |
| draft 2 | crops at 9.08s and 14.05s                                   | The arrow covers half of "Settings", half of "Done" and the checkbox tick at 10.9s                                                                                                                                                                                                                                 | fixed: each hotspot moved past the end of its label, still inside the measured control box (`boxes.ts#TARGETS`). Draft 3 crops at 9.0s, 10.9s and 14.05s show every label and the tick                                                                                                                                                                                                                              |
| draft 3 | full-resolution frame at 10.5s                              | [rendered] The REL-127 card's bottom border sat at y 1045, 28px lower than `boxes.ts` predicted and inside the 38px bottom margin for 0.6s. The window also clipped 17px of the inbox's bottom padding                                                                                                             | fixed: the measuring still had read the layout in a layout effect, before Inter loaded, so every card came out 4px short. Re-measured after `document.fonts.ready`: the inbox is 688.6px tall and the column ends at y 837.6. `BOXES.window` and `BOXES.dialogColumn` updated, draft 4 puts the border at y 1017                                                                                                    |
| draft 4 | sheets, frames 80 to 1440                                   | Title, entrance, caption 01, Settings hover, dialog entrance, push-in, tick, Done, pull back, caption 02 and outro all as planned. Captions sit clear of the window, the after-state shows the 4 web issues                                                                                                        | not a problem: nothing new to fix                                                                                                                                                                                                                                                                                                                                                                                   |
| draft 4 | two full renders of the same source compared frame by frame | Frames around the moving cursor differed by up to 4 levels between renders, and the encoder carried that through the rest of each group of pictures                                                                                                                                                                | fixed: the kit cursor's drop shadow was rasterised inside the product's tiles, which depends on the frame a parallel tab drew before. `willChange: "transform"` gives it its own layer in `scene/Cursor.tsx`. Two final renders now differ only at the two hover transitions (frames 540 and 844 to 862), by at most 2 levels                                                                                       |
| final   | the final render against a render of a fresh copy           | 151 of 1472 frames differ, from frame 540 (the Settings hover) to 687 and 844 to 846 (the Done hover). Overall SSIM 0.99989, lowest frame 0.99786, PSNR 47.8dB or better                                                                                                                                           | not a problem: every value the reel sets is a function of the frame (techniques.md section 3), and the same frames rendered in a single tab come out byte-identical. The difference is Chrome anti-aliasing a repainted border a level or two differently by render order, carried forward by the encoder. Two attempts to isolate the buttons in layers made it worse during the dialog entrance and were reverted |
| final   | edge-scan at 0.1s: CROSSES top and bottom 10.10s to 14.50s  | Cropped the outermost 60px of both edges every 0.1s from 9.4s to 15.3s, the whole push-in, hold and pull-back, 60 samples per edge. The bands hold only the background, the window's rounded top and bottom border passing through during the moves and its two side borders running off the frame during the hold | not a problem: a bleed with no text line, row or control cut at any sample, mid-move included (Restraint: edges are either clear or clearly bled). The header never comes within 60px of the top and the last card's border stays inside the bottom safe margin                                                                                                                                                     |
| final   | all six gates, `outputs/reel.mp4`                           | check-video, edge-scan, easing-inventory, claims, fonts and lightness pass, output below                                                                                                                                                                                                                           | pass                                                                                                                                                                                                                                                                                                                                                                                                                |

Gate output on the final render, from `gates.mjs outputs/reel.mp4 --src src --storyboard storyboard.md --min 18 --max 25` [rendered]:

```text

== check-video
ok    resolution 1920x1080
ok    duration 18 to 25s (is 24.53s)
ok    opens from black
ok    ends on black
ok    no near-empty stage mid-reel

== edge-scan
outputs/reel.mp4: 1920x1080, 24.53s, sampled every 0.2s, action safe is 67px left and right, 38px top and bottom
  CROSSES  top     10.00s to  14.40s  content runs off the edge: crop it and check nothing is sliced
  CROSSES  bottom  10.00s to  14.40s  content runs off the edge: crop it and check nothing is sliced

== easing-inventory
Reel.tsx:28                  smoothPath   smoothPath monotone cubic                      smoothPath(
curves.ts:52                 tween        emphasizedIn bezier(0.05,0.7,0.1,1)            tween(f(seconds), FPS, [start, start + REVEAL], [0, 1], emphasizedIn);
curves.ts:57                 tween        emphasizedOut bezier(0.3,0,0.8,0.15)           tween(f(seconds), FPS, [exitAt, exitAt + 0.7], [0, 1], emphasizedOut);
curves.ts:59                 tween        easeOut bezier(0.16,1,0.3,1)                   tween(f(seconds), FPS, [exitAt, exitAt + 0.45], [0, 1], easeOut);
curves.ts:64                 tween        emphasizedIn bezier(0.05,0.7,0.1,1)            tween(f(seconds), FPS, [CUE.productIn, CUE.productIn + 1.0], [0, 1], emphasizedIn);
curves.ts:66                 tween        emphasizedIn bezier(0.05,0.7,0.1,1)            tween(f(seconds), FPS, [CUE.productIn, CUE.productIn + 0.4], [0, 1], emphasizedIn);
curves.ts:68                 tween        emphasizedOut bezier(0.3,0,0.8,0.15)           tween(f(seconds), FPS, [CUE.outro + 0.1, CUE.outro + 0.9], [0, 1], emphasizedOut);
curves.ts:70                 tween        easeInOut bezier(0.65,0,0.35,1)                tween(f(seconds), FPS, [CUE.outro + 0.1, CUE.outro + 0.1 + FADE], [0, 1], easeInOut);
curves.ts:73                 tween        easeOut bezier(0.16,1,0.3,1)                   tween(f(seconds), FPS, [CUE.outro + 0.1, CUE.endCard], [0, 1], easeOut);
curves.ts:92                 tween        cssEaseOut bezier(0,0,0.58,1)                  tween(f(seconds), FPS, [CUE.settingsOpen, CUE.settingsOpen + 0.18], [0, 1], cssEaseOut);
curves.ts:102                tween        cssEase bezier(0.25,0.1,0.25,1)                tween(f(seconds), FPS, [CUE.cursorAtSettings, CUE.cursorAtSettings + 0.2], [0, 1], cssEase
curves.ts:103                tween        cssEase bezier(0.25,0.1,0.25,1)                tween(f(seconds), FPS, [CUE.settingsOpen, CUE.settingsOpen + 0.2], [0, 1], cssEase);
curves.ts:105                tween        cssEase bezier(0.25,0.1,0.25,1)                tween(f(seconds), FPS, [CUE.cursorAtDone, CUE.cursorAtDone + 0.2], [0, 1], cssEase);
curves.ts:108                tween        easeInOut bezier(0.65,0,0.35,1)                tween(f(seconds), FPS, [0, 0.8], [0, 1], easeInOut) *
curves.ts:109                tween        easeInOut bezier(0.65,0,0.35,1)                (1 - tween(f(seconds), FPS, [CUE.fadeOut, CUE.fadeOut + 0.6], [0, 1], easeInOut));
scene/Captions.tsx:22        tween        emphasizedIn bezier(0.05,0.7,0.1,1)            const enter = tween(frame, fps, [from, from + 0.8], [0, 1], emphasizedIn);
scene/Captions.tsx:23        tween        emphasizedOut bezier(0.3,0,0.8,0.15)           const leave = tween(frame, fps, [to, to + 0.4], [0, 1], emphasizedOut);
scene/Captions.tsx:95        tween        easeOut bezier(0.16,1,0.3,1) (tween default)   tween(frame, fps, [from, from + 0.5], [0, 1]) * (1 - tween(frame, fps, [to, to + 0.4], [0,
scene/Cursor.tsx:42          tween        easeInOut bezier(0.65,0,0.35,1)                x += tween(frame, fps, [from, arrive], [0, to.x - previous.x], easeInOut);
scene/Cursor.tsx:43          tween        settleY bezier(0.3,0.9,0.3,1)                  y += tween(frame, fps, [from, arrive], [0, to.y - previous.y], settleY);
scene/Cursor.tsx:52          interpolate  linear                                         interpolate(
scene/Cursor.tsx:74          tween        easeOut bezier(0.16,1,0.3,1) (tween default)   tween(frame, fps, [visibleFrom, visibleFrom + 0.2], [0, 1]) -
scene/Cursor.tsx:75          tween        easeOut bezier(0.16,1,0.3,1) (tween default)   tween(frame, fps, [hideAt, hideAt + 0.25], [0, 1]),

storyboard check passed: 23 motion calls, every one cited with the easing the code applies

== claims
ok    src/timeline.ts:11  title opacity at productIn is 46.7%  [46.70%]
                          at 3.050s
ok    src/timeline.ts:74  product opacity at endCard is 78.2%  [78.21%]
                          at 21.180s
ok    src/timeline.ts:75  product blur at endCard is 14.0px  [14.00px]
                          at 21.180s
ok    storyboard.md:113   max product opacity over titleExit..productIn is 0%  [0.00%]
                          at 3.000s
ok    storyboard.md:117   product blur at endCard + 0.07 is 14.0px  [14.00px]
                          at 21.250s

claims check passed: 5 claims re-derived from curves.ts

== fonts
ok    src/Root.tsx:5  inter  (a licensed package)
ok    src/Root.tsx:6  inter  (a licensed package)
ok    src/reel.css:11  Inter is asked for
ok    storyboard names inter

fonts check passed: 1 family, every one from the repo

== lightness
      6.13s  surface reads luma 21, from the 54.5% of the frame that is product
      7.67s  surface reads luma 21, from the 54.3% of the frame that is product
      9.20s  surface reads luma 16, from the 17.6% of the frame that is product
      10.73s  surface reads luma 21, from the 19.2% of the frame that is product
      12.27s  surface reads luma 21, from the 17.9% of the frame that is product
      13.80s  surface reads luma 21, from the 17.9% of the frame that is product
      15.33s  surface reads luma 15, from the 55.0% of the frame that is product
      16.87s  surface reads luma 15, from the 54.5% of the frame that is product
      18.40s  surface reads luma 15, from the 54.5% of the frame that is product
ok    LIGHTNESS declared 0.05, the render shows 0.08 (off by 0.03, tolerance 0.20)

All 6 gates passed.
```
