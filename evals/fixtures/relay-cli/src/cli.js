#!/usr/bin/env node
import { sync } from "./commands/sync.js";

const HELP = `relay: sync local drafts with your Relay issue tracker

Usage:
  relay sync      Compare local drafts with the server, choose what to push, push it
  relay --help    Show this help`;

const [command] = process.argv.slice(2);
if (command === "sync") {
  await sync();
} else {
  console.log(HELP);
  process.exitCode = command && command !== "--help" ? 1 : 0;
}
