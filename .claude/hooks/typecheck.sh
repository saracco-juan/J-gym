#!/usr/bin/env bash
# Stop: typecheck once per turn when TS/TSX files changed, so Claude fixes errors before finishing.
set -uo pipefail

input=$(cat)
# Already continuing because of this hook: let the turn end instead of looping.
[ "$(jq -r '.stop_hook_active // false' <<<"$input")" = "true" ] && exit 0

cd "$CLAUDE_PROJECT_DIR" || exit 0
git status --porcelain -- '*.ts' '*.tsx' | grep -q . || exit 0

if ! out=$(npx --no-install tsc --noEmit 2>&1); then
  printf 'TypeScript errors. Fix them before finishing:\n%s\n' "$out" | head -60 >&2
  exit 2
fi
