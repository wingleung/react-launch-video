#!/usr/bin/env node
// Find where a render's content comes too close to, or runs off, the frame edge.
//
//     node edge-scan.mjs reel.mp4 [--every 0.2] [--json]
//
// Samples the video, runs a Sobel filter on four strips along the frame edges and reports two things per edge:
//
// - TIGHT: a straight line (a window or card border) sits inside the action-safe margin, 3.5% of the frame width or
//   height from the edge (SMPTE ST 2046-1: safe action is 93% of the frame). A border a few pixels from the edge reads
//   as a mistake. Frame it inside the margin or bleed it clearly off. Exits 1 when any TIGHT range is found.
// - CROSSES: content runs across the edge. A deliberate bleed is fine only when no text line, row or control is sliced.
//   Crop every CROSSES range at full resolution (contact-sheet.mjs --crop), look and write the verdict in the frame
//   review log. A sliced line is a failing gate, not a caveat.
//
// Needs ffmpeg on the PATH. No dependencies.
import { parse } from "./lib/cli.mjs";
import { fixed, floatLiteral, roundHalfEven } from "./lib/fmt.mjs";
import { probeGeometry } from "./lib/probe.mjs";
import { main, runBytes } from "./lib/run.mjs";

const SPEC = {
  positionals: ["video"],
  options: [
    { flag: "--every", dest: "every", metavar: "EVERY", type: "float", default: 0.2, help: "seconds between samples" },
    { flag: "--json", dest: "json", store: true, default: false },
    {
      flag: "--accept",
      dest: "accept",
      metavar: "RANGES",
      default: "",
      help: 'ranges already looked at and allowed, e.g. "top:7.8-13.0,right:17.6-18.2"',
    },
  ],
};

const EDGE = 28; // Sobel magnitude that counts as an edge pixel on normal-contrast content
// A dark theme's borders are genuinely faint: a #232833 line on #0b0d12 peaks at a Sobel magnitude around 8 to 12,
// so a fixed 28 cannot see them and a real border 25px from the frame edge went unreported for four seconds. Scale
// the threshold to the strongest edge the frame actually contains, and never upwards: bright content keeps 28 and
// its false-positive behaviour is unchanged.
const FAINT = 0.35;
const LINE = 0.1; // a run of edge pixels this long (fraction of the edge length) is a border, text never runs that long
const CROSS = 12; // edge pixels on the outermost two lines that mean something crosses the edge
const HOLD = 0.6; // a border passing through the margin during a camera move is fine, one resting there is not
const SLACK = 0.05; // an accepted range is matched loosely, so a sample landing a frame either side still counts

/** Ranges a human has already cropped and judged, so the next render stops reporting them. */
function parseAccepted(text) {
  return text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const found = /^(left|right|top|bottom):(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/.exec(part);
      if (!found) throw new Error(`cannot read --accept range "${part}", expected edge:from-to like top:7.8-13.0`);
      return { edge: found[1], from: Number(found[2]), to: Number(found[3]) };
    });
}

