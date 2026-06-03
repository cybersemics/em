#!/usr/bin/env bash
# Pings a BrowserStack Automate session at fixed intervals so its idle
# timeout doesn't fire while an AI agent is thinking. Self-daemonizes
# (setsid + nohup) so it survives the calling shell exiting, and writes a
# timestamped log to /tmp/heartbeat-<session-id>.log. Self-exits when the
# session disappears.
#
# Usage:
#   .github/skills/browser-control/heartbeat.sh <session-id>
#
# No trailing & needed — the script re-execs itself detached and the
# foreground process returns immediately. To inspect activity after a
# session death, `cat /tmp/heartbeat-<session-id>.log`.
#
# Required env: BROWSERSTACK_USERNAME, BROWSERSTACK_ACCESS_KEY.
# Optional env: HEARTBEAT_INTERVAL (seconds, default 90).
#
# We ping every 90s, well under any plausible idle cap. Earlier runs with a
# 240s interval saw real-device iOS Safari sessions die ~2 min after a
# confirmed-alive ping despite idleTimeout: 900 — either the cap is silently
# clamped lower on real devices or the timer we were resetting wasn't the one
# actually killing the session.
#
# We use POST /execute/sync (script: "return 1") rather than GET /url for the
# ping. /execute/sync forces the full WebDriver → Appium → XCUITest →
# safaridriver → page JS bridge round trip, which is harder to mis-classify as
# "no real activity" than a metadata GET. GET /url was the original choice
# because it was small and W3C-standard, but the field evidence suggests at
# least one timer on this stack ignores it.
set -uo pipefail

SESSION_ID="${1:?session id required}"
INTERVAL="${HEARTBEAT_INTERVAL:-90}"
MAX_FAILS=3
LOG="/tmp/heartbeat-${SESSION_ID}.log"

# --- Self-daemonize ---------------------------------------------------------
# The agent launches us from a Bash tool call whose shell exits after the
# call returns. Without setsid + nohup the SIGHUP from that exit would kill
# us silently — which is the original "heartbeat there but session still
# died" bug. Re-exec under a fresh session leader with stdio bound to the
# log file, then exit the foreground process.
if [[ "${_HEARTBEAT_DAEMON:-}" != "1" ]]; then
  SCRIPT="$(cd "$(dirname "$0")" && pwd -P)/$(basename "$0")"
  # Prefer setsid (Linux runner) for full session/process-group detachment.
  # Fall back to nohup-only on macOS dev boxes where setsid isn't installed —
  # nohup + disown is enough to ignore SIGHUP from the calling shell exit.
  if command -v setsid >/dev/null 2>&1; then
    _HEARTBEAT_DAEMON=1 setsid nohup "$SCRIPT" "$@" </dev/null >>"$LOG" 2>&1 &
  else
    _HEARTBEAT_DAEMON=1 nohup "$SCRIPT" "$@" </dev/null >>"$LOG" 2>&1 &
  fi
  disown
  echo "[heartbeat] launched pid=$! log=$LOG"
  exit 0
fi

# --- Daemonized body --------------------------------------------------------
ts() { date -u +'%Y-%m-%dT%H:%M:%SZ'; }
echo "[$(ts)] started session=$SESSION_ID interval=${INTERVAL}s"

FAILS=0
while true; do
  # Ping first, sleep after — so the first heartbeat fires at t=0 instead of
  # t=INTERVAL. Otherwise a long agent turn immediately after start_session
  # could let the idle timer fire before we ever poke it.
  STATUS=$(curl -sS -o /dev/null -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -u "$BROWSERSTACK_USERNAME:$BROWSERSTACK_ACCESS_KEY" \
    --data '{"script":"return 1","args":[]}' \
    "https://hub.browserstack.com/wd/hub/session/$SESSION_ID/execute/sync" 2>/dev/null \
    || echo "000")
  if [[ "$STATUS" =~ ^[23] ]]; then
    echo "[$(ts)] ping ok status=$STATUS"
    FAILS=0
  else
    FAILS=$((FAILS + 1))
    echo "[$(ts)] ping FAIL status=$STATUS fails=$FAILS/$MAX_FAILS"
    if (( FAILS >= MAX_FAILS )); then
      echo "[$(ts)] giving up — session likely ended"
      # Fetch BrowserStack's post-mortem on the session so future debugging
      # has a concrete reason field instead of "the heartbeat noticed it was
      # gone." Best-effort; quietly skipped if the API is unreachable or the
      # session is too young to have a record.
      POSTMORTEM=$(curl -sS \
        -u "$BROWSERSTACK_USERNAME:$BROWSERSTACK_ACCESS_KEY" \
        "https://api.browserstack.com/automate/sessions/$SESSION_ID.json" 2>/dev/null \
        || echo '{"error":"api fetch failed"}')
      echo "[$(ts)] browserstack session post-mortem: $POSTMORTEM"
      exit 0
    fi
  fi
  sleep "$INTERVAL"
done
