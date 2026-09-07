import assert from 'node:assert/strict'
import { readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const collect = require('../collect-copilot-conflicts.cjs')
const marker = '<!-- copilot-conflicts -->'

/** Creates a Copilot PR fixture with configurable conflict state and comment state. */
const makePr = ({
  number,
  updatedAt,
  mergeable = false,
  state,
  author = 'Copilot',
  type = 'Bot',
  sameRepository = true,
  labels = [],
}) => ({
  number,
  state: 'open',
  labels: labels.map(name => ({ name })),
  base: { ref: 'main', sha: 'base' },
  head: {
    ref: `copilot/fix/${number}`,
    sha: `head-${number}`,
    repo: sameRepository ? { full_name: 'owner/repo' } : { full_name: 'fork/repo' },
  },
  user: { login: author, type },
  mergeable,
  updated_at: updatedAt,
  html_url: `https://example.test/${number}`,
  comments: state
    ? [
        {
          id: number,
          body: `${marker}\n<!-- copilot-conflicts-state: ${Buffer.from(JSON.stringify(state)).toString('base64url')} -->`,
        },
      ]
    : [],
})

/** Runs the collector against in-memory REST responses and returns its dispatch report. */
const run = async (prs, requestedPr) => {
  const byNumber = new Map(prs.map(pr => [pr.number, pr]))
  /** Lists all fixture pull requests. */
  const list = async () => ({ data: prs })
  /** Gets one fixture pull request. */
  const get = async ({ pull_number }) => ({ data: byNumber.get(pull_number) })
  /** Lists fixture comments for one pull request. */
  const listComments = async ({ issue_number }) => ({ data: byNumber.get(issue_number).comments })
  const github = {
    rest: {
      pulls: { list, get },
      issues: {
        listComments,
        updateComment: async ({ comment_id, body }) => {
          const pr = byNumber.get(comment_id)
          pr.comments = [{ id: comment_id, body }]
        },
        createComment: async ({ issue_number, body }) => {
          const pr = byNumber.get(issue_number)
          const comment = { id: issue_number, body }
          pr.comments = [comment]
          return { data: comment }
        },
      },
    },
    paginate: async (fn, params) => (await fn(params)).data,
  }
  const core = {
    warning: () => {},
    info: () => {},
    summary: { addHeading: () => core.summary, addRaw: () => core.summary, write: async () => {} },
  }
  const realTimeout = global.setTimeout
  global.setTimeout = callback => {
    callback()
    return 0
  }
  process.env.PR_NUMBER = requestedPr ? String(requestedPr) : ''
  try {
    await collect({ github, context: { repo: { owner: 'owner', repo: 'repo' } }, core })
    return JSON.parse(readFileSync('copilot-conflicts/report.json', 'utf8'))
  } finally {
    global.setTimeout = realTimeout
    delete process.env.PR_NUMBER
    rmSync('copilot-conflicts', { recursive: true, force: true })
  }
}

const now = Date.now()
/** Creates state that has waited past the specified retry delay. */
const dueState = attempt => ({
  version: 1,
  firstConflictAt: new Date(now - 200 * 60 * 60 * 1000).toISOString(),
  attempts: attempt,
  lastDispatchedAt: attempt
    ? new Date(now - ([3, 6, 12, 24, 48, 96][attempt] + 1) * 60 * 60 * 1000).toISOString()
    : null,
  history: [],
})

/** Verifies six retry delays and the five-task recency cap. */
const testRetryPolicy = async () => {
  const report = await run([
    makePr({ number: 1, updatedAt: '2026-09-06T10:00:00Z', state: dueState(0) }),
    makePr({ number: 2, updatedAt: '2026-09-06T11:00:00Z', state: dueState(1) }),
    makePr({ number: 3, updatedAt: '2026-09-06T12:00:00Z', state: dueState(2) }),
    makePr({ number: 4, updatedAt: '2026-09-06T13:00:00Z', state: dueState(3) }),
    makePr({ number: 5, updatedAt: '2026-09-06T14:00:00Z', state: dueState(4) }),
    makePr({ number: 6, updatedAt: '2026-09-06T15:00:00Z', state: dueState(5) }),
  ])
  assert.deepEqual(
    report.tasks.map(task => task.number),
    [6, 5, 4, 3, 2],
  )
}

/** Verifies ineligible, early, resolved, and lifetime-capped PRs are excluded. */
const testExclusions = async () => {
  const report = await run([
    makePr({
      number: 7,
      updatedAt: '2026-09-06T10:00:00Z',
      state: { ...dueState(0), attempts: 6, lastDispatchedAt: new Date(now - 100 * 60 * 60 * 1000).toISOString() },
    }),
    makePr({
      number: 8,
      updatedAt: '2026-09-06T10:00:00Z',
      state: { ...dueState(0), firstConflictAt: new Date(now - 2 * 60 * 60 * 1000).toISOString() },
    }),
    makePr({ number: 9, updatedAt: '2026-09-06T10:00:00Z', mergeable: true, state: dueState(2) }),
    makePr({ number: 10, updatedAt: '2026-09-06T10:00:00Z', author: 'dependabot[bot]', state: dueState(0) }),
    makePr({ number: 11, updatedAt: '2026-09-06T10:00:00Z', sameRepository: false, state: dueState(0) }),
  ])
  assert.deepEqual(report.tasks, [])
}

/** Verifies the skip label excludes a due PR entirely, leaving its comment untouched. */
const testSkipLabel = async () => {
  const skipped = makePr({
    number: 15,
    updatedAt: '2026-09-06T10:00:00Z',
    state: dueState(2),
    labels: ['skip-auto-resolve-conflicts'],
  })
  const before = skipped.comments[0].body
  const report = await run([skipped])
  assert.deepEqual(report.tasks, [])
  assert.equal(skipped.comments[0].body, before)
}

/** Verifies a comment is posted only once a conflict exists, and is kept updated afterwards. */
const testCommentOnConflictOnly = async () => {
  const clean = makePr({ number: 12, updatedAt: '2026-09-06T10:00:00Z', mergeable: true })
  const conflicting = makePr({ number: 13, updatedAt: '2026-09-06T10:00:00Z' })
  const resolved = makePr({ number: 14, updatedAt: '2026-09-06T10:00:00Z', mergeable: true, state: dueState(1) })
  await run([clean, conflicting, resolved])
  assert.deepEqual(clean.comments, [])
  assert.ok(conflicting.comments[0].body.includes('A merge conflict is detected'))
  assert.ok(resolved.comments[0].body.includes('No merge conflict is currently detected'))
}

/** Verifies the comment ends on the shared attempt footer once an attempt has been started. */
const testAttemptFooter = async () => {
  const pr = makePr({
    number: 16,
    updatedAt: '2026-09-06T10:00:00Z',
    state: {
      ...dueState(2),
      lastTaskUrl: 'https://example.test/task/2',
      lastRunUrl: 'https://example.test/run/99',
    },
  })
  await run([pr])
  assert.equal(
    pr.comments[0].body.split('\n').pop(),
    'Attempt 2 of 6. The next attempt is eligible 12 hours after this one, if the pull request still conflicts. Started by [Copilot Conflict Resolution](https://example.test/run/99).',
  )
}

/** Verifies the last attempt names the dispatch that asks for one more, rather than a dead end. */
const testCapNotice = async () => {
  const pr = makePr({
    number: 17,
    updatedAt: '2026-09-06T10:00:00Z',
    state: { ...dueState(0), attempts: 6, lastRunUrl: 'https://example.test/run/99' },
  })
  await run([pr])
  assert.equal(
    pr.comments[0].body.split('\n').pop(),
    'Attempt 6 of 6. No further attempt starts on its own — run `gh workflow run copilot-conflicts.yml -f pr=17` if it needs another. Started by [Copilot Conflict Resolution](https://example.test/run/99).',
  )
}

/** Verifies the schedule rides in the body until there is an attempt for a footer to count. */
const testScheduleBeforeFirstAttempt = async () => {
  const pr = makePr({ number: 18, updatedAt: '2026-09-06T10:00:00Z' })
  await run([pr])
  assert.equal(
    pr.comments[0].body.split('\n').pop(),
    'A merge conflict is detected. The next attempt is eligible 3 hours after the conflict was first seen, if the pull request still conflicts.',
  )
}

/** Verifies a dispatch that names a pull request overrides both the wait and the lifetime cap. */
const testNamedDispatchOverridesWaitAndCap = async () => {
  const waiting = makePr({
    number: 19,
    updatedAt: '2026-09-06T10:00:00Z',
    state: { ...dueState(2), lastDispatchedAt: new Date(now - 60 * 60 * 1000).toISOString() },
  })
  const capped = makePr({ number: 20, updatedAt: '2026-09-06T10:00:00Z', state: { ...dueState(0), attempts: 6 } })
  assert.deepEqual(
    (await run([waiting], 19)).tasks.map(task => task.number),
    [19],
  )
  assert.deepEqual(
    (await run([capped], 20)).tasks.map(task => task.number),
    [20],
  )
}

await testRetryPolicy()
await testExclusions()
await testCommentOnConflictOnly()
await testSkipLabel()
await testAttemptFooter()
await testCapNotice()
await testScheduleBeforeFirstAttempt()
await testNamedDispatchOverridesWaitAndCap()

console.info('PASS: collect-copilot-conflicts')
