#!/usr/bin/env bash
# Bring up the agent's BrowserStack iOS session WITHOUT the wdio MCP's start_session, so the slow
# (~20-40s, variable) device provisioning never straddles the MCP host's fixed request timeout (the
# Copilot cloud-agent timeout that aborts start_session). Launches scripts/start-ios-session.mjs
# detached — it starts the BrowserStack Local tunnel, creates the App Automate session, and holds the
# tunnel open — then polls the status file and starts the heartbeat once the session id lands.
#
# Usage:
#   .github/skills/browser-control-ios/bringup.sh
#   EM_IOS_DEVICE='iPhone 15' EM_IOS_VERSION='17' .github/skills/browser-control-ios/bringup.sh
#
# Prints the session id on success (and leaves it in /tmp/em-bs-session.txt for the bridge); on
# failure prints the bring-up log and exits non-zero. Polls a local file — NOT an MCP call — so the
# Bash tool's generous timeout applies, not the MCP host timeout.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
SESSION_FILE="${EM_BRIDGE_SESSION_FILE:-/tmp/em-bs-session.txt}"
STATUS_FILE="${EM_IOS_BRINGUP_STATUS:-/tmp/em-ios-bringup.status}"
LOG="/tmp/em-ios-bringup.log"
TIMEOUT="${EM_IOS_BRINGUP_TIMEOUT:-120}"

rm -f "$SESSION_FILE" "$STATUS_FILE"

# Detach so this shell (and the agent's Bash call) returns regardless of provisioning time. The node
# process must outlive this shell — it holds the BrowserStack Local tunnel open for the whole session.
setsid nohup node "$ROOT/scripts/start-ios-session.mjs" >"$LOG" 2>&1 &
disown

for ((i = 0; i < TIMEOUT; i++)); do
  status="$(cat "$STATUS_FILE" 2>/dev/null || true)"
  case "$status" in
    session:*)
      sid="${status#session:}"
      echo "iOS session ready: $sid"
      "$ROOT/.github/skills/browser-control-ios/heartbeat.sh" "$sid"
      # Start the WebDriver shim so the wdio-MCP can adopt this session (provider:local +
      # appiumConfig -> this proxy). It fakes new-session with $sid and forwards commands to
      # BrowserStack over node:https. Detached; holds until the agent session ends.
      PROXY_PORT="${EM_MCP_PROXY_PORT:-4723}"
      setsid nohup node "$ROOT/scripts/mcp-session-proxy.mjs" >/tmp/em-mcp-proxy.log 2>&1 &
      disown
      echo "wdio-MCP shim: point start_session at { provider:'local', platform:'ios', noReset:true, appiumConfig:{ protocol:'http', host:'127.0.0.1', port:$PROXY_PORT, path:'/wd/hub' } }"
      exit 0
      ;;
    error:*)
      echo "iOS bring-up failed: ${status#error:}" >&2
      echo "--- bring-up log ($LOG) ---" >&2
      cat "$LOG" >&2
      exit 1
      ;;
  esac
  sleep 1
done

echo "iOS bring-up timed out after ${TIMEOUT}s (last status: ${status:-none})" >&2
echo "--- bring-up log ($LOG) ---" >&2
cat "$LOG" >&2
exit 1
