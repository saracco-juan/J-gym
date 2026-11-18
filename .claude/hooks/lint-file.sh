#!/usr/bin/env bash
# PostToolUse (Edit|Write): lint the edited TS/TSX file and send problems back to Claude.
set -uo pipefail

file=$(jq -r '.tool_input.file_path // empty')
case "$file" in
  *.ts | *.tsx) ;;
  *) exit 0 ;;
esac
[ -f "$file" ] || exit 0

cd "$CLAUDE_PROJECT_DIR" || exit 0
if ! out=$(npx --no-install eslint "$file" 2>&1); then
  printf 'ESLint found problems in %s. Fix them:\n%s\n' "$file" "$out" | head -60 >&2
  exit 2
fi
