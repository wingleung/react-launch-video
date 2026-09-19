# What renders, and what does not

A reel imports the product's components into a Remotion composition and renders them in headless Chrome through a
plain webpack bundle. There is no framework server, no request, no route and no compiler other than webpack. Decide
whether the product fits that **before** the storyboard, in step 1b, because every later step costs more to undo.

Judge by rendering model, not by the framework's name. "React app" is not the question. The question is whether a
component can be called as a function in a browser with props you supply.

## Rendering models

| Shape                                                       | Renders? | What to do                                                                                                                                                                                      |
| ----------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plain React (Vite, CRA, Parcel)                             | Yes      | The designed path. See techniques.md section 1b for the bundler work                                                                                                                            |
| Next.js App Router, client components only (`"use client"`) | Yes      | Import the client components directly. Never import through a page or layout                                                                                                                    |
| Next.js App Router, server components                       | **No**   | An `async` component is a promise, not an element a client bundler can render. Say so in step 1b and agree what to do, which is usually to build the reel from the client components underneath |
| A `use server` module anywhere in the import path           | **No**   | It pulls a server-only runtime into the bundle. Import around it, or stop                                                                                                                       |
| Next.js Pages Router                                        | Mostly   | `getServerSideProps` and `getStaticProps` are separate exports, so the split leaves them behind naturally. The `next/*` components still need handling, below                                   |
| Remix, React Router 7                                       | Mostly   | `useLoaderData`, `<Link>` and `<Form>` need a router. Mount a memory router in the reel and pass the data as props                                                                              |
| Astro with React islands                                    | Yes      | The island is already props-driven, which is the best case. The `.astro` page around it has to be rebuilt in the reel and is a flagged placeholder                                              |
| Gatsby                                                      | **No**   | `useStaticQuery`, the `graphql` tag and `StaticImage` are compile-time constructs of the Gatsby compiler                                                                                        |
| Vue, Svelte, Angular, native mobile or desktop              | **No**   | Out of scope for this skill. Say so and stop                                                                                                                                                    |

`next/*` components in a reel: replace `next/image` with a plain `<img>` inside the display-only view, `next/link` with
an `<a>`, and read `useRouter` state from props instead. Record each substitution in the storyboard's truthfulness
table, because the reel is then showing something very slightly different from what ships.

## Styling

The rule from techniques.md section 2 is not only about Tailwind and UnoCSS. Anything that decides CSS at build time
has to be told the reel's own sources exist, or the render succeeds and the product looks unstyled.

| System                     | Renders?    | What to do                                                                                                                                                       |
| -------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tailwind, UnoCSS, Panda    | Yes         | Run the tool's CLI over the product's **and** the reel's sources before `studio` and `render`. Panda's content globs will not include the reel unless you add it |
| CSS Modules                | Yes         | Remotion's bundler handles them                                                                                                                                  |
| styled-components, Emotion | Yes         | Runtime CSS needs no compiler. Alias the library to one copy and mount the product's `ThemeProvider`, or `theme.*` lookups throw                                 |
| vanilla-extract            | Needs setup | `.css.ts` is compiled by a bundler plugin. Add `@vanilla-extract/webpack-plugin` to `remotion.config.ts` or importing one throws                                 |
| Sass or Less modules       | Needs setup | Remotion gates these behind a config flag                                                                                                                        |

## Fonts

The rule is that a font comes from the product or from a licensed package, never from a system font folder, and never
over the network at render time. Three of the four common setups fit it directly:

- **Self-hosted in `public/`**: the designed path, through `Config.setPublicDir` and `@remotion/fonts`.
- **Fontsource**: install the same package the product uses.
- **A Google Fonts `<link>`**: install that family as `@fontsource/<family>` at the weights and axes the product
  actually uses. A variable-font product rendered at a single static weight drifts from what ships.
- **`next/font`**: there is no file to copy and no package that works outside the Next compiler. Install the same
  family from Fontsource at the same weights and axes, and record the substitution in the truthfulness table. Do not
  let it fall through to the kit's `reel.css` fallback: a whole reel in a system font looks plausible at a glance,
  which is exactly why it ships unnoticed.
