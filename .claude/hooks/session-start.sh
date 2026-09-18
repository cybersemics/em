#!/usr/bin/env bash

# SessionStart hook for Claude Code on the web (claude.ai/code).
#
# Provisions the cloud container so that `yarn lint`, `yarn test`, `yarn build` and the Puppeteer
# suite all work the moment the session opens, instead of the agent spending its first twenty
# minutes discovering the three things below by hand. It is the Claude-cloud counterpart of
# .github/workflows/copilot-setup-steps.yml, which does the same job for the Copilot cloud agent.
#
# What the container does NOT arrive with:
#
#   1. node_modules is empty. `yarn install`'s postinstall runs build:packages and build:styles,
#      so no separate build step is needed afterwards.
#   2. The Docker daemon is not running, and `service docker start` fails with
#      "ulimit: error setting limit (Operation not permitted)". Launching dockerd directly works;
#      the session runs as root, so no sudo.
#   3. The browserless/chrome image that src/e2e/puppeteer/test-puppeteer.sh runs is absent, and
#      Docker Hub is unreachable from here two independent ways — the blob CDN
#      (production.cloudfront.docker.com) answers 403 through the proxy, and anonymous Hub pulls
#      answer 429. mirror.gcr.io serves the same image. The script does `docker run ...
#      browserless/chrome` by that bare name, so the mirrored image has to be re-tagged under it.
#
# CI is deliberately NOT exported. src/e2e/puppeteer/setup.ts picks the app URL from it: set means
# https://172.17.0.1:3000, unset means https://host.docker.internal:2552. The harness provisions its
# own Vite on 2552, so exporting CI makes nearly every Puppeteer file fail with
# ERR_CONNECTION_REFUSED. Leave it unset.
#
# This hook must never break a session. There is no `set -e`, no step can abort the script, and it
# always exits 0: an empty node_modules costs one `yarn install`, but a hook that exits non-zero
# costs every future cloud session. The Docker steps are best-effort by design — a session that
# cannot run Puppeteer is still a session that can lint, typecheck, unit-test and build. Anything
# that goes wrong is reported loudly on stdout (which the session reads) and in full in the log.

# -u and -o pipefail, but NOT -e — see above.
set -uo pipefail

# Only the cloud container needs provisioning. A local checkout is already set up, and starting
# dockerd or pulling a 4.5GB image on someone's laptop would be rude.
[ "${CLAUDE_CODE_REMOTE:-}" = 'true' ] || exit 0

LOG=/tmp/claude-session-start.log
DOCKERD_LOG=/tmp/dockerd.log

# CLAUDE_PROJECT_DIR is set by Claude Code; the fallback keeps the script runnable by hand.
PROJECT_DIR=${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}

# Print one line to stdout (the session transcript) and a banner into the log, so a human reading
# either one can line them up.
say() {
  printf 'session-start: %s\n' "$*"
  printf '\n=== %s ===\n' "$*" >>"$LOG"
}

: >"$LOG"

if ! cd "$PROJECT_DIR"; then
  echo "session-start: cannot cd to $PROJECT_DIR — skipping setup. Run 'yarn install' by hand." >&2
  exit 0
fi

say "provisioning $PROJECT_DIR — full output in $LOG"

# 1. Dependencies. Plain `yarn install` rather than `--immutable`, so a warm container reuses what
# is already unpacked and this is cheap to repeat. postinstall builds packages/webview and the
# Panda styles, which lint and the type check both need.
PUPPETEER_READY=no
START=$SECONDS
if yarn install >>"$LOG" 2>&1; then
  say "dependencies installed ($((SECONDS - START))s)"
  DEPS_READY=yes
else
  say "FAILED: yarn install — see $LOG. Run 'yarn install' by hand before linting or testing."
  DEPS_READY=no
fi

# 2. Docker daemon, for the Puppeteer harness. Best-effort from here down.
if docker info >/dev/null 2>&1; then
  say 'docker daemon already running'
  DOCKER_READY=yes
else
  # `service docker start` fails in this container with "ulimit: error setting limit (Operation not
  # permitted)"; the daemon itself starts fine when launched directly. stdin is closed and output
  # redirected so the daemon does not hold the hook's streams open after it exits.
  nohup dockerd >>"$DOCKERD_LOG" 2>&1 </dev/null &
  disown
  DOCKER_READY=no
  START=$SECONDS
  for _ in $(seq 1 60); do
    if docker info >/dev/null 2>&1; then
      DOCKER_READY=yes
      break
    fi
    sleep 1
  done
  if [ "$DOCKER_READY" = 'yes' ]; then
    say "docker daemon started ($((SECONDS - START))s)"
  else
    say "FAILED: docker daemon did not come up within 60s — see $DOCKERD_LOG. Puppeteer tests will not run; everything else will."
  fi
fi

# 3. The browserless image, under the bare name test-puppeteer.sh runs.
if [ "$DOCKER_READY" = 'yes' ]; then
  if docker image inspect browserless/chrome:latest >/dev/null 2>&1; then
    say 'browserless/chrome image already present'
    PUPPETEER_READY=yes
  else
    say 'pulling browserless/chrome from mirror.gcr.io (~1.25GB transferred, ~4.5GB on disk) — this is the slow step'
    START=$SECONDS
    if docker pull mirror.gcr.io/browserless/chrome:latest >>"$LOG" 2>&1 &&
      docker tag mirror.gcr.io/browserless/chrome:latest browserless/chrome:latest; then
      say "browserless/chrome image ready ($((SECONDS - START))s)"
      PUPPETEER_READY=yes
    else
      say "FAILED: could not pull browserless/chrome — see $LOG. Puppeteer tests will not run; everything else will."
    fi
  fi
fi

# Tell the session what it actually has, so it does not have to find out by failing.
if [ "$DEPS_READY" = 'yes' ]; then
  echo 'session-start: ready — yarn lint, yarn test and yarn build can run now.'
else
  echo 'session-start: NOT ready — dependencies are missing. Run yarn install before anything else.'
fi

if [ "$PUPPETEER_READY" = 'yes' ]; then
  # CI and GITHUB_ACTIONS are both unset here, but a stray export would silently retarget the tests
  # at a server nobody started, so the documented invocation clears them.
  echo 'session-start: puppeteer is ready — env -u CI -u GITHUB_ACTIONS ./src/e2e/puppeteer/test-puppeteer.sh src/e2e/puppeteer/__tests__/<file>.ts'
else
  echo "session-start: puppeteer is NOT available in this session (docker or the image is missing — see $LOG). Lint, unit tests and build are unaffected."
fi

# Never fail the session.
exit 0
