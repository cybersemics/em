#!/usr/bin/env bash
# Dispatch a JSONWP TouchAction sequence at the legacy /touch/perform endpoint
# proxied by Appium-XCUITest. Used as a fallback when the wdio MCP's standard
# touch tools (tap_element, swipe, mobile: <cmd>) don't trigger the iOS
# recognizer correctly — see ./SKILL.md.
#
# Usage:
#   touch-perform.sh '<actions JSON array>'
#
# Example (double-tap at (130, 164)):
#   touch-perform.sh '[{"action":"tap","options":{"x":130,"y":164}},
#                      {"action":"wait","options":{"ms":100}},
#                      {"action":"tap","options":{"x":130,"y":164}}]'
#
# Reads:
#   /tmp/em-bs-session.txt — session ID written by browser-control-ios after start_session
#   $BROWSERSTACK_USERNAME, $BROWSERSTACK_ACCESS_KEY — auth (from GitHub Actions secrets / local env)

set -euo pipefail

SESSION_FILE="/tmp/em-bs-session.txt"
HUB="https://hub-cloud.browserstack.com/wd/hub"

if [[ $# -ne 1 ]]; then
  echo "usage: $(basename "$0") '<actions JSON array>'" >&2
  exit 2
fi

ACTIONS_JSON="$1"

if [[ ! -f "$SESSION_FILE" ]]; then
  echo "error: $SESSION_FILE not found — write the session ID there after start_session" >&2
  exit 1
fi

SID="$(cat "$SESSION_FILE")"
if [[ -z "$SID" ]]; then
  echo "error: $SESSION_FILE is empty" >&2
  exit 1
fi

if [[ -z "${BROWSERSTACK_USERNAME:-}" || -z "${BROWSERSTACK_ACCESS_KEY:-}" ]]; then
  echo "error: BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY must be set in env" >&2
  exit 1
fi

AUTH="$(printf '%s' "${BROWSERSTACK_USERNAME}:${BROWSERSTACK_ACCESS_KEY}" | base64)"

# Wrap the actions array in the {"actions": ...} envelope expected by the endpoint
BODY="{\"actions\":${ACTIONS_JSON}}"

RESPONSE="$(curl -sS -X POST "${HUB}/session/${SID}/touch/perform" \
  -H "Authorization: Basic ${AUTH}" \
  -H "Content-Type: application/json" \
  -d "${BODY}")"

echo "${RESPONSE}"

# Surface non-success: the endpoint returns {"value":null} on success and
# {"status":N,"value":{"error":...}} or HTTP-level errors otherwise.
if echo "${RESPONSE}" | grep -qE '"error"|"status":[1-9]'; then
  exit 1
fi
