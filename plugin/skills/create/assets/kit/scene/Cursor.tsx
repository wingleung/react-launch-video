import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { easeInOut, tween } from "../motion";

export interface CursorMove {
  /** World coordinates of the hotspot at the end of this move. */
  to: { x: number; y: number };
  from: number;
  arrive: number;
}

// The y axis settles sooner than x, which bends the straight line into the arc a hand actually draws.
const settleY = Easing.bezier(0.3, 0.9, 0.3, 1);

/**
 * A pointer that travels a list of moves and optionally clicks. Render it inside the camera layer so it zooms with the
 * product. Target coordinates are world coordinates: measure them from a rendered still, do not guess.
 */
export function Cursor({
  start,
  moves,
  clickAt,
  clicks,
  visibleFrom,
  hideAt,
}: {
  start: { x: number; y: number };
  moves: CursorMove[];
  /** One click, for the common case. */
  clickAt?: number;
  /** Every click, when the cursor presses more than once. A reel with two clicks should not have to patch the kit. */
  clicks?: number[];
  visibleFrom: number;
  hideAt: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < visibleFrom * fps) return null;

  let [x, y] = [start.x, start.y];
  let previous = start;
  for (const { to, from, arrive } of moves) {
    x += tween(frame, fps, [from, arrive], [0, to.x - previous.x], easeInOut);
    y += tween(frame, fps, [from, arrive], [0, to.y - previous.y], settleY);
    previous = to;
  }

  // Each press dips the cursor and returns it, so the presses multiply: away from any click every term is 1.
  const at = clicks ?? (clickAt === undefined ? [] : [clickAt]);
  const press = at.reduce(
    (scale, when) =>
      scale *
      interpolate(
        frame,
        [when, when + 0.06, when + 0.2].map((s) => s * fps),
        [1, 0.82, 1],
        {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        },
      ),
    1,
  );

  return (
    <svg
      width={30}
      height={36}
      viewBox="0 0 20 24"
      style={{
        position: "absolute",
        left: x - 3,
        top: y - 2,
        opacity:
          tween(frame, fps, [visibleFrom, visibleFrom + 0.2], [0, 1]) -
          tween(frame, fps, [hideAt, hideAt + 0.25], [0, 1]),
        transform: `scale(${press})`,
        transformOrigin: "3px 2px",
        filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))",
      }}
    >
      <path
        d="M2 1.5 L2 19.5 L6.6 15.2 L9.6 22 L12.6 20.7 L9.7 14 L16 14 Z"
        fill="white"
        stroke="#0a0a0a"
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
    </svg>
  );
}
