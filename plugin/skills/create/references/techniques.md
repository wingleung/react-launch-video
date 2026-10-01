# Techniques and pitfalls: Remotion reels from real product components

Everything here was learned building a real reel. Each item says what goes wrong and what to do instead.

## Contents

1. Making components renderable 1b. Getting a real app to bundle
2. Styling and assets 2b. Rendering what the product really renders
3. Frame determinism
4. Measuring instead of guessing
5. Animating a component you must not edit
6. Libraries that fight frame-by-frame rendering
7. Camera, layers and framing
8. Verification 8b. Fonts and motion blur
9. Environment and hand-off

## 1. Making components renderable

- **Split the view from its data.** A component that fetches on mount (browser APIs, network, storage) cannot be
  rendered per frame. Move its markup unchanged into a display-only `XView({ state })` and leave the fetching in the
  original component, which now renders `<XView state={state} />`. Diff the moved markup against the original to prove
  it is verbatim, then run the product's typecheck, tests and build.
- **Header or slot props** for parts that talk to the platform: the view takes `header: ReactNode` and the app passes
  its interactive buttons in. The reel passes the same components where they are safe to render.
- **Export pieces of third-party-driven components.** A command palette built on a library (kbar, cmdk) renders through
  the library's store. Export its dialog, row, section heading and class-name constants, keep the library version
  composing them and let the reel compose the same pieces driven by the frame.
- **Stub platform imports** the displayed code imports but never calls during a render (an extension API, a native
  bridge) with a webpack alias to a stub module. Keep the typecheck on the real types and alias only in the bundler.
- **Share context libraries.** If a component calls a hook from a library whose provider the reel mounts, alias that
  library to ONE copy (the product's) or the hook will not find the provider. Remotion already dedupes React.
- **Never invent data.** Use the product's bundled fallback data, a real catalog file, fixtures or a recorded API
  response. Flag anything placeholder in the README so it is replaced before publishing.

## 1b. Getting a real app to bundle

Remotion bundles with webpack, not with the product's own build tool, so a product that builds perfectly on its own can
still fail to bundle here. Work through this before splitting anything: a split is cheap to redo and an integration wall
found after the storyboard is not.

- **A Vite product bundles fine unless it uses Vite's own features.** Grep for them before assuming a fight:
  `grep -rE "import\.meta\.(glob|env)|\.ya?ml"" src`. `import.meta.glob` has no webpack equivalent and needs a small
  pre-loader that expands it into real imports. `import.meta.env` needs a `DefinePlugin` and any import the product's
  plugins handle (yaml, and anything else non-standard) needs its own loader. Root-relative `url()` in CSS resolves
  only once `resolve.roots` points at the product's public folder. A plain Vite app with none of these needs one
  alias.
- **Root-relative URLs built at runtime return 404.** `Config.setPublicDir` is necessary and not sufficient: Remotion
  serves that folder under `/public/`, not at `/`. Any path the product assembles while running, an image path inside
  its data or a CSS custom property a theme loader sets, has to go through `staticFile`.
- **In a monorepo, resolve from the app.** Point `resolve.modules` at the app's own `node_modules` and alias React to one
  copy so hooks find their provider. Point the TypeScript types at the product's `@types/react`. Put the reel
  package outside the workspace globs too, or the user's task runner and CI pick up a Remotion package nobody meant to
  ship.
- **Build-time CSS extraction has to cover the reel as well.** The utility CSS rule in section 2 is not only about
  Tailwind and UnoCSS. Anything that extracts from content globs (Panda) or through a bundler plugin (vanilla-extract,
  Sass modules) has never been told the reel's own composition is content. The failure is silent: the render succeeds
  and the product looks unstyled or half styled. Add the reel's sources to the tool's globs, and add the plugin to
  `remotion.config.ts` where one is needed.
- **A wide product cannot fill the frame while a caption is up.** `Captions` sits at left 110 with width 560 and
  `CAPTION_SAFE` starts at x=700, so the product has about 1153px to live in. An app laid out at 1080 CSS px fits only
  at a zoom around 1.26, and at that zoom its 12px text lands at 15px, under the 18px floor. The answer is to render
  the product at a **narrower viewport** (880px works) so its own text is larger relative to its window, not to raise
  the zoom until something crops.
- **`position: fixed` escapes the camera too, and more often than portals do.** A dialog overlay that dims "the page"
  dims the whole 1920x1080 canvas once it is inside the camera layer. Give the product's container `contain: paint`.
  This is the cheapest thing step 1b catches, so look for it in the first still.
- **Portals leave the camera.** Dialogs, popovers, tooltips, selects and dropdowns from Radix, Headless UI, shadcn and
  MUI portal to `document.body` by default, which is outside the camera transform. The overlay draws unzoomed over the
  captions, and `fitCamera` frames empty space because the measured box no longer says where the thing appears. Pass
  the library's `container` prop so it mounts inside the product frame. Same class as `position: fixed` in section 2,
  one construct further out.
- **Overlays can mount a commit late.** Some libraries mount their popup one or more commits after `open` turns true,
  which is after Remotion captured the frame, so the first stills show no dialog at all. Gate a `delayRender` on the
  DOM node appearing, never on a timer.
- **Stateful components need remounting per frame.** Remotion renders frames out of order across parallel tabs, so a
  component that remembers what it last showed, reads `defaultValues` once or tracks focus renders differently
  depending on which frames a tab happened to draw. `key={frame}` on the subtree fixes it by remounting every frame.
  Know the side effect before you reach for it: a library that restores focus on mount now does so every frame, which
  can scroll a list under the camera.
- **An iframe will not render.** A preview that talks to its child through `postMessage` and a settle delay does not
  resolve inside a frame capture. Alias the iframe component to a stub that renders the same document directly.
- **Focus rings appear that a mouse user never sees.** Headless Chrome has had no pointer input, so anything focused
  programmatically matches `:focus-visible` and draws a keyboard ring. Override it narrowly in the reel's CSS rather
  than globally, so a deliberate keyboard-focus beat can still show one.

## 2. Styling and assets

- **Utility CSS (UnoCSS, Tailwind):** generate the stylesheet with the tool's CLI over both the reel's and the product's
  component sources, before `studio` and `render`. Bundler plugins can fail inside Remotion's config loader (seen with
  `@unocss/webpack`: CommonJS and ES module interop errors). Import the product's own config so tokens match.
