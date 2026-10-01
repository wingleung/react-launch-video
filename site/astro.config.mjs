import { defineConfig } from "astro/config";

// A GitHub Pages project site lives under /react-launch-video, so every internal URL goes through BASE_URL.
export default defineConfig({
  site: "https://wingleung.github.io",
  base: "/react-launch-video",
});
