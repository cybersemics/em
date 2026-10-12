import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const mergeDependabotPr = require('../merge-dependabot-pr.cjs')

/** Creates a completed check run. */
const check = (name, conclusion = 'success', status = 'completed') => ({ name, status, conclusion })

/** Creates a workflow run on this repository. */
const workflowRun = (name, status = 'completed') => ({ name, status, head_repository: { full_name: 'owner/repo' } })

/** Creates an open Dependabot pull request fixture. */
const makePr = (overrides = {}) => ({
  number: 1,
  state: 'open',
  draft: false,
  mergeable: true,
  user: { login: 'dependabot[bot]' },
  base: { ref: 'main' },
  head: {
    ref: 'dependabot/npm_and_yarn/foo-1.0.0',
    label: 'owner:dependabot/npm_and_yarn/foo-1.0.0',
    sha: 'abcdef1234',
    repo: { full_name: 'owner/repo' },
  },
  ...overrides,
})

/** Runs the script against in-memory REST responses and returns its outputs and approvals. */
const run = async ({
  pr = makePr(),
  workflowRuns = [workflowRun('Lint'), workflowRun('Test')],
  checkRuns = [check('Lint'), check('Test'), check('TDD — Unit tests', 'skipped')],
  statuses = [],
  commits = [{ author: { login: 'dependabot[bot]' } }],
} = {}) => {
  const outputs = {}
  const approvals = []
  const failures = []
  /** Lists the fixture workflow runs. */
  const listWorkflowRunsForRepo = async () => ({ data: workflowRuns })
  /** Lists the fixture check runs. */
  const listForRef = async () => ({ data: checkRuns })
  /** Lists the fixture commits. */
  const listCommits = async () => ({ data: commits })
  const github = {
    paginate: async (method, params) => (await method(params)).data,
    rest: {
      pulls: {
        list: async () => ({ data: [pr] }),
        get: async () => ({ data: pr }),
        listCommits,
        createReview: async params => approvals.push(params),
      },
      actions: { listWorkflowRunsForRepo },
      checks: { listForRef },
      repos: { getCombinedStatusForRef: async () => ({ data: { statuses } }) },
    },
  }
  const core = {
    info: () => {},
    warning: () => {},
    setFailed: message => failures.push(message),
    setOutput: (name, value) => (outputs[name] = value),
  }
  process.env.HEAD_BRANCH = pr.head.ref
  process.env.PR_NUMBER = ''
  await mergeDependabotPr({ github, context: { repo: { owner: 'owner', repo: 'repo' } }, core })
  return { outputs, approvals, failures }
}

// Merges once every check on the head has passed.
{
  const { outputs, approvals } = await run()
  assert.deepEqual(outputs, { merge: 'true', pr: '1', sha: 'abcdef1234' })
  assert.equal(approvals.length, 1)
}

// Waits while an optional suite is still running, even though Lint, the required check, passed.
{
  const { outputs } = await run({ checkRuns: [check('Lint'), check('Puppeteer', null, 'in_progress')] })
  assert.equal(outputs.merge, 'false')
}

// Waits while a workflow is queued and has not created its check runs yet.
{
  const { outputs } = await run({ workflowRuns: [workflowRun('Lint'), workflowRun('BrowserStack', 'queued')] })
  assert.equal(outputs.merge, 'false')
}

// Does not merge past a failed or cancelled optional suite.
for (const conclusion of ['failure', 'cancelled', 'timed_out']) {
  const { outputs } = await run({ checkRuns: [check('Lint'), check('Test', conclusion)] })
  assert.equal(outputs.merge, 'false', conclusion)
}

// Does not merge past a failing commit status.
{
  const { outputs } = await run({ statuses: [{ context: 'external', state: 'failure' }] })
  assert.equal(outputs.merge, 'false')
}

// Does not merge before any check has reported.
{
  const { outputs } = await run({ workflowRuns: [], checkRuns: [] })
  assert.equal(outputs.merge, 'false')
}

// Leaves alone a pull request Dependabot did not open, one on a fork, and one that conflicts.
for (const pr of [
  makePr({ user: { login: 'someone' } }),
  makePr({ head: { ...makePr().head, repo: { full_name: 'fork/repo' } } }),
  makePr({ mergeable: false }),
]) {
  const { outputs, approvals } = await run({ pr })
  assert.equal(outputs.merge, 'false')
  assert.equal(approvals.length, 0)
}

// Merges a bump that carries a fix commit, but does not approve it.
{
  const { outputs, approvals } = await run({
    commits: [{ author: { login: 'dependabot[bot]' } }, { author: { login: 'Copilot' } }],
  })
  assert.equal(outputs.merge, 'true')
  assert.equal(approvals.length, 0)
}

console.info('PASS: merge-dependabot-pr')
