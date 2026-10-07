import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

const require = createRequire(import.meta.url)
const resolveDiffPr = require('../resolve-diff-pr.cjs')
const upsertDiffComment = require('../upsert-diff-comment.cjs')

/** Runs the production comment scripts against real artifact files and a mocked GitHub boundary. */
const runWorkflow = async ({
  flat = false,
  raw = '5791',
  conclusion = 'success',
  collected = 0,
  headSha = 'head',
} = {}) => {
  const directory = fs.mkdtempSync(path.join(tmpdir(), 'em-diff-comment-'))
  const originalDirectory = process.cwd()
  const keys = ['PR', 'AUTHOR', 'RUN_ID', 'RUN_URL', 'COLLECTED', 'GITHUB_WORKSPACE']
  const originalEnvironment = Object.fromEntries(keys.map(key => [key, process.env[key]]))
  const result = { outputs: {}, failures: [], messages: [], comments: [], requestedPr: null }

  try {
    process.chdir(directory)
    if (raw !== null) {
      const file = flat ? 'artifacts/pr-number.txt' : 'artifacts/pr-number/pr-number.txt'
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.writeFileSync(file, raw)
    }
    fs.writeFileSync('committed-images.txt', 'drag-and-drop/__diff_output__/drag-alert-1-diff.png\n')
    Object.assign(process.env, {
      RUN_ID: '42',
      RUN_URL: 'https://github.test/runs/42',
      COLLECTED: String(collected),
      GITHUB_WORKSPACE: directory,
    })

    const github = {
      rest: {
        pulls: {
          get: async request => {
            result.requestedPr = request.pull_number
            return { data: { head: { sha: headSha }, user: { login: 'author' } } }
          },
        },
        issues: {
          listComments: async () => ({ data: [{ id: 7, body: '<!-- puppeteer-diff -->\nOld diffs' }] }),
          updateComment: async request => result.comments.push(request),
          createComment: async () => assert.fail('The existing diff comment should be updated.'),
        },
      },
    }
    const context = {
      repo: { owner: 'owner', repo: 'repo' },
      payload: { workflow_run: { head_sha: 'head', conclusion } },
    }
    const core = {
      info: message => result.messages.push(message),
      setFailed: message => result.failures.push(message),
      setOutput: (name, value) => {
        result.outputs[name] = value
      },
    }
    await resolveDiffPr({ github, context, core })
    // The workflow only posts a comment after the PR identity has been verified.
    if (result.outputs.number) {
      process.env.PR = result.outputs.number
      process.env.AUTHOR = result.outputs.author
      await upsertDiffComment({ github, context })
    }
    return result
  } finally {
    process.chdir(originalDirectory)
    keys.forEach(key => {
      if (originalEnvironment[key] === undefined) delete process.env[key]
      else process.env[key] = originalEnvironment[key]
    })
    fs.rmSync(directory, { recursive: true, force: true })
  }
}

await test('a flat PR-number artifact clears the existing diff comment after success', async () => {
  const result = await runWorkflow({ flat: true })
  assert.deepEqual(result.outputs, { number: '5791', author: 'author' })
  assert.deepEqual(result.failures, [])
  assert.equal(result.comments.length, 1)
  assert.equal(result.comments[0].comment_id, 7)
  assert.match(result.comments[0].body, /No snapshot diffs in the latest run/)
})

await test('a nested PR-number artifact still resolves and clears the existing comment', async () => {
  const result = await runWorkflow()
  assert.deepEqual(result.outputs, { number: '5791', author: 'author' })
  assert.match(result.comments[0].body, /No snapshot diffs in the latest run/)
})

await test('a successful retry clears stale diff artifacts from earlier attempts', async () => {
  const result = await runWorkflow({ collected: 1 })
  assert.match(result.comments[0].body, /No snapshot diffs in the latest run/)
  assert.doesNotMatch(result.comments[0].body, /broken snapshot|<img/)
})

await test('a failed run still posts its snapshot diff', async () => {
  const result = await runWorkflow({ conclusion: 'failure', collected: 1 })
  assert.match(result.comments[0].body, /1 broken snapshot/)
  assert.match(result.comments[0].body, /pr-5791\/42\/drag-and-drop\/__diff_output__\/drag-alert-1-diff.png/)
})

await test('a flat artifact cannot post to a PR with a different head SHA', async () => {
  const result = await runWorkflow({ flat: true, headSha: 'other-head' })
  assert.equal(result.requestedPr, 5791)
  assert.equal(result.failures.length, 1)
  assert.match(result.failures[0], /does not match/)
  assert.deepEqual(result.outputs, {})
  assert.deepEqual(result.comments, [])
})

await test('a malformed PR number is rejected before requesting the PR', async () => {
  const result = await runWorkflow({ raw: '5791<script>' })
  assert.match(result.failures[0], /not a plain integer/)
  assert.equal(result.requestedPr, null)
  assert.deepEqual(result.comments, [])
})

await test('a run without a PR-number artifact posts no comment', async () => {
  const result = await runWorkflow({ raw: null })
  assert.deepEqual(result.outputs, {})
  assert.deepEqual(result.comments, [])
  assert.deepEqual(result.messages, ['No pr-number artifact found; nothing to do.'])
})
