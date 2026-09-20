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

/** A word is readable once fully settled: its start plus REVEAL. Count holds from the last word's settle. */
export const REVEAL = 0.9;

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
  tween(f(seconds), FPS, [CUE.outro + 0.1, CUE.outro + 0.9], [0, 1], easeInOut);
/** The exit blur, on its own faster ramp that finishes as the end card starts. See references/pacing.md rule 1. */
export const productDissolve = (seconds: number) =>
  tween(f(seconds), FPS, [CUE.outro + 0.1, CUE.endCard], [0, 1], easeOut);

export const reelFade = (seconds: number) =>
  tween(f(seconds), FPS, [0, 0.8], [0, 1], easeInOut) *
  (1 - tween(f(seconds), FPS, [CUE.fadeOut, CUE.fadeOut + 0.6], [0, 1], easeInOut));

// Each element comes in a pair: the alpha its own layer sets, which the component uses, and the opacity the viewer
// ends up seeing once the reveal it rises on and the stage's fade to black are folded in. Claims are about the
// second one, because a layer at full alpha inside a stage fading to black is not on screen in any useful sense.
export const titleAlpha = (seconds: number, exitAt: number = CUE.titleExit) => 1 - titleGone(seconds, exitAt);
export const productAlpha = (seconds: number) => productArrived(seconds) * (1 - productGone(seconds));

export const titleOpacity = (seconds: number) =>
  reelFade(seconds) * Math.max(rise(seconds, CUE.titleLogo), rise(seconds, CUE.titleWords)) * titleAlpha(seconds);
export const titleBlur = (seconds: number, exitAt: number = CUE.titleExit) => 8 * titleGone(seconds, exitAt);
export const productOpacity = (seconds: number) => reelFade(seconds) * productAlpha(seconds);
export const productBlur = (seconds: number) => (1 - productArrived(seconds)) * 14 + productDissolve(seconds) * 14;
/** The kit's end card: logo and headline both rise on CUE.endCard, later words only later still. */
export const endCardOpacity = (seconds: number) => reelFade(seconds) * rise(seconds, CUE.endCard);

/** The brightest thing on the stage. A handoff that lets this fall away leaves the viewer looking at nothing. */
export const brightest = (seconds: number) =>
  Math.max(titleOpacity(seconds), productOpacity(seconds), endCardOpacity(seconds));

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
