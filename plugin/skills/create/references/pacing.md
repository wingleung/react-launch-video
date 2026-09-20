# Pacing, easing and camera for cinematic product reels

Researched September 2026. Linear, Vercel, Framer, Apple and Stripe do not publish timings for their own launch videos,
so the numbers below come from design-system motion tokens, animation docs, subtitle rules and reading-speed research.
Anything marked **[convention]** is common practice with no source behind it: treat it as a starting point, not a rule.
Anything marked **[rule]** is a threshold this file sets. Anything written as a `[measured: ...]` claim is re-derived
from the kit's own curves by `scripts/claims.mjs` on every run, so it is true here or the build fails.
All frame counts assume 60fps.

## Durations per segment

| Segment                       | Recommended                                                             | Basis                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Total teaser                  | 15 to 30s                                                               | [convention]. Videos under a minute average 52% engagement, the best of any length ([Wistia](https://wistia.com/learn/marketing/optimal-video-length))                                                                                                                                                                                                                                                                                                                                                       |
| Fade from or to black         | 0.4 to 1.0s                                                             | Film fades run 1 to 2s and soft cuts 6 to 12 frames at 24fps ([Wikipedia: Dissolve](<https://en.wikipedia.org/wiki/Dissolve_(filmmaking)>)). Shortened for short reels [convention]                                                                                                                                                                                                                                                                                                                          |
| Title card (reveal plus read) | 1.5 to 2.5s                                                             | [convention]. The hold must cover the reading time below                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Text the viewer must read     | characters ÷ 17 seconds, minimum 0.8s, plus about 0.5s after it settles | Netflix allows 20 characters/s for adults and 17 for children ([style guide](https://partnerhelp.netflixstudios.com/hc/en-us/articles/217350977-English-USA-Timed-Text-Style-Guide)) with a 4/5s minimum ([timing](https://partnerhelp.netflixstudios.com/hc/en-us/articles/360051554394-Timed-Text-Style-Guide-Subtitle-Timing-Guidelines)). Silent reading averages 238 words a minute ([Brysbaert 2019](https://gwern.net/doc/psychology/linguistics/2019-brysbaert.pdf)). The extra 0.5s is [convention] |
| Feature beat                  | 3 to 5s: about 0.8 to 1.2s of move, then a hold                         | [convention]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Transition between beats      | 0.25 to 0.5s                                                            | Soft cuts as above. Carbon slow-02 is 700ms ([Carbon tokens](https://github.com/carbon-design-system/carbon/blob/main/packages/motion/src/tokens.ts)). Material 3 tops out at 1000ms ([MotionTokens.kt](https://raw.githubusercontent.com/androidx/androidx/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/MotionTokens.kt))                                                                                                                              |
| Camera push-in or pull-back   | 0.8 to 1.5s                                                             | Duration should grow with the distance or area covered ([Material Motion.md](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md), [M1](https://m1.material.io/motion/duration-easing.html)). The exact range is [convention]                                                                                                                                                                                                                              |
| End card or logo lockup       | 2 to 3s including the hold                                              | 1 to 2s stings for social, 2 to 5s generally ([Renderforest](https://www.renderforest.com/blog/how-to-animate-logo))                                                                                                                                                                                                                                                                                                                                                                                         |

**Counting rule.** Count every character visible in that block of text at the same time, spaces and punctuation
included, and any label that is part of it (a chapter number such as "01", a keycap label next to it). Join its lines
with a single space and count those spaces too. Measure the hold from the moment the whole block is readable to the
moment its exit starts. A block is readable once its last part has fully settled: for a staggered reveal, that is the
last word's start plus its whole rise. Reveal and exit time never count as reading time. Leave at least 0.2s of margin:
a hold that passes by a few hundredths fails as soon as anyone retimes a neighbour.

Worked example: a caption "01" over "Command palette" over "Search by name, hostname or group" is "01 Command palette
Search by name, hostname or group", 52 characters. 52 ÷ 17 = 3.06s, plus 0.5s = 3.56s between the detail line settling
and the caption starting to leave. A title "Relay Issue Search" (18 characters) revealed as two units 0.09s apart with a
0.9s rise is readable at 0.09 + 0.9 = 0.99s after its first word starts, and then needs 18 ÷ 17 + 0.5 = 1.56s, plus
margin, before its exit.

Keycaps are text too: "Ctrl K" is 6 characters, so it needs the 0.8s minimum after it is fully visible, however quickly
the key itself is released.

UI micro-interaction budgets (under 300ms and so on) do not apply to a video's holds and camera moves. They still apply
to the product's own components inside the reel (a popover opening, a keypress response).

## Easing

| Use                                                         | Curve                                                                                                      | Source                                                                                                                                                                                   |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Large things arriving (title, product, cards)               | `cubic-bezier(0.05, 0.7, 0.1, 1)`, Material 3 emphasized decelerate                                        | [MotionTokens.kt](https://raw.githubusercontent.com/androidx/androidx/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/MotionTokens.kt) |
| Strong ease-out for smaller UI                              | `cubic-bezier(0.23, 1, 0.32, 1)`                                                                           | [Emil Kowalski](https://github.com/emilkowalski/skills/blob/main/skills/emil-design-eng/SKILL.md)                                                                                        |
| Large things leaving (title receding, product pulling away) | `cubic-bezier(0.3, 0, 0.8, 0.15)` (Material 3) or `cubic-bezier(0.4, 0.14, 1, 1)` (Carbon expressive exit) | MotionTokens.kt, [Carbon](https://github.com/carbon-design-system/carbon/blob/main/packages/motion/src/tokens.ts)                                                                        |
| On-screen move or morph                                     | `cubic-bezier(0.4, 0.14, 0.3, 1)` (Carbon expressive standard) or `cubic-bezier(0.77, 0, 0.175, 1)`        | Carbon. Ease-in-out for things already on screen ([animations.dev](https://animations.dev/learn/animation-theory/the-easing-blueprint))                                                  |
| Spring without overshoot                                    | Remotion `{ damping: 200 }`                                                                                | [Remotion spring](https://www.remotion.dev/docs/spring)                                                                                                                                  |
| Springs in general                                          | bounce 0 by default, be careful above 0.4                                                                  | [WWDC23 Animate with springs](https://developer.apple.com/videos/play/wwdc2023/10158/)                                                                                                   |

Never ease-in something that is arriving: it delays the moment the viewer is watching (Emil Kowalski).

Where a band and a reading time disagree, **reading time wins**. A 16-character title already needs about 1.6s of
hold on top of its reveal, so a title card carrying real product copy will run past the 1.5 to 2.5s band. Take the
extra length rather than a hold nobody can read, and say so in the storyboard.

## Rules

1. **Overlap handoffs.** Start the next move while the previous one is still finishing, 30 to 50% overlap. Title to
   product: the title scales to about 0.9, blurs 4 to 8px and fades over 0.5 to 0.7s, and the product starts rising
   0.05s in and takes 0.8 to 1.0s. [convention], following the overlapping action principle
   ([StudioBinder](https://www.studiobinder.com/blog/what-are-the-12-principles-of-animation/)). Blur hides crossfade
   artifacts, but keep it under 20px (Emil Kowalski).

   Overlap the motion, not the legibility: at the first frame arriving text passes 50% opacity, the product under it
   is **either** below 10% **or** blurred past 12px, and neither side is ever alone on an empty stage. [rule]

   Those two halves fight each other, and which way you resolve it depends on the handoff. The kit's title handoff has
   a middle. Wait 0.15s and the title is alone on a stage with [measured: title opacity at titleExit + 0.15 is 9.7%]
   left on it, wait none at all and a bright product rises under text that is still being read, and at the 0.05s the
   kit uses neither happens: [measured: min brightest over titleExit..productIn + 1.0 is 40.3%].

   The outro has no such middle. Search the whole timing space and there is none, because the product must fall under
   the opacity threshold before the card is readable, which guarantees a dim frame between them. Blur is what resolves
   it rather than timing: the product leaves over 0.8s so it is still substantial when the end card starts,
   [measured: product opacity at endCard is 50.0%], while its blur runs on its own faster ramp that finishes on that
   same cue, [measured: product blur at endCard is 14.0px]. A blurred product is not readable at any opacity, which is
   the point the opacity threshold was always standing in for.

   The blur threshold is measured, not chosen. An earlier kit tied the blur to the fade, so it had barely begun when
   the card arrived, and a barely blurred product still shows legible window shapes and text blocks under the wordmark.
   Ramp the blur separately from the opacity so it is finished before the card arrives rather than stretching the fade,
   which only trades a readable product for a dark frame.

   An emphasized accelerate exit still shows 85% opacity at its midpoint, so fade the product's opacity on a faster
   curve than its recede. Measured while building the kit: sequencing the two moves so they never overlap looks safer
   and opens a 0.17s hole at each handoff, which reads worse than the dissolve. [convention]

2. **No stop-go camera.** A multi-keyframe path eased at every key stops at every key. Ease only where the camera should
   really stop, and carry speed through the rest, like After Effects roving keyframes
   ([Adobe](https://helpx.adobe.com/after-effects/using/keyframe-interpolation.html)). `smoothPath` in the kit does
   this.
3. **Hold after every settle** for the reading time above, at least 0.8s, before the next move. Aim for roughly 40%
   motion and 60% stillness over the reel. [convention]
4. **Staggers.** 30 to 80ms between UI items, 60 to 100ms between title words. [convention for titles]
5. **Anticipation.** A 2 to 4% counter-move (a slight pull back) over 150 to 250ms before a push-in. [convention for the
   numbers]
6. **Scale duration to distance.** On a 1080p canvas, moves that cross the frame use the long end of token ranges, 500
   to 1000ms (M1).
7. **Outro.** Pull back 1.0 to 1.2s into the end card, hold 1.5 to 2s (longer if the subline needs it), fade to black
   over 0.5 to 0.8s. [convention]
8. **Motion blur**, if used: a 180° shutter (blur over half the frame interval), on camera and large moves only, never
   on text being read
   ([ProVideo Coalition](https://www.provideocoalition.com/tip_create_cinematic_motion_blur_in_after_effects_and_in_life/)).
   In Remotion it multiplies render time, so offer it for the final render rather than every iteration. Measured on a
   real reel: `@remotion/motion-blur` CameraMotionBlur banded dark gradients and rendered about 6x slower, while
   rendering 4 samples per frame and averaging them in ffmpeg at 16 bits did not band (kit `MotionBlur.tsx`).
9. **Ambient layer, still product.** Something slow always moves so no held shot is a still frame, but only the soft
   background glow. The product and the camera hold perfectly still while text is read. Measured on real renders: a 1.5%
   zoom drift through holds changed the product region almost 60% as much per frame as a real push-in, and the text
   visibly shifted and rescaled in half a second, which viewers see as wobble. Keep fine detail (grids, noise, thin
   lines) out of the moving backdrop for the same reason: subpixel moves make it shimmer.
10. **Restraint.** One push-in per beat at most, zoom computed to fit what it frames, highlights only where the point
    would otherwise be missed. [convention] Tested on real renders: reels that spent every available effect cropped
    content, rushed keycaps and ran over length, while restrained ones did not.
11. **Safe areas.** Keep borders and text inside the safe action area, 93% of the frame width and height (3.5% in from
    each edge, 67 by 38px at 1920x1080), and captions inside the safe title area, 90% (96 by 54px), as redefined by
    SMPTE ST 2046-1 ([NAB summary](https://www.nab.org/xert/scitech/pdfs/tv031510.pdf)). A reel for the web is never
    overscanned, so this is a composition rule rather than a delivery one: a window border resting a few pixels from the
    edge reads as a mistake. Either frame it inside or bleed it well off, and never slice a line of text. Measured on
    real renders: borders at 5 to 16px from the edge and rows sliced during a push-in were the edge problems reviewers
    caught, and `node scripts/edge-scan.mjs` finds both **when the border has contrast to find**. It thresholds on
    Sobel magnitude, so a dark theme's own borders (a `#232833` line on `#0b0d12` peaks around 8 to 12) can sit below
    it. The threshold now scales down for low-contrast strips, but on a dark UI check the margins by eye on a
    full-resolution crop rather than treating a clean scan as proof.
