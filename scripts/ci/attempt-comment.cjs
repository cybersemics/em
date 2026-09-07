/**
 * The comment shape shared by the automations that keep putting an agent on a pull request until it
 * is fixed — Dependabot Fix and Copilot Conflict Resolution. Each keeps one sticky comment per pull
 * request and each is bounded by an attempt cap, so each ends on the same line: which attempt this
 * is out of how many, what happens after it, and the run that started it.
 *
 * CommonJS because both kinds of caller need it — the collectors, which actions/github-script loads
 * with require(), and the dispatchers, which are ESM and import it.
 */

/**
 * Renders the comment: the hidden `markers` its collector reads back, the `heading`, the `body`
 * lines, and the attempt footer.
 *
 * `attempt` counts the attempts already started, out of `maxAttempts`; `next` is the sentence
 * describing what follows this one, which the cap notice replaces once there is no next; `runUrl`
 * is the run that started the attempt, or null where there is none to link — a comment rewritten by
 * a later scan, or a test.
 */
const attemptComment = ({ markers, heading, body, attempt, maxAttempts, next, pr, runUrl, workflow, workflowFile }) => {
  const footer = [
    `Attempt ${attempt} of ${maxAttempts}.`,
    // At the cap nothing further happens on its own, and the `pr` input both workflows take is how
    // a human asks for one more — so the remedy is the same dispatch either side of this.
    attempt >= maxAttempts
      ? `No further attempt starts on its own — run \`gh workflow run ${workflowFile} -f pr=${pr}\` if it needs another.`
      : next,
    runUrl && `Started by [${workflow}](${runUrl}).`,
  ]
    .filter(Boolean)
    .join(' ')
  // A comment written before the first attempt has no footer: nothing yet to number or attribute.
  return [...markers, `### 🤖 ${heading}`, '', ...body, ...(attempt ? ['', footer] : [])].join('\n')
}

module.exports = attemptComment
