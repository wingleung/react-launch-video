export const FPS = 60;
export const DURATION_SECONDS = 41;

export const CUE = {
  titleIn: 0.3,
  titleExit: 2.0,
  // title is gone by 2.6
  productIn: 3.2,
  dashboardHold: 4.4,
  incidentOpen: 7.0,
  cameraOnIncident: 7.4,
  newPage: 8.1,
  paletteOpen: 10.0,
  paletteCaptionFrom: 10.1,
  paletteCaptionTo: 11.3,
  // walk every one of the 60 services with the arrow key
  walkStart: 11.5,
  walkEnd: 38.5,
  endCard: 39.2,
  cut: 40.1,
} as const;

export const WALK_STEP = 0.08;