- **The product's global styles live in its entry point, not in its components, and the reel imports components.** A
  reset (`@unocss/reset`, Tailwind's preflight, normalize.css), a base layer and any `app.css` are imported once in
  `main.tsx` or `index.tsx`, so importing a component brings none of them. Open the product's entry point and copy
  every import that is not a component into the reel's `Root.tsx`, in the same order.

  This is worth its own line because of how it fails. The component renders, the render exits 0, the layout is right
  and the utility classes work, so it looks like a success. What is wrong is typography: links come back
  browser-default blue and underlined, headings take the user agent's margins and buttons lose their reset. It reads
  as "slightly off brand" rather than as a broken render, which is exactly the kind of thing that ships. Measured on a
  real extension, the fix was one import line and it changed nothing else.

- **Fonts and icons from the product's public folder** via `Config.setPublicDir`, loaded with `@remotion/fonts`. Never
  fetch fonts at render time: CI and restricted networks break, and the render stops being reproducible.
- **Dark mode** usually keys on a `.dark` class on an ancestor: wrap each rendered view in `className="dark"` instead of
  touching the document root. Get this wrong and the failure is invisibility rather than an error: a logo painted
  `fill-[#123456] dark:fill-white` renders as near-black on a near-black stage, and the only symptom is that you cannot
  find it.
- **Media queries measure the composition, not the window you drew around the product.** A product placed inside a
  720px browser frame still sees a 1920px viewport, so it picks its widest breakpoint: four columns squeezed into a
  two-column box, titles truncated to fit, a desktop nav where the real window shows a menu. Nothing errors and the
  frame looks deliberate. Set the layout the product really uses at that width from the reel's own CSS, or give the
  frame a container query the product already responds to.
- **A class name assembled at runtime is invisible to the utility-CSS scanner.** UnoCSS and Tailwind generate CSS by
  reading source text, so `` `i-lucide-${name}` `` or `` `text-${colour}-500` `` produce no CSS and the element renders
  as an empty box while the render exits 0. This catches reels twice over: once in the product, where a good codebase
  already lists the classes as literals, and once in the reel's own new code, where nobody has learned that lesson
  yet. Write the literals out, or add them to the config's safelist.
- **`position: fixed` inside the stage** resolves against the nearest transformed ancestor, which is the whole camera
  layer. Give the page container `contain: paint` so fixed children stay inside it.
- **Negative z-index backgrounds** inside a component need a stacking context on the reel's wrapper
  (`isolation: isolate`), or they disappear behind the wrapper's background.
- **User agent:** components that pick Cmd or Ctrl from `navigator.userAgent` follow the headless browser's UA, which on
  a Mac says Mac. Set `Config.setChromiumUserAgent` to the audience's platform. Studio in a desktop browser still uses
  that browser's UA. Only renders follow the config.

## 2b. Rendering what the product really renders

Reels of CLIs and library-driven UI keep getting this wrong in the same way: reading a library's theme or defaults and
drawing what the file says, instead of what the product's call path selects.

- **Start at the product's call site and follow the calls.** Example from a Go CLI built on huh v2.0.3 (a terminal forms
  library): the CLI's own prompt helper calls `huh.NewMultiSelect(...).Run()`, `Run` calls `huh.Run` and `huh.Run`
  builds the form `WithShowHelp(false)`: so no help line, whatever the field's own help would say. What the call path
  sets wins over the library's defaults.
