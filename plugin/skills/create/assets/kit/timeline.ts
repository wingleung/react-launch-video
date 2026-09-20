export const FPS = 60;

// Anchor each beat on the one before, so retiming a beat shifts everything after it. Overlap handoffs: the product
// starts rising 0.05s into the title's exit.
const TITLE_EXIT = 2.45;
// The product rises 0.05s into the title's exit, so the two genuinely cross rather than queue.
// [measured: title opacity at productIn is 46.7%]
//
// The lead is the whole game here and it is narrow on both sides, and both failures are quiet. Wait 0.15s and the
// title is alone on an almost empty stage, [measured: title opacity at titleExit + 0.15 is 9.7%]. Wait none at all
// and a bright product rises under text that is still being read. At 0.05s neither happens: the stage never empties,
// [measured: min brightest over titleExit..productIn + 1.0 is 40.3%], and the product is still at nothing for as
// long as the title is readable, [measured: max product opacity over titleExit..productIn is 0%] with
// [measured: title opacity crosses 50% after titleExit at 2.500s].
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
  // The logo starts here with the product still substantial and still leaving, so no frame is empty:
  // [measured: product opacity at endCard is 50.0%] and [measured: min brightest over outro..fadeOut is 38.4%].
  // The product's blur ramp ends on this cue too, so from here on it is unreadable however bright it still is.
  endCard: OUTRO + 0.5,
  fadeOut: OUTRO + 3.8,
} as const;

export const DURATION_SECONDS = CUE.fadeOut + 0.7;
