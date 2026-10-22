import assert from 'node:assert/strict'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const collect = require('../collect-main-failures.cjs')

const SHA = 'a'.repeat(40)
const GREEN_SHA = 'b'.repeat(40)

/** Creates a workflow run fixture on main. */
const makeRun = ({
  id,
  name,
  conclusion = 'success',
  status = 'completed',
  attempt = 1,
  runNumber = 100,
  sha = SHA,
}) => ({
  id,
  name,
  workflow_id: name,
  status,
  conclusion: status === 'completed' ? conclusion : null,
  run_attempt: attempt,
  run_number: runNumber,
  head_sha: sha,
  html_url: `https://example.test/runs/${id}`,
  head_commit: { message: 'Break the build (#1234)\n\nBody.' },
})

/** A Vitest log with two failed tests in its summary. */
const VITEST_LOG = [
  '2026-10-04T00:00:00.0000000Z  ❯ src/e2e/puppeteer/__tests__/drag-and-drop.ts (2 tests | 2 failed)',
  '2026-10-04T00:00:00.0000000Z ⎯⎯⎯ Failed Tests 2 ⎯⎯⎯',
  '2026-10-04T00:00:00.0000000Z  FAIL  src/e2e/puppeteer/__tests__/drag-and-drop.ts > drag Alert',
  '2026-10-04T00:00:00.0000000Z  FAIL  src/e2e/puppeteer/__tests__/drag-and-drop.ts > drag should show alert',
  '2026-10-04T00:00:00.0000000Z ##[error]Process completed with exit code 1.',
].join('\n')

/**
 * Runs the collector against in-memory REST responses. `history` maps a workflow name to its runs
 * on main, newest first, as the per-workflow listing returns them. Returns the outputs it set, the
 * issues and comments it wrote, and its report when it wrote one.
 */
const run = async ({ runs, history = {}, openIssues = [], comments = {}, dispatched = false }) => {
  const outputs = {}
  const created = []
  const posted = []
  const github = {
    rest: {
      actions: {
        listWorkflowRunsForRepo: async () => ({ data: runs }),
        listWorkflowRuns: async ({ workflow_id, status }) => ({
          data: {
            workflow_runs: (history[workflow_id] || []).filter(candidate =>
              status === 'completed' ? candidate.status === 'completed' : candidate.conclusion === status,
            ),
          },
        }),
        listJobsForWorkflowRun: async ({ run_id }) => ({
          data: [
            { id: run_id * 10, name: 'build', conclusion: 'success', html_url: 'https://example.test/job/ok' },
            {
              id: run_id * 10 + 1,
              name: 'tests',
              conclusion: 'failure',
              html_url: `https://example.test/job/${run_id}`,
            },
          ],
        }),
      },
      issues: {
        listForRepo: async () => ({ data: openIssues }),
        listComments: async ({ issue_number }) => ({ data: comments[issue_number] || [] }),
        createComment: async ({ issue_number, body }) => {
          posted.push({ issue_number, body })
          return { data: {} }
        },
        getLabel: async () => ({ data: {} }),
        createLabel: async () => ({ data: {} }),
        create: async params => {
          created.push(params)
          return { data: { number: 9000, html_url: 'https://example.test/issues/9000' } }
        },
      },
    },
    paginate: async (fn, params) => (await fn(params)).data,
  }
  const core = {
    info: () => {},
    warning: () => {},
    setFailed: message => {
      throw new Error(message)
    },
    setOutput: (name, value) => {
      outputs[name] = value
    },
    summary: { addRaw: () => core.summary, write: async () => {} },
  }
  const realFetch = global.fetch
  global.fetch = async () => ({
    ok: true,
    headers: { get: () => null },
    text: async () => VITEST_LOG,
  })
  process.env.SHA = SHA
  process.env.DISPATCHED = String(dispatched)
  try {
    await collect({ github, context: { repo: { owner: 'owner', repo: 'repo' } }, core })
    const report = existsSync('main-fix/report.json') ? JSON.parse(readFileSync('main-fix/report.json', 'utf8')) : null
    return { outputs, created, posted, report }
  } finally {
    global.fetch = realFetch
    delete process.env.SHA
    delete process.env.DISPATCHED
    rmSync('main-fix', { recursive: true, force: true })
  }
}

/** Verifies nothing happens while any CI workflow on the commit is still running. */
const testWaitsForLastOneOut = async () => {
  const { outputs, created } = await run({
    runs: [
      makeRun({ id: 1, name: 'Lint', conclusion: 'failure', attempt: 2 }),
      makeRun({ id: 2, name: 'Puppeteer', status: 'in_progress' }),
    ],
  })
  assert.equal(outputs.rerun, '')
  assert.equal(outputs.dispatch, 'false')
  assert.equal(created.length, 0)
}