- **Environment choices are only made if the code asks for them.** Dark or light background, terminal width and colour
  profile are usually detected on request. Find the line that sets the value. If nothing on the path sets it, the zero
  value holds: that huh version picks its dark theme variant only after a background colour message, which only its
  spinner requests, so a multi-select renders the light variant even on a dark terminal.
- **Probe through the product, not around it.** A probe program calls the product's own function (or the same entry
  point with the same arguments as the call site), with stdin and stdout on a real pseudo terminal if detection depends
  on them. Calling `ThemeCharm(true)` yourself forces the branch the product never takes and "proves" a bug that does
  not exist.
- **Write the chain down.** The truthfulness table gets a row per rendering claim: the element, the call chain as
  `file:line` hops and what it selects. "Shown as it really is" without that chain is a claim, not a finding.

## 3. Frame determinism

Remotion renders frames in parallel tabs and out of order. Every visual value must be a pure function of the frame.

- **Kill CSS transitions and keyframe animations globally** (`reel.css` in the kit). Product utility classes such as
  `transition-all` or `animate-pulse` otherwise freeze mid-flight. Re-create any wanted motion from the frame.
- **No state carried between frames**, no `Math.random`, no `Date.now`, no `new Date()` (a greeting based on the time of
  day must be passed in).
- **Hover cannot be triggered** in a render. Emulate it by writing the hover styles from the frame (for example a border
  colour mixed by a progress value).
- **Async effects in rendered components** (a permission check on mount) can resolve after capture. Prefer states that
  settle synchronously, and check the first frames of that component on a contact sheet.

## 4. Measuring instead of guessing

- Heights and positions of real UI depend on data. Measure them in a `useLayoutEffect` (runs before capture) and write
  styles directly: `offsetHeight`, and `boxWithin(element, container)` in the kit for positions that ignore transforms.
- To animate between two states (loading to loaded), render BOTH as real DOM (one hidden if needed), measure both and
  interpolate a shared panel's height. One panel background with crossfading contents avoids a dark flash, which a
  second opaque panel on top causes.
- When a value really must be a constant, measure it once with a throwaway composition that prints the measurement as
  text into a still (console output from renders is not reliably shown), then delete the harness.
- Cursor targets and overlay positions: read them off a rendered still and correct, never trust the first guess.

## 5. Animating a component you must not edit

- `useReveal(ref, [{ selector, at, delay }])` in the kit fades, lifts and unblurs parts of a rendered component by CSS
  selector, writing inline styles from the frame. Delays can follow a grid (column index plus row index) instead of
  document order.
- Highlights (border beam, selection ring) are overlays positioned over measured elements, not changes to the component.

## 6. Libraries that fight frame-by-frame rendering

- Libraries that throttle, debounce or animate in real time (search results throttled by 100ms, Web Animations API
  height animations, virtualised lists measuring on scroll) lag or jitter per frame. Port the logic you need (for kbar:
  Fuse options plus its section and priority ordering) into a pure function of the input.
- **Prove the port.** Render a throwaway still that runs the real library (waiting for its throttle with `delayRender`)
  next to the port for a list of inputs, printing SAME or DIFF per input. Keep the verified inputs in a comment. This
  also reveals story problems: a query that ranks the wrong result first.
- Emulate scrolling of a capped list by translating the list and computing the scroll from measured rows, matching the
  library's own rule (for a virtualiser: scroll only when the active row leaves the bottom edge).

## 7. Camera, layers and framing

- **Layers, bottom to top:** stage backdrop, title card, camera layer (product frame, popovers, cursor, all in world
  coordinates), screen-space captions, end card, keycaps.
