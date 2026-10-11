#!/usr/bin/env bash
# Installs dependencies at the start of a new Claude Code cloud session.
#
# Runs the Yarn release committed at yarnPath directly rather than whatever `yarn` is on PATH. Once
# Corepack is enabled, `yarn` downloads Yarn from repo.yarnpkg.com, which the cloud sandbox blocks.
# The committed release needs no download, so the install works with no environment configuration.
#
# Registered for the "startup" source only in .claude/settings.json, so resume, clear and compact do
# not pay for a repeat install. Local sessions skip it and keep their own node_modules.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"
YARN_PATH="$(sed -n 's/^yarnPath: *//p' .yarnrc.yml)"
node "$YARN_PATH" install >&2
