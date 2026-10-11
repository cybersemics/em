/**
 * The comment shape shared by the automations that keep putting an agent on a pull request until it
 * is fixed — Dependabot Fix and Copilot Conflict Resolution. Each keeps one sticky comment per pull
 * request and each is bounded by a task cap, so each ends on the same line: which task this is out
 * of how many, what happens after it, and the run that started it.
 *
 * The count is of tasks rather than attempts because neither automation ever learns how a task
 * ended. Each starts another because the pull request is still broken — a check still red, a
 * conflict still there — which is not the same as the last task having failed, and "attempt" told
 * a reader it was.
 *
 * CommonJS because both kinds of caller need it — the collectors, which actions/github-script loads
 * with require(), and the dispatchers, which are ESM and import it.
 */

/**
 * Renders the comment: the hidden `markers` its collector reads back, the `heading`, the `body`
 * lines, and the task footer.
 *
 * `taskNumber` counts the tasks already started, out of `maxTasks`; `next` is the sentence
 * describing what follows this one, which the cap notice replaces once there is no next; `runUrl`
 * is the run that started the task, or null where there is none to link — a comment rewritten by a
 * later scan, or a test.
 */
const taskComment = ({ markers, heading, body, taskNumber, maxTasks, next, pr, runUrl, workflow, workflowFile }) => {
  const footer = [
    `Task ${taskNumber} of ${maxTasks}.`,
    // At the cap nothing further happens on its own, and the `pr` input both workflows take is how
    // a human asks for one more — so the remedy is the same dispatch either side of this.
    taskNumber >= maxTasks
      ? `No further task starts on its own — run \`gh workflow run ${workflowFile} -f pr=${pr}\` if it needs another.`
      : next,
    runUrl && `Started by [${workflow}](${runUrl}).`,
  ]
    .filter(Boolean)
    .join(' ')
  // A comment written before the first task has no footer: nothing yet to number or attribute.
  return [...markers, `### 🤖 ${heading}`, '', ...body, ...(taskNumber ? ['', footer] : [])].join('\n')
}

module.exports = taskComment
