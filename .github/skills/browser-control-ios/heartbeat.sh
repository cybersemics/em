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
# We ping GET /contexts rather than GET /url or POST /execute/sync. /contexts is an
# Appium command that forces the full WebDriver → Appium → XCUITest round trip (harder
# to mis-classify as "no real activity" than a metadata GET) and is valid in BOTH the
# native and webview contexts. POST /execute/sync was the previous choice, but
# XCUITestDriver answers a plain-JS execute in the NATIVE_APP context with 405 "Method is
# not implemented" — so every ping read as a failure and the heartbeat gave up after 3
# while the session was healthy, letting the idle timer it was holding off kill it.
#
# The ping goes through the local shim (scripts/mcp-session-proxy.mjs, started by
# bringup.sh) rather than straight to the BrowserStack hub, because the sandbox egress
# MITM mangles direct hub requests; the shim re-frames them over node:https (see
# scripts/mcp-session-proxy.mjs). Override with EM_HEARTBEAT_URL to ping the hub
# directly (CI / no firewall).
set -uo pipefail

SESSION_ID="${1:?session id required}"
INTERVAL="${HEARTBEAT_INTERVAL:-90}"
MAX_FAILS=3
LOG="/tmp/heartbeat-${SESSION_ID}.log"
HUB_URL="${EM_HEARTBEAT_URL:-http://127.0.0.1:${EM_MCP_PROXY_PORT:-4723}/wd/hub}"

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
    "$HUB_URL/session/$SESSION_ID/contexts" 2>/dev/null \
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
      # session is too young to have a record. App Automate sessions live on
      # api-cloud/app-automate (api.browserstack.com/automate is the desktop
      # Automate product and 404s for these session ids).
      POSTMORTEM=$(curl -sS \
        -u "$BROWSERSTACK_USERNAME:$BROWSERSTACK_ACCESS_KEY" \
        "https://api-cloud.browserstack.com/app-automate/sessions/$SESSION_ID.json" 2>/dev/null \
        || echo '{"error":"api fetch failed"}')
      echo "[$(ts)] browserstack session post-mortem: $POSTMORTEM"
      exit 0
    fi
  fi
  sleep "$INTERVAL"
done