main("edge-scan", () => {
  const args = parse("edge-scan.mjs", SPEC, process.argv.slice(2));
  const accepted = parseAccepted(args.accept);
  const isAccepted = (finding) =>
    accepted.some(
      (range) => range.edge === finding.edge && finding.from >= range.from - SLACK && finding.to <= range.to + SLACK,
    );
  const { width, height, duration } = probeGeometry(args.video);
  const safeX = roundHalfEven(width * 0.035);
  const safeY = roundHalfEven(height * 0.035);
  const every = floatLiteral(args.every); // the filter string and the header both show it as a float, so 1 reads as 1.0

  const strips = [
    { name: "left", crop: `${safeX + 2}:${height}:0:0`, depth: safeX + 2, length: height, stride: safeX + 2 },
    {
      name: "right",
      crop: `${safeX + 2}:${height}:${width - safeX - 2}:0`,
      depth: safeX + 2,
      length: height,
      stride: safeX + 2,
    },
    { name: "top", crop: `${width}:${safeY + 2}:0:0`, depth: safeY + 2, length: width, stride: width },
    {
      name: "bottom",
      crop: `${width}:${safeY + 2}:0:${height - safeY - 2}`,
      depth: safeY + 2,
      length: width,
      stride: width,
    },
  ];

  // One pass over a line, counting edge pixels and the longest unbroken run of them.
  const scanLine = (strip, spec, index, edge) => {
    let sum = 0;
    let longest = 0;
    let run = 0;
    const take = (value) => {
      if (value > edge) {
        sum += 1;
        run += 1;
        if (run > longest) longest = run;
      } else {
        run = 0;
      }
    };
    if (spec.name === "left" || spec.name === "right") {
      const start = spec.name === "left" ? index : spec.stride - 1 - index;
      for (let at = start; at < strip.length; at += spec.stride) take(strip[at]);
    } else {
      const row = spec.name === "top" ? index : spec.depth - 1 - index;
      const from = Math.min(Math.max(row * width, 0), strip.length);
      const to = Math.min(Math.max((row + 1) * width, 0), strip.length);
      for (let at = from; at < to; at += 1) take(strip[at]);
    }
    return { sum, longest };
  };

  const samples = new Map();
  for (const spec of strips) {
    const isSide = spec.name === "left" || spec.name === "right";
    const frameBytes = spec.stride * (isSide ? height : spec.depth);
    const raw = runBytes("ffmpeg", [
      "-loglevel",
      "error",
      "-i",
      args.video,
      "-vf",
      `fps=1/${every},format=gray,sobel,crop=${spec.crop}`,
      "-f",
      "rawvideo",
      "-pix_fmt",
      "gray",
      "-",
    ]);
    let strongest = 0;
    for (const value of raw) if (value > strongest) strongest = value;
    const edge = Math.min(EDGE, Math.max(8, FAINT * strongest));
    const rows = [];
    for (let n = 0; n < Math.floor(raw.length / frameBytes); n += 1) {
      const strip = raw.subarray(n * frameBytes, (n + 1) * frameBytes);
      let state = "ok";
      let distance = -1;
      if (scanLine(strip, spec, 0, edge).sum + scanLine(strip, spec, 1, edge).sum >= CROSS) {
        state = "crosses";
        distance = 0;
      } else {
        for (let index = 0; index < spec.depth; index += 1) {
          if (scanLine(strip, spec, index, edge).longest >= LINE * spec.length) {
            if (index < (isSide ? safeX : safeY)) {
              state = "tight";
              distance = index;
            }
            break;
          }
        }
      }
      rows.push({ at: roundHalfEven(n * args.every, 2), state, distance });
    }
    samples.set(spec.name, rows);
  }

  const findings = [];
  for (const [name, rows] of samples) {
    const runs = []; // [state, from, to, closest_px], consecutive samples in the same state
    for (const { at, state, distance } of rows) {
      const last = runs[runs.length - 1];
      if (last && last.state === state && Math.abs(last.to - at) < args.every * 1.5) {
        last.to = at;
        last.distance = state === "tight" ? Math.min(last.distance, distance) : distance;
      } else {
        runs.push({ state, from: at, to: at, distance });
      }
    }
    for (const run of runs) {
      const end = run.to + args.every; // a run's last sample covers one more interval
      if (run.state === "tight" && end - run.from < HOLD) continue;
      if (run.state === "ok") continue;
      const previous = findings.length && findings[findings.length - 1].edge === name ? findings.at(-1) : null;
      if (previous && previous.state === run.state && run.from - previous.to <= 2 * args.every) {
        previous.to = roundHalfEven(end, 2);
        previous.closest_px = Math.min(previous.closest_px, run.distance);
      } else {
        findings.push({
          edge: name,
          state: run.state,
          from: run.from,
          to: roundHalfEven(Math.min(end, duration), 2),
          closest_px: run.distance,
        });
      }
    }
  }

  for (const finding of findings) if (isAccepted(finding)) finding.accepted = true;

  if (args.json) {
    console.log(asJson({ x: safeX, y: safeY }, findings));
  } else {
    const safeNote = `action safe is ${safeX}px left and right, ${safeY}px top and bottom`;
    console.log(`${args.video}: ${width}x${height}, ${fixed(duration, 2)}s, sampled every ${every}s, ${safeNote}`);
    for (const finding of [...findings].sort((a, b) => a.from - b.from)) {
      const span = `${fixed(finding.from, 2).padStart(6)}s to ${fixed(finding.to, 2).padStart(6)}s`;
      const edge = finding.edge.padEnd(6);
      if (finding.accepted) {
        console.log(`  ALLOWED  ${edge} ${span}  looked at already, listed in --accept`);
      } else if (finding.state === "tight") {
        console.log(`  TIGHT    ${edge} ${span}  a border sits ${finding.closest_px}px from the edge`);
      } else {
        console.log(`  CROSSES  ${edge} ${span}  content runs off the edge: crop it and check nothing is sliced`);
      }
    }
    if (!findings.length) console.log("  nothing near the edges");
  }
  return findings.some((finding) => finding.state === "tight" && !finding.accepted) ? 1 : 0;
});

// A timestamp stays a float in the JSON that graders parse, so a whole number keeps its `.0`.
function asJson(safe, findings) {
  const body = findings.map((finding) =>
    [
      "    {",
      `      "edge": ${JSON.stringify(finding.edge)},`,
      `      "state": ${JSON.stringify(finding.state)},`,
      `      "from": ${floatLiteral(finding.from)},`,
      `      "to": ${floatLiteral(finding.to)},`,
      `      "closest_px": ${finding.closest_px}${finding.accepted ? "," : ""}`,
      ...(finding.accepted ? ['      "accepted": true'] : []),
      "    }",
    ].join("\n"),
  );
  const list = body.length ? `[\n${body.join(",\n")}\n  ]` : "[]";
  return `{\n  "safe": {\n    "x": ${safe.x},\n    "y": ${safe.y}\n  },\n  "findings": ${list}\n}`;
}
