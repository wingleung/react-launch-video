# Quality gates

Six gates run on every render, and a failing one means another pass rather than a caveat in the report. The create
skill runs all six through one command, `gates.mjs`, so a round of iteration is one invocation rather than six. Every
gate is a dependency-free Node script in the create skill's `scripts/` folder and needs ffmpeg on the PATH.

| Gate                   | Fails when                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `check-video.mjs`      | wrong resolution or length, no fade from or to black, an empty stage mid-reel                                                                                |
| `edge-scan.mjs`        | a border rests inside the action-safe margin (reported as `TIGHT`)                                                                                           |
| `easing-inventory.mjs` | an animated value does not have the easing the storyboard says it has                                                                                        |
| `claims.mjs`           | a number a comment or a doc states about the timing is not what the code does                                                                                |
| `fonts.mjs`            | a font comes from a machine's font folder or the network (`@remotion/google-fonts` included), or a family named in CSS or a JSX `fontFamily` is never loaded |
| `lightness.mjs`        | the product's lightness is not what the kit was told, so the outro is mistuned                                                                               |

The runner refuses to start on a reel that was never really finished, an unedited storyboard template or the kit's own
placeholder colours, which takes milliseconds instead of failing after a twenty minute render. It runs
`easing-inventory`, `claims`, `fonts` and `lightness` with `--strict`, so a package with no motion call, no claim, no
loaded font or a product it cannot find in the frame fails instead of passing with nothing to check. For a cut that is
not 16:9, pass `--width` and `--height` to `gates.mjs` (see [Other sizes](other-sizes.md)).

## Reading edge-scan output

`edge-scan` reports two kinds of range and only one of them fails:

- **`TIGHT`** means a straight line, such as a window or card border, sits inside the action-safe margin (3.5% of the
  frame from each edge, SMPTE ST 2046-1). A border a few pixels from the edge reads as a mistake. The scan exits 1.
  Frame the border inside the margin or bleed it clearly off.
- **`CROSSES`** means content runs across the edge, usually during a push-in. The scan still exits 0, because a
  deliberate bleed is fine as long as no line of text, row or control is sliced. Crop each range at full resolution
  (`contact-sheet.mjs --crop`) and look. A sliced line is a failure by that judgement even though the exit code is 0.
  Once you have judged a range, pass it with `--accept "top:7.8-13.0"` and it prints as `ALLOWED`.

```
reel.mp4: 1920x1080, 21.37s, sampled every 0.2s, action safe is 67px left and right, 38px top and bottom
  CROSSES  top      7.80s to  13.00s  content runs off the edge: crop it and check nothing is sliced
```

That output is from the demo reel, where the camera pushes into the settings dialog and pulls back out. A range like
this is the cue to crop those frames and look, not a verdict either way.

## Tools

These pass or fail nothing:

| Tool                     | In skill | Does                                                                                 |
| ------------------------ | -------- | ------------------------------------------------------------------------------------ |
| `contact-sheet.mjs`      | `create` | builds the frame sheets and crops the review is done on                              |
| `doctor.mjs`             | `create` | checks this machine has Node and ffmpeg with the right filters                       |
| `render-motion-blur.mjs` | `create` | renders the final with band-free motion blur                                         |
| `add-music.mjs`          | `create` | adds a music track without re-encoding the video, padding a short track with silence |
| `reading-time.mjs`       | `review` | works out how long a piece of on-screen text has to be held                          |

## Checks inside the kit

Two more run when the composition loads, so a render fails in seconds instead of after an hour:
`assertStillWhileReading` throws when the camera moves while text is being read, and `assertReadingTime` throws when a
caption is held for less time than it takes to read (characters ÷ 17 + 0.5s, never under 0.8s, plus 0.2s of margin).
The camera also throws on keys out of order or at the same time, and on a box `fitCamera` cannot fit.

Every rule behind these gates is sourced in the create skill's
[`references/pacing.md`](../plugin/skills/create/references/pacing.md).
