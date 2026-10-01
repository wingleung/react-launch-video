#!/usr/bin/env bash
# Every check there is. CI runs this exact script rather than a copy of it, so the two cannot drift.
# Run it before opening a pull request.
set -euo pipefail
cd "$(dirname "$0")/.."
fail=0
failed=()
# The step name is remembered so the end of the run can name what broke. A filtered view of this output (a grep for
# "ok" or "passed") otherwise shows a wall of green and the absence of the final line reads like a dropped match.
step() { current="$1"; printf "\n== %s\n" "$1"; }
note() { fail=1; failed+=("$current"); }

step "plugin and marketplace manifests"
claude plugin validate --strict . || note
claude plugin validate --strict plugin || note

step "version, CHANGELOG and descriptions agree"
node scripts/release-check.mjs || note

step "no personal paths or private names"
# A home directory that reached a doc or a fixture. Add your own names (an employer, a client, an internal hostname)
# one per line in .private-names, which is ignored, so the names themselves never ship. They are matched literally,
# ignoring case, so a name holding a dot or a bracket means itself.
# In a git worktree .git is a file naming the main checkout's absolute path, which --exclude-dir does not skip.
scan() {
  grep -rni --binary-files=without-match "$@" . \
    --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=renders --exclude-dir=.astro \
    --exclude=check.sh --exclude=.git --exclude=ci.yml --exclude=.private-names
}
# grep exits 1 for no match and 2 when it could not search at all. Piped into the filter below, a 2 used to be
# masked by the filter's own status and the step printed ok having scanned nothing, so each status is kept apart.
scanned=0
home=$(scan -E '/Users/|/home/[a-z]|C:\\Users\\') || [ $? -eq 1 ] || scanned=2
names=""
if [ -f .private-names ]; then
  names=$(scan -F -f .private-names) || [ $? -eq 1 ] || scanned=2
fi
# Lockfile integrity hashes are dropped: they are random base64, so a short pattern matched case-insensitively turns
# up in one sooner or later. A lockfile's `resolved` URLs are still scanned, since that is where a private registry
# host would leak.
leaks=$(printf '%s\n%s\n' "$home" "$names" | grep -vE '^$|"integrity": "sha(1|256|384|512)-' || true)
if [ "$scanned" -ne 0 ]; then
  echo "FAIL: grep could not run the scan (its error is above), so finding nothing here does not mean clean"
  note
elif [ -n "$leaks" ]; then
  printf '%s\n' "$leaks"
  echo "FAIL: the matches above must not ship"
  note
else
  echo "ok"
fi

step "formatting (prettier)"
# Exact, not `@3`. A floating major lets a prettier release redden a commit that changed nothing in this
# repo, which is a failure nobody can reproduce from the diff.
npx --yes prettier@3.9.8 --check "**/*.{ts,tsx,js,cjs,mjs,css,html,json,md,yml,yaml}" || note

step "skills reach the files they point at"
node scripts/skill-paths.mjs || note

step "kit typecheck and camera"
node scripts/kit-check.mjs || note

step "storyboard easings match the kit"
node plugin/skills/create/scripts/easing-inventory.mjs plugin/skills/create/assets/kit \
  --storyboard plugin/skills/create/references/storyboard.md || note

step "kit names no font it does not load"
node plugin/skills/create/scripts/fonts.mjs plugin/skills/create/assets/kit || note

step "gate scripts"
node plugin/skills/create/scripts/doctor.mjs || note
node --test test/gates/*.test.mjs || note

step "site builds"
# The site imports the manifest, README and skills, so a change to any of them can break it.
(cd site && npm ci --silent && npm run build --silent) || note

step "fixtures build"
(cd evals/fixtures/relay-web && npm ci --silent && npm run build --silent) || note
node --test evals/fixtures/relay-cli/test/*.test.js || note

if [ "$fail" -eq 0 ]; then
  echo -e "\nAll checks passed"
else
  printf "\nFAILED: %s\n" "$(printf '%s; ' "${failed[@]}")"
  exit 1
fi
