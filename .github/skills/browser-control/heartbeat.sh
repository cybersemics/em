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
# Optional env: HEARTBEAT_INTERVAL (seconds, default 240).
#
# 240s is well under the configured 900s idle cap (see browser-control
# SKILL.md). Any read against the session endpoint resets the clock; we use
# GET /url because it's small, universally supported, and a real W3C
# WebDriver command (so it resets both BrowserStack's idle timer and
# Appium's newCommandTimeout).
set -uo pipefail

SESSION_ID="${1:?session id required}"
INTERVAL="${HEARTBEAT_INTERVAL:-240}"
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
    -u "$BROWSERSTACK_USERNAME:$BROWSERSTACK_ACCESS_KEY" \
    "https://hub.browserstack.com/wd/hub/session/$SESSION_ID/url" 2>/dev/null \
    || echo "000")
  if [[ "$STATUS" =~ ^[23] ]]; then
    echo "[$(ts)] ping ok status=$STATUS"
    FAILS=0
  else
    FAILS=$((FAILS + 1))
    echo "[$(ts)] ping FAIL status=$STATUS fails=$FAILS/$MAX_FAILS"
    if (( FAILS >= MAX_FAILS )); then
      echo "[$(ts)] giving up — session likely ended"
      exit 0
    fi
  fi
  sleep "$INTERVAL"
done
