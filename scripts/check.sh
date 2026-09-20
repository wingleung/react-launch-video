#!/usr/bin/env bash
# Every check there is. CI runs this exact script rather than a copy of it, so the two cannot drift.
# Run it before opening a pull request.
set -euo pipefail
cd "$(dirname "$0")/.."
fail=0
step() { printf "\n== %s\n" "$1"; }

step "plugin and marketplace manifests"
claude plugin validate --strict . || fail=1
claude plugin validate --strict plugin || fail=1

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
  fail=1
else
  echo "ok"
fi

step "formatting (prettier)"
npx --yes prettier@3 --check "**/*.{ts,tsx,md,json,mjs}" || fail=1

step "kit typecheck and camera"
node scripts/kit-check.mjs || fail=1

step "storyboard easings match the kit"
node plugin/skills/create/scripts/easing-inventory.mjs plugin/skills/create/assets/kit \
  --storyboard plugin/skills/create/references/storyboard.md || fail=1

step "kit names no font it does not load"
node plugin/skills/create/scripts/fonts.mjs plugin/skills/create/assets/kit || fail=1

step "gate scripts"
node plugin/skills/create/scripts/doctor.mjs || fail=1
node --test test/gates/*.test.mjs || fail=1

step "fixtures build"
(cd evals/fixtures/relay-web && npm ci --silent && npm run build --silent) || fail=1
node --test evals/fixtures/relay-cli/test/*.test.js || fail=1

[ "$fail" -eq 0 ] && echo -e "\nAll checks passed" || { echo -e "\nSome checks failed"; exit 1; }
