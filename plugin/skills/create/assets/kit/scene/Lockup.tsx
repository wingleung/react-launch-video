import { useCurrentFrame, useVideoConfig } from "remotion";
import { emphasizedIn, tween } from "../motion";

export interface LockupWord {
  text: string;
  /**
   * Painted with the product's gradient text class. Keep a multi-word gradient phrase as ONE word so it runs
   * unbroken.
   */
  gradient?: boolean;
}

const WORD_STAGGER = 0.09;
/** A word is readable once fully settled: its start plus REVEAL. Count holds from the last word's settle. */
export const REVEAL = 0.9;

export function useRise(start: number, distance: number) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = tween(frame, fps, [start, start + REVEAL], [0, 1], emphasizedIn);
  return {
    opacity: p,
    transform: `translateY(${(1 - p) * distance}px)`,
    filter: p < 1 ? `blur(${(1 - p) * 12}px)` : undefined,
  };
}

function Word({ text, gradient, start, gradientClass }: LockupWord & { start: number; gradientClass: string }) {
  return (
    <span className={gradient ? gradientClass : undefined} style={{ display: "inline-block", ...useRise(start, 34) }}>
      {text}
    </span>
  );
}

/**
 * The product logo over its headline, each part rising out of a blur a beat after the one before. Used for both the
 * title card and the end card, so the reel opens and closes on the same lockup.
 */
export function Lockup({
  logo,
  words,
  logoAt,
  wordsAt,
  gradientClass,
  fontSize = 112,
  children,
}: {
  /** The product's own logo component, not a redrawn one. */
  logo: React.ReactNode;
  words: LockupWord[];
  logoAt: number;
  wordsAt: number;
  /** The product's own gradient text class, from its design tokens. */
  gradientClass: string;
  fontSize?: number;
  children?: React.ReactNode;
}) {
  const rise = useRise(logoAt, 20);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", color: "#f5f5f5" }}>
      <div style={rise}>{logo}</div>
      <h1
        style={{
          marginTop: 28,
          fontSize,
          fontWeight: 700,
          letterSpacing: "-0.035em",
          lineHeight: 1.05,
          display: "flex",
          gap: "0.26em",
        }}
      >
        {words.map((word, i) => (
          <Word key={word.text} {...word} gradientClass={gradientClass} start={wordsAt + i * WORD_STAGGER} />
        ))}
      </h1>
      {children}
    </div>
  );
}

export function Subline({ at, children }: { at: number; children: React.ReactNode }) {
  return (
    <p style={{ marginTop: 26, fontSize: 30, color: "#a3a3a3", letterSpacing: "-0.01em", ...useRise(at, 16) }}>
      {children}
    </p>
  );
}
