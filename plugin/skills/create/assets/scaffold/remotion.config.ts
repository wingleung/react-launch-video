import path from "node:path";
import { Config } from "@remotion/cli/config";

// The product the reel shows, as a sibling folder. Its components are imported, never copied.
const product = path.resolve("../my-product");

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
      // The product's own import alias, so its components resolve unchanged.
      "@": product,
      // Libraries that hold React context must be ONE copy shared with the product, or providers and hooks miss.
      // "some-context-lib": path.join(product, "node_modules/some-context-lib"),
      // Platform APIs the displayed components import but never call during a render.
      // "webextension-polyfill": path.resolve("src/stubs/browser.ts"),
    },
  },
}));
