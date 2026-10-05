import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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
/** Creates state that has waited past the delay before the task after the specified count. */
const dueState = tasks => ({
  version: 2,
  firstConflictAt: new Date(now - 200 * 60 * 60 * 1000).toISOString(),
  tasks,
  lastDispatchedAt: tasks ? new Date(now - ([3, 6, 12, 24, 48, 96][tasks] + 1) * 60 * 60 * 1000).toISOString() : null,
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
      state: { ...dueState(0), tasks: 6, lastDispatchedAt: new Date(now - 100 * 60 * 60 * 1000).toISOString() },
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

/** Verifies each opt-out label excludes a due PR entirely, leaving its comment untouched. */
const testSkipLabels = async () => {
  for (const [number, label] of [
    [15, 'skip-auto-resolve-conflicts'],
    [21, 'hold'],
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
    'Task 2 of 6. The next task is eligible 12 hours after this one, if the pull request still conflicts. Started by [Copilot Conflict Resolution](https://example.test/run/99).',
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
    'A merge conflict is detected. Copilot will resolve it on this branch. The next task is eligible 3 hours after the conflict was first seen, if the pull request still conflicts.',
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

/** Runs the real task dispatcher with fixture API responses and captures its requests and exit status. */
const runDispatch = async responses => {
  const directory = mkdtempSync(join(tmpdir(), 'copilot-conflict-dispatch-'))
  const reportFile = join(directory, 'report.json')
  const pr = makePr({ number: 1, updatedAt: '2026-09-06T10:00:00Z', state: dueState(0) })
  const task = {
    number: pr.number,
    url: pr.html_url,
    headRef: pr.head.ref,
    baseRef: pr.base.ref,
    headSha: pr.head.sha,
    baseSha: pr.base.sha,
  }
  writeFileSync(reportFile, JSON.stringify({ tasks: [task], requested: false }))
  const result = { requests: [], updates: [], output: '', exitCode: 0 }
  const original = {
    fetch: global.fetch,
    argv: process.argv,
    exit: process.exit,
    write: process.stdout.write,
    token: process.env.COPILOT_TASKS_TOKEN,
    repository: process.env.GITHUB_REPOSITORY,
    model: process.env.COPILOT_MODEL,
    conflictModel: process.env.COPILOT_MODEL_CONFLICTS,
  }
  process.argv = [process.argv[0], 'start-copilot-conflict-task.mjs', reportFile]
  process.env.COPILOT_TASKS_TOKEN = 'test-token'
  process.env.GITHUB_REPOSITORY = 'owner/repo'
  process.env.COPILOT_MODEL = 'claude-opus-5'
  process.env.COPILOT_MODEL_CONFLICTS = 'claude-opus-5'
  process.exit = code => {
    result.exitCode = code
  }
  process.stdout.write = output => {
    result.output += output
    return true
  }
  global.fetch = async (url, options) => {
    if (url === 'https://api.github.com/repos/owner/repo/pulls/1') return Response.json(pr)
    if (url === 'https://api.github.com/repos/owner/repo/issues/1/comments') return Response.json(pr.comments)
    if (url === 'https://api.github.com/agents/repos/owner/repo/tasks') {
      assert.equal(options.method, 'POST')
      result.requests.push(JSON.parse(options.body))
      const response = responses[result.requests.length - 1]
      assert.ok(response, 'unexpected additional task dispatch')
      return response
    }
    assert.equal(url, 'https://api.github.com/repos/owner/repo/issues/comments/1')
    assert.equal(options.method, 'PATCH')
    result.updates.push(JSON.parse(options.body))
    return Response.json({})
  }
  try {
    await import(`../start-copilot-conflict-task.mjs?report=${encodeURIComponent(reportFile)}`)
    return result
  } finally {
    global.fetch = original.fetch
    process.argv = original.argv
    process.exit = original.exit
    process.stdout.write = original.write
    if (original.token === undefined) delete process.env.COPILOT_TASKS_TOKEN
    else process.env.COPILOT_TASKS_TOKEN = original.token
    if (original.repository === undefined) delete process.env.GITHUB_REPOSITORY
    else process.env.GITHUB_REPOSITORY = original.repository
    if (original.model === undefined) delete process.env.COPILOT_MODEL
    else process.env.COPILOT_MODEL = original.model
    if (original.conflictModel === undefined) delete process.env.COPILOT_MODEL_CONFLICTS
    else process.env.COPILOT_MODEL_CONFLICTS = original.conflictModel
    rmSync(directory, { recursive: true, force: true })
  }
}

/** Verifies an unavailable model falls back once without changing the task or consuming an extra task count. */
const testUnavailableModelFallback = async () => {
  const result = await runDispatch([
    Response.json({ message: 'model not found or not enabled for user' }, { status: 400 }),
    Response.json({ html_url: 'https://example.test/task/1' }, { status: 201 }),
  ])
  assert.equal(result.exitCode, 0, result.output)
  assert.equal(result.requests.length, 2)
  const { model, ...task } = result.requests[0]
  assert.equal(model, 'claude-opus-5')
  assert.deepEqual(result.requests[1], task)
  assert.equal(task.custom_agent, 'worker-bee')
  assert.equal(task.head_ref, 'copilot/fix/1')
  assert.equal(task.base_ref, 'main')
  assert.equal(result.updates.length, 1)
  const { parseState } = require('../copilot-conflicts-comment.cjs')
  const state = parseState(result.updates[0].body)
  assert.equal(state.tasks, 1)
  assert.equal(state.lastTaskUrl, 'https://example.test/task/1')
  assert.equal(state.history.length, 1)
}

/** Verifies a successful preferred-model request starts only one task. */
const testPreferredModelSuccess = async () => {
  const result = await runDispatch([Response.json({ html_url: 'https://example.test/task/1' }, { status: 201 })])
  assert.equal(result.exitCode, 0, result.output)
  assert.equal(result.requests.length, 1)
  assert.equal(result.requests[0].model, 'claude-opus-5')
  assert.equal(result.updates.length, 1)
}

/** Verifies other errors are not retried and a rejected fallback never consumes task state. */
const testDispatchFailures = async () => {
  for (const responses of [
    [Response.json({ message: 'Invalid head_ref' }, { status: 400 })],
    [Response.json({ message: 'model not found or not enabled for user' }, { status: 403 })],
    [
      Response.json({ message: 'model not found or not enabled for user' }, { status: 400 }),
      Response.json({ message: 'model not found or not enabled for user' }, { status: 400 }),
    ],
  ]) {
    const result = await runDispatch(responses)
    assert.equal(result.exitCode, 1)
    assert.equal(result.requests.length, responses.length)
    assert.equal(result.updates.length, 0)
    assert.ok(result.output.includes('dispatch failed:'))
  }
}

await testRetryPolicy()
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
await testUnavailableModelFallback()
await testPreferredModelSuccess()
await testDispatchFailures()

console.info('PASS: collect-copilot-conflicts')
