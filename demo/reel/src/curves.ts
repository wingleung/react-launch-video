import { Easing } from "remotion";
import { easeInOut, easeOut, emphasizedIn, emphasizedOut, tween } from "./motion";
import { CUE, FPS } from "./timeline";

/**
 * Every timing curve in the reel as a plain function of seconds, so a script can evaluate one without a browser.
 * The components call these rather than keeping their own copies: a number checked against a second copy of the
 * timing proves nothing about the reel that ships.
 *
 * Like camera.ts this file carries no JSX on purpose. `scripts/claims.mjs` imports it in Node and re-derives every
 * `[measured: ...]` figure written in a comment or a reference doc, which is how six wrong numbers were found.
 *
 * Each curve calls `tween` itself rather than sharing a wrapper, so `easing-inventory.mjs` can still read the easing
 * off the call. A helper that hid these behind one `tween` would take them out of the storyboard's reach.
 */
const f = (seconds: number) => seconds * FPS;

/**
 * How light the product's own UI is, from 0 for a dark interface to 1 for a white one. Read it off the product's
 * surface token rather than guessing: take the background it shows behind its content and use its lightness, so
 * `#0d0f16` is about 0.05, `#8a8f99` about 0.56 and `#ffffff` is 1.
 *
 * This is here because the outro behaves differently at each end and one set of numbers cannot serve both. A dark
 * product is at risk of emptying the stage as it blurs out, because blur takes the light with it, so it leaves
 * slowly and blooms. A pale product blurs to a bright slab that keeps its own light and was never at that risk, so
 * the risk it runs is the opposite one: the end card's wordmark landing on a visibly present rectangle. Measured at
 * the frame where the wordmark is half risen, the product behind it sat at 7% of the reel's peak brightness when
 * dark and 35% when mid-grey, and no gate tells those apart because both are blurred past the rule's threshold.
 * [rendered], September 2026.
 *
 * So a pale product leaves faster and blooms less, and both fall out of this one number. 0 reproduces the dark
 * kit exactly. Set it once, then confirm with `check-video.mjs` on a render, which is the only real authority.
 */
// Relay's --bg is #0b0d12 and its cards #12151c (theme.css), so about 0.05.
export const LIGHTNESS = 0.05;

/** A pale product can leave faster because it was never in danger of emptying the stage. */
export const fadeFor = (lightness: number) => 0.8 - 0.25 * lightness;
/** And it needs less of the bloom, which exists to replace light that a dark product loses to the blur. */
export const bloomFor = (lightness: number) => 1.2 * (1 - lightness);
const FADE = fadeFor(LIGHTNESS);

/** A word is readable once fully settled: its start plus REVEAL. Count holds from the last word's settle. */
export const REVEAL = 0.9;
/** The gap between one lockup word starting to rise and the next. */
export const WORD_STAGGER = 0.09;
/** When a lockup of `words` words that starts rising at `start` is readable: its last word's start plus REVEAL. */
export const settled = (start: number, words: number) => start + (words - 1) * WORD_STAGGER + REVEAL;

/** One part of a lockup rising out of its blur. `useRise` in scene/Lockup.tsx is this curve. */
export const rise = (seconds: number, start: number) =>
  tween(f(seconds), FPS, [start, start + REVEAL], [0, 1], emphasizedIn);

// The title recedes on two curves: the transform rides the slower `titleRecede`, opacity and blur the faster
// `titleGone`, so the headline is unreadable before it has finished moving.
export const titleRecede = (seconds: number, exitAt: number = CUE.titleExit) =>
  tween(f(seconds), FPS, [exitAt, exitAt + 0.7], [0, 1], emphasizedOut);
export const titleGone = (seconds: number, exitAt: number = CUE.titleExit) =>
  tween(f(seconds), FPS, [exitAt, exitAt + 0.45], [0, 1], easeOut);

// The product's entrance splits the same way: opacity arrives on `productArrived` well before the transform settles
// on `productEnter`, or the product travels most of its distance while the stage behind it is still dark.
export const productEnter = (seconds: number) =>
  tween(f(seconds), FPS, [CUE.productIn, CUE.productIn + 1.0], [0, 1], emphasizedIn);
export const productArrived = (seconds: number) =>
  tween(f(seconds), FPS, [CUE.productIn, CUE.productIn + 0.4], [0, 1], emphasizedIn);
