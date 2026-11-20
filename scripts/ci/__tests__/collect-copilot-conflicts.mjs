import assert from 'node:assert/strict'
import { readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const collect = require('../collect-copilot-conflicts.cjs')
const { parseState } = require('../copilot-conflicts-comment.cjs')
const marker = '<!-- copilot-conflicts -->'

/** Creates a Copilot PR fixture with configurable conflict state and comment state. */
const makePr = ({
  number,
  updatedAt,
  createdAt = updatedAt,
  mergeable = false,
  state,
  author = 'Copilot',
  type = 'Bot',
  sameRepository = true,
  labels = [],
  draft = false,
}) => ({
  number,
  state: 'open',
  draft,
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
  created_at: createdAt,
  html_url: `https://example.test/${number}`,
  comments: state
    ? [
        {
          id: number,
          // The scan has already seen the current head unless the state says otherwise.
          body: `${marker}\n<!-- copilot-conflicts-state: ${Buffer.from(JSON.stringify({ observedHeadSha: `head-${number}`, ...state })).toString('base64url')} -->`,
        },
      ]
    : [],
})

/** Runs the collector against in-memory REST responses and returns its dispatch report. */
const run = async (prs, requestedPr, { browserStackBusy = false } = {}) => {
  const byNumber = new Map(prs.map(pr => [pr.number, pr]))
  /** Lists all fixture pull requests. */
  const list = async () => ({ data: prs })
  /** Gets one fixture pull request. */
  const get = async ({ pull_number }) => ({ data: byNumber.get(pull_number) })
  /** Lists fixture comments for one pull request. */
  const listComments = async ({ issue_number }) => ({ data: byNumber.get(issue_number).comments })
  const github = {
    rest: {
      actions: {
        listWorkflowRuns: async () => ({
          data: browserStackBusy ? { total_count: 1, workflow_runs: [{}] } : { total_count: 0, workflow_runs: [] },
        }),
      },
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
/** Returns an ISO timestamp the given number of hours before now. */
const hoursAgo = hours => new Date(now - hours * 60 * 60 * 1000).toISOString()
/** Creates state that has waited past the delay before the task after the specified count. */
const dueState = tasks => ({
  version: 2,
  firstConflictAt: hoursAgo(200),
  lastHeadChangeAt: hoursAgo(200),
  tasks,
  lastDispatchedAt: tasks ? hoursAgo([0, 6, 12, 24, 48, 96][tasks] + 1) : null,
  history: [],
})

/** Reads back the state the scan left in a fixture pull request's comment. */
const savedState = pr => parseState(pr.comments[0].body)

/** Verifies six retry delays, one task per scan, and the oldest due pull request going first. */
const testRetryPolicy = async () => {
  const report = await run([
    makePr({ number: 1, updatedAt: '2026-09-06T15:00:00Z', createdAt: '2026-09-01T10:00:00Z', state: dueState(0) }),
    makePr({ number: 2, updatedAt: '2026-09-06T14:00:00Z', createdAt: '2026-09-01T11:00:00Z', state: dueState(1) }),
    makePr({ number: 3, updatedAt: '2026-09-06T13:00:00Z', createdAt: '2026-09-01T12:00:00Z', state: dueState(2) }),
    makePr({ number: 4, updatedAt: '2026-09-06T12:00:00Z', createdAt: '2026-09-01T13:00:00Z', state: dueState(3) }),
    makePr({ number: 5, updatedAt: '2026-09-06T11:00:00Z', createdAt: '2026-09-01T14:00:00Z', state: dueState(4) }),
    makePr({ number: 6, updatedAt: '2026-09-06T10:00:00Z', createdAt: '2026-09-01T15:00:00Z', state: dueState(5) }),
  ])
  assert.deepEqual(
    report.tasks.map(task => task.number),
    [1],
  )
  const later = await run([
    makePr({ number: 2, updatedAt: '2026-09-06T14:00:00Z', createdAt: '2026-09-01T11:00:00Z', state: dueState(1) }),
    makePr({ number: 3, updatedAt: '2026-09-06T13:00:00Z', createdAt: '2026-09-01T12:00:00Z', state: dueState(2) }),
    makePr({ number: 4, updatedAt: '2026-09-06T12:00:00Z', createdAt: '2026-09-01T13:00:00Z', state: dueState(3) }),
    makePr({ number: 5, updatedAt: '2026-09-06T11:00:00Z', createdAt: '2026-09-01T14:00:00Z', state: dueState(4) }),
    makePr({ number: 6, updatedAt: '2026-09-06T10:00:00Z', createdAt: '2026-09-01T15:00:00Z', state: dueState(5) }),
  ])
  assert.deepEqual(
    later.tasks.map(task => task.number),
    [2],
  )
}

/** Verifies no task starts while BrowserStack is busy, unless a human named the pull request. */
const testBrowserStackBusy = async () => {
  const due = makePr({ number: 32, updatedAt: '2026-09-06T10:00:00Z', state: dueState(1) })
  assert.deepEqual((await run([due], undefined, { browserStackBusy: true })).tasks, [])
  assert.deepEqual(
    (await run([due], 32, { browserStackBusy: true })).tasks.map(task => task.number),
    [32],
  )
}

/** Verifies no task starts until the branch has gone an hour without a new commit. */
const testQuietPeriod = async () => {
  const recentCommit = makePr({
    number: 27,
    updatedAt: '2026-09-06T10:00:00Z',
    state: { ...dueState(0), lastHeadChangeAt: hoursAgo(0.5) },
  })
  const newHead = makePr({
    number: 28,
    updatedAt: '2026-09-06T10:00:00Z',
    state: { ...dueState(0), observedHeadSha: 'an-older-head' },
  })
  assert.deepEqual((await run([recentCommit, newHead])).tasks, [])
  assert.equal(savedState(newHead).observedHeadSha, 'head-28')
  // A conflict seen for the first time waits for the quiet period too.
  const firstSeen = makePr({ number: 29, updatedAt: '2026-09-06T10:00:00Z' })
  assert.deepEqual((await run([firstSeen])).tasks, [])
}

/** Verifies somebody's commit restarts the count of tasks, while a task's own commit does not. */
const testWorkRestartsBackoff = async () => {
  const worked = makePr({
    number: 30,
    updatedAt: '2026-09-06T10:00:00Z',
    state: {
      ...dueState(3),
      lastDispatchedAt: hoursAgo(5),
      lastTaskUrl: 'https://example.test/task/3',
      observedHeadSha: 'an-older-head',
    },
  })
  const taskCommit = makePr({
    number: 31,
    updatedAt: '2026-09-06T10:00:00Z',
    state: { ...dueState(3), lastDispatchedAt: hoursAgo(0.5), observedHeadSha: 'an-older-head' },
  })
  await run([worked, taskCommit])
  assert.equal(savedState(worked).tasks, 0)
  assert.equal(savedState(taskCommit).tasks, 3)
}

/** Verifies ineligible, early, resolved, and lifetime-capped PRs are excluded. */
const testExclusions = async () => {
  const report = await run([
    makePr({
      number: 7,
      updatedAt: '2026-09-06T10:00:00Z',
      state: { ...dueState(0), tasks: 6, lastDispatchedAt: new Date(now - 100 * 60 * 60 * 1000).toISOString() },
    }),
    makePr({
      number: 8,
      updatedAt: '2026-09-06T10:00:00Z',
      state: { ...dueState(0), lastHeadChangeAt: hoursAgo(0.5) },
    }),
    makePr({ number: 9, updatedAt: '2026-09-06T10:00:00Z', mergeable: true, state: dueState(2) }),
    makePr({ number: 10, updatedAt: '2026-09-06T10:00:00Z', author: 'dependabot[bot]', state: dueState(0) }),
    makePr({ number: 11, updatedAt: '2026-09-06T10:00:00Z', sameRepository: false, state: dueState(0) }),
  ])
  assert.deepEqual(report.tasks, [])
}

/** Verifies each opt-out label excludes a due PR entirely, leaving its comment untouched. */
const testSkipLabels = async () => {
  for (const [number, label] of [
    [15, 'skip-auto-resolve-conflicts'],
    [21, 'hold'],
    [26, 'prototype'],
  ]) {
    const skipped = makePr({ number, updatedAt: '2026-09-06T10:00:00Z', state: dueState(2), labels: [label] })
    const before = skipped.comments[0].body
    const report = await run([skipped])
    assert.deepEqual(report.tasks, [])
    assert.equal(skipped.comments[0].body, before)
  }
}

/** Verifies a draft is excluded entirely from an unnamed scan, its comment left untouched. */
const testDraft = async () => {
  const draft = makePr({ number: 23, updatedAt: '2026-09-06T10:00:00Z', state: dueState(2), draft: true })
  const before = draft.comments[0].body
  assert.deepEqual((await run([draft])).tasks, [])
  assert.equal(draft.comments[0].body, before)
}

/** Verifies a dispatch that names a pull request overrides the opt-out labels and draft status. */
const testNamedDispatchOverridesOptOuts = async () => {
  for (const pr of [
    makePr({ number: 22, updatedAt: '2026-09-06T10:00:00Z', state: dueState(2), labels: ['hold'] }),
    makePr({
      number: 24,
      updatedAt: '2026-09-06T10:00:00Z',
      state: dueState(2),
      labels: ['skip-auto-resolve-conflicts'],
    }),
    makePr({ number: 25, updatedAt: '2026-09-06T10:00:00Z', state: dueState(2), draft: true }),
  ]) {
    const report = await run([pr], pr.number)
    assert.deepEqual(
      report.tasks.map(task => task.number),
      [pr.number],
    )
    // The dispatch step re-checks the opt-outs, so it has to see the same override the scan applied.
    assert.equal(report.requested, true)
  }
}

/** Verifies a comment is posted only once a conflict exists, and is kept updated afterwards. */
const testCommentOnConflictOnly = async () => {
  const clean = makePr({ number: 12, updatedAt: '2026-09-06T10:00:00Z', mergeable: true })
  const conflicting = makePr({ number: 13, updatedAt: '2026-09-06T10:00:00Z' })
  const resolved = makePr({ number: 14, updatedAt: '2026-09-06T10:00:00Z', mergeable: true, state: dueState(1) })
  await run([clean, conflicting, resolved])
  assert.deepEqual(clean.comments, [])
  assert.ok(conflicting.comments[0].body.includes('A merge conflict is detected'))
  assert.ok(resolved.comments[0].body.includes('Merge conflicts resolved.'))
}

/** Verifies the comment ends on the shared task footer once a task has been started. */
const testTaskFooter = async () => {
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
    'Task 2 of 6. The next task is eligible 12 hours after this one, once the branch has had no new commits for an hour, if the pull request still conflicts. Started by [Copilot Conflict Resolution](https://example.test/run/99).',
  )
}

/** Verifies the last task names the dispatch that asks for one more, rather than a dead end. */
const testCapNotice = async () => {
  const pr = makePr({
    number: 17,
    updatedAt: '2026-09-06T10:00:00Z',
    state: {
      ...dueState(0),
      tasks: 6,
      lastTaskUrl: 'https://example.test/task/6',
      lastRunUrl: 'https://example.test/run/99',
    },
  })
  await run([pr])
  assert.equal(
    pr.comments[0].body.split('\n').pop(),
    'Task 6 of 6. No further task starts on its own — run `gh workflow run copilot-conflicts.yml -f pr=17` if it needs another. Started by [Copilot Conflict Resolution](https://example.test/run/99).',
  )
  // Nothing further starts on its own at the cap, so no resolution may be claimed as ongoing.
  assert.ok(
    pr.comments[0].body.includes(
      'A merge conflict is detected. The most recent task was [this one](https://example.test/task/6).',
    ),
  )
}

/** Verifies the schedule rides in the body until there is a task for a footer to count. */
const testScheduleBeforeFirstTask = async () => {
  const pr = makePr({ number: 18, updatedAt: '2026-09-06T10:00:00Z' })
  await run([pr])
  assert.equal(
    pr.comments[0].body.split('\n').pop(),
    'A merge conflict is detected. Copilot will resolve it on this branch. The first task is eligible once the branch has had no new commits for an hour, if the pull request still conflicts.',
  )
}

/** Verifies a started task says the conflict is being resolved and links the task doing it. */
const testTaskLink = async () => {
  const conflicting = makePr({
    number: 19,
    updatedAt: '2026-09-06T10:00:00Z',
    state: { ...dueState(2), lastTaskUrl: 'https://example.test/task/2' },
  })
  const resolved = makePr({
    number: 20,
    updatedAt: '2026-09-06T10:00:00Z',
    mergeable: true,
    state: { ...dueState(2), lastTaskUrl: 'https://example.test/task/2' },
  })
  await run([conflicting, resolved])
  assert.ok(
    conflicting.comments[0].body.includes(
      'A merge conflict is detected. Copilot is resolving it on this branch: [task](https://example.test/task/2).',
    ),
  )
  assert.ok(
    resolved.comments[0].body.includes(
      'Merge conflicts resolved. The most recent task was [this one](https://example.test/task/2).',
    ),
  )
}

/** Verifies a dispatch that names a pull request overrides both the wait and the lifetime cap. */
const testNamedDispatchOverridesWaitAndCap = async () => {
  const waiting = makePr({
    number: 19,
    updatedAt: '2026-09-06T10:00:00Z',
    state: { ...dueState(2), lastDispatchedAt: new Date(now - 60 * 60 * 1000).toISOString() },
  })
  const capped = makePr({ number: 20, updatedAt: '2026-09-06T10:00:00Z', state: { ...dueState(0), tasks: 6 } })
  assert.deepEqual(
    (await run([waiting], 19)).tasks.map(task => task.number),
    [19],
  )
  assert.deepEqual(
    (await run([capped], 20)).tasks.map(task => task.number),
    [20],
  )
  // A scan nobody named leaves the report unmarked, so the dispatch step re-checks the opt-outs.
  assert.equal((await run([waiting])).requested, false)
}

await testRetryPolicy()
await testBrowserStackBusy()
await testQuietPeriod()
await testWorkRestartsBackoff()
await testExclusions()
await testCommentOnConflictOnly()
await testSkipLabels()
await testDraft()
await testNamedDispatchOverridesOptOuts()
await testTaskFooter()
await testCapNotice()
await testScheduleBeforeFirstTask()
await testTaskLink()
await testNamedDispatchOverridesWaitAndCap()

console.info('PASS: collect-copilot-conflicts')
