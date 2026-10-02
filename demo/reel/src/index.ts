import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

// Remotion's entry point. `remotion studio src/index.ts` and `remotion render src/index.ts Reel out.mp4` both start
// here, which is why every script in this skill names that path.
registerRoot(RemotionRoot);
