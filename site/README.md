# site

The product page at https://wingleung.github.io/react-launch-video, a single static Astro page deployed to GitHub Pages by
`.github/workflows/pages.yml` on every push to `main` that touches what it reads.

```bash
npm --prefix site ci
npm --prefix site run dev
```

The dev server serves it at http://localhost:4321/react-launch-video/.

Nothing about the plugin is written twice. The version, descriptions, skills and reference docs are imported from the
repo at build time (`src/lib/repo.ts`), `index.md` is the README with its links made absolute and `llms.txt` is built
from the manifest and the skills. The reels are imported from `docs/`.

Three things are measured from `docs/demo-relay-web.mp4` by hand: the hero timeline in `src/components/Reel.astro`, and
the holds table and the gate output in `src/pages/index.astro`. Replace that reel and all three have to be measured
again, the way their comments describe, and its 720p copy for phones in `src/assets/` re-encoded with the command in
`Reel.astro`.

Before the first deploy, set the repo's Pages source to GitHub Actions (Settings, Pages).
