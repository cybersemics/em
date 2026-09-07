/**
 * Finds conflicting Copilot pull requests that are due for a resolution attempt.
 * State is retained in one marked PR comment so later push-triggered scans resume safely.
 */
const fs = require('node:fs')

const REPORT_DIR = 'copilot-conflicts'
const REPORT_FILE = `${REPORT_DIR}/report.json`
const MARKER = '<!-- copilot-conflicts -->'
const COPILOT = 'Copilot'
const BASE_BRANCH = 'main'
const MAX_DISPATCHES = 5
const MAX_ATTEMPTS = 6
const DELAYS_HOURS = [3, 6, 12, 24, 48, 96]

/** Returns the initial schema-versioned state stored in a PR comment. */
const initialState = () => ({
  version: 1,
  firstConflictAt: null,
  attempts: 0,
  lastDispatchedAt: null,
  lastTaskUrl: null,
  history: [],
})

/** Decodes the state payload from a previously written comment. */
const parseState = body => {
  const match = /<!-- copilot-conflicts-state: ([A-Za-z0-9_-]+) -->/.exec(body || '')
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

/** Renders the visible sticky comment and its machine-readable state. */
const commentBody = state => {
  const encoded = Buffer.from(JSON.stringify(state)).toString('base64url')
  const delay = state.attempts < MAX_ATTEMPTS ? DELAYS_HOURS[state.attempts] : null
  const status = state.firstConflictAt
    ? state.attempts >= MAX_ATTEMPTS
      ? 'Automatic conflict resolution has reached its six-attempt lifetime limit.'
      : `A merge conflict is detected. Attempt ${state.attempts + 1} is eligible after ${delay} hours.`
    : 'No merge conflict is currently detected.'
  return [
    MARKER,
    `<!-- copilot-conflicts-state: ${encoded} -->`,
    '### Copilot conflict resolution',
    '',
    status,
    state.lastTaskUrl && `Latest task: ${state.lastTaskUrl}`,
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * Creates or updates the state comment, unless the scan is read-only. A pull request that has never
 * conflicted gets no comment, so only pull requests the workflow has acted on are annotated.
 */
const upsertComment = async ({ github, owner, repo, pr, comment, state, dryRun }) => {
  if (dryRun) return comment
  if (!comment && !state.firstConflictAt) return null
  const body = commentBody(state)
  if (comment) {
    await github.rest.issues.updateComment({ owner, repo, comment_id: comment.id, body })
    return { ...comment, body }
  }
  return (await github.rest.issues.createComment({ owner, repo, issue_number: pr.number, body })).data
}

/** Waits briefly for GitHub to finish calculating a PR's mergeability. */
const getMergeability = async ({ github, owner, repo, prNumber }) => {
  for (const delay of [0, 2000, 4000]) {
    if (delay) await new Promise(resolve => setTimeout(resolve, delay))
    const pr = (await github.rest.pulls.get({ owner, repo, pull_number: prNumber })).data
    if (pr.mergeable !== null) return pr
  }
  return null
}

/** Returns whether a pull request is an in-repository Copilot PR targeting main. */
const isEligible = ({ pr, repository }) =>
  pr.state === 'open' &&
  pr.base.ref === BASE_BRANCH &&
  pr.user.login === COPILOT &&
  pr.user.type === 'Bot' &&
  pr.head.repo &&
  pr.head.repo.full_name === repository

/** Returns when the next resolution attempt becomes eligible. */
const getDueAt = state => {
  if (!state.firstConflictAt || state.attempts >= MAX_ATTEMPTS) return null
  const previousAttempt = state.lastDispatchedAt || state.firstConflictAt
  return new Date(new Date(previousAttempt).getTime() + DELAYS_HOURS[state.attempts] * 60 * 60 * 1000)
}

/** Produces the dispatcher report while keeping conflict state synchronized with GitHub. */
const collectCopilotConflicts = async ({ github, context, core }) => {
  const { owner, repo } = context.repo
  const repository = `${owner}/${repo}`
  const dryRun = process.env.DRY_RUN === 'true'
  const requestedPr = Number(process.env.PR_NUMBER || '0')
  const now = new Date()
  const listed = requestedPr
    ? [(await github.rest.pulls.get({ owner, repo, pull_number: requestedPr })).data]
    : await github.paginate(github.rest.pulls.list, {
        owner,
        repo,
        state: 'open',
        base: BASE_BRANCH,
        sort: 'updated',
        direction: 'desc',
        per_page: 100,
      })
  const due = []

  for (const listedPr of listed.filter(pr => isEligible({ pr, repository }))) {
    const pr = await getMergeability({ github, owner, repo, prNumber: listedPr.number })
    if (!pr) {
      core.warning(`#${listedPr.number}: mergeability is still unknown; leaving state unchanged.`)
      continue
    }
    const comments = await github.paginate(github.rest.issues.listComments, {
      owner,
      repo,
      issue_number: pr.number,
      per_page: 100,
    })
    const comment = comments.find(candidate => candidate.body && candidate.body.includes(MARKER))
    const oldState = parseState(comment && comment.body)
    const conflicting = pr.mergeable === false
    const state = {
      ...oldState,
      firstConflictAt: conflicting ? oldState.firstConflictAt || now.toISOString() : null,
      observedHeadSha: pr.head.sha,
      observedBaseSha: pr.base.sha,
    }
    const savedComment = await upsertComment({ github, owner, repo, pr, comment, state, dryRun })
    const dueAt = getDueAt(state)
    if (conflicting && dueAt && dueAt <= now) {
      due.push({
        number: pr.number,
        url: pr.html_url,
        updatedAt: pr.updated_at,
        headRef: pr.head.ref,
        baseRef: pr.base.ref,
        headSha: pr.head.sha,
        baseSha: pr.base.sha,
        commentId: savedComment && savedComment.id,
        state,
      })
    }
  }

  const tasks = due.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, MAX_DISPATCHES)
  fs.mkdirSync(REPORT_DIR, { recursive: true })
  fs.writeFileSync(REPORT_FILE, JSON.stringify({ generatedAt: now.toISOString(), dryRun, tasks }, null, 2))
  await core.summary
    .addHeading('Copilot conflict resolution')
    .addRaw(`Due: ${due.length}; selected: ${tasks.length}.`)
    .write()
  core.info(`Selected ${tasks.length} due Copilot conflict-resolution task(s).`)
}

module.exports = collectCopilotConflicts
