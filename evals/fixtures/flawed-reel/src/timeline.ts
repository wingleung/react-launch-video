export const FPS = 60;

export const SERVICES = 338;
export const WALK_STEP = 0.08;

export const CUE = {
  titleIn: 0.3,
  titleExit: 2.0,
  titleGone: 2.6,
  productIn: 3.2,
  dashboardHold: 4.4,
  incidentOpen: 7.0,
  cameraOnIncident: 7.4,
  newPage: 8.1,
  paletteOpen: 10.0,
  paletteCaptionFrom: 10.1,
  paletteCaptionTo: 11.3,
  // walk every one of the 338 services with the arrow key, one press per WALK_STEP: 337 presses, about 27s
  walkStart: 11.5,
  walkEnd: 11.5 + (SERVICES - 1) * WALK_STEP,
  endCard: 39.2,
  cut: 40.1,
} as const;

// The reel ends on the cut.
export const DURATION_SECONDS = CUE.cut;
