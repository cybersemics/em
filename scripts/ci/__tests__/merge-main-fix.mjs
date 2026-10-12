import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const merge = require('../merge-main-fix.cjs')

const HEAD = 'c'.repeat(40)

/**
 * Runs the merge step against in-memory REST responses, each overridable, and returns the merge
 * calls it made.
 */
const run = async ({ pr = {}, issue = {}, checks, statuses = [], headSha = HEAD } = {}) => {
  const merged = []
  const github = {
    rest: {
      pulls: {
        get: async () => ({
          data: {
            number: 7,
            state: 'open',
            draft: false,
            base: { ref: 'main' },
            head: { sha: HEAD },
            body: 'Fixes #42\n\nReverts #1234.',
            html_url: 'https://example.test/pull/7',
            ...pr,
          },
        }),
        merge: async params => {
          merged.push(params)
          return { data: {} }
        },
      },
      issues: {
        get: async () => ({ data: { number: 42, state: 'open', labels: [{ name: 'main-fix' }], ...issue } }),
      },
      checks: {
        listForRef: async () => ({
          data: checks || [
            { name: 'Lint', status: 'completed', conclusion: 'success' },
            { name: 'Puppeteer', status: 'completed', conclusion: 'success' },
            { name: 'Agent Scripts', status: 'completed', conclusion: 'skipped' },
          ],
        }),
      },
      repos: { getCombinedStatusForRef: async () => ({ data: { state: 'pending', statuses } }) },
    },
    paginate: async (fn, params) => (await fn(params)).data,
  }
  const core = {
    info: () => {},
    setFailed: message => {
      throw new Error(message)
    },
    summary: { addRaw: () => core.summary, write: async () => {} },
  }
  process.env.PR_NUMBER = '7'
  process.env.HEAD_SHA = headSha
  try {
    await merge({ github, context: { repo: { owner: 'owner', repo: 'repo' } }, core })
    return merged
  } finally {
    delete process.env.PR_NUMBER
    delete process.env.HEAD_SHA
  }
}

/** Verifies a green fix for an open main-fix issue is squash-merged at the commit that was checked. */
const testMerges = async () => {
  const merged = await run()
  assert.equal(merged.length, 1)
  assert.equal(merged[0].sha, HEAD)
  assert.equal(merged[0].merge_method, 'squash')
}

/** Verifies only a pull request that fixes an open main-fix issue is merged. */
const testOnlyMainFixes = async () => {
  assert.equal((await run({ pr: { body: 'Some other change.\n\nFixes #42' } })).length, 0)
  assert.equal((await run({ issue: { labels: [{ name: 'test' }] } })).length, 0)
  assert.equal((await run({ issue: { state: 'closed' } })).length, 0)
  assert.equal((await run({ pr: { draft: true } })).length, 0)
  assert.equal((await run({ pr: { base: { ref: 'release' } } })).length, 0)
}

/** Verifies every check must have completed and passed — a cancelled or running one holds the merge. */
const testEveryCheck = async () => {
  assert.equal((await run({ checks: [{ name: 'Puppeteer', status: 'in_progress', conclusion: null }] })).length, 0)
  assert.equal((await run({ checks: [{ name: 'Puppeteer', status: 'completed', conclusion: 'cancelled' }] })).length, 0)
  assert.equal((await run({ statuses: [{ context: 'Vercel', state: 'pending' }] })).length, 0)
  // No statuses at all reads as a combined `pending`, which must not hold the merge.
  assert.equal((await run({ statuses: [] })).length, 1)
}

/** Verifies a push after the checks were read holds the merge until that commit is checked. */
const testHeadMoved = async () => {
  assert.equal((await run({ headSha: 'd'.repeat(40) })).length, 0)
}

await testMerges()
await testOnlyMainFixes()
await testEveryCheck()
await testHeadMoved()

console.info('PASS: merge-main-fix')
