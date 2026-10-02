import { useLayoutEffect, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { InboxView } from "@/components/InboxView";
import { SettingsDialog } from "@/components/SettingsDialog";
import { BOXES } from "./boxes";
import { CUE } from "./timeline";
import { dialogIn, doneHover, settingsHover } from "./curves";

const noop = () => {};

/**
 * Relay's real inbox and settings dialog in a plain window, no OS chrome: the audience is on Linux and Windows. The
 * window is 880px wide so a whole-window framing beside a caption keeps 16px UI text at 20px on screen (references
 * techniques.md 1b). It is as tall as the unfiltered inbox. `contain: paint` keeps the dialog's fixed overlay inside it.
 */
export function Product() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = frame / fps;
  const root = useRef<HTMLDivElement>(null);
  const settingsOpen = seconds >= CUE.settingsOpen && seconds < CUE.settingsClose;
  const focusMode = seconds >= CUE.focusOn;

  // The product's own motion from theme.css, which reel.css kills, re-created from the frame: the .dialog keyframes
  // and the .card:hover on the two buttons the cursor presses.
  useLayoutEffect(() => {
    const hover = (button: HTMLElement | null | undefined, p: number) => {
      if (!button) return;
      button.style.borderColor = `color-mix(in srgb, var(--accent) ${(p * 100).toFixed(1)}%, var(--border))`;
      button.style.transform = `translateY(${-p}px)`;
    };
    hover(root.current?.querySelector<HTMLElement>("nav button:last-child"), settingsHover(seconds));
    const dialog = root.current?.querySelector<HTMLElement>(".dialog");
    if (!dialog) return;
    const p = dialogIn(seconds);
    dialog.style.opacity = String(p);
    dialog.style.transform = `scale(${0.97 + 0.03 * p})`;
    hover(dialog.querySelector<HTMLElement>("button"), doneHover(seconds));
  });

  const { x, y, width, height } = BOXES.window;
  return (
    <div
      ref={root}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height,
        overflow: "hidden",
        contain: "paint",
        background: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        boxShadow: "0 40px 120px rgba(0, 0, 0, 0.55)",
        boxSizing: "content-box",
      }}
    >
      <InboxView greeting="Good morning" focusMode={focusMode} onQuickFind={noop} onSettings={noop}>
        {settingsOpen && <SettingsDialog focusMode={focusMode} onFocusModeChange={noop} onClose={noop} />}
      </InboxView>
    </div>
  );
}
