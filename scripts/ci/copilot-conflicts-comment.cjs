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
const taskComment = require('./task-comment.cjs')

/** Marker identifying the comment this workflow maintains on a pull request. */
const MARKER = '<!-- copilot-conflicts -->'

/**
 * Labels that opt a pull request out of conflict resolution. `skip-auto-resolve-conflicts` is this
 * workflow's own opt-out; `hold` pauses development on the pull request generally, and a pull
 * request nobody intends to advance is not worth spending a task on; nor is a `prototype`, a design
 * experiment that is never merged (docs/testing.md § Prototype pull requests). Any one excludes the
 * pull request from the scan entirely, so no comment is written or updated and its retry state
 * stays frozen until the label is removed — or until a dispatch names the pull request, which
 * overrides the opt-out because a human asking for a task is the thing the label said was absent.
 */
const SKIP_LABELS = ['skip-auto-resolve-conflicts', 'hold', 'prototype']

/** The state record hidden in that comment, as base64url-encoded JSON. */
const STATE_PATTERN = /<!-- copilot-conflicts-state: ([A-Za-z0-9_-]+) -->/

/** Tasks started on one pull request before the automation gives up on it. */
const MAX_TASKS = 6

/**
 * Hours waited after the previous task before each task, indexed by the number of tasks already
 * started. The first task waits only for the branch to go quiet (QUIET_HOURS). The later waits
 * double to limit churn: every task pushes a commit that runs the full CI suite, BrowserStack
 * included, and a pull request that keeps conflicting while nobody is about to review or merge it —
 * over a weekend, or while it is stalled — would otherwise get a fresh resolution after every change
 * to main. Doubling keeps the tasks a pull request can spend while nobody works on it to six over
 * about eight days. Work on the pull request restarts the count, since a pull request somebody is
 * working on is one that is about to be reviewed.
 */
const DELAYS_HOURS = [0, 6, 12, 24, 48, 96]

/**
 * Hours a pull request's branch must go without a new commit before a task starts, so that a task
 * never lands in the middle of somebody's work on it. This is a debounce: each commit restarts it.
 */
const QUIET_HOURS = 1

/**
 * Hours after a task starts during which new commits on the branch are taken to be the task's own
 * rather than somebody's work, so that they do not restart the count of tasks.
 */
const TASK_WINDOW_HOURS = 2

/** The workflow as the comment names it, and as `gh workflow run` takes it. */
const WORKFLOW = 'Copilot Conflict Resolution'
const WORKFLOW_FILE = 'copilot-conflicts.yml'

/** Returns the initial schema-versioned state stored in a PR comment. */
const initialState = () => ({
  version: 2,
  firstConflictAt: null,
  tasks: 0,
  lastDispatchedAt: null,
  lastHeadChangeAt: null,
  lastTaskUrl: null,
  lastRunUrl: null,
  history: [],
})

/**
 * Decodes the state payload from a previously written comment. A payload from an older schema is
 * discarded rather than migrated: version 1 counted the same runs under an `attempts` key, and a
 * pull request that starts its count over is a cheaper outcome than a compatibility branch kept
 * alive for the handful of open pull requests carrying one.
 */
const parseState = body => {
  const match = STATE_PATTERN.exec(body || '')
  if (!match) return initialState()
  try {
    const state = JSON.parse(Buffer.from(match[1], 'base64url').toString('utf8'))
    return state.version === 2
      ? { ...initialState(), ...state, history: Array.isArray(state.history) ? state.history : [] }
      : initialState()
  } catch {
    return initialState()
  }
}

/** Renders the visible comment for a state, and the machine-readable copy of that state inside it. */
const commentBody = ({ state, number }) => {
  const encoded = Buffer.from(JSON.stringify(state)).toString('base64url')
  // The agent run working the conflict, which is the only view from the pull request into what the
  // task is actually doing.
  const task = state.lastTaskUrl && `[task](${state.lastTaskUrl})`
  // What is being done about the conflict, claimed as ongoing only while it is: at the cap nothing
  // further starts on its own, so there the task is named in the past tense the footer's cap notice
  // follows from.
  const resolving =
    state.firstConflictAt && state.tasks < MAX_TASKS
      ? task
        ? `Copilot is resolving it on this branch: ${task}.`
        : 'Copilot will resolve it on this branch.'
      : null
  // What was seen, and what is being done about it — a reader given only the observation cannot tell
  // whether a resolution is coming, underway, or theirs to do. The comment exists only once a
  // conflict has been seen, so a cleared one is a resolution rather than an absence; by whom is not
  // knowable here, as an author can merge as readily as a task can.
  const status = [
    state.firstConflictAt ? 'A merge conflict is detected.' : 'Merge conflicts resolved.',
    // Leads with the noun: "the last one" after a sentence about the conflict could name either.
    resolving || (state.lastTaskUrl && `The most recent task was [this one](${state.lastTaskUrl}).`),
  ]
    .filter(Boolean)
    .join(' ')
  // Measured from the same instants getDueAt measures from, so it stays true however long the
  // comment sits there. Nothing is scheduled while the pull request merges cleanly, and nothing is
  // scheduled past the cap — where the footer prints the cap notice in place of this.
  const quiet = `the branch has had no new commits for ${QUIET_HOURS === 1 ? 'an hour' : `${QUIET_HOURS} hours`}`
  const next =
    state.firstConflictAt && state.tasks < MAX_TASKS
      ? state.tasks
        ? `The next task is eligible ${DELAYS_HOURS[state.tasks]} hours after this one, once ${quiet}, if the pull request still conflicts.`
        : `The first task is eligible once ${quiet}, if the pull request still conflicts.`
      : null
  return taskComment({
    markers: [MARKER, `<!-- copilot-conflicts-state: ${encoded} -->`],
    heading: 'Copilot conflict resolution',
    // Until the first task there is no footer to carry the schedule, so it rides in the body.
    body: [state.tasks ? status : [status, next].filter(Boolean).join(' ')],
    taskNumber: state.tasks,
    maxTasks: MAX_TASKS,
    next,
    pr: number,
    // The run that started the last task, which is not this one whenever a later scan rewrites
    // the comment — so it is read back from the state rather than from the environment.
    runUrl: state.lastRunUrl,
    workflow: WORKFLOW,
    workflowFile: WORKFLOW_FILE,
  })
}

module.exports = {
  DELAYS_HOURS,
  MARKER,
  MAX_TASKS,
  QUIET_HOURS,
  SKIP_LABELS,
  TASK_WINDOW_HOURS,
  commentBody,
  parseState,
}
