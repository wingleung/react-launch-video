# product-reel

A public Claude Code plugin (`plugin/.claude-plugin/plugin.json`) with two skills: `plugin/skills/create` (build a reel)
and `plugin/skills/review` (review one). It is also its own marketplace (`.claude-plugin/marketplace.json`).

- GitHub issues are the backlog. There is no `tasks/todo.md`, and `tasks/lessons.md` is the corrections log rather than
  a second backlog.
- Nothing private goes in this repo: no employer or client material, and no absolute home paths. Examples use the
  fictional product "Relay". `./scripts/check.sh` fails on a home path and on any pattern listed in `.private-names`,
  which is ignored so the patterns themselves never ship.
- Every rule in the skills is sourced or measured. Change the method with evidence (a reference, a render, a before and
  after), not taste.
- Paths inside SKILL.md use `${CLAUDE_SKILL_DIR}`. The review skill reaches the create skill's files through
  `${CLAUDE_SKILL_DIR}/../create/`.
- Kit changes: format with `npx prettier@3 --write "plugin/skills/create/assets/kit/**/*.{ts,tsx}"` (printWidth 120),
  then run `./scripts/check.sh`, which typechecks the kit and runs the easing check whose example table cites kit line
  numbers.
- Release: bump `version` in `plugin/.claude-plugin/plugin.json`, add a CHANGELOG entry,
  `claude plugin validate --strict .`, then `claude plugin tag`.
- **Testing a change against a real session means updating the installed copy first**, with
  `claude plugin marketplace update product-reel && claude plugin update product-reel@product-reel`. Installed copies
  are cached per version under `~/.claude/plugins/cache/`, old versions are never pruned, and an agent that goes
  looking for the skill's own files will happily read whichever one it finds. A refusal test failed exactly this way:
  the agent quoted a table row from a cached 1.4.0 that predated the row being tested, and the conclusion looked like
  a defect in the skill rather than a stale copy on disk.