export const productRecede = (seconds: number) =>
  tween(f(seconds), FPS, [CUE.outro + 0.1, CUE.outro + 0.9], [0, 1], emphasizedOut);
export const productGone = (seconds: number) =>
  tween(f(seconds), FPS, [CUE.outro + 0.1, CUE.outro + 0.1 + FADE], [0, 1], easeInOut);
/** The exit blur, on its own faster ramp that finishes as the end card starts. See references/pacing.md rule 1. */
export const productDissolve = (seconds: number) =>
  tween(f(seconds), FPS, [CUE.outro + 0.1, CUE.endCard], [0, 1], easeOut);
/**
 * Defocus spreads a highlight over a wider area, so it takes the peak brightness down with it. On a product made of
 * thin text on a dark panel that is most of the light in the frame, and the collapse is brutal: peak luma fell from
 * 243 to 76 in three frames as the blur crossed 8px, and bottomed at 11% of the reel's median. [rendered] on the
 * kit's own outro, September 2026. Blur alone therefore cannot both hide the product and keep the stage lit,
 * whatever the timing, which is what an earlier version of rule 1 got wrong. This puts the light back as the blur
 * takes it away, the way a real defocused highlight blooms rather than simply dimming.
 *
 * 1.2 is for a dark product, which is the case that needs it, and LIGHTNESS scales it away for paler ones. A light
 * product blurs to a bright slab and keeps its own light: rendered, the same outro measured 53% of the reel's median
 * with the full bloom and 53% with none at all, so there it was inert rather than wrong. [rendered], September 2026.
 */
export const productBloom = (seconds: number) => 1 + productDissolve(seconds) * bloomFor(LIGHTNESS);

/** CSS `ease-out`, the timing function of the product's own .dialog keyframes in theme.css. */
const cssEaseOut = Easing.bezier(0, 0, 0.58, 1);
/** The settings dialog's 180ms entrance from theme.css (opacity 0 and scale 0.97 to rest), driven by the frame. */
export const dialogIn = (seconds: number) =>
  tween(f(seconds), FPS, [CUE.settingsOpen, CUE.settingsOpen + 0.18], [0, 1], cssEaseOut);

/** CSS `ease`, the timing function of the product's .card border and lift transitions in theme.css. */
const cssEase = Easing.bezier(0.25, 0.1, 0.25, 1);
/**
 * The product's `.card:hover` (accent border, 1px lift) on the button under the cursor. theme.css transitions it over
 * 200ms both ways, and reel.css kills that transition, so it is re-created here. Settings loses its hover the moment
 * the dialog's overlay covers it, Done keeps it until the dialog unmounts.
 */
export const settingsHover = (seconds: number) =>
  tween(f(seconds), FPS, [CUE.cursorAtSettings, CUE.cursorAtSettings + 0.2], [0, 1], cssEase) -
  tween(f(seconds), FPS, [CUE.settingsOpen, CUE.settingsOpen + 0.2], [0, 1], cssEase);
export const doneHover = (seconds: number) =>
  tween(f(seconds), FPS, [CUE.cursorAtDone, CUE.cursorAtDone + 0.2], [0, 1], cssEase);

export const reelFade = (seconds: number) =>
  tween(f(seconds), FPS, [0, 0.8], [0, 1], easeInOut) *
  (1 - tween(f(seconds), FPS, [CUE.fadeOut, CUE.fadeOut + 0.6], [0, 1], easeInOut));

// Each element comes in a pair: the alpha its own layer sets, which the component uses, and the opacity the viewer
// ends up seeing once the reveal it rises on and the stage's fade to black are folded in. Claims are about the
// second one, because a layer at full alpha inside a stage fading to black is not on screen in any useful sense.
export const titleAlpha = (seconds: number, exitAt: number = CUE.titleExit) => 1 - titleGone(seconds, exitAt);
export const productAlpha = (seconds: number) => productArrived(seconds) * (1 - productGone(seconds));

// Relay has no logo, so the title is its words alone.
export const titleOpacity = (seconds: number) =>
  reelFade(seconds) * rise(seconds, CUE.titleWords) * titleAlpha(seconds);
