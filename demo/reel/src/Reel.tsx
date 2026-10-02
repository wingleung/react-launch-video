import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { TARGETS } from "./boxes";
import { CAMERA, FOCUS, INBOX, TITLE } from "./camera";
import { productAlpha, productBloom, productBlur, productEnter, productRecede, reelFade } from "./curves";
import { smoothPath } from "./motion";
import { Product } from "./Product";
import { Captions } from "./scene/Captions";
import { Cursor } from "./scene/Cursor";
import { Lockup, type LockupWord } from "./scene/Lockup";
import { Stage } from "./scene/Stage";
import { EndCard, TitleCard } from "./scene/Titles";
import { CUE } from "./timeline";

// Relay's --accent (#7c5cff) and --accent-2 (#22d3ee) from theme.css, at low alpha.
const GLOW: [string, string] = ["rgba(124, 92, 255, 0.16)", "rgba(34, 211, 238, 0.07)"];
// The product's own gradient text class from theme.css.
const GRADIENT = "brand-gradient";
// Relay ships no logo, so the lockup is its name with the feature in the product's gradient.
const WORDS: LockupWord[] = [{ text: "Relay" }, { text: "Focus mode", gradient: true }];

export function Reel() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const seconds = frame / fps;

  const times = CAMERA.map(([time]) => time);
  const track = (index: 1 | 2 | 3) =>
    smoothPath(
      seconds,
      times,
      CAMERA.map((key) => key[index]),
    );
  const [focusX, focusY, zoom] = [track(1), track(2), track(3)];
  const cameraX = width / 2 - focusX * zoom;
  const cameraY = height / 2 - focusY * zoom;

  const enter = productEnter(seconds);
  const recede = productRecede(seconds);
  const fade = reelFade(seconds);

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <AbsoluteFill style={{ opacity: fade }}>
        {/* The backdrop moves a fraction of the camera: that parallax is what reads as depth. */}
        <Stage
          glow={GLOW}
          offsetX={(cameraX - (width / 2) * (1 - zoom)) * 0.12}
          offsetY={(cameraY - (height / 2) * (1 - zoom)) * 0.12}
          scale={1 + (zoom - 1) * 0.15}
        />
        <TitleCard exitAt={CUE.titleExit}>
          <Lockup logo={null} words={WORDS} logoAt={CUE.titleWords} wordsAt={CUE.titleWords} gradientClass={GRADIENT} />
        </TitleCard>
        <div
          style={{
            position: "absolute",
            width,
            height,
            transformOrigin: "0 0",
            transform: `translate(${cameraX}px, ${cameraY}px) scale(${zoom})`,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: productAlpha(seconds),
              transform:
                `perspective(2400px) translateY(${(1 - enter) * 140 + recede * 40}px) ` +
                `rotateX(${(1 - enter) * 22}deg) scale(${0.94 + 0.06 * enter - 0.08 * recede})`,
              // The bloom is not decoration: without it the blur takes the frame's light with it. See curves.ts.
              filter: `blur(${productBlur(seconds)}px) brightness(${productBloom(seconds)})`,
            }}
          >
            <Product />
            <Cursor
              start={TARGETS.start}
              visibleFrom={CUE.cursorIn}
              moves={[
                { to: TARGETS.settings, from: CUE.cursorIn + 0.05, arrive: CUE.cursorAtSettings },
                { to: TARGETS.focusCheckbox, from: CUE.dialogFramed - 0.3, arrive: CUE.cursorAtCheckbox },
                { to: TARGETS.done, from: CUE.cursorAtDone - 0.65, arrive: CUE.cursorAtDone },
              ]}
              clicks={[CUE.settingsClick, CUE.focusClick, CUE.doneClick]}
              hideAt={CUE.settingsClose + 0.1}
            />
          </div>
        </div>
        <Captions
          gradientClass={GRADIENT}
          chapters={[
            { ...INBOX, from: CUE.inboxCaption, to: CUE.inboxCaptionEnd },
            { ...FOCUS, from: CUE.afterCaption, to: CUE.afterCaptionEnd },
          ]}
        />
        <EndCard at={CUE.endCard}>
          <Lockup logo={null} words={WORDS} logoAt={CUE.endCard} wordsAt={CUE.endCard} gradientClass={GRADIENT} />
        </EndCard>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
