#!/bin/sh
# Emit GitHub diff annotations for added it()/test() calls in a unified diff.
#
# Usage: annotate-tdd-violations.sh <patch-file>
#
# For each added it(), test(), it.skip(), etc. line found in the patch, emits
# a ::error annotation pointing to the correct line in the new file. These
# annotations appear in the GitHub PR "Files changed" tab.

PATCH_FILE="${1:-/tmp/test.patch}"

if [ ! -f "$PATCH_FILE" ]; then
  echo "Patch file not found: $PATCH_FILE"
  exit 0
fi

awk '
  /^diff --git/ { file = "" }
  /^\+\+\+ b\// { file = substr($0, 7); next }
  /^@@/ {
    match($0, /\+([0-9]+)/, m)
    new_line = m[1] + 0 - 1
    next
  }
  /^\+\+\+/ { next }
  /^---/ { next }
  /^\+/ {
    new_line++
    line = substr($0, 2)
    if (file != "" && (line ~ /^[[:space:]]*(it|test)[[:space:]]*\(/ || line ~ /^[[:space:]]*(it|test)\.(skip|only|todo)[[:space:]]*\(/)) {
      print "::error file=" file ",line=" new_line "::TDD: This test passes on the base branch. New tests must fail on base to confirm they cover new behavior."
    }
    next
  }
  /^-/ { next }
  { new_line++ }
' "$PATCH_FILE"
