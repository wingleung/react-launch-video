import { useLayoutEffect, type RefObject } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { SMOOTH, springAt } from "./motion";

export interface Reveal {
  selector: string;
  /** Cue point in seconds. */
  at: number;
  /** Extra delay in seconds per matched element, from its index or its place in the DOM. */
  delay?: (element: HTMLElement, index: number) => number;
  distance?: number;
}

/** Position among its siblings, for delays that follow a grid rather than document order. */
export function siblingIndex(element: Element | null): number {
  return element?.parentElement ? Array.prototype.indexOf.call(element.parentElement.children, element) : 0;
}

/**
 * Fades, lifts and unblurs parts of a component the reel renders untouched. It writes inline styles in a layout
 * effect, so they land before the frame is captured, and every value is a function of the frame alone, which
 * keeps frames correct when Remotion renders them out of order.
 */
export function useReveal(root: RefObject<HTMLElement | null>, reveals: Reveal[]) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  useLayoutEffect(() => {
    if (!root.current) return;
    for (const { selector, at, delay, distance = 10 } of reveals) {
      root.current.querySelectorAll<HTMLElement>(selector).forEach((element, index) => {
        const progress = springAt(frame, fps, at + (delay?.(element, index) ?? 0), SMOOTH, 0.55 * fps);
        applyReveal(element, progress, distance);
      });
    }
  });
}

// Each element's own inline values from before any reveal touched it, so every frame starts from the product's styles.
const untouched = new WeakMap<HTMLElement, Pick<CSSStyleDeclaration, "opacity" | "translate" | "filter">>();

/**
 * One frame of a reveal, composed with the element's own styles rather than written over them. The lift rides the
 * individual `translate` property, so a component's `transform` (a popover centred with translate(-50%, -50%)) is
 * never touched, and its own translate, opacity and filter carry through the reveal and are back once it ends.
 */
function applyReveal(element: HTMLElement, progress: number, distance: number) {
  let own = untouched.get(element);
  if (!own) {
    own = { opacity: element.style.opacity, translate: element.style.translate, filter: element.style.filter };
    untouched.set(element, own);
  }
  Object.assign(element.style, own);
  if (progress >= 1) return;
  const computed = getComputedStyle(element);
  const [x = "0px", y = "0px", z] =
    computed.translate === "none" ? [] : (computed.translate.match(/(?:[^\s(]+|\([^)]*\))+/g) ?? []);
  element.style.opacity = String(Number(computed.opacity) * progress);
  element.style.translate = [x, `calc(${y} + ${(1 - progress) * distance}px)`, z].filter(Boolean).join(" ");
  element.style.filter = `${computed.filter === "none" ? "" : `${computed.filter} `}blur(${(1 - progress) * 4}px)`;
}

/**
 * An element's box relative to a positioned ancestor, in layout pixels: transforms, the camera's included, are
 * ignored.
 */
export function boxWithin(element: HTMLElement, container: HTMLElement) {
  let top = 0;
  let left = 0;
  let node: HTMLElement | null = element;
  while (node && node !== container) {
    top += node.offsetTop;
    left += node.offsetLeft;
    node = node.offsetParent as HTMLElement | null;
  }
  return { top, left, width: element.offsetWidth, height: element.offsetHeight };
}
