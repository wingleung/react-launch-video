# Everything in the kit you have to change

The kit is a skeleton with the product-shaped holes left open. There are about twenty of them and only a handful are
obvious, so this is the list. Work down it after step 1b's copy and before the first real render.

Three of these are theme colours in three different files. Setting one and forgetting the other two is the most
common way a reel ends up looking like the kit rather than like the product, and no gate can see it: the reel renders
perfectly in someone else's palette.

## Structural, never delete these

`index.ts`, `Root.tsx`, `reel.css`, `timeline.ts`, `motion.ts` and `curves.ts` are the package rather than scene
components. Nothing imports `boxes.ts` either, because step 1c fills it in and the camera reads it. Step 4 tells you
to delete the scene files this reel does not use, and it means `scene/`, not these.

## The list

| #   | File                 | What                        | Set it from                                                                                                                                                                                     |
| --- | -------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `remotion.config.ts` | the product's path          | wherever the product sits relative to the reel package. Set it in step 1b: the config throws until it names a real folder                                                                       |
| 2   | `remotion.config.ts` | `@` alias, context libs     | the product's own import aliases, and one copy of any library holding React context                                                                                                             |
| 3   | `remotion.config.ts` | Chromium user agent         | the audience's platform, so the product picks the right modifier key                                                                                                                            |
| 4   | `reel.css`           | the font stack              | the product's own family, loaded through `@remotion/fonts` (already in the scaffold, pinned) or its `@fontsource` package. Naming a family nothing loads renders the whole reel in the fallback |
| 5   | `Reel.tsx`           | `GLOW`                      | two accent colours from the design tokens, as low-alpha rgba                                                                                                                                    |
| 6   | `Reel.tsx`           | the four component slots    | the title card, the product frame, the popovers with the cursor and the screen-space captions with the end card                                                                                 |
| 7   | `Root.tsx`           | `width` and `height`        | only for a cut that is not 16:9. Pass the same numbers to `gates.mjs` and to `MotionBlurComposition`                                                                                            |
| 8   | `curves.ts`          | `LIGHTNESS`                 | the product's surface token, 0 for a dark UI and 1 for a white one. `lightness.mjs` fails the render if this disagrees with the pixels                                                          |
| 9   | `timeline.ts`        | `TITLE_EXIT`                | the title's reading time, not a round number                                                                                                                                                    |
| 10  | `timeline.ts`        | `LAST_ACTION`               | the kit ships a bare `at(12)` placeholder: it must become the real last beat                                                                                                                    |
| 11  | `timeline.ts`        | one `CUE` block per beat    | the storyboard's beat sheet                                                                                                                                                                     |
| 12  | `boxes.ts`           | `BOXES`                     | measured in step 1c, never estimated                                                                                                                                                            |
| 13  | `camera.ts`          | `CAMERA` keys               | the boxes above, through `fitCamera`, two equal keys per hold                                                                                                                                   |
| 14  | `camera.ts`          | `READING` windows           | one per caption, with its `text` so the reading-time guard runs                                                                                                                                 |
| 15  | `scene/Lockup.tsx`   | `gradientClass`, the words  | the product's gradient text class and its real headline                                                                                                                                         |
| 16  | `scene/Captions.tsx` | `gradientClass`, `chapters` | the same class, and one chapter per beat with its copy                                                                                                                                          |
| 17  | `scene/Ring.tsx`     | beam and ring `from`/`to`   | the product's accent, the third theme site and the one people miss                                                                                                                              |
| 18  | `scene/Keys.tsx`     | `combos`, `left`, `top`     | the real shortcuts, placed outside the product's on-screen bounds                                                                                                                               |
| 19  | `scene/Cursor.tsx`   | the cursor's targets        | the coordinates the pointer actually travels between                                                                                                                                            |

## After the list

Delete the `scene/` files this reel does not use. `easing-inventory.mjs` reports every motion call in the package
against the storyboard's easing table, so an unused `Keys.tsx` is a gate failure rather than dead weight.
