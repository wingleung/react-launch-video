// Everything the page states about the plugin is imported from the repo at build time, so a release cannot leave the
// site describing an older version. Raw imports rather than fs reads: the bundler resolves them from this file, while a
// path built from import.meta.url breaks once this module is bundled into a chunk somewhere else.
import manifest from "../../../plugin/.claude-plugin/plugin.json";
import readme from "../../../README.md?raw";

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

const repoPath = (globKey: string) => globKey.replace("../../../", "");

const blob = `${plugin.repository}/blob/main/`;
const raw = plugin.repository.replace("https://github.com/", "https://raw.githubusercontent.com/") + "/main/";

export const repoUrl = (path = "") => (path ? blob + path : plugin.repository);
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

export const references = Object.entries(referenceFiles).map(([key, text]) => ({
  path: repoPath(key),
  title: text.match(/^# (.+)$/m)?.[1] ?? repoPath(key),
}));

// The README is the long-form documentation. Its relative links point into the repo, which means nothing once the
// text is served from another host, so they are made absolute: images to the raw file, everything else to GitHub.
export function readmeWithAbsoluteLinks() {
  return readme.replace(
    /(!?)\[([^\]]*)\]\((?!https?:|#|mailto:)([^)\s]+)\)/g,
    (_, bang: string, text: string, path: string) => `${bang}[${text}](${bang ? rawUrl(path) : repoUrl(path)})`,
  );
}