export const titleBlur = (seconds: number, exitAt: number = CUE.titleExit) => 8 * titleGone(seconds, exitAt);
export const productOpacity = (seconds: number) => reelFade(seconds) * productAlpha(seconds);
export const productBlur = (seconds: number) => (1 - productArrived(seconds)) * 14 + productDissolve(seconds) * 14;
/** The kit's end card: logo and headline both rise on CUE.endCard, later words only later still. */
export const endCardOpacity = (seconds: number) => reelFade(seconds) * rise(seconds, CUE.endCard);

/**
 * How much of its peak brightness a blurred thing keeps. Blur spreads a highlight, so what it costs depends on the
 * blur radius against the width of the strokes being spread: a 112px wordmark barely notices 4px, while 2px text in
 * a product screenshot is gone by 8px. The curve below is in units of blur per stroke width for that reason.
 *
 * Calibrated against one rendered reel by sampling the brightest pixel per frame and dividing out the opacity the
 * curve asked for. Both ends come from real frames, and they are far apart: display text at 0.36 kept 97%, product
 * UI text at 4.0 kept 30% and at 7.0 kept 21%. [rendered], September 2026.
 *
 * It is a model of one reel, not a law, so treat it as a smoke alarm rather than a proof. The authority on whether a
 * frame is empty is `check-video.mjs` on a real render, which measures pixels instead of predicting them. This
 * exists so that a number written in a comment is not actively wrong.
 *
 * Both ends were measured on a dark product, so it reads a paler one low: the same outro rendered 33% of the reel's
 * median with a dark panel, 53% with a light one and 82% with a mid-grey one, against the single figure of 35% this
 * predicts for all three. Wrong in the safe direction, which is the direction to keep it, since the failure it
 * replaced was the optimistic one. [rendered], September 2026.
 */
const KEEPS: [number, number][] = [
  [0, 1],
  [0.4, 0.97],
  [1, 0.8],
  [2, 0.55],
  [3, 0.4],
  [4, 0.3],
  [5, 0.26],
  [7, 0.21],
  [10, 0.2],
];
/** Typical stroke widths on a 1920x1080 stage: a display lockup, and text inside the product's own UI. */
export const STROKE = { display: 12, ui: 2 };
export const survivesBlur = (blur: number, stroke: number, floor: number = LIGHTNESS) => {
  const ratio = blur / stroke;
  if (ratio <= 0) return 1;
  // `floor` is there because blur pulls a peak towards the average of what surrounds it, and a pale panel's average
  // is its own background, so however hard it is blurred it cannot end up darker than that. Without it the curve,
  // calibrated on a dark product, reads a mid-grey one nearly 50 points low.
  for (let i = 1; i < KEEPS.length; i++) {
    const [x0, y0] = KEEPS[i - 1]!;
    const [x1, y1] = KEEPS[i]!;
    if (ratio <= x1) return Math.max(floor, y0 + ((y1 - y0) * (ratio - x0)) / (x1 - x0));
  }
  return Math.max(floor, KEEPS[KEEPS.length - 1]![1]);
};

/**
 * The brightest thing on the stage, as a fraction of what a fully lit frame would be. A handoff that lets this fall
 * away leaves the viewer looking at nothing.
 *
 * Opacity alone used to stand in for this, and it certified as 96% lit an outro frame that rendered at 11% of the
 * reel's median, because a blurred layer keeps all of its opacity while losing almost all of its light. [rendered],
 * September 2026. Blur and bloom are folded in here so the number means roughly what it says. Roughly: see
 * survivesBlur on why this is a smoke alarm and why check-video on a real render is the proof.
 */
export const brightest = (seconds: number) =>
  Math.max(
    titleOpacity(seconds) * survivesBlur(titleBlur(seconds), STROKE.display),
    Math.min(1, productOpacity(seconds) * survivesBlur(productBlur(seconds), STROKE.ui) * productBloom(seconds)),
    endCardOpacity(seconds),
  );

/**
 * The signals a `[measured: ...]` claim may name, with the unit the claim writes after its number. Add a row here
 * and prose about that signal can be checked. Anything not here cannot be claimed, which is the point of the list.
 */
export const SIGNALS: Record<string, { unit: "%" | "px"; at: (seconds: number) => number }> = {
  "title opacity": { unit: "%", at: titleOpacity },
  "title blur": { unit: "px", at: titleBlur },
  "product opacity": { unit: "%", at: productOpacity },
  "product blur": { unit: "px", at: productBlur },
  "end card opacity": { unit: "%", at: endCardOpacity },
  brightest: { unit: "%", at: brightest },
};
