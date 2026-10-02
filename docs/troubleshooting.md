# Troubleshooting

What goes wrong when a reel is set up, rendered or checked, with the cause and the fix for each.

| Symptom                                       | Cause and fix                                                                                                                                                                                                                                                              |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The doctor reports a missing tool             | Install it with the command it prints, then open a new terminal so the PATH is picked up                                                                                                                                                                                   |
| `npm run still` fails on the product path     | `reel/remotion.config.ts` names a product folder that does not exist. Point it at your app, then run the still again                                                                                                                                                       |
| The first still is black                      | `npm run still` renders frame 480 on purpose, because frame 0 is the fade from black. A still you rendered at frame 0 is black whatever the state of the toolchain. Before the product is imported the still is a dim drifting gradient with nothing on it, which is right |
| The still with the product looks empty        | The component rendered unstyled and too dark to see, usually because utility CSS was not generated yet. Generate it over the reel and your components (the skill's step 4), then compare the still against the empty one by eye                                            |
| Styles missing in the render                  | Utility CSS (Tailwind, UnoCSS) has to be generated over the reel and your components before each render, see the skill's step 4                                                                                                                                            |
| Icons or colours missing, nothing else        | A class name assembled at runtime is invisible to the utility-CSS scanner. Write the full name as a literal                                                                                                                                                                |
| The product picks its widest layout           | A media query measures the composition, not the window drawn around the product. Override the breakpoint in the reel's CSS                                                                                                                                                 |
| Text renders in a fallback font               | Fonts must be loaded through `@remotion/fonts` from your product or a licensed package, not a stylesheet link                                                                                                                                                              |
| The fonts gate says a font comes from the net | A stylesheet link or `@remotion/google-fonts` fetches at render time. Install the same family from Fontsource (or use the product's own font files) and load it with `@remotion/fonts`                                                                                     |
| Frames differ between renders                 | Something is not derived from the frame: a clock, `Math.random`, a CSS transition or an async effect. The storyboard's determinism table lists how each is neutralised                                                                                                     |
| `edge-scan` prints `CROSSES`                  | Not a failure: the scan exits 0. Content runs off the frame, so crop those frames at full resolution and check no text line or control is sliced. See [Reading edge-scan output](quality-gates.md#reading-edge-scan-output)                                                |
| A gate fails and the reel looks fine          | Read the gate's output before overriding it. It reports times, so crop those frames and look at full resolution                                                                                                                                                            |
| Motion blur render fails on a missing filter  | Remotion's bundled ffmpeg has no `tmix`. Install a system ffmpeg and make sure it is first on the PATH                                                                                                                                                                     |
| Every render prints a version mismatch        | A `@remotion/*` package was installed with a caret range. Install it exact at the version `remotion` is pinned to: `npm i -E @remotion/<name>@<version>`                                                                                                                   |
| An update does not show up                    | Installed copies only update when the plugin's version changes, and Claude Code needs a restart to apply an update                                                                                                                                                         |

## Loading a font

The fonts gate accepts a licensed package or the product's own files, never a stylesheet link or a system font:

```ts
// A licensed package: import its CSS once, from the reel's entry file
import "@fontsource/inter/400.css";

// The product's own files, served from its public folder
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

loadFont({ family: "Inter", url: staticFile("fonts/inter.woff2"), weight: "400" });
```

For anything not listed, the create skill's [techniques and pitfalls](../plugin/skills/create/references/techniques.md)
covers what goes wrong when a real product is rendered in Remotion, and
[what renders, and what does not](../plugin/skills/create/references/frameworks.md) covers each framework.
