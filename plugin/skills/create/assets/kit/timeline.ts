export const FPS = 60;

// Anchor each beat on the one before, so retiming a beat shifts everything after it. Overlap handoffs: the product
// starts rising 0.05s into the title's exit.
const TITLE_EXIT = 2.45;
// The product rises 0.05s into the title's exit, while the title is still around 47%, so the two genuinely cross.
// The lead is the whole game here and it is narrow on both sides. Sampled every quarter-frame across the handoff:
// at 0.15s the title has already fallen to 9.7% with the product still at 0, leaving the brightest thing on screen
// under a tenth, and at 0s the product is bright under text that is still readable. 0.05s is the measured middle:
// the faintest moment is 40.3%, and the product never passes 10% while the title is above 50%.
const PRODUCT = TITLE_EXIT + 0.05;
const at = (seconds: number) => PRODUCT + seconds;

const LAST_ACTION = at(12);
const OUTRO = LAST_ACTION + 0.55;

/**
 * Cue points in seconds. Every animation keys off these. Holds for text are reading time: characters / 17 + 0.5s,
 * never under 0.8s. See references/pacing.md in the product-reel create skill.
 */
export const CUE = {
  // Intro: fade up from black, title reveals, holds to be read, recedes behind the product.
  titleLogo: 0.35,
  titleWords: 0.55,
  titleExit: TITLE_EXIT,
  // Beat 1
  productIn: PRODUCT,
  // ...one block per beat, each with its caption window and camera keys
  lastAction: LAST_ACTION,
  // Outro: pull back as the product recedes, end card comes forward, holds, then everything fades to black.
  outro: OUTRO,
  // The logo starts here with the product at 50% and still leaving, so no frame is empty, and the product's blur ramp
  // ends on this cue, so from here on it is unreadable however bright it still is.
  endCard: OUTRO + 0.5,
  fadeOut: OUTRO + 3.8,
} as const;

export const DURATION_SECONDS = CUE.fadeOut + 0.7;
