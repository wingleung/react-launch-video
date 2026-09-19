# Changelog

## 1.1.0

Everything here came from two runs on real products plus an audit, not from the test fixtures.

- **Fails early on a product that cannot render.** A new step renders one still of one real component before the
  storyboard and before any file is edited, and `references/frameworks.md` decides scope by rendering model rather
  than by framework name, so React Server Components are refused up front instead of at the first render.
- **Guards the repo.** The step that edits your components now checks `git status` first, takes a typecheck, test and
  build baseline before the split rather than only after, and offers to revert the split at the end.
- **A real app integration section** in `references/techniques.md`: Vite-only imports, public paths, monorepo
  resolution, silent CSS extraction, portals escaping the camera, late-mounting overlays, per-frame state, iframes.
- **Legibility is decided in the storyboard**, as source px times zoom against an 18px floor, instead of being found
  in review after several drafts.
- **Any frame size.** `check-video --width/--height`, `safeArea()` for any frame, `fitCamera` for the frame it
  composes, and a sized `MotionBlurComposition`, so a vertical cut can be gated like a 16:9 one.
- **Tempo.** `beatsAt(bpm)` for reels cut to music, and `add-music.mjs`, which muxes a track with the video stream
  copied rather than re-encoded.
- **Reading time is a gate**: give a reading window its `text` and `assertReadingTime` throws at composition load.
- **Gates that stop nagging.** `easing-inventory` accepts `File.tsx#symbol` citations that survive edits, and
  `edge-scan --accept` silences ranges already cropped and judged deliberate.
- **Fixed:** the kit's own example camera drifted through the end card and failed the kit's own assertion.

## 1.0.0

First public release.

- `create` skill: storyboard-first method with sourced pacing, a Remotion starter kit (camera path, captions, title and
  end cards, cursor, keycaps, highlights, motion blur) and five gate scripts.
- `review` skill: severity-ranked review of a reel or Remotion project against the same standards.
- Scope: React web apps and CLIs.
- Gates: resolution, length, fades, no empty stage in a handoff, action-safe edges, storyboard easings matching the
  code, and `assertStillWhileReading` in the kit, which fails a render whose camera moves while text is being read.
- Prerequisites are Node and ffmpeg. The gate scripts are dependency-free ESM, run as `node <script>.mjs`, so there is
  one runtime rather than two and nothing that depends on a shebang, which Windows does not have.
- The gates have their own test suite, which pins their output and builds the clips that exercise each failure.
