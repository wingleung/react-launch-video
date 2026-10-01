// The page as Markdown, for agents and for "copy as Markdown". It is the README rather than a second copy of the page
// copy, so the two can never disagree.
import { readmeWithAbsoluteLinks } from "../lib/repo";

export function GET() {
  return new Response(readmeWithAbsoluteLinks(), { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
