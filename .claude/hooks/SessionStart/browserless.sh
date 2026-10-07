#!/usr/bin/env bash
# Starts Docker and pulls the browserless image at the start of a new Claude Code cloud session, so the
# Puppeteer harness (src/e2e/puppeteer/test-puppeteer.sh) can start its container without a cold pull.
#
# The cloud runner does not start the Docker daemon on its own. The image is pulled from ghcr.io, whose
# layers download from pkg-containers.githubusercontent.com. The Trusted network level does not allow
# that host, so the pull succeeds only in an environment whose Custom allowlist adds it.
#
# Runs in the background and never fails: a blocked or slow pull leaves the session working, and only a
# later Puppeteer run is affected. Output goes to /tmp/browserless-setup.log. Local sessions skip it.
set -uo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"
# Read the image from the harness so the tag is pinned in one place.
IMAGE="$(grep -o 'ghcr\.io/browserless/chromium:[^ )"]*' src/e2e/puppeteer/test-puppeteer.sh | head -n 1)"

(
  if ! docker info >/dev/null 2>&1; then
    nohup dockerd >/tmp/dockerd.log 2>&1 &
    for _ in $(seq 1 30); do
      docker info >/dev/null 2>&1 && break
      sleep 1
    done
  fi
  docker pull "$IMAGE" || true
) >/tmp/browserless-setup.log 2>&1 </dev/null &
disown

exit 0
