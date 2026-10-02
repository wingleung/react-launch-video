// An index for agents in the llms.txt format (https://llmstxt.org): a title, a one-line summary, then lists of links to
// Markdown. Every link points at a file in the repo, so nothing here can drift from what ships. Ordered for someone
// helping a user: what the plugin is, how to use it and fix it, then how the skills work inside.
import type { APIContext } from "astro";
import { guides, install, listing, plugin, rawUrl, references, securityPolicy, skills } from "../lib/repo";

export function GET({ site }: APIContext) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const page = (path: string) => new URL(`${base}/${path}`, site).href;
  const lines = [
    `# ${plugin.displayName}`,
    "",
    `> ${plugin.description}`,
    "",
    `Version ${plugin.version}, ${plugin.license} licensed. Install in Claude Code:`,
    "",
    ...install.map((line) => `    ${line}`),
    "",
    `Everything below in one file: [llms-full.txt](${page("llms-full.txt")})`,
    "",
    "## Start here",
    "",
    `- [${listing.title}](${rawUrl(listing.path)}): ${listing.summary}`,
    `- [README](${page("index.md")}): install, cost, a trial on the bundled test app, how a run goes, scope and updating`,
    "",
    "## Guides",
    "",
    ...guides.map((guide) => `- [${guide.title}](${rawUrl(guide.path)}): ${guide.summary}`),
    `- [Security](${rawUrl(securityPolicy.path)}): ${securityPolicy.summary}`,
    "",
    "## Skills",
    "",
    ...skills.map((skill) => `- [${plugin.name}:${skill.name}](${rawUrl(skill.path)}): ${skill.description}`),
    "",
    "## References",
    "",
    ...references.map((ref) => `- [${ref.title}](${rawUrl(ref.path)}): ${ref.summary}`),
    "",
    "## Optional",
    "",
    `- [Changelog](${rawUrl("CHANGELOG.md")})`,
    `- [Contributing](${rawUrl("CONTRIBUTING.md")})`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
