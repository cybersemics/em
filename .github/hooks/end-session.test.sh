#!/usr/bin/env bash

set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
GUARD="$ROOT/.github/hooks/end-session.sh"
TEST_STATE=$(mktemp -d)
trap 'rm -rf "$TEST_STATE"' EXIT

export EM_COMPLETION_GUARD_FORCE=1
export EM_COMPLETION_GUARD_STATE_DIR="$TEST_STATE"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

run_hook() {
  local mode=$1
  local payload=$2
  printf '%s' "$payload" | bash "$GUARD" "$mode"
}

assert_decision() {
  local expected=$1
  local output=$2
  local actual
  actual=$(jq -r '.decision' <<<"$output")
  [[ $actual == "$expected" ]] || fail "expected decision '$expected', got '$actual': $output"
}

SESSION_1=session-1
SESSION_2=session-2

run_hook session-start "{\"sessionId\":\"$SESSION_1\"}" >/dev/null

# A nested helper finishing is unrelated to the outer task's completion gate.
output=$(run_hook subagent-stop "{\"sessionId\":\"$SESSION_1\",\"agentName\":\"explore\"}")
assert_decision allow "$output"

# Worker Bee and the parent are both held while end-session has not armed the marker.
output=$(run_hook subagent-stop "{\"sessionId\":\"$SESSION_1\",\"agentName\":\"🐝 Worker Bee\"}")
assert_decision block "$output"
[[ $(jq -r '.reason' <<<"$output") == *end-session* ]] || fail 'Worker Bee block did not explain the end-session requirement'

# Accept VS Code-compatible field names and display-name variants as well.
output=$(run_hook subagent-stop "{\"session_id\":\"$SESSION_1\",\"agent_name\":\"worker-bee\",\"agent_display_name\":\"Worker Bee\"}")
assert_decision block "$output"

output=$(run_hook agent-stop "{\"sessionId\":\"$SESSION_1\"}")
assert_decision block "$output"

# The end-session skill arms the current session, allowing both lifecycle boundaries to close.
bash "$GUARD" arm >/dev/null
output=$(run_hook subagent-stop "{\"sessionId\":\"$SESSION_1\",\"agentName\":\"🐝 Worker Bee\"}")
assert_decision allow "$output"
output=$(run_hook agent-stop "{\"sessionId\":\"$SESSION_1\"}")
assert_decision allow "$output"

# A new cloud job clears the old marker; a previous session can never authorize the next one.
run_hook session-start "{\"sessionId\":\"$SESSION_2\"}" >/dev/null
[[ ! -e $TEST_STATE/armed-session-id ]] || fail 'sessionStart did not clear the previous armed marker'
output=$(run_hook agent-stop "{\"sessionId\":\"$SESSION_2\"}")
assert_decision block "$output"

# Hooks are inert outside cloud agent even though repository hooks also load in Copilot CLI.
unset EM_COMPLETION_GUARD_FORCE
unset GITHUB_COPILOT_API_TOKEN
output=$(run_hook agent-stop '{"sessionId":"local"}')
assert_decision allow "$output"
bash "$GUARD" arm >/dev/null

printf '%s\n' 'PASS: end-session hook blocks premature cloud completion and allows an armed session'
