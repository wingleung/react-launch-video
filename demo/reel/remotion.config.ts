import { existsSync } from "node:fs";
import path from "node:path";
import { Config } from "@remotion/cli/config";

// The product the reel shows, as a sibling folder. Its components are imported, never copied.
const product = path.resolve("../relay-web");
// A missing product still renders the empty stage and exits 0, so a wrong path would pass for a working one.
if (!existsSync(product)) {
  throw new Error(`No product at ${product}. Set the path in remotion.config.ts to the product's folder.`);
}

// Fonts, icons and logos come from the product's own public folder, so the reel cannot drift from what ships and
// renders never fetch fonts over the network.
Config.setPublicDir(path.join(product, "public"));
Config.setVideoImageFormat("jpeg");
// UI that picks Cmd or Ctrl from the user agent follows this. Match the audience's platform.
Config.setChromiumUserAgent(
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
);

Config.overrideWebpackConfig((config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    alias: {
      ...config.resolve?.alias,
      // The product's own import alias (vite.config.ts maps "@" to src), so its components resolve unchanged.
      "@": path.join(product, "src"),
      // The product's own font package, the copy it ships with, so the reel cannot drift to another version.
      "@fontsource/inter": path.join(product, "node_modules/@fontsource/inter"),
    },
  },
}));
