export const FPS = 60;

// Anchor each beat on the one before, so retiming a beat shifts everything after it. Overlap handoffs: the product
// starts rising 0.15s into the title's exit.
const TITLE_EXIT = 2.45;
// The product rises 0.15s into the title's exit. By then the title is under 10% (Titles.tsx fades it over 0.45s), so
// the two cross as a dissolve: nothing readable sits over anything readable, and no frame is empty. Starting later
// looks tidier on paper and opens a visible gap, measured at 0.17s.
const PRODUCT = TITLE_EXIT + 0.15;
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
  // The logo starts here with the product at 15% and still leaving, so no frame is empty. The headline's words settle
  // later, by which time the product is gone: readable text never lands on readable product.
  endCard: OUTRO + 0.5,
  fadeOut: OUTRO + 3.8,
} as const;

export const DURATION_SECONDS = CUE.fadeOut + 0.7;
