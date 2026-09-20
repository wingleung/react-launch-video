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

step "no personal paths or private names"
# A home directory that reached a doc or a fixture. Add your own patterns (an employer, a client, an internal
# hostname) one per line in .private-names, which is ignored, so the names themselves never ship.
patterns='/Users/|/home/[a-z]|C:\\Users\\'
if [ -f .private-names ]; then
  patterns="$patterns|$(tr '\n' '|' < .private-names | sed 's/|*$//')"
fi
if grep -rniE --binary-files=without-match "$patterns" . \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=renders \
  --exclude=check.sh --exclude=ci.yml --exclude=.private-names; then
  echo "FAIL: the matches above must not ship"
  note
else
  echo "ok"
fi

step "formatting (prettier)"
npx --yes prettier@3 --check "**/*.{ts,tsx,md,json,mjs}" || note

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

step "fixtures build"
(cd evals/fixtures/relay-web && npm ci --silent && npm run build --silent) || note
node --test evals/fixtures/relay-cli/test/*.test.js || note

if [ "$fail" -eq 0 ]; then
  echo -e "\nAll checks passed"
else
  printf "\nFAILED: %s\n" "$(printf '%s; ' "${failed[@]}")"
  exit 1
fi
