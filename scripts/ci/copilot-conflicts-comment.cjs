/**
 * The single comment Copilot Conflict Resolution keeps on a pull request, and the retry state
 * hidden inside it.
 *
 * Both steps of .github/workflows/copilot-conflicts.yml write this comment — the scan through
 * collect-copilot-conflicts.cjs, the dispatch through start-copilot-conflict-task.mjs — and the
 * scan rewrites whatever the dispatch left behind, so the two have to render a given state
 * identically. Rendering it in one place is what makes that true; while each had its own copy they
 * disagreed on the wording, and each carried its own copy of the delays and the cap.
 *
 * The opt-out labels live here for the same reason: the scan decides against them and the dispatch
 * rechecks the same decision, so a label honored by one and not the other would be a hole.
 */
const attemptComment = require('./attempt-comment.cjs')

/** Marker identifying the comment this workflow maintains on a pull request. */
const MARKER = '<!-- copilot-conflicts -->'

/**
 * Labels that opt a pull request out of conflict resolution. `skip-auto-resolve-conflicts` is this
 * workflow's own opt-out; `hold` pauses development on the pull request generally, and a pull
 * request nobody intends to advance is not worth spending an attempt on. Either one excludes the
 * pull request from the scan entirely, so no comment is written or updated and its retry state
 * stays frozen until the label is removed.
 */
const SKIP_LABELS = ['skip-auto-resolve-conflicts', 'hold']

/** The state record hidden in that comment, as base64url-encoded JSON. */
const STATE_PATTERN = /<!-- copilot-conflicts-state: ([A-Za-z0-9_-]+) -->/

/** Attempts made on one pull request before the automation gives up on it. */
const MAX_ATTEMPTS = 6

/** Hours waited before each attempt, indexed by the number of attempts already made. */
const DELAYS_HOURS = [3, 6, 12, 24, 48, 96]

/** The workflow as the comment names it, and as `gh workflow run` takes it. */
const WORKFLOW = 'Copilot Conflict Resolution'
const WORKFLOW_FILE = 'copilot-conflicts.yml'

/** Returns the initial schema-versioned state stored in a PR comment. */
const initialState = () => ({
  version: 1,
  firstConflictAt: null,
  attempts: 0,
  lastDispatchedAt: null,
  lastTaskUrl: null,
  lastRunUrl: null,
  history: [],
})

/** Decodes the state payload from a previously written comment. */
const parseState = body => {
  const match = STATE_PATTERN.exec(body || '')
  if (!match) return initialState()
  try {
    const state = JSON.parse(Buffer.from(match[1], 'base64url').toString('utf8'))
    return state.version === 1
      ? { ...initialState(), ...state, history: Array.isArray(state.history) ? state.history : [] }
      : initialState()
  } catch {
    return initialState()
  }
}

/** Renders the visible comment for a state, and the machine-readable copy of that state inside it. */
const commentBody = ({ state, number }) => {
  const encoded = Buffer.from(JSON.stringify(state)).toString('base64url')
  const status = state.firstConflictAt ? 'A merge conflict is detected.' : 'No merge conflict is currently detected.'
  // Measured from the same instant getDueAt measures from, so it stays true however long the
  // comment sits there. Nothing is scheduled while the pull request merges cleanly, and nothing is
  // scheduled past the cap — where the footer prints the cap notice in place of this.
  const next =
    state.firstConflictAt && state.attempts < MAX_ATTEMPTS
      ? `The next attempt is eligible ${DELAYS_HOURS[state.attempts]} hours after ${
          state.attempts ? 'this one' : 'the conflict was first seen'
        }, if the pull request still conflicts.`
      : null
  return attemptComment({
    markers: [MARKER, `<!-- copilot-conflicts-state: ${encoded} -->`],
    heading: 'Copilot conflict resolution',
    body: [
      // Until the first attempt there is no footer to carry the schedule, so it rides in the body.
      state.attempts ? status : [status, next].filter(Boolean).join(' '),
      state.lastTaskUrl && `Latest task: ${state.lastTaskUrl}`,
    ].filter(Boolean),
    attempt: state.attempts,
    maxAttempts: MAX_ATTEMPTS,
    next,
    pr: number,
    // The run that started the last attempt, which is not this one whenever a later scan rewrites
    // the comment — so it is read back from the state rather than from the environment.
    runUrl: state.lastRunUrl,
    workflow: WORKFLOW,
    workflowFile: WORKFLOW_FILE,
  })
}

module.exports = { DELAYS_HOURS, MARKER, MAX_ATTEMPTS, SKIP_LABELS, commentBody, parseState }
