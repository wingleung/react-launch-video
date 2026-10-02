import type { Box } from "./motion";

/**
 * Where things are on the 1920x1080 stage, in world coordinates, so `fitCamera` can frame them. Measured with
 * getBoundingClientRect on a rendered still of the real components (step 1c), after `document.fonts.ready`: measured
 * before Inter had loaded, the cards came out 4px short each and the push-in sat 28px lower than this. Re-measure
 * whenever the layout changes.
 */
export const BOXES = {
  /** The product window's content box: 880px wide, as tall as the unfiltered inbox (688.6px), centred on the stage. */
  window: { x: 520, y: 196, width: 880, height: 689 } satisfies Box,
  /**
   * The settings dialog at its own width, stretched from the header's top (h1 at y 245) to the last card's bottom
   * (REL-127, y 837.6). Fitting the dialog alone would bleed the header and the last card across the frame edge
   * mid-move, so the push-in fits the whole column of text the dialog sits over. The dialog itself is 460x191.9 at
   * 731,445.5, centred on this box.
   */
  dialogColumn: { x: 731, y: 245, width: 460, height: 593 } satisfies Box,
} satisfies Record<string, Box>;

/**
 * Cursor hotspots, inside each control's measured box but past the end of its label, so the arrow (which hangs down
 * and right of the hotspot) never covers the word being pressed. Settings is 1277.3,246.5 91.7x38, the checkbox
 * 760,522.5 13x13 and Done 756,579.5 61.9x33, all from the same still. The start is empty space under the Done column.
 */
export const TARGETS = {
  start: { x: 1250, y: 700 },
  settings: { x: 1360, y: 278 },
  focusCheckbox: { x: 771, y: 533 },
  done: { x: 808, y: 604 },
};
