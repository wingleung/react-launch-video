// Everything the page states about the plugin is imported from the repo at build time, so a release cannot leave the
// site describing an older version. Raw imports rather than fs reads: the bundler resolves them from this file, while a
// path built from import.meta.url breaks once this module is bundled into a chunk somewhere else.
import { posix } from "node:path";
import manifest from "../../../plugin/.claude-plugin/plugin.json";
import pluginReadme from "../../../plugin/README.md?raw";
import readme from "../../../README.md?raw";
import security from "../../../SECURITY.md?raw";

export const plugin = manifest;

const skillFiles = import.meta.glob<string>("../../../plugin/skills/*/SKILL.md", {
  query: "?raw",
  import: "default",
  eager: true,
});
const referenceFiles = import.meta.glob<string>("../../../plugin/skills/create/references/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

const guideFiles = import.meta.glob<string>("../../../docs/*.md", { query: "?raw", import: "default", eager: true });

const repoPath = (globKey: string) => globKey.replace("../../../", "");

const blob = `${plugin.repository}/blob/main/`;
const raw = plugin.repository.replace("https://github.com/", "https://raw.githubusercontent.com/") + "/main/";

export const repoUrl = (path = "") => (path ? blob + path : plugin.repository);
// The folder `git clone` makes, which is the last segment of the repo URL.
export const cloneDir = plugin.repository.split("/").at(-1)!;
export const rawUrl = (path: string) => raw + path;

export const install = [
  `/plugin marketplace add ${plugin.repository.replace("https://github.com/", "")}`,
  `/plugin install ${plugin.name}@${plugin.name}`,
];

export const shellInstall = install.map((line) => `claude ${line.slice(1)}`);

function frontmatter(markdown: string, key: string) {
  const block = markdown.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  const folded = block.match(new RegExp(`^${key}: >-\\n((?: {2}.*\\n?)+)`, "m"))?.[1];
  if (folded) return folded.replace(/\s+/g, " ").trim();
  return block.match(new RegExp(`^${key}: (.*)$`, "m"))?.[1].trim() ?? "";
}

export const skills = Object.entries(skillFiles)
  .map(([key, text]) => ({
    name: frontmatter(text, "name"),
    path: repoPath(key),
    description: frontmatter(text, "description"),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export interface Doc {
  path: string;
  title: string;
  /** The first sentence after the title, which llms.txt uses as the link's description. */
  summary: string;
  text: string;
}

function doc(path: string, text: string): Doc {
  const title = text.match(/^# (.+)$/m)?.[1] ?? path;
  const body = text.replace(/^---\n[\s\S]*?\n---\n/, "").replace(/^# .+$/m, "");
  // The first sentence of prose long enough to say something: a dateline such as "Researched September 2026." is not.
  const sentences = body
    .split(/\n\s*\n/)
    .filter((block) => /^[A-Z]/.test(block.trim()))
    .map((block) =>
      block
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .map((block) => block.match(/^.*?\.(?=\s|$)/)?.[0] ?? block);
  const summary = sentences.find((sentence) => sentence.length >= 30) ?? sentences[0] ?? "";
  return { path, title, summary, text };
}

export const references = Object.entries(referenceFiles).map(([key, text]) => doc(repoPath(key), text));

// The guides in reading order. A new page in docs/ fails the build until it is placed here, so the order agents read
// them in is always a choice.
const GUIDE_ORDER = ["docs/quality-gates.md", "docs/troubleshooting.md", "docs/other-sizes.md"];
export const guides = Object.entries(guideFiles).map(([key, text]) => doc(repoPath(key), text));
for (const guide of guides) {
  if (!GUIDE_ORDER.includes(guide.path)) throw new Error(`${guide.path} is not in GUIDE_ORDER in site/src/lib/repo.ts`);
}
guides.sort((a, b) => GUIDE_ORDER.indexOf(a.path) - GUIDE_ORDER.indexOf(b.path));

export const listing = doc("plugin/README.md", pluginReadme);
export const securityPolicy = doc("SECURITY.md", security);
export const skillDocs = Object.entries(skillFiles).map(([key, text]) => doc(repoPath(key), text));

// Repo Markdown links are relative to the file they sit in, which means nothing once the text is served from another
// host, so they are resolved against that file and made absolute: images to the raw file, everything else to GitHub.
export function withAbsoluteLinks(markdown: string, path: string) {
  const directory = posix.dirname(path);
  return markdown.replace(
    /(!?)\[([^\]]*)\]\((?!<|https?:|#|mailto:)([^)\s]+)\)/g,
    (_, bang: string, text: string, target: string) => {
      const [file, anchor] = target.split("#");
      const resolved = posix.normalize(posix.join(directory, file));
      const url = (bang ? rawUrl(resolved) : repoUrl(resolved)) + (anchor ? `#${anchor}` : "");
      return `${bang}[${text}](${url})`;
    },
  );
}

export const readmeWithAbsoluteLinks = () => withAbsoluteLinks(readme, "README.md");
