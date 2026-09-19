#!/usr/bin/env node
// Put a music track on a finished reel without touching a single video frame.
//
//     node add-music.mjs reel.mp4 music.m4a reel-with-music.mp4 [--fade-out 2]
//
// The video stream is copied, not re-encoded. That matters: taking a reel through an editor and exporting again
// re-encodes it, and these reels are mostly large, dark, smooth gradients, which is exactly what banding shows up in.
// Mux instead, and the picture that passed the gates is the picture that ships.
//
// Needs ffmpeg and ffprobe on the PATH. No dependencies.
import { parse } from "./lib/cli.mjs";
import { fixed } from "./lib/fmt.mjs";
import { probeGeometry } from "./lib/probe.mjs";
import { main, runInherit } from "./lib/run.mjs";

const SPEC = {
  positionals: ["video", "music", "out"],
  options: [
    {
      flag: "--fade-out",
      dest: "fadeOut",
      metavar: "SECONDS",
      type: "float",
      default: 2,
      help: "seconds of audio fade at the end, 0 for none",
    },
  ],
};

main("add-music", () => {
  const args = parse("add-music.mjs", SPEC, process.argv.slice(2));
  const { duration } = probeGeometry(args.video);
  const fade = Math.max(0, Math.min(args.fadeOut, duration));
  // The reel ends on black, so the music has to end with it rather than being cut off mid-note.
  const filter = fade > 0 ? ["-af", `afade=t=out:st=${fixed(duration - fade, 3)}:d=${fixed(fade, 3)}`] : [];

  runInherit("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    args.video,
    "-i",
    args.music,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    ...filter,
    // Stop at the reel's last frame even when the track is longer.
    "-shortest",
    "-movflags",
    "+faststart",
    args.out,
  ]);
  console.log(args.out);
  return 0;
});
