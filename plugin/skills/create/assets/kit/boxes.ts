import type { Box } from "./motion";

/**
 * Where things actually are on the 1920x1080 stage, in world coordinates, so `fitCamera` can frame them.
 *
 * **Measure these, do not estimate them.** Step 1c of the skill renders a throwaway still that prints each element's
 * `getBoundingClientRect()` and you copy the numbers here. A guessed box is the single most expensive mistake
 * available in this kit: `fitCamera` accepts any object of the right shape, so a wrong one produces a reel that
 * passes every gate while framing the wrong thing or slicing a row, and nobody sees it until they watch the render.
 *
 * Re-measure whenever the product's layout changes. These are coordinates on the stage, not inside the product, so
 * they already include wherever you positioned the product frame.
 */
export const BOXES = {
  /** The whole product frame, for the opening wide shot. Replace with the real rectangle. */
  product: { x: 360, y: 210, width: 1200, height: 660 } satisfies Box,
  // One per beat, named after what the beat shows, for example:
  // commandPalette: { x: 620, y: 300, width: 680, height: 420 } satisfies Box,
} satisfies Record<string, Box>;
