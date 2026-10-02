# Vertical, square and 4:5 cuts

How to make a reel in another frame size: a 1080x1920 vertical story, a 1080x1350 (4:5) post or a 1080x1080 square.
Reels render at 1920x1080 by default. Ask for another size in plain words and the create skill makes these changes:

```
/react-launch-video:create a 4:5 cut of the same reel for LinkedIn, at 1080x1350
```

1. **The composition size.** `width` and `height` in the reel's `src/Root.tsx`. The camera, the parallax and the
   centre of the frame follow it, because the kit reads the size from the composition rather than assuming 16:9.
2. **The push-ins.** Camera keys come from `fitCamera(box, safeArea(frame), margin, maxZoom, frame)` with the new
   `frame`, so every push-in is computed against the safe area of the frame that ships. `fitCamera` picks the largest
   zoom that keeps the box inside that area, and throws when the box cannot fit at all.
3. **The product's layout.** A media query measures the composition, so a narrow frame can switch the product to its
   phone layout. If that is not the layout you want to show, override the breakpoint in the reel's CSS.
4. **Motion blur.** `MotionBlurComposition` is registered with the same `width` and `height`.
5. **The gates.** Pass the size to the runner, which hands it to `check-video`:

   ```
   node <skill>/scripts/gates.mjs outputs/reel.mp4 --src src --storyboard storyboard.md --width 1080 --height 1350
   ```

   `edge-scan` needs no size: its action-safe margin is a share of whatever frame it reads.

Captions and title cards keep their reading-time holds at any size. The storyboard is the place to decide whether a
vertical cut shows the same beats or fewer, since each beat has less room.
