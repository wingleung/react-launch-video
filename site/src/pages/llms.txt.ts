// An index for agents in the llms.txt format (https://llmstxt.org): a title, a one-line summary, then lists of links to
// Markdown. Every link points at a file in the repo, so nothing here can drift from what ships.
import type { APIContext } from "astro";
import { install, plugin, rawUrl, references, skills } from "../lib/repo";

export function GET({ site }: APIContext) {
  const page = new URL(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/index.md`, site).href;
  const lines = [
    `# ${plugin.displayName}`,
    "",
    `> ${plugin.description}`,
    "",
    `Version ${plugin.version}, ${plugin.license} licensed. Install in Claude Code:`,
    "",
    ...install.map((line) => `    ${line}`),
    "",
    "## Skills",
    "",
    ...skills.map((skill) => `- [${plugin.name}:${skill.name}](${rawUrl(skill.path)}): ${skill.description}`),
    "",
    "## Docs",
    "",
    `- [README](${page}): install, usage, scope, quality gates, troubleshooting and licensing`,
    ...references.map((ref) => `- [${ref.title}](${rawUrl(ref.path)})`),
    "",
    "## Optional",
    "",
    `- [Changelog](${rawUrl("CHANGELOG.md")})`,
    `- [Contributing](${rawUrl("CONTRIBUTING.md")})`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
