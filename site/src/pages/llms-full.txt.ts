// Every document llms.txt links, in the same order, as one file: for an assistant that fetches a single URL. Built from
// the repo files at build time with their links made absolute, so it is never a copy that can fall behind.
import type { APIContext } from "astro";
import {
  guides,
  listing,
  plugin,
  readmeWithAbsoluteLinks,
  references,
  repoUrl,
  securityPolicy,
  skillDocs,
  withAbsoluteLinks,
} from "../lib/repo";

export function GET(_: APIContext) {
  const docs = [
    listing,
    { path: "README.md", text: readmeWithAbsoluteLinks() },
    ...guides,
    securityPolicy,
    ...skillDocs,
    ...references,
  ];
  const sections = docs.map(({ path, text }) => {
    const body = path === "README.md" ? text : withAbsoluteLinks(text, path);
    return `Source: ${repoUrl(path)}\n\n${body.trim()}\n`;
  });
  const header = `# ${plugin.displayName}: full documentation\n\n> ${plugin.description}\n`;
  return new Response([header, ...sections].join("\n---\n\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
