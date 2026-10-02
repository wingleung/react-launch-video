import { assertReadingTime, assertStillWhileReading, CAPTION_SAFE, fitCamera } from "./motion";
import type { CameraKey, ReadingWindow } from "./motion";
import { BOXES } from "./boxes";
import { settled } from "./curves";
import { CUE } from "./timeline";

// The whole window beside a caption and the push-in on the settings dialog. Both come from fitCamera on measured
// boxes, and in both every text line of the inbox is inside the frame, so no move between them slices one.
const [wideX, wideY, wideZoom] = fitCamera(BOXES.window, CAPTION_SAFE);
const dialog = fitCamera(BOXES.dialogColumn);

// Camera keyframes: [seconds, focus x, focus y, zoom], in world coordinates on the 1920x1080 stage.
// smoothPath carries speed through the keys, so only equal neighbours stop the camera.
export const CAMERA: CameraKey[] = [
  [CUE.productIn, wideX, wideY + 100, wideZoom * 0.86],
  [CUE.inboxFramed, wideX, wideY, wideZoom],
  // Held through caption 01 and the click on Settings.
  [CUE.pushIn, wideX, wideY, wideZoom],
  // Anticipation: a 3% pull back before the push-in.
  [CUE.pushIn + 0.2, wideX, wideY, wideZoom * 0.97],
  [CUE.dialogFramed, ...dialog],
  [CUE.pullBack, ...dialog],
  [CUE.afterFramed, wideX, wideY, wideZoom],
  // Held through caption 02.
  [CUE.outro, wideX, wideY, wideZoom],
  [CUE.outro + 1.1, 960, 540, 0.92],
  // Repeats its zoom so the camera is perfectly still for the whole end card (references/pacing.md rule 7).
  [CUE.fadeOut + 0.7, 960, 540, 0.92],
];

export const TITLE = "Relay Focus mode";
export const INBOX = { name: "Inbox", detail: "Every open issue, grouped by status." };
export const FOCUS = { name: "Focus mode", detail: "Shows only the issues assigned to your team." };
/** The dialog's label block, which the viewer reads while it is ticked (SettingsDialog.tsx). */
const DIALOG_LABEL = "Focus mode Only show issues assigned to the web team.";

/** A caption is readable once its detail line has risen: two 0.08s staggers plus the 0.8s rise (Captions.tsx). */
const captionSettled = (from: number) => from + 0.16 + 0.8;

// Every window where text is being read, from fully settled to the start of its exit, with the text it shows.
export const READING: ReadingWindow[] = [
  { label: "title", from: settled(CUE.titleWords, 2), to: CUE.titleExit, text: TITLE },
  {
    label: "01 Inbox",
    from: captionSettled(CUE.inboxCaption),
    to: CUE.inboxCaptionEnd,
    text: `01 ${INBOX.name} ${INBOX.detail}`,
  },
  { label: "settings dialog", from: CUE.dialogFramed, to: CUE.settingsClose, text: DIALOG_LABEL },
  {
    label: "02 Focus mode",
    from: captionSettled(CUE.afterCaption),
    to: CUE.afterCaptionEnd,
    text: `02 ${FOCUS.name} ${FOCUS.detail}`,
  },
  { label: "end card", from: settled(CUE.endCard, 2), to: CUE.fadeOut, text: TITLE },
];

// Both run when the composition loads, so a camera that drifts under text, or a hold shorter than its reading time,
// fails in seconds rather than after a render.
assertStillWhileReading(CAMERA, READING);
assertReadingTime(READING);