/** Verifies every first-attempt failure on the commit is re-run once, and nothing is filed yet. */
const testRerunsFirstAttempts = async () => {
  const { outputs, created } = await run({
    runs: [
      makeRun({ id: 1, name: 'Lint', conclusion: 'failure' }),
      makeRun({ id: 2, name: 'Test', conclusion: 'failure' }),
      makeRun({ id: 3, name: 'Puppeteer' }),
    ],
  })
  assert.equal(outputs.rerun, '1 2')
  assert.equal(outputs.dispatch, 'false')
  assert.equal(created.length, 0)
}

/** Verifies a failure that passed on its re-run is treated as a temporary outage. */
const testRerunPassed = async () => {
  const { outputs, created } = await run({
    runs: [makeRun({ id: 1, name: 'Lint', attempt: 2 }), makeRun({ id: 2, name: 'Puppeteer' })],
  })
  assert.equal(outputs.rerun, '')
  assert.equal(outputs.dispatch, 'false')
  assert.equal(created.length, 0)
}

/** Verifies confirmed failures across workflows become one issue naming each one, and one task. */
const testFilesOneIssue = async () => {
  const lint = makeRun({ id: 1, name: 'Lint', conclusion: 'failure', attempt: 2 })
  const puppeteer = makeRun({ id: 2, name: 'Puppeteer', conclusion: 'failure', attempt: 2 })
  const { outputs, created, report } = await run({
    runs: [lint, puppeteer, makeRun({ id: 3, name: 'Test' })],
    history: {
      Puppeteer: [puppeteer, makeRun({ id: 20, name: 'Puppeteer', runNumber: 99, sha: GREEN_SHA })],
    },
  })
  assert.equal(outputs.dispatch, 'true')
  assert.equal(outputs.issue, '9000')
  assert.equal(created.length, 1)
  assert.equal(created[0].title, 'CI failing on main: Lint, Puppeteer')
  assert.deepEqual(created[0].labels, ['main-fix'])
  const body = created[0].body
  assert.ok(body.includes('## Steps to Reproduce'))
  assert.ok(body.includes('## Current Behavior'))
  assert.ok(body.includes('## Expected Behavior'))
  assert.ok(body.includes('Break the build (#1234)'))
  assert.ok(body.includes('https://example.test/runs/1'))
  assert.ok(body.includes('https://example.test/runs/2'))
  assert.ok(body.includes('`src/e2e/puppeteer/__tests__/drag-and-drop.ts > drag should show alert`'))
  assert.ok(body.includes(`It last passed on \`main\` at [\`${GREEN_SHA.slice(0, 7)}\`]`))
  assert.equal(report.issue.status, 'created')
  assert.deepEqual(
    report.failures.map(failure => failure.workflow),
    ['Lint', 'Puppeteer'],
  )
  assert.equal(report.failures[1].lastGreenSha, GREEN_SHA)
}

/** Verifies an open tracking issue is linked rather than duplicated, and gets no second task. */
const testLinksOpenIssue = async () => {
  const lint = makeRun({ id: 1, name: 'Lint', conclusion: 'failure', attempt: 2 })
  const openIssues = [{ number: 42, html_url: 'https://example.test/issues/42', body: 'earlier' }]
  const first = await run({ runs: [lint], openIssues })
  assert.equal(first.created.length, 0)
  assert.equal(first.posted.length, 1)
  assert.equal(first.posted[0].issue_number, 42)
  assert.equal(first.outputs.issue, '42')
  assert.equal(first.outputs.dispatch, 'false')

  // The same run reported again — a later completion on the same commit — adds nothing.
  const again = await run({ runs: [lint], openIssues, comments: { 42: [{ body: first.posted[0].body }] } })
  assert.equal(again.posted.length, 0)
}

/** Verifies a failure a newer commit already turned green is ignored. */
const testSuperseded = async () => {
  const lint = makeRun({ id: 1, name: 'Lint', conclusion: 'failure', attempt: 2 })
  const { outputs, created } = await run({
    runs: [lint],
    history: { Lint: [makeRun({ id: 5, name: 'Lint', runNumber: 101, sha: GREEN_SHA }), lint] },
  })
  assert.equal(outputs.dispatch, 'false')
  assert.equal(created.length, 0)
}

/** Verifies a manual dispatch skips the re-run and starts a task even with an issue open. */
const testDispatchOverrides = async () => {
  const { outputs, posted } = await run({
    runs: [makeRun({ id: 1, name: 'Lint', conclusion: 'failure' })],
    openIssues: [{ number: 42, html_url: 'https://example.test/issues/42', body: '' }],
    dispatched: true,
  })
  assert.equal(outputs.rerun, '')
  assert.equal(outputs.dispatch, 'true')
  assert.equal(posted.length, 1)
}

await testWaitsForLastOneOut()
await testRerunsFirstAttempts()
await testRerunPassed()
await testFilesOneIssue()
await testLinksOpenIssue()
await testSuperseded()
await testDispatchOverrides()

console.info('PASS: collect-main-failures')
