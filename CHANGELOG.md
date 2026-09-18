# Changelog

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