- **Camera as focus point plus zoom** per keyframe: `translate(960 - fx * zoom, 540 - fy * zoom) scale(zoom)`. Drive all
  three with `smoothPath` so speed carries through keys. Put equal neighbouring keys where the camera should hold, and a
  small pull back before a push-in.
- **Depth of field:** blur and dim the product layer slightly while the camera is pushed in on a popover that lives in a
  separate layer.
- **Captions need clear space.** While a caption is up, frame the product with `fitCamera(box, CAPTION_SAFE)` so they
  never overlap, not even over a blurred product. The same goes for the end card: fade the product out before it rises.
  Keycaps go beside what they drive, outside its on-screen bounds.
- **Compute push-ins, never choose them.** `fitCamera(measuredBox, safeArea, margin)` returns the focus and zoom that
  fit a measured element inside the safe area (`ACTION_SAFE` by default). A zoom picked by eye is how tables and long
  lines get cropped. When a push-in bleeds the rest of the window off the frame, the frame edge must fall in empty
  space: if it would cut a row, measure the whole block that row belongs to and fit that instead.
- **Hide what you pass.** Beats that change the page (a new tab) should happen after the camera has pulled back, or the
  frame shows an empty zoomed area.
- **Frame for readability.** Zoom so the smallest text that matters is readable at 1080p (UI text at 12px needs about
  1.5 to 1.9x), and check the tallest state still fits the frame.

## 8. Verification

- Typecheck the reel and the product after every structural change.
- Render the full video (JPEG frames render fast), then pull frames at cue points with `node scripts/contact-sheet.mjs`:
  just before a move, mid-move, on arrival, mid-hold and mid-handoff. Read the sheets. Look for: empty or near-empty
  frames, content cropped by the frame edge, text rising over the product, overlapping captions or keycaps,
  mid-transition mismatches (a highlight and an active row disagreeing), text that is too small, a state swap that
  flashes.
- Confirm small effects (a beam around a 32px icon) with a full-resolution crop: a half-scale sheet hides them.
- After a timing change, re-check the frames around every cue that moved, not only the one you meant to change.
- An unchanged-looking result deserves suspicion: confirm the change landed with a frame that must differ.
- Run the gates, all exiting 0: `node scripts/check-video.mjs` (resolution, length, fades, no empty stage),
  `node scripts/edge-scan.mjs` (borders inside the action-safe margin, content off the edge to crop and judge) and
  `node scripts/easing-inventory.mjs src --storyboard storyboard.md` (storyboard easings match the code). A problem is
  fixed or shown not to be one, never accepted.
- Finish with `/react-launch-video:review` on the timeline and the sheets.

## 8b. Fonts and motion blur

- **Fonts** come from the product (its public folder), from a licensed package (`@fontsource/*`) or, if the product only
  loads them from a CDN, from that same family installed as a package. Never copy files from the system font folder or
  out of another application: their licence does not cover redistribution in a video project. `next/font` has no file
  to copy and no package that works outside the Next compiler, so install the same family from Fontsource at the same
  weights and axes and record the substitution. `references/frameworks.md` has the table.
- **Motion blur**: `@remotion/motion-blur` CameraMotionBlur stacks translucent copies in the browser. On a real reel it
  banded dark gradients (column jitter nearly doubled) and rendered about 6x slower. Instead register
  `MotionBlurComposition` (kit) with the reel's `width` and `height` from `Root.tsx` and run `scripts/render-motion-blur.mjs`, which renders 4 samples per frame over a 180°
  shutter and averages them in ffmpeg at 16 bits. Remotion's bundled ffmpeg lacks `tmix`, so this needs a system ffmpeg.
  Keep a draft render script without blur for iteration.

## 9. Environment and hand-off

- The reel is its own package next to the product, with pinned Remotion versions (all `remotion` and `@remotion/*`
  packages on the exact same version).
- `npm --prefix <dir>` runs the script with the package as its working directory, so a `render` script written as
  `remotion render Reel outputs/reel.mp4` writes to `<reel-dir>/outputs/`, not to the root the user is standing in.
  Write the script's output path as `outputs/reel.mp4` and run the documented command once for real to see where
  the file lands.
- Hand the user commands that run from the session's root (`npm --prefix <reel-dir> run render`), verified in their own
  interactive shell, not only in yours.
- Document in the reel README: beats, pacing choices with sources, placeholder data to replace, render time.
- Offer motion blur only for the final render: it multiplies render time.
