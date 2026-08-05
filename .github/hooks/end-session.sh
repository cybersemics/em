#!/usr/bin/env bash

# Deterministically enforce the end-session skill in Copilot cloud agent jobs.
#
# The agent's prompt still owns the substantive checklist. This hook closes the
# gap where the model stops before invoking it: session-start clears a
# per-session marker, the skill arms it only after completing its checklist,
# and both Worker Bee and its parent are blocked from stopping without it.

set -euo pipefail

MODE=${1:-}
STATE_DIR=${EM_COMPLETION_GUARD_STATE_DIR:-/tmp/em-copilot-completion-guard}
SESSION_FILE="$STATE_DIR/session-id"
ARMED_FILE="$STATE_DIR/armed-session-id"

is_cloud_agent() {
  [[ -n ${GITHUB_COPILOT_API_TOKEN:-} || ${EM_COMPLETION_GUARD_FORCE:-} == 1 ]]
}

read_payload() {
  PAYLOAD=$(cat)
  SESSION_ID=$(jq -r '.sessionId // .session_id // empty' <<<"$PAYLOAD")
}

allow() {
  printf '{"decision":"allow"}\n'
}

block() {
  jq -cn --arg reason "$1" '{ decision: "block", reason: $reason }'
}

is_armed() {
  [[ -n ${SESSION_ID:-} && -f $ARMED_FILE ]] && [[ $(<"$ARMED_FILE") == "$SESSION_ID" ]]
}

case "$MODE" in
  session-start)
    # Repository hooks also load in Copilot CLI. This guard targets the
    # non-interactive cloud agent, whose sandbox always provides this token.
    if ! is_cloud_agent; then
      printf '{}\n'
      exit 0
    fi

    read_payload
    if [[ -z $SESSION_ID ]]; then
      printf '%s\n' 'completion guard: sessionStart payload did not include a session id' >&2
      printf '{}\n'
      exit 0
    fi

    mkdir -p "$STATE_DIR"
    printf '%s\n' "$SESSION_ID" >"$SESSION_FILE"
    rm -f "$ARMED_FILE"
    printf '{}\n'
    ;;

  arm)
    if ! is_cloud_agent; then
      printf '%s\n' 'completion guard: local session; no cloud marker required'
      exit 0
    fi

    if [[ ! -s $SESSION_FILE ]]; then
      printf '%s\n' 'completion guard: cannot arm because sessionStart did not initialize the session marker' >&2
      exit 1
    fi

    cp "$SESSION_FILE" "$ARMED_FILE"
    printf '%s\n' 'completion guard: armed for this cloud agent session'
    ;;

  subagent-stop)
    if ! is_cloud_agent; then
      allow
      exit 0
    fi

    read_payload
    AGENT_NAME=$(jq -r '.agentName // .agent_name // empty' <<<"$PAYLOAD")
    AGENT_DISPLAY_NAME=$(jq -r '.agentDisplayName // .agent_display_name // empty' <<<"$PAYLOAD")

    # Nested specialist agents must be free to return results to Worker Bee.
    # subagentStop has no configuration-level matcher, so filter here.
    # Copilot normally reports the profile's `name`, but accept the filename
    # identifier and display-name variants too so a runtime normalization
    # change cannot silently disable the gate.
    if [[ $AGENT_NAME != worker-bee &&
      $AGENT_NAME != 'Worker Bee' &&
      $AGENT_NAME != '🐝 Worker Bee' &&
      $AGENT_DISPLAY_NAME != 'Worker Bee' &&
      $AGENT_DISPLAY_NAME != '🐝 Worker Bee' ]]; then
      allow
      exit 0
    fi

    if is_armed; then
      allow
    else
      block 'The end-session completion guard is not armed. You attempted to stop before completing the task. Continue the current work. When the task has reached a legitimate ending, execute every step of .github/skills/end-session/SKILL.md; its final step arms this guard.'
    fi
    ;;

  agent-stop)
    if ! is_cloud_agent; then
      allow
      exit 0
    fi

    read_payload
    if is_armed; then
      allow
    else
      block 'The cloud agent session cannot end because the end-session completion guard is not armed. Resume the unfinished work, then execute every step of .github/skills/end-session/SKILL.md before stopping.'
    fi
    ;;

  *)
    printf 'usage: %s {session-start|arm|subagent-stop|agent-stop}\n' "$0" >&2
    exit 2
    ;;
esac
