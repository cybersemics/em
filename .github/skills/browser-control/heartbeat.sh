#!/usr/bin/env bash
# Pings a BrowserStack Automate session at fixed intervals so its idle
# timeout doesn't fire while an AI agent is thinking. Run in background
# after start_session; self-exits when the session disappears.
#
# Usage:
#   .github/skills/browser-control/heartbeat.sh <session-id> &
#
# Required env: BROWSERSTACK_USERNAME, BROWSERSTACK_ACCESS_KEY.
# Optional env: HEARTBEAT_INTERVAL (seconds, default 240).
#
# 240s is well under BrowserStack's 300s idle cap. Any read against the
# session endpoint resets the clock; we use GET /url because it's small
# and universally supported.
set -uo pipefail

SESSION_ID="${1:?session id required}"
INTERVAL="${HEARTBEAT_INTERVAL:-240}"
MAX_FAILS=3
FAILS=0

while true; do
  sleep "$INTERVAL"
  STATUS=$(curl -fsS -o /dev/null -w "%{http_code}" \
    -u "$BROWSERSTACK_USERNAME:$BROWSERSTACK_ACCESS_KEY" \
    "https://hub.browserstack.com/wd/hub/session/$SESSION_ID/url" 2>/dev/null \
    || echo "000")
  if [[ "$STATUS" =~ ^[23] ]]; then
    FAILS=0
  else
    FAILS=$((FAILS + 1))
    echo "[heartbeat] session $SESSION_ID returned $STATUS (fail $FAILS/$MAX_FAILS)" >&2
    if (( FAILS >= MAX_FAILS )); then
      echo "[heartbeat] giving up — session likely ended" >&2
      exit 0
    fi
  fi
done
