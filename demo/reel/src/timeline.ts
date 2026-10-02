export const FPS = 60;

// Anchor each beat on the one before, so retiming a beat shifts everything after it. Every hold below is reading
// time (characters / 17 + 0.5s, plus 0.2s of margin) from the moment the text has fully settled, and camera.ts
// asserts each one at load with the exact text, so the arithmetic lives there rather than in these comments.

// Title "Relay Focus mode": two lockup words, settled at TITLE_WORDS + 0.09 + 0.9.
const TITLE_WORDS = 0.3;
const TITLE_EXIT = 3.0;
// The product rises 0.05s into the title's exit, so the two genuinely cross rather than queue.
// [measured: title opacity at productIn is 46.7%]
const PRODUCT = TITLE_EXIT + 0.05;
const at = (seconds: number) => PRODUCT + seconds;

// Beat 1, the inbox before: caption 01 beside the whole window.
const INBOX_FRAMED = at(1.15);
const INBOX_CAPTION = at(0.85);
const INBOX_CAPTION_END = INBOX_CAPTION + 4.4;

// Beat 2, the settings dialog: the cursor clicks Settings, the camera pushes in on the dialog, Focus mode is ticked.
const SETTINGS_CLICK = INBOX_CAPTION_END + 0.75;
// A click opens the dialog on release, a moment after the press.
const SETTINGS_OPEN = SETTINGS_CLICK + 0.08;
const PUSH_IN = SETTINGS_OPEN + 0.05;
const DIALOG_FRAMED = PUSH_IN + 1.1;
const FOCUS_CLICK = DIALOG_FRAMED + 0.55;
// The dialog's text is held still for its reading time, then Done closes it.
const SETTINGS_CLOSE = DIALOG_FRAMED + 3.85;

// Beat 3, the inbox after: the camera pulls back to the whole window and caption 02 names the feature.
const AFTER_FRAMED = SETTINGS_CLOSE + 1.1;
const AFTER_CAPTION = AFTER_FRAMED - 0.1;
const AFTER_CAPTION_END = AFTER_CAPTION + 5.1;

const LAST_ACTION = AFTER_CAPTION_END;
const OUTRO = LAST_ACTION + 0.55;

/**
 * Cue points in seconds. Every animation keys off these. See references/pacing.md in the react-launch-video create
 * skill for the reading-time rule and the handoff overlaps.
 */
export const CUE = {
  // Intro: fade up from black, title reveals, holds to be read, recedes behind the product.
  titleWords: TITLE_WORDS,
  titleExit: TITLE_EXIT,
  productIn: PRODUCT,
  // Beat 1
  inboxFramed: INBOX_FRAMED,
  inboxCaption: INBOX_CAPTION,
  inboxCaptionEnd: INBOX_CAPTION_END,
  // Beat 2
  cursorIn: INBOX_CAPTION_END,
  // The cursor rests on each control for 0.1s before pressing it, long enough for the product's hover to show.
  cursorAtSettings: SETTINGS_CLICK - 0.1,
  settingsClick: SETTINGS_CLICK,
  settingsOpen: SETTINGS_OPEN,
  pushIn: PUSH_IN,
  dialogFramed: DIALOG_FRAMED,
  cursorAtCheckbox: FOCUS_CLICK - 0.12,
  focusClick: FOCUS_CLICK,
  focusOn: FOCUS_CLICK + 0.05,
  cursorAtDone: SETTINGS_CLOSE - 0.18,
  doneClick: SETTINGS_CLOSE - 0.08,
  settingsClose: SETTINGS_CLOSE,
  // Beat 3
  pullBack: SETTINGS_CLOSE + 0.05,
  afterFramed: AFTER_FRAMED,
  afterCaption: AFTER_CAPTION,
  afterCaptionEnd: AFTER_CAPTION_END,
  lastAction: LAST_ACTION,
  // Outro: pull back as the product recedes, end card comes forward, holds, then everything fades to black.
  outro: OUTRO,
  // The end card starts while the product is still substantial and still leaving, so the two cross rather than queue:
  // [measured: product opacity at endCard is 78.2%]. The product's blur ramp ends on this cue too, so from here on
  // it is unreadable however bright it still is, [measured: product blur at endCard is 14.0px].
  endCard: OUTRO + 0.4,
  fadeOut: OUTRO + 3.05,
} as const;

export const DURATION_SECONDS = CUE.fadeOut + 0.7;
